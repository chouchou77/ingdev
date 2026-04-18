import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapPage = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const geoJsonLayerRef = useRef(null);
    const layerMappingRef = useRef({});

    // States
    const [geoData, setGeoData] = useState(null);
    const [riskMapping, setRiskMapping] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);
    const [viewMode, setViewMode] = useState('risk');
    const [mapSearchTerm, setMapSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Data Constants
    const wilayaIdNames = {
        1: 'ADRAR', 2: 'CHLEF', 3: 'LAGHOUAT', 4: 'OUMBOUAGHI', 5: 'BATNA',
        6: 'BEJAIA', 7: 'BISKRA', 8: 'BECHAR', 9: 'BLIDA', 10: 'BOUIRA',
        11: 'TAMNGHASSET', 12: 'TEBESSA', 13: 'TLEMCEN', 14: 'TIARET', 15: 'TIZIOUZOU',
        16: 'ALGER', 17: 'DJELFA', 18: 'JIJEL', 19: 'SETIF', 20: 'SAIDA',
        21: 'SKIKDA', 22: 'SIDIBELABBES', 23: 'ANNABA', 24: 'GUELMA', 25: 'CONSTANTINE',
        26: 'MEDEA', 27: 'MOSTAGANEM', 28: 'MSILA', 29: 'MASCARA', 30: 'OUARGLA',
        31: 'ORAN', 32: 'ELBAYADH', 33: 'ILLIZI', 34: 'BORDJBOUARRERIDJ', 35: 'BOUMERDES',
        36: 'ELTARF', 37: 'TINDOUF', 38: 'TISSEMSSILT', 39: 'ELOUED', 40: 'KHENCHELA',
        41: 'SOUKAHRAS', 42: 'TIPAZA', 43: 'MILA', 44: 'AINDEFLA', 45: 'NAAMA',
        46: 'AINTEMOUCHENT', 47: 'GHARDAIA', 48: 'RELIZANE'
    };

    const communeManualOverrides = {
        'BAINSROMAINS': 'HAMMAMET',
        'BOLOGHINEIBNZIRI': 'BOLOGHINE',
        'KHRAISSIA': 'KHRAICIA',
        'TALKHEMT': 'TALAKHAMET',
        'TICHI': 'TICHY',
        'SOUKELHAD': 'SOUK EL HAD',
        'OUELLAL': 'OUALEL',
        'IGHRAM': 'IGHREM',
        'KHANGATSIDINADJI': 'KHENGUET SIDI NADJI',
    };

    const riskToVulnFactor = { 0.5: 0, 1: 0.12, 2: 0.20, 3: 0.25, 4: 0.3 };

    // Helper functions
    const normalize = (str) => {
        if (!str) return "";
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[- '’]/g, "")
            .toUpperCase();
    };

    const getRiskColor = (risk) => {
        if (risk === undefined || risk === null) return '#334155';
        if (risk <= 0.5) return '#10b981';
        if (risk <= 1.0) return '#3b82f6';
        if (risk <= 2.0) return '#eab308';
        if (risk <= 3.0) return '#f97316';
        return '#ef4444';
    };

    const getVulnColor = (vuln, capital) => {
        if (!capital || capital <= 0) return '#334155';
        if (vuln === undefined || vuln === null) return '#1e293b';
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

    // 1. Data Fetching Effect
    useEffect(() => {
        const wilayaNameToId = {};
        Object.entries(wilayaIdNames).forEach(([id, name]) => {
            wilayaNameToId[name] = parseInt(id);
        });

        Promise.all([
            fetch('/merged_willaya_data.csv').then(r => r.text()),
            fetch('/dza_admin2.geojson').then(r => r.json())
        ]).then(([csvText, geoJson]) => {
            const csvRows = csvText.split('\n').filter(l => l.trim() !== '').slice(1).map(line => {
                const cols = line.split(',');
                return {
                    wilayaId: parseInt(cols[1]),
                    communeName: cols[3]?.trim(),
                    risk: parseFloat(cols[5]),
                    capital: parseFloat(cols[6] || 0)
                };
            });

            const newMapping = {};
            geoJson.features.forEach(feature => {
                const props = feature.properties;
                const nomWilaya = normalize(props.adm1_name);
                const rawCommune = props.adm2_name;
                const nomCommune = normalize(rawCommune);
                const wId = wilayaNameToId[nomWilaya];

                if (!wId) return;

                const wilayaCommunes = csvRows.filter(r => r.wilayaId === wId);

                // --- Robust Matching Algorithm ---
                // 1. Exact Match
                let match = wilayaCommunes.find(item => normalize(item.communeName) === nomCommune);

                // 2. Manual Override Match
                if (!match) {
                    const overrideName = communeManualOverrides[nomCommune];
                    if (overrideName) {
                        match = wilayaCommunes.find(item => normalize(item.communeName) === normalize(overrideName));
                    }
                }

                // 3. Special case for Batna/Tlemcen typo
                if (!match && wId === 5 && nomCommune === 'TLEMCEN') {
                    match = wilayaCommunes.find(item => normalize(item.communeName) === 'TAXLENT');
                }

                // 4. Prefix-omitting Match (Standardize "EL", "AL", etc.)
                if (!match) {
                    const clean = (s) => s.replace(/^(EL|AL|LE|LA|L)/, "");
                    const cleanNom = clean(nomCommune);
                    match = wilayaCommunes.find(item => clean(normalize(item.communeName)) === cleanNom);
                }

                // 5. Fuzzy "Contains" Match (minimum 4 chars to avoid false positives)
                if (!match && nomCommune.length > 4) {
                    match = wilayaCommunes.find(item => {
                        const nItem = normalize(item.communeName);
                        return nItem.length > 4 && (nItem.includes(nomCommune) || nomCommune.includes(nItem));
                    });
                }

                // 6. Global Fallback (Last resort: same name in any wilaya)
                if (!match) {
                    match = csvRows.find(item => normalize(item.communeName) === nomCommune);
                }

                if (match) {
                    newMapping[props.adm2_pcode] = {
                        ...match,
                        geoName: props.adm2_name,
                        vulnerability: match.capital * (riskToVulnFactor[match.risk] || 0)
                    };
                } else {
                    // Default safe values so it's not "empty" on the map
                    newMapping[props.adm2_pcode] = {
                        wilayaId: wId,
                        communeName: rawCommune,
                        risk: null, // Clearly distinguish from Zone 0
                        capital: 0,
                        geoName: rawCommune,
                        vulnerability: 0
                    };
                }
            });

            setRiskMapping(newMapping);
            setGeoData(geoJson);
            setIsLoaded(true);
        });
    }, []);

    // 2. Map Rendering Effect
    useEffect(() => {
        if (!geoData) return;

        if (mapRef.current && !mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: false
            }).setView([34.0339, 3.6596], 6);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; CartoDB'
            }).addTo(mapInstanceRef.current);

            L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);
        }

        if (mapInstanceRef.current) {
            if (geoJsonLayerRef.current) mapInstanceRef.current.removeLayer(geoJsonLayerRef.current);

            geoJsonLayerRef.current = L.geoJSON(geoData, {
                style: (feature) => {
                    const data = riskMapping[feature.properties?.adm2_pcode];
                    return {
                        fillColor: viewMode === 'risk'
                            ? getRiskColor(data?.risk)
                            : getVulnColor(data?.vulnerability, data?.capital),
                        color: "#ffffff",
                        weight: 0.1,
                        opacity: 0.3,
                        fillOpacity: 0.8
                    };
                },
                onEachFeature: (feature, layer) => {
                    const pcode = feature.properties?.adm2_pcode;
                    const data = riskMapping[pcode];
                    const name = feature.properties?.adm2_name;
                    const wilaya = feature.properties?.adm1_name;

                    if (pcode) {
                        layerMappingRef.current[pcode] = layer;
                    }

                    const popupContent = `
                        <div style="padding: 12px; min-width: 200px; font-family: sans-serif;">
                            <b style="color: #10b981; font-size: 14px; text-transform: uppercase;">${name}</b><br/>
                            <small style="color: #94a3b8;">WILAYA: ${wilaya}</small>
                            <hr style="border: none; border-top: 1px solid #334155; margin: 8px 0;"/>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                                <span style="color: #94a3b8;">ZONE RISQUE:</span>
                                <b style="color: ${getRiskColor(data?.risk)}">ZONE ${data?.risk || '0'}</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
                                <span style="color: #94a3b8;">VALEUR ASSURÉE:</span>
                                <b style="color: #3b82f6;">${formatMillion(data?.capital)} DZD</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #334155;">
                                <span style="color: #94a3b8;">EXPOSITION:</span>
                                <b style="color: #10b981;">${formatMillion(data?.vulnerability)} DZD</b>
                            </div>
                        </div>
                    `;
                    layer.bindPopup(popupContent, { className: 'custom-popup' });

                    layer.on('mouseover', (e) => {
                        e.target.setStyle({ weight: 1.5, fillOpacity: 0.9, color: '#10b981' });
                        e.target.bringToFront();
                    });
                    layer.on('mouseout', (e) => {
                        e.target.setStyle({ weight: 0.1, fillOpacity: 0.8, color: '#ffffff' });
                    });
                }
            }).addTo(mapInstanceRef.current);
        }
    }, [geoData, riskMapping, viewMode]);

    const handleSearch = (e) => {
        const val = e.target.value;
        setMapSearchTerm(val);
        if (val.length > 1) {
            const matches = Object.entries(riskMapping)
                .filter(([pcode, data]) => data.geoName.toLowerCase().includes(val.toLowerCase()))
                .slice(0, 10)
                .map(([pcode, data]) => ({ pcode, ...data }));
            setSearchResults(matches);
        } else {
            setSearchResults([]);
        }
    };

    const zoomToCommune = (pcode) => {
        const layer = layerMappingRef.current[pcode];
        if (layer && mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 12 });
            layer.openPopup();
        }
        setMapSearchTerm('');
        setSearchResults([]);
    };

    return (
        <div className="flex flex-col h-screen bg-black overflow-hidden text-white font-sans">
            <header className="h-20 bg-slate-900/90 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center px-10 z-[1000] fixed w-full">
                <div className="flex items-center gap-8">
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 relative shadow-2xl backdrop-blur-xl">
                        <button
                            onClick={() => setViewMode('risk')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-500 flex items-center gap-3 ${viewMode === 'risk' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${viewMode === 'risk' ? 'bg-white animate-pulse' : 'bg-slate-600'}`}></span>
                            RISQUE SÉISMIQUE
                        </button>
                        <button
                            onClick={() => setViewMode('vuln')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all duration-500 flex items-center gap-3 ${viewMode === 'vuln' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${viewMode === 'vuln' ? 'bg-white animate-pulse' : 'bg-slate-600'}`}></span>
                            INDICE VULNÉRABILITÉ
                        </button>
                    </div>
                </div>

                <div className="relative w-96 group">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-2xl group-hover:bg-emerald-500/30 transition-all duration-700 opacity-0 group-hover:opacity-100"></div>
                    <div className="relative bg-black/40 border border-white/10 rounded-2xl flex items-center px-5 h-12 group-hover:border-emerald-500/50 transition-all duration-500 backdrop-blur-3xl shadow-inner">
                        <input
                            type="text"
                            placeholder="Rechercher une commune..."
                            value={mapSearchTerm}
                            onChange={handleSearch}
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-600 font-medium"
                        />
                        <svg className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 transition-colors duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {searchResults.length > 0 && (
                        <div className="absolute top-14 left-0 w-full bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden py-3 animate-in fade-in slide-in-from-top-4 duration-500 z-[1001]">
                            {searchResults.map((res) => (
                                <button
                                    key={res.pcode}
                                    onClick={() => zoomToCommune(res.pcode)}
                                    className="w-full px-6 py-3.5 hover:bg-emerald-500/10 flex flex-col items-start transition-all duration-300 border-l-4 border-transparent hover:border-emerald-500"
                                >
                                    <span className="font-black text-sm uppercase tracking-tighter">{res.geoName}</span>
                                    <span className="text-[10px] text-slate-500 font-bold mt-1">WILAYA ${res.wilayaId} • ZONE ${res.risk}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="flex-1 relative flex">
                <div ref={mapRef} className="absolute inset-0 z-0 bg-slate-950" />

                {/* Legend Overlay */}
                <div className="absolute bottom-10 left-10 z-50 pointer-events-none">
                    <div className="bg-slate-900/90 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl space-y-5">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Légende Interactive</span>
                            <h3 className="text-sm font-black text-white">{viewMode === 'risk' ? 'Zones Sismiques (RPA)' : 'Exposition Capital'}</h3>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: viewMode === 'risk' ? 'Zone 3 (Haut)' : '> 200M DZD', color: '#ef4444' },
                                { label: viewMode === 'risk' ? 'Zone 2b' : '50M - 200M', color: '#f97316' },
                                { label: viewMode === 'risk' ? 'Zone 2a' : '10M - 50M', color: '#eab308' },
                                { label: viewMode === 'risk' ? 'Zone 1' : '< 10M DZD', color: '#3b82f6' },
                                { label: viewMode === 'risk' ? 'Zone 0 (Nul)' : 'Exposition Nulle', color: '#10b981' },
                                { label: 'Données non disponibles', color: '#334155' }
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-lg shadow-inner ring-1 ring-white/10" style={{ backgroundColor: item.color }}></div>
                                    <span className="text-[11px] font-bold text-slate-300">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {!isLoaded && (
                    <div className="absolute inset-0 z-[2000] bg-black flex items-center justify-center">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-sm font-black tracking-widest text-emerald-500 uppercase animate-pulse">Initialisation du Moteur Cartographique</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Synchronisation des données géospatiales...</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MapPage;
