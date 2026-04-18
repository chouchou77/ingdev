import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';

const MapPage = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const geoJsonLayerRef = useRef(null);
    const [riskMapping, setRiskMapping] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('risk');

    const wilayaIdNames = {
        1: 'ADRAR', 2: 'CHLEF', 3: 'LAGHOUAT', 4: 'OUMELBOUAGHI', 5: 'BATNA',
        6: 'BEJAIA', 7: 'BISKRA', 8: 'BECHAR', 9: 'BLIDA', 10: 'BOUIRA',
        11: 'TAMANRASSET', 12: 'TEBESSA', 13: 'TLEMCEN', 14: 'TIARET', 15: 'TIZIOUZOU',
        16: 'ALGER', 17: 'DJELFA', 18: 'JIJEL', 19: 'SETIF', 20: 'SAIDA',
        21: 'SKIKDA', 22: 'SIDIBELABBES', 23: 'ANNABA', 24: 'GUELMA', 25: 'CONSTANTINE',
        26: 'MEDEA', 27: 'MOSTAGANEM', 28: 'MSILA', 29: 'MASCARA', 30: 'OUARGLA',
        31: 'ORAN', 32: 'ELBAYADH', 33: 'ILLIZI', 34: 'BORDJBOUARRER', 35: 'BOUMERDES',
        36: 'ELTARF', 37: 'TINDOUF', 38: 'TISSEMSILT', 39: 'ELOUED', 40: 'KHENCHELA',
        41: 'SOUKAHRAS', 42: 'TIPAZA', 43: 'MILA', 44: 'AINDEFLA', 45: 'NAAMA',
        46: 'AINTEMOUCHENT', 47: 'GHARDAIA', 48: 'RELIZANE'
    };

    const riskToVulnFactor = { 0.5: 0, 1: 0.12, 2: 0.20, 3: 0.25, 4: 0.3 };

    const normalize = (str) => {
        if (!str) return "";
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[- '’]/g, "")
            .toUpperCase();
    };

    const getRiskColor = (risk) => {
        if (risk === undefined) return '#1e293b';
        if (risk <= 0.5) return '#10b981';
        if (risk <= 1.0) return '#3b82f6';
        if (risk <= 2.0) return '#eab308';
        if (risk <= 3.0) return '#f97316';
        return '#ef4444';
    };

    const getVulnColor = (vuln, capital) => {
        // Special case: Neutral color ONLY in Vulnerability mode if no capital
        if (!capital || capital <= 0) return '#334155';
        if (vuln === undefined) return '#1e293b';
        if (vuln === 0) return '#10b981';
        if (vuln < 10000000) return '#3b82f6';
        if (vuln < 50000000) return '#eab308';
        if (vuln < 200000000) return '#f97316';
        return '#ef4444';
    };

    const formatMillion = (num) => {
        if (!num || num <= 0) return "0.0";
        return (num / 1000000).toFixed(1) + "M";
    };

    useEffect(() => {
        Promise.all([
            fetch('/merged_willaya_data.csv').then(r => r.text()),
            fetch('/dza_admin2.geojson').then(r => r.json())
        ]).then(([csvText, geoData]) => {
            const csvRows = csvText.split('\n').filter(line => line.trim() !== '').slice(1);
            const csvByWilayaId = {};
            csvRows.forEach(row => {
                const cols = row.split(',');
                if (cols.length >= 7) {
                    const wilayaId = parseInt(cols[1]);
                    const communeName = cols[3]?.trim();
                    const risk = parseFloat(cols[5]);
                    const capital = parseFloat(cols[6] || 0);
                    const vulnerability = capital * (riskToVulnFactor[risk] || 0);

                    if (!csvByWilayaId[wilayaId]) csvByWilayaId[wilayaId] = [];
                    csvByWilayaId[wilayaId].push({ name: communeName, risk, capital, vulnerability });
                }
            });

            const geoByNormWilaya = {};
            geoData.features.forEach(feature => {
                const normWilaya = normalize(feature.properties?.adm1_name);
                if (!geoByNormWilaya[normWilaya]) geoByNormWilaya[normWilaya] = [];
                geoByNormWilaya[normWilaya].push(feature);
            });

            const newMapping = {};
            for (let id = 1; id <= 48; id++) {
                const targetNormName = wilayaIdNames[id];
                const csvCommunes = csvByWilayaId[id];
                const geoFeatures = geoByNormWilaya[targetNormName];

                if (csvCommunes && geoFeatures) {
                    const sortedCsv = [...csvCommunes].sort((a, b) => a.name.localeCompare(b.name));
                    const sortedGeo = [...geoFeatures].sort((a, b) =>
                        (a.properties.adm2_name || "").toUpperCase().localeCompare((b.properties.adm2_name || "").toUpperCase())
                    );

                    const len = Math.min(sortedCsv.length, sortedGeo.length);
                    for (let i = 0; i < len; i++) {
                        const feature = sortedGeo[i];
                        const csvData = sortedCsv[i];
                        if (feature.properties?.adm2_pcode) {
                            newMapping[feature.properties.adm2_pcode] = {
                                risk: csvData.risk,
                                capital: csvData.capital,
                                vulnerability: csvData.vulnerability,
                                csvName: csvData.name,
                                geoName: feature.properties.adm2_name,
                                wilayaId: id
                            };
                        }
                    }
                }
            }

            setRiskMapping(newMapping);
            setIsLoaded(true);

            if (mapRef.current && !mapInstanceRef.current) {
                mapInstanceRef.current = L.map(mapRef.current).setView([28.0339, 1.6596], 5);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; CartoDB'
                }).addTo(mapInstanceRef.current);
            }

            if (mapInstanceRef.current) {
                if (geoJsonLayerRef.current) mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);

                geoJsonLayerRef.current = L.geoJSON(geoData, {
                    style: (feature) => {
                        const data = newMapping[feature.properties?.adm2_pcode];
                        return {
                            fillColor: viewMode === 'risk'
                                ? getRiskColor(data?.risk)
                                : getVulnColor(data?.vulnerability, data?.capital),
                            color: "#ffffff",
                            weight: 0.2,
                            opacity: 0.5,
                            fillOpacity: 0.8
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const data = newMapping[feature.properties?.adm2_pcode];
                        const name = feature.properties?.adm2_name;
                        const wilaya = feature.properties?.adm1_name;

                        const popupContent = `
                            <div class="p-4 min-w-[220px] bg-slate-900 text-white rounded-lg">
                                <div class="font-black border-b border-white/10 pb-2 mb-3 text-emerald-400 uppercase tracking-tighter">${name}</div>
                                <div class="space-y-3 text-xs">
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-500 font-bold">PROVINCE:</span>
                                        <span class="font-bold text-slate-300">${wilaya}</span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-500 font-bold">RISK ZONE:</span>
                                        <span class="px-2 py-0.5 rounded bg-white/5 font-black" style="color: ${getRiskColor(data?.risk)}">
                                            ZONE ${data?.risk || '0'}
                                        </span>
                                    </div>
                                    <div class="flex justify-between items-center">
                                        <span class="text-slate-500 font-bold">PORTFOLIO:</span>
                                        <span class="font-black ${data?.capital > 0 ? 'text-blue-400' : 'text-slate-600'}">
                                            ${formatMillion(data?.capital)} DZD
                                        </span>
                                    </div>
                                    ${data?.capital > 0 ? `
                                    <div class="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 mt-4">
                                        <div class="flex justify-between items-center">
                                            <span class="text-emerald-400 font-black text-[10px]">EXPOSURE INDEX:</span>
                                            <span class="font-black text-emerald-300 text-sm">${formatMillion(data?.vulnerability)} DZD</span>
                                        </div>
                                    </div>
                                    ` : `
                                    <div class="bg-slate-800/50 p-2 rounded-xl border border-white/5 mt-4 text-center">
                                        <span class="text-slate-500 font-bold text-[10px]">NO ACTIVE POLICIES IN THIS SECTOR</span>
                                    </div>
                                    `}
                                </div>
                            </div>
                        `;
                        layer.bindPopup(popupContent, { className: 'custom-popup', maxWidth: 300 });
                        layer.on('mouseover', (e) => {
                            e.target.setStyle({ weight: 1.5, fillOpacity: 1, color: '#10b981' });
                            e.target.bringToFront();
                        });
                        layer.on('mouseout', (e) => {
                            e.target.setStyle({ weight: 0.2, fillOpacity: 0.8, color: '#ffffff' });
                        });
                    }
                }).addTo(mapInstanceRef.current);
            }
        });
    }, [viewMode]);

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden text-white font-sans">
            <header className="h-20 bg-slate-900/90 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center px-10 z-50">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(16,185,129,0.15)]">🌍</div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Risk<span className="text-emerald-500">Core</span></h1>
                        <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase mt-1">Strategic Exposure Matrix</p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <Link to="/prediction" className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-6 py-2 rounded-xl text-[10px] font-black transition-all border border-blue-500/30 flex items-center gap-3 group">
                        <span className="group-hover:rotate-12 transition-transform">🔮</span>
                        RUN PREDICTION
                    </Link>
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 relative shadow-2xl backdrop-blur-xl">
                        <button
                            onClick={() => setViewMode('risk')}
                            className={`px-8 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all z-10 ${viewMode === 'risk' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            GEOGRAPHIC RISK
                        </button>
                        <button
                            onClick={() => setViewMode('vulnerability')}
                            className={`px-8 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all z-10 ${viewMode === 'vulnerability' ? 'text-white' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                            EXPOSURE INDEX
                        </button>
                        <div
                            className="absolute bg-emerald-600 top-1.5 bottom-1.5 rounded-xl transition-all duration-500 ease-out shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                            style={{
                                width: 'calc(50% - 6px)',
                                left: viewMode === 'risk' ? '6px' : 'calc(50%)'
                            }}
                        ></div>
                    </div>

                    <div className="flex gap-4">
                        <Link to="/" className="w-10 h-10 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-slate-400 hover:text-white">🏠</Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 relative bg-slate-950">
                {!isLoaded && (
                    <div className="absolute inset-0 z-2000 bg-black flex flex-col items-center justify-center gap-8">
                        <div className="relative">
                            <div className="w-32 h-32 border-[6px] border-emerald-500/5 rounded-full"></div>
                            <div className="w-32 h-32 border-[6px] border-emerald-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_40px_rgba(16,185,129,0.2)]"></div>
                        </div>
                        <div className="text-center">
                            <div className="text-emerald-500 font-black text-sm tracking-[0.5em] mb-2 uppercase">Syncing Node Mesh</div>
                            <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Validating 1,541 Communes...</div>
                        </div>
                    </div>
                )}
                <div id="map" ref={mapRef} className="absolute inset-0 z-0 grayscale-[0.2] brightness-[0.8]"></div>

                <div className="absolute bottom-12 right-12 z-1000 bg-slate-900/80 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl w-80">
                    <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 italic">Spectral Data</h4>
                        <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 animate-pulse">LIVE</div>
                    </div>

                    <div className="space-y-4">
                        {(viewMode === 'risk' ? [
                            { l: 'Critical / Zone 4', c: '#ef4444', v: 'Severe' },
                            { l: 'Major / Zone 3', c: '#f97316', v: 'High' },
                            { l: 'Moderate / Zone 2', c: '#eab308', v: 'Med' },
                            { l: 'Minor / Zone 1', c: '#3b82f6', v: 'Low' },
                            { l: 'Baseline / Zone 0', c: '#10b981', v: 'Safe' }
                        ] : [
                            { l: 'Ultra High', c: '#ef4444', v: '> 200M' },
                            { l: 'Elevated', c: '#f97316', v: '50-200M' },
                            { l: 'Nominal', c: '#eab308', v: '10-50M' },
                            { l: 'Minimal', c: '#3b82f6', v: '< 10M' },
                            { l: 'No Exposure', c: '#10b981', v: '0.0' }
                        ]).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-1 h-6 rounded-full transition-all group-hover:w-3" style={{ backgroundColor: item.c }}></div>
                                    <span className="text-[11px] font-black text-slate-400 group-hover:text-white transition-colors">{item.l}</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-600 font-mono italic">{item.v}</span>
                            </div>
                        ))}

                        {viewMode === 'vulnerability' && (
                            <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-1 h-6 rounded-full bg-[#334155] group-hover:w-3 transition-all"></div>
                                    <span className="text-[11px] font-black text-slate-500 group-hover:text-slate-300 transition-colors uppercase italic">No Active Policies</span>
                                </div>
                                <span className="text-[9px] font-black text-slate-600 font-mono uppercase">Inactive</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8">
                        <div className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed border-l-2 border-emerald-500/30 pl-3">
                            {viewMode === 'risk'
                                ? "Displaying raw seismic zoning covering ALL administrative territories."
                                : "Displaying portfolio concentration: Areas with no policies are marked neutral."}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MapPage;
