import React, { useState, useEffect } from 'react';

const Simulation = () => {
    const [formData, setFormData] = useState({
        wilaya: '',
        commune: '',
        capital: '100000000',
        risk_level: '0.2',
        seismic_zone: '2'
    });

    const [wilayas, setWilayas] = useState([]);
    const [communes, setCommunes] = useState([]);
    const [allData, setAllData] = useState([]);
    const [results, setResults] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

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
                        risk_level: parseFloat(cols[5]) || 0.1,
                        capital: parseFloat(cols[6]) || 0
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

            const communeData = allData.find(d => d.wilaya === formData.wilaya && d.commune === formData.commune);
            if (communeData) {
                const zone = communeData.risk_level >= 4 ? '3' : communeData.risk_level >= 2 ? '2' : '1';
                const riskVal = communeData.risk_level === 0.5 ? 0.05 : communeData.risk_level * 0.1;
                setFormData(prev => ({
                    ...prev,
                    seismic_zone: zone,
                    risk_level: riskVal.toString(),
                    capital: communeData.capital > 0 ? communeData.capital.toString() : prev.capital
                }));
            }
        }
    }, [formData.wilaya, formData.commune, allData]);

    const runSimulation = async () => {
        setIsSimulating(true);
        try {
            const payload = {
                wilaya: formData.wilaya,
                commune: formData.commune,
                risk_type: 'Bien immobilier',
                capital_assure: parseFloat(formData.capital),
                risk_level: parseFloat(formData.risk_level),
                nb_floors: 1, // Standard for simulation
                height_m: 3.5,
                seismic_zone: parseInt(formData.seismic_zone),
            };

            const response = await fetch('http://localhost:8000/simulate_monte_carlo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Simulation failed');
            const data = await response.json();
            setResults(data);
        } catch (error) {
            console.error("Simulation error:", error);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-slate-300 font-sans">
            <header className="h-40 bg-linear-to-b from-blue-600/20 to-transparent border-b border-white/5 flex flex-col items-center justify-center text-center p-8">
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                    Monte Carlo <span className="text-blue-500">Loss Engine</span>
                </h1>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-[0.3em]">10,000 Iterations Lognormal Seismic Simulator</p>
            </header>

            <main className="max-w-6xl mx-auto py-12 px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* CONFIGURATION */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-md">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                            Parameter Matrix
                        </h3>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Context Location</label>
                                <select
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                    value={formData.wilaya}
                                    onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })}
                                >
                                    <option value="">Select Wilaya</option>
                                    {wilayas.map(w => <option key={w} value={w}>{w}</option>)}
                                </select>
                                <select
                                    disabled={!formData.wilaya}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 mt-2"
                                    value={formData.commune}
                                    onChange={(e) => setFormData({ ...formData, commune: e.target.value })}
                                >
                                    <option value="">Select Commune</option>
                                    {communes.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Exposure Capital (DZD)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                                    value={formData.capital}
                                    onChange={(e) => setFormData({ ...formData, capital: e.target.value })}
                                />
                            </div>

                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Detected Zone</p>
                                <p className="text-xl font-black text-white">Zone {formData.seismic_zone}</p>
                            </div>

                            <button
                                onClick={runSimulation}
                                disabled={isSimulating || !formData.commune}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-30"
                            >
                                {isSimulating ? 'SIMULATING...' : 'RUN MONTE CARLO'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RESULTS */}
                <div className="lg:col-span-8">
                    {!results ? (
                        <div className="h-full bg-white/5 border border-white/5 border-dashed rounded-[2rem] flex flex-col items-center justify-center p-12 text-center grayscale opacity-30">
                            <span className="text-7xl mb-6">🎲</span>
                            <h3 className="text-xl font-black text-white uppercase">Engine Standby</h3>
                            <p className="text-slate-400 max-w-xs mt-2 text-sm">Select a municipality and define exposure capital to start the stochastic loss analysis.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-slate-900 border border-white/5 p-8 rounded-[2rem] shadow-2xl">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Mean Expected Loss</p>
                                    <div className="text-4xl font-black text-white tracking-tighter">
                                        {results.Expected_Loss.toLocaleString()} <span className="text-sm font-normal text-slate-500">DZD</span>
                                    </div>
                                    <div className="mt-6 flex items-center gap-2">
                                        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: '25%' }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-blue-400">NORMALIZED</span>
                                    </div>
                                </div>
                                <div className="bg-linear-to-br from-red-600 to-red-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-red-200 uppercase tracking-widest mb-4">PML 95% (Extreme Scenario)</p>
                                        <div className="text-4xl font-black text-white tracking-tighter">
                                            {results.PML_95.toLocaleString()} <span className="text-sm font-normal text-red-300">DZD</span>
                                        </div>
                                    </div>
                                    <span className="absolute -right-4 -bottom-4 text-7xl opacity-10 pointer-events-none">⚠️</span>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
                                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                    Simulation Statistics (n=10k)
                                </h4>
                                <div className="grid grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">PML 99%</p>
                                        <p className="text-lg font-black text-white">{results.PML_99.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Absolute Max Loss</p>
                                        <p className="text-lg font-black text-white">{results.Max_Loss.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Recurrence Interval</p>
                                        <p className="text-lg font-black text-white">475-2475 Years</p>
                                    </div>
                                </div>

                                <div className="mt-12 p-6 bg-black/40 border border-white/10 rounded-2xl">
                                    <p className="text-[10px] italic text-slate-400 leading-relaxed font-medium">
                                        Analytics Note: This simulation uses a lognormal distribution calibrated for Algerian seismic zones.
                                        {results.Note}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default Simulation;
