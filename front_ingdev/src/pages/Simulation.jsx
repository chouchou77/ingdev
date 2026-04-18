import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

const Simulation = () => {
    const [selectedMunicipalityId, setSelectedMunicipalityId] = useState('');
    const [lossPercentage, setLossPercentage] = useState(10);

    // Mock data for municipalities
    const municipalities = useMemo(() => [
        { id: 1, name: 'Algiers (Centre)', province: 'Algiers', zone: 'III', capitalAtRisk: 12.5 },
        { id: 2, name: 'Bab El Oued', province: 'Algiers', zone: 'III', capitalAtRisk: 8.2 },
        { id: 3, name: 'Bouzareah', province: 'Algiers', zone: 'III', capitalAtRisk: 6.8 },
        { id: 4, name: 'Cheraga', province: 'Algiers', zone: 'III', capitalAtRisk: 13.0 },
        { id: 5, name: 'Tipaza (City)', province: 'Tipaza', zone: 'III', capitalAtRisk: 8.1 },
        { id: 6, name: 'Blida (City)', province: 'Blida', zone: 'IIb', capitalAtRisk: 6.5 },
        { id: 7, name: 'Boumerdes (City)', province: 'Boumerdes', zone: 'IIb', capitalAtRisk: 7.4 },
        { id: 8, name: 'Bejaia (City)', province: 'Bejaia', zone: 'IIa', capitalAtRisk: 5.0 },
        { id: 9, name: 'Constantine (City)', province: 'Constantine', zone: 'IIa', capitalAtRisk: 9.5 },
        { id: 10, name: 'Oran (Centre)', province: 'Oran', zone: '0', capitalAtRisk: 4.2 },
        { id: 11, name: 'Annaba (Centre)', province: 'Annaba', zone: 'IIa', capitalAtRisk: 5.8 },
        { id: 12, name: 'Tlemcen (City)', province: 'Tlemcen', zone: 'I', capitalAtRisk: 3.5 },
        { id: 13, name: 'Adrar (Centre)', province: 'Adrar', zone: '0', capitalAtRisk: 1.7 },
    ], []);

    const selectedMunicipality = municipalities.find(m => m.id === parseInt(selectedMunicipalityId));

    const calculation = useMemo(() => {
        if (!selectedMunicipality) return null;
        const estimatedLoss = (selectedMunicipality.capitalAtRisk * lossPercentage) / 100;
        return {
            total: selectedMunicipality.capitalAtRisk,
            loss: estimatedLoss,
            remaining: selectedMunicipality.capitalAtRisk - estimatedLoss
        };
    }, [selectedMunicipality, lossPercentage]);

    const getZoneSeverity = (zone) => {
        switch (zone) {
            case 'III': return { label: 'High Risk (Zone III)', color: 'text-red-600', bg: 'bg-red-50' };
            case 'IIb': return { label: 'Medium-High Risk (Zone IIb)', color: 'text-orange-600', bg: 'bg-orange-50' };
            case 'IIa': return { label: 'Medium Risk (Zone IIa)', color: 'text-yellow-600', bg: 'bg-yellow-50' };
            default: return { label: 'Low Risk', color: 'text-green-600', bg: 'bg-green-50' };
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
            {/* HEADER */}
            <header className="bg-slate-900 text-white p-6 shadow-xl mb-8">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📊</span>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold">Loss Simulation Engine</h1>
                            <p className="text-slate-400 text-sm italic">Simulate seismic impact and financial exposure</p>
                        </div>
                    </div>
                    <Link to="/" className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm transition-all border border-slate-700 flex items-center gap-2">
                        🏠 Exit Simulator
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* INPUTS COLUMN */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800">
                            ⚙️ Configuration
                        </h3>

                        <div className="space-y-6">
                            {/* Municipality Select */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Select Municipality</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                    value={selectedMunicipalityId}
                                    onChange={(e) => setSelectedMunicipalityId(e.target.value)}
                                >
                                    <option value="">-- Search Municipality --</option>
                                    {municipalities.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.province})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Loss Percentage Slider */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-semibold text-slate-600">Simulated Loss (%)</label>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg text-xs font-bold">{lossPercentage}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    step="1"
                                    value={lossPercentage}
                                    onChange={(e) => setLossPercentage(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                                <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                    <span>Minor</span>
                                    <span>Catastrophic</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-900 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/20 relative overflow-hidden group">
                        <div className="relative z-10">
                            <h4 className="font-bold mb-2">Calculation Logic</h4>
                            <p className="text-xs text-blue-100 leading-relaxed italic">
                                Loss is calculated based on the total capital at risk accumulated in the selected municipality's administrative boundaries.
                            </p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 text-white opacity-5 group-hover:opacity-10 transition-opacity">
                            <span className="text-8xl">📉</span>
                        </div>
                    </div>
                </div>

                {/* RESULTS COLUMN */}
                <div className="lg:col-span-2">
                    {!selectedMunicipality ? (
                        <div className="h-full flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-50">
                                📉
                            </div>
                            <h3 className="font-bold text-slate-600">No Municipality Selected</h3>
                            <p className="text-slate-400 text-sm max-w-xs mx-auto">Please select a municipality from the configuration panel to run the earthquake simulation.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Municipality Header */}
                            <div className={`p-6 rounded-3xl border border-slate-100 shadow-sm ${getZoneSeverity(selectedMunicipality.zone).bg}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-800">{selectedMunicipality.name}</h2>
                                        <p className="text-slate-500">{selectedMunicipality.province} Province</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${getZoneSeverity(selectedMunicipality.zone).color} border border-current`}>
                                        {getZoneSeverity(selectedMunicipality.zone).label}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Total Exposure</span>
                                    <div className="text-2xl font-black text-slate-800">{calculation.total.toFixed(2)} <span className="text-sm font-normal text-slate-500">Billion DZD</span></div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform"></div>
                                    <span className="text-xs font-bold text-red-500 uppercase block mb-1">Estimated Loss</span>
                                    <div className="text-2xl font-black text-red-600">{calculation.loss.toFixed(2)} <span className="text-sm font-normal text-slate-500">Billion DZD</span></div>
                                </div>
                                <div className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-600/20 text-white">
                                    <span className="text-xs font-bold text-emerald-100 uppercase block mb-1">Net Remaining Capital</span>
                                    <div className="text-2xl font-black">{calculation.remaining.toFixed(2)} <span className="text-sm font-normal text-emerald-200">Billion DZD</span></div>
                                </div>
                            </div>

                            {/* Comparison Chart Mockup */}
                            <div className="bg-white p-8 rounded-3xl shadow-md border border-slate-100">
                                <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                                    Visual Impact Breakdown
                                </h4>
                                <div className="flex gap-4 h-12 bg-slate-100 rounded-2xl overflow-hidden p-1">
                                    <div
                                        className="bg-red-500 h-full rounded-xl transition-all duration-700 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                                        style={{ width: `${lossPercentage}%` }}
                                    >
                                        {lossPercentage > 15 ? 'PAYOUT' : ''}
                                    </div>
                                    <div
                                        className="bg-emerald-500 h-full rounded-xl transition-all duration-700 flex items-center justify-center text-[10px] font-bold text-white shadow-inner"
                                        style={{ width: `${100 - lossPercentage}%` }}
                                    >
                                        REMAINING ASSETS
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-red-500 rounded-sm"></span>
                                        <span className="text-slate-600 font-medium">Potential Loss: <strong className="text-red-700">{calculation.loss.toFixed(2)} Billion</strong></span>
                                    </div>
                                    <div className="text-slate-400 text-xs italic">
                                        *Simulation based on {lossPercentage}% destruction rate
                                    </div>
                                </div>
                            </div>

                            {/* Recommendations Placeholder */}
                            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6">
                                <div className="flex gap-4">
                                    <span className="text-2xl">💡</span>
                                    <div>
                                        <h5 className="font-bold text-amber-900 mb-1 text-sm uppercase">Mitigation Advice</h5>
                                        <p className="text-amber-800 text-sm leading-relaxed">
                                            For a {lossPercentage}% loss in <strong>{selectedMunicipality.name}</strong>, it is highly recommended to review your reinsurance treaties for this cluster. Current exposure exceeds local retention capacity by <strong className="font-bold">{(calculation.loss * 0.4).toFixed(2)} Billion DZD</strong>.
                                        </p>
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}
                </div>

            </main>

            <footer className="max-w-5xl mx-auto px-4 mt-12 text-center text-slate-400 text-xs">
                <p>© 2026 Insurance Risk Management System – RPA99 Assessment Framework</p>
            </footer>
        </div>
    );
};

export default Simulation;
