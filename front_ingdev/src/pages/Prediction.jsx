import { useState, useEffect } from 'react';

const Prediction = () => {
    const [formData, setFormData] = useState({
        wilaya: '',
        commune: '',
        buildingType: 'residential',
        floors: '2',
        height: '6',
        capital: '50000000',
        // New RPA fields
        seismic_zone: '2',
        trumeau_area_m2: '15',
        distance_between_columns_m: '4',
        diagonal_wall_length: '3',
        wall_thickness_cm: '25',
        wall_density_ratio: '0.05',
        openings_ratio: '0.3',
        has_rc_encadrement: true,
        brick_type: 'hollow',
        longitudinal_reinforcement_bars: '4',
        rebar_diameter_mm: '12',
        mortar_strength_mpa: '5',
        concrete_strength_mpa: '25',
    });

    const [wilayas, setWilayas] = useState([]);
    const [communes, setCommunes] = useState([]);
    const [allData, setAllData] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [activeTab, setActiveTab] = useState('basic');

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
                // Refined Zone mapping from RPA Standards
                const zone = communeData.risk_level >= 4 ? '3' :
                    communeData.risk_level >= 2 ? '2' : '1';

                setFormData(prev => ({
                    ...prev,
                    seismic_zone: zone,
                    capital: communeData.capital > 0 ? communeData.capital.toString() : prev.capital
                }));
            }
        } else {
            setCommunes([]);
        }
    }, [formData.wilaya, formData.commune, allData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResult(null);

        const communeData = allData.find(d => d.wilaya === formData.wilaya && d.commune === formData.commune);
        const mappedRisk = communeData ? (communeData.risk_level === 0.5 ? 0.05 : communeData.risk_level * 0.1) : 0.2;

        const payload = {
            wilaya: formData.wilaya,
            commune: formData.commune,
            risk_type: formData.buildingType === 'residential' ? 'Bien immobilier' :
                formData.buildingType === 'industrial' ? 'Installation Industrielle' : 'Commercial',
            capital_assure: parseFloat(formData.capital),
            risk_level: mappedRisk,
            nb_floors: parseInt(formData.floors),
            height_m: parseFloat(formData.height),
            // New fields
            seismic_zone: parseInt(formData.seismic_zone),
            a_factor: mappedRisk,
            trumeau_area_m2: parseFloat(formData.trumeau_area_m2),
            distance_between_columns_m: parseFloat(formData.distance_between_columns_m),
            diagonal_wall_length: parseFloat(formData.diagonal_wall_length),
            wall_thickness_cm: parseFloat(formData.wall_thickness_cm),
            wall_density_ratio: parseFloat(formData.wall_density_ratio),
            openings_ratio: parseFloat(formData.openings_ratio),
            has_rc_encadrement: formData.has_rc_encadrement,
            brick_type: formData.brick_type,
            longitudinal_reinforcement_bars: parseInt(formData.longitudinal_reinforcement_bars),
            rebar_diameter_mm: parseFloat(formData.rebar_diameter_mm),
            mortar_strength_mpa: parseFloat(formData.mortar_strength_mpa),
            concrete_strength_mpa: parseFloat(formData.concrete_strength_mpa),
        };

        try {
            const response = await fetch('http://localhost:8000/analyze_risk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();

            setResult({
                status: 'Success',
                score: data.ai_prediction.risk_index,
                decision: data.ai_prediction.decision,
                color: data.ai_prediction.color,
                rpa: data.rpa_validation,
                monte_carlo: data.monte_carlo_simulation,
                portfolio: data.portfolio_impact,
                recommendation: data.final_recommendation
            });
            setIsSubmitting(false);
        } catch (error) {
            console.error("Prediction failed:", error);
            setIsSubmitting(false);
            alert("Connection error with backend.");
        }
    };

    const InputField = ({ label, name, type = "text", options = null }) => (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            {options ? (
                <select
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                    value={formData[name]}
                    onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                >
                    {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-all"
                    value={formData[name]}
                    onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                />
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-sans selection:bg-emerald-500/30">
            <main className="max-w-6xl mx-auto py-12 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT PANEL: FORM */}
                    <div className="lg:col-span-7 bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-md flex flex-col">
                        <div className="p-8 border-b border-white/5 bg-linear-to-r from-slate-900 to-black">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="text-emerald-500">⚙️</span> ADVANCED RISK ASSESSMENT
                            </h2>
                            <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold opacity-60">RPA 99/2003 Confined Masonry Framework</p>
                        </div>

                        <div className="flex border-b border-white/5 bg-black/20">
                            <button onClick={() => setActiveTab('basic')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'basic' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}>Basic Data</button>
                            <button onClick={() => setActiveTab('structural')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'structural' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}>Structural Specs</button>
                            <button onClick={() => setActiveTab('materials')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'materials' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}>Materials & Rebar</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="col-span-2 md:col-span-1">
                                        <InputField label="Wilaya" name="wilaya" options={[{ value: '', label: 'Select Wilaya' }, ...wilayas.map(w => ({ value: w, label: w }))]} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <InputField label="Commune" name="commune" options={[{ value: '', label: 'Select Commune' }, ...communes.map(c => ({ value: c, label: c }))]} />
                                    </div>
                                    <InputField label="Building Category" name="buildingType" options={[
                                        { value: 'residential', label: 'Habitation / Units' },
                                        { value: 'industrial', label: 'Industrial Complex' },
                                        { value: 'office', label: 'Commercial / Office' }
                                    ]} />
                                    <InputField label="Seismic Zone (RPA)" name="seismic_zone" options={[
                                        { value: '1', label: 'Zone I (Low)' },
                                        { value: '2', label: 'Zone II (Medium)' },
                                        { value: '3', label: 'Zone III (High)' }
                                    ]} />
                                    <InputField label="Number of Floors" name="floors" type="number" />
                                    <InputField label="Total Height (m)" name="height" type="number" />
                                    <div className="col-span-2">
                                        <InputField label="Capital Assured (DZD)" name="capital" type="number" />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'structural' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <InputField label="Trumeau Area (m²)" name="trumeau_area_m2" type="number" />
                                    <InputField label="Distance between Columns (m)" name="distance_between_columns_m" type="number" />
                                    <InputField label="Diagonal Wall Length (m)" name="diagonal_wall_length" type="number" />
                                    <InputField label="Wall Thickness (cm)" name="wall_thickness_cm" type="number" />
                                    <InputField label="Wall Density Ratio" name="wall_density_ratio" type="number" />
                                    <InputField label="Openings Area Ratio" name="openings_ratio" type="number" />
                                    <div className="col-span-2 flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                                        <input
                                            type="checkbox"
                                            checked={formData.has_rc_encadrement}
                                            onChange={(e) => setFormData({ ...formData, has_rc_encadrement: e.target.checked })}
                                            className="w-5 h-5 accent-emerald-500"
                                        />
                                        <div>
                                            <p className="text-xs font-bold text-white">Has R.C Encadrement around openings?</p>
                                            <p className="text-[10px] text-slate-500">Required for Zone III according to RPA Chapitre IX.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'materials' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <InputField label="Brick Type" name="brick_type" options={[
                                        { value: 'hollow', label: 'Hollow Brick' },
                                        { value: 'solid', label: 'Solid Brick' }
                                    ]} />
                                    <InputField label="Rebar Count (Longitudinal)" name="longitudinal_reinforcement_bars" type="number" />
                                    <InputField label="Rebar Diameter (mm)" name="rebar_diameter_mm" type="number" />
                                    <InputField label="Mortar Strength (MPa)" name="mortar_strength_mpa" type="number" />
                                    <InputField label="Concrete Strength (MPa)" name="concrete_strength_mpa" type="number" />
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full mt-12 bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] disabled:bg-slate-800"
                            >
                                {isSubmitting ? 'CALCULATING ENGINE...' : 'GENERATE COMPREHENSIVE REPORT'}
                            </button>
                        </form>
                    </div>

                    {/* RIGHT PANEL: RESULTS */}
                    <div className="lg:col-span-5 space-y-6">
                        {!result ? (
                            <div className="h-full bg-slate-900/20 border border-white/5 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center opacity-40">
                                <div className="text-6xl mb-6">📉</div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Waiting for Input</h3>
                                <p className="text-sm text-slate-400 mt-2">Submit the form to generate AI-driven seismic vulnerability index and loss simulations.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                {/* DECISION CARD */}
                                <div className="bg-slate-900/60 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Final Underwriting Decision</p>
                                            <h2 className="text-4xl font-black" style={{ color: result.color }}>{result.decision}</h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-black text-white">{result.score}</div>
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">AI RISK INDEX</p>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">"{result.recommendation}"</p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                                        <span className="text-8xl">⚖️</span>
                                    </div>
                                </div>

                                {/* RPA VALIDATION */}
                                <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-4 flex items-center justify-between">
                                        RPA 99/2003 Compliance
                                        <span className={`px-3 py-1 rounded-full text-[9px] border ${result.rpa.compliant ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-red-500/40 text-red-400'}`}>
                                            {result.rpa.compliant ? 'PASSED' : 'FAILED'}
                                        </span>
                                    </h4>
                                    <div className="space-y-3">
                                        {result.rpa.major_violations.map((v, i) => (
                                            <div key={i} className="flex gap-3 text-[11px] text-red-400 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                                                <span>🚨</span> {v}
                                            </div>
                                        ))}
                                        {result.rpa.compliant && (
                                            <div className="text-[11px] text-emerald-400 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex gap-3">
                                                <span>✅</span> All structural parameters are within RPA limits for Zone {formData.seismic_zone}.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* MONTE CARLO & PORTFOLIO */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">Monte Carlo Mean Loss</p>
                                        <div className="text-xl font-black text-white tracking-tighter">{result.monte_carlo?.average_simulated_loss?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">DZD</span></div>
                                        <p className="text-[9px] text-slate-400 mt-2 uppercase">Extreme (95%): {result.monte_carlo?.extreme_scenario_95?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Prediction;
