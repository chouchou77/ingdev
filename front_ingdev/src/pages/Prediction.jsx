import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Prediction = () => {
    const [formData, setFormData] = useState({
        wilaya: '',
        commune: '',
        buildingType: 'residential',
        floors: '',
        height: '',
        capital: ''
    });

    const [wilayas, setWilayas] = useState([]);
    const [communes, setCommunes] = useState([]);
    const [allData, setAllData] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);

    const wilayaIdNames = {
        1: 'Adrar', 2: 'Chlef', 3: 'Laghouat', 4: 'Oum El Bouaghi', 5: 'Batna',
        6: 'Bejaia', 7: 'Biskra', 8: 'Bechar', 9: 'Blida', 10: 'Bouira',
        11: 'Tamanrasset', 12: 'Tebessa', 13: 'Tlemcen', 14: 'Tiaret', 15: 'Tizi Ouzou',
        16: 'Alger', 17: 'Djelfa', 18: 'Jijel', 19: 'Setif', 20: 'Saida',
        21: 'Skikda', 22: 'Sidi Bel Abbes', 23: 'Annaba', 24: 'Guelma', 25: 'Constantine',
        26: 'Medea', 27: 'Mostaganem', 28: 'M\'sila', 29: 'Mascara', 30: 'Ouargla',
        31: 'Oran', 32: 'El Bayadh', 33: 'Illizi', 34: 'Bordj Bou Arreridj', 35: 'Boumerdes',
        36: 'El Tarf', 37: 'Tindouf', 38: 'Tissemsilt', 39: 'El Oued', 40: 'Khenchela',
        41: 'Souk Ahras', 42: 'Tipaza', 43: 'Mila', 44: 'Ain Defla', 45: 'Naama',
        46: 'Ain Temouchent', 47: 'Ghardaia', 48: 'Relizane'
    };

    useEffect(() => {
        fetch('/merged_willaya_data.csv')
            .then(r => r.text())
            .then(text => {
                const rows = text.split('\n').filter(line => line.trim() !== '').slice(1);
                const data = rows.map(row => {
                    const cols = row.split(',');
                    const wId = parseInt(cols[1]);
                    return {
                        w_id: wId,
                        wilaya: wilayaIdNames[wId] || `Wilaya ${wId}`,
                        commune: cols[3],
                        risk_level: parseFloat(cols[5]) || 0.1
                    };
                });
                setAllData(data);

                const uniqueWilayas = [...new Set(data.map(d => d.wilaya))].sort();
                setWilayas(uniqueWilayas);
            });
    }, []);

    useEffect(() => {
        if (formData.wilaya) {
            const filtered = allData
                .filter(d => d.wilaya === formData.wilaya)
                .map(d => d.commune)
                .sort();
            setCommunes(filtered);
        } else {
            setCommunes([]);
        }
    }, [formData.wilaya, allData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResult(null);

        // Find the risk level for the selected commune
        const communeData = allData.find(d => d.wilaya === formData.wilaya && d.commune === formData.commune);
        // Map 1-4 to 0.1-0.4 risk level
        const mappedRisk = communeData ? (communeData.risk_level === 0.5 ? 0.05 : communeData.risk_level * 0.1) : 0.2;

        const payload = {
            wilaya: formData.wilaya,
            commune: formData.commune,
            risk_type: formData.buildingType === 'residential' ? 'Bien immobilier' :
                formData.buildingType === 'industrial' ? 'Installation Industrielle' : 'Commercial',
            capital_assure: parseFloat(formData.capital),
            risk_level: mappedRisk,
            nb_floors: parseInt(formData.floors),
            height_m: parseFloat(formData.height)
        };

        try {
            const response = await fetch('http://localhost:8000/analyze_risk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();

            setResult({
                status: 'Success',
                score: data.ai_prediction.risk_index,
                decision: data.ai_prediction.decision,
                color: data.ai_prediction.color,
                rpa: data.rpa_validation,
                monteCarlo: data.monte_carlo_simulation,
                recommendation: data.final_recommendation
            });
            setIsSubmitting(false);
        } catch (error) {
            console.error("Prediction failed:", error);
            setIsSubmitting(false);
            alert("فشل في الاتصال بسيرفر التحليلات. تأكد من تشغيل backend/main.py");
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-emerald-500/30">
            <header className="h-20 border-b border-white/5 bg-black/20 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl">🔮</div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight uppercase">Risk<span className="text-emerald-500">Forecaster</span></h1>
                        <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">Advanced Prediction Engine</p>
                    </div>
                </div>
                <Link to="/map" className="bg-slate-800/50 hover:bg-slate-700/50 px-6 py-2.5 rounded-xl text-xs font-black transition-all border border-white/5 text-slate-100 flex items-center gap-2">
                    ⬅ BACK TO MAP
                </Link>
            </header>

            <main className="max-w-4xl mx-auto py-16 px-6">
                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        <div className="p-12 bg-linear-to-br from-slate-900 to-black border-r border-white/5">
                            <h2 className="text-3xl font-black text-white mb-6 leading-tight">Predict Asset <br /><span className="text-emerald-500 font-normal italic">Vulnerability</span></h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                                Input the asset parameters to calculate its seismic performance score and potential financial exposure index.
                            </p>

                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-emerald-400">01</div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase mb-1">Geographic Context</p>
                                        <p className="text-slate-500 text-[11px]">Region-specific hazard coefficients.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-emerald-400">02</div>
                                    <div>
                                        <p className="text-xs font-black text-white uppercase mb-1">Structural Inputs</p>
                                        <p className="text-slate-500 text-[11px]">Physical building attributes.</p>
                                    </div>
                                </div>
                            </div>

                            {result && (
                                <div className="mt-12 p-8 rounded-4xl bg-slate-800/40 border border-white/10 animate-in zoom-in duration-500">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">Detailed Assessment Result</p>

                                    <div className="grid grid-cols-1 gap-6">
                                        {/* Main Score & Decision */}
                                        <div className="flex justify-between items-start border-b border-white/5 pb-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 text-white font-bold text-sm">
                                                    <span className="text-emerald-500">📍</span> {formData.wilaya} / {formData.commune}
                                                </div>
                                                <div className="text-4xl font-black" style={{ color: result.color }}>
                                                    {result.decision}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-black text-white">{result.score}</div>
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">AI Risk Index</div>
                                            </div>
                                        </div>

                                        {/* RPA & Simulation Data */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">RPA Compliance</p>
                                                <div className={`text-xs font-bold ${result.rpa.compliant ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {result.rpa.compliant ? '✓ COMPLIANT' : '✗ NON-COMPLIANT'}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">Limits: {result.rpa.zone_limit_floors} floors / {result.rpa.zone_limit_height}m</p>
                                            </div>
                                            <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Simulated Loss (Avg)</p>
                                                <div className="text-xs font-bold text-white">
                                                    {result.monteCarlo.average_simulated_loss.toLocaleString()} DZD
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1">Extreme (95%): {result.monteCarlo.extreme_scenario_95.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Recommendation */}
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">Recommendation</p>
                                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                                {result.recommendation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-12">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Wilaya (Province)</label>
                                    <select
                                        required
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                                        value={formData.wilaya}
                                        onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                                    >
                                        <option value="">Select Wilaya</option>
                                        {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commune (Municipality)</label>
                                    <select
                                        required
                                        disabled={!formData.wilaya}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none disabled:opacity-30 disabled:cursor-not-allowed"
                                        value={formData.commune}
                                        onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                                    >
                                        <option value="">Select Commune</option>
                                        {communes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Building Type</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                                        value={formData.buildingType}
                                        onChange={(e) => setFormData({ ...formData, buildingType: e.target.value })}
                                    >
                                        <option value="residential">Residential Unit</option>
                                        <option value="industrial">Industrial Complex</option>
                                        <option value="office">Office / Commercial</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Floors</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                            value={formData.floors}
                                            onChange={(e) => setFormData({ ...formData, floors: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Height (m)</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                                            value={formData.height}
                                            onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pb-6">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Credit Capital (DZD)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
                                        value={formData.capital}
                                        onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] disabled:bg-slate-800"
                                >
                                    {isSubmitting ? 'PROCESSING...' : 'RUN PREDICTION'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Prediction;
