import { useState, useEffect } from 'react';

const Prediction = () => {
    const [selectedWilayaId, setSelectedWilayaId] = useState(null);
    const [formData, setFormData] = useState({
        wilaya: '',
        commune: '',
        buildingType: 'résidentiel',
        floors: '2',
        height: '6',
        capital: '50000000',
        seismic_zone: '2',
        trumeau_area_m2: '15',
        distance_between_columns_m: '4',
        diagonal_wall_length: '3',
        wall_thickness_cm: '25',
        wall_density_ratio: '0.05',
        openings_ratio: '0.3',
        has_rc_encadrement: true,
        brick_type: 'creuse',
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
                    const wilayaName = (wilayaIdNames[wId] || `Wilaya ${wId}`).toUpperCase();
                    const communeName = cols[3]?.trim().toUpperCase();
                    return {
                        w_id: wId,
                        wilaya: wilayaName,
                        commune: communeName,
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
            const currentWilayaNames = allData
                .filter(d => d.wilaya === formData.wilaya.toUpperCase())
                .map(d => d.commune)
                .sort();
            setCommunes(currentWilayaNames);

            const communeData = allData.find(d =>
                d.wilaya === formData.wilaya.toUpperCase() &&
                d.commune === formData.commune.toUpperCase()
            );

            if (communeData) {
                setSelectedWilayaId(communeData.w_id);
                const zone = communeData.risk_level >= 4 ? '3' :
                    communeData.risk_level >= 2 ? '2' : '1';

                setFormData(prev => ({
                    ...prev,
                    seismic_zone: zone,
                    capital: communeData.capital > 0 ? communeData.capital.toString() : prev.capital
                }));
            }
        }
    }, [formData.wilaya, formData.commune, allData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setResult(null);

        const currentWilaya = formData.wilaya.toUpperCase();
        const currentCommune = formData.commune.toUpperCase();
        const communeData = allData.find(d => d.wilaya === currentWilaya && d.commune === currentCommune);
        const mappedRisk = communeData ? (communeData.risk_level === 0.5 ? 0.05 : communeData.risk_level * 0.1) : 0.2;

        const payload = {
            wilaya: currentWilaya,
            commune: currentCommune,
            risk_type: formData.buildingType === 'résidentiel' ? 'Bien immobilier' :
                formData.buildingType === 'industriel' ? 'Installation Industrielle' : 'Commercial',
            capital_assure: parseFloat(formData.capital),
            risk_level: mappedRisk,
            nb_floors: parseInt(formData.floors),
            height_m: parseFloat(formData.height),
            seismic_zone: parseInt(formData.seismic_zone),
            a_factor: mappedRisk,
            trumeau_area_m2: parseFloat(formData.trumeau_area_m2),
            distance_between_columns_m: parseFloat(formData.distance_between_columns_m),
            diagonal_wall_length: parseFloat(formData.diagonal_wall_length),
            wall_thickness_cm: parseFloat(formData.wall_thickness_cm),
            wall_density_ratio: parseFloat(formData.wall_density_ratio),
            openings_ratio: parseFloat(formData.openings_ratio),
            has_rc_encadrement: formData.has_rc_encadrement,
            brick_type: formData.brick_type === 'pleine' ? 'solid' : 'hollow',
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

            if (!response.ok) throw new Error('Échec de la requête API');
            const data = await response.json();

            setResult({
                status: 'Succès',
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
            console.error("Échec de la prédiction:", error);
            setIsSubmitting(false);
            alert("Erreur de connexion avec le serveur.");
        }
    };

    const InputField = ({ label, name, type = "text", options = null }) => (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{label}</label>
            {options ? (
                <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
                    value={formData[name]}
                    onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                >
                    {options.map(opt => <option key={opt.value} value={opt.value} className="text-slate-900">{opt.label}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-emerald-500/50 transition-all"
                    value={formData[name]}
                    onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                />
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500/30">
            <main className="max-w-6xl mx-auto py-12 px-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                        <div className="p-8 border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                <span className="text-emerald-500">⚙️</span> ÉVALUATION DES RISQUES
                            </h2>
                            <p className="text-slate-600 text-xs mt-2 uppercase tracking-widest font-bold opacity-60">Cadre RPA 99/2003 Maçonnerie Chaînée</p>
                        </div>
                        <div className="flex border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100 text-slate-900 ">
                            <button onClick={() => setActiveTab('basic')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'basic' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}>Données de base</button>
                            <button onClick={() => setActiveTab('structural')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'structural' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}>Spécifications structurelles</button>
                            <button onClick={() => setActiveTab('materials')} className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'materials' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50' : 'text-slate-500 hover:text-slate-700'}`}>Matériaux & Armature</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 flex-1 overflow-y-auto max-h-[600px] custom-scrollbar">
                            {activeTab === 'basic' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <div className="col-span-2 md:col-span-1">
                                        <InputField label="Wilaya" name="wilaya" options={[{ value: '', label: 'Sélectionner Wilaya' }, ...wilayas.map(w => ({ value: w, label: w }))]} />
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <InputField label="Commune" name="commune" options={[{ value: '', label: 'Sélectionner Commune' }, ...communes.map(c => ({ value: c, label: c }))]} />
                                    </div>
                                    <InputField label="Catégorie du bâtiment" name="buildingType" options={[
                                        { value: 'résidentiel', label: 'Habitation / Logements' },
                                        { value: 'industriel', label: 'Complexe Industriel' },
                                        { value: 'bureau', label: 'Commercial / Bureaux' }
                                    ]} />
                                    <InputField label="Zone Sismique (RPA)" name="seismic_zone" options={[
                                        { value: '1', label: 'Zone I (Faible)' },
                                        { value: '2', label: 'Zone II (Moyenne)' },
                                        { value: '3', label: 'Zone III (Élevée)' }
                                    ]} />
                                    <InputField label="Nombre d'étages" name="floors" type="number" />
                                    <InputField label="Hauteur Totale (m)" name="height" type="number" />
                                    <div className="col-span-2">
                                        <InputField label="Capital Assuré (DZD)" name="capital" type="number" />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'structural' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <InputField label="Surface du trumeau (m²)" name="trumeau_area_m2" type="number" />
                                    <InputField label="Distance entre colonnes (m)" name="distance_between_columns_m" type="number" />
                                    <InputField label="Longueur diagonale du mur (m)" name="diagonal_wall_length" type="number" />
                                    <InputField label="Épaisseur du mur (cm)" name="wall_thickness_cm" type="number" />
                                    <InputField label="Ratio de densité des murs" name="wall_density_ratio" type="number" />
                                    <InputField label="Ratio de surface d'ouvertures" name="openings_ratio" type="number" />
                                    <div className="col-span-2 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <input type="checkbox" checked={formData.has_rc_encadrement} onChange={(e) => setFormData({ ...formData, has_rc_encadrement: e.target.checked })} className="w-5 h-5 accent-emerald-500" />
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Possède un encadrement B.A autour des ouvertures ?</p>
                                            <p className="text-[10px] text-slate-500">Obligatoire pour la Zone III selon RPA Chapitre IX.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'materials' && (
                                <div className="grid grid-cols-2 gap-6 animate-in fade-in duration-300">
                                    <InputField label="Type de brique" name="brick_type" options={[
                                        { value: 'creuse', label: 'Brique Creuse' },
                                        { value: 'pleine', label: 'Brique Pleine' }
                                    ]} />
                                    <InputField label="Nombre de barres (Longitudinal)" name="longitudinal_reinforcement_bars" type="number" />
                                    <InputField label="Diamètre des barres (mm)" name="rebar_diameter_mm" type="number" />
                                    <InputField label="Résistance du mortier (MPa)" name="mortar_strength_mpa" type="number" />
                                    <InputField label="Résistance du béton (MPa)" name="concrete_strength_mpa" type="number" />
                                </div>
                            )}
                            <button type="submit" disabled={isSubmitting || !formData.wilaya || !formData.commune} className="w-full mt-12 bg-emerald-600 hover:bg-emerald-500 text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_0_40px_rgba(16,185,129,0.2)] disabled:bg-slate-800">
                                {isSubmitting ? 'CALCUL DU MOTEUR...' : 'GÉNÉRER LE RAPPORT COMPLET'}
                            </button>
                        </form>
                    </div>
                    <div className="lg:col-span-5 space-y-6">
                        {!result ? (
                            <div className="h-full bg-slate-100 border border-slate-200 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center p-12 text-center opacity-60">
                                <div className="text-6xl mb-6">📉</div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">En attente des données</h3>
                                <p className="text-sm text-slate-500 mt-2">Soumettez le formulaire pour générer l'indice de vulnérabilité sismique IA et les simulations de pertes.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Décision Finale de Souscription</p>
                                            <h2 className="text-4xl font-black" style={{ color: result.color }}>{result.decision}</h2>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-black text-slate-900">{result.score}</div>
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">INDICE DE RISQUE IA</p>
                                        </div>
                                    </div>
                                    <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <p className="text-[10px] text-slate-600 leading-relaxed font-medium">"{result.recommendation}"</p>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none text-slate-900">
                                        <span className="text-8xl">⚖️</span>
                                    </div>
                                </div>
                                <div className="bg-white border border-slate-200 p-6 rounded-3xl">
                                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center justify-between">
                                        Conformité RPA 99/2003
                                        <span className={`px-3 py-1 rounded-full text-[9px] border ${result.rpa.compliant ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600' : 'bg-red-500/10 border-red-500/40 text-red-600'}`}>
                                            {result.rpa.compliant ? 'CONFORME' : 'NON-CONFORME'}
                                        </span>
                                    </h4>
                                    <div className="space-y-3">
                                        {result.rpa.major_violations.map((v, i) => (
                                            <div key={i} className="flex gap-3 text-[11px] text-red-600 bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                                                <span>🚨</span> {v}
                                            </div>
                                        ))}
                                        {result.rpa.compliant && (
                                            <div className="text-[11px] text-emerald-600 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 flex gap-3">
                                                <span>✅</span> Tous les paramètres structurels sont dans les limites RPA pour la Zone {formData.seismic_zone}.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-slate-200 p-5 rounded-3xl">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">Perte Moyenne Monte Carlo</p>
                                        <div className="text-xl font-black text-slate-900 tracking-tighter">{result.monte_carlo?.average_simulated_loss?.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">DZD</span></div>
                                        <p className="text-[9px] text-slate-500 mt-2 uppercase">Extrême (95%): {result.monte_carlo?.extreme_scenario_95?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white border border-slate-200 p-5 rounded-3xl">
                                        <p className="text-[9px] font-black text-slate-500 uppercase mb-3">Concentration Portefeuille</p>
                                        <div className={`text-xl font-black tracking-tighter ${result.portfolio.warning ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {result.portfolio.warning ? 'ALERTE HAUTE' : 'OPTIMALE'}
                                        </div>
                                        <p className="text-[9px] text-slate-500 mt-2 leading-none">{result.portfolio.note}</p>
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
