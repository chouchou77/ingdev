import { useState, useEffect, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Home = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/merged_willaya_data.csv')
      .then(r => r.text())
      .then(text => {
        const rows = text.split('\n').filter(line => line.trim() !== '').slice(1);
        const parsed = rows.map(row => {
          const cols = row.split(',');
          return {
            w_id: parseInt(cols[1]),
            commune: cols[3],
            risk: parseFloat(cols[5]),
            capital: parseFloat(cols[6] || 0)
          };
        });
        setData(parsed);
        setIsLoading(parsed.length === 0);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const wilayaSummary = useMemo(() => {
    const summary = {};
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

    data.forEach(d => {
      if (!summary[d.w_id]) {
        summary[d.w_id] = { name: wilayaIdNames[d.w_id] || `Wilaya ${d.w_id}`, low: 0, med: 0, high: 0, total: 0 };
      }
      if (d.risk <= 1) summary[d.w_id].low += d.capital;
      else if (d.risk <= 3) summary[d.w_id].med += d.capital;
      else summary[d.w_id].high += d.capital;
      summary[d.w_id].total += d.capital;
    });
    return Object.values(summary).sort((a, b) => b.total - a.total);
  }, [data]);

  const filteredWilayaSummary = useMemo(() => {
    return wilayaSummary.filter(w =>
      w.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [wilayaSummary, searchTerm]);

  const chartData = {
    labels: ['Zone I', 'Zone IIa', 'Zone IIb', 'Zone III'],
    datasets: [{
      label: 'Capital Assuré (Milliards DZD)',
      data: [
        data.filter(d => d.risk === 1).reduce((acc, curr) => acc + curr.capital, 0) / 1000000000,
        data.filter(d => d.risk === 2).reduce((acc, curr) => acc + curr.capital, 0) / 1000000000,
        data.filter(d => d.risk === 3).reduce((acc, curr) => acc + curr.capital, 0) / 1000000000,
        data.filter(d => d.risk === 4).reduce((acc, curr) => acc + curr.capital, 0) / 1000000000,
      ],
      backgroundColor: ['#3b82f6', '#eab308', '#f97316', '#ef4444'],
      borderRadius: 12,
    }]
  };

  const recommendations = useMemo(() => {
    const totalCapital = data.reduce((acc, curr) => acc + curr.capital, 0);
    const weightedRiskSum = data.reduce((acc, curr) => acc + (curr.risk * curr.capital), 0);
    const weightedAvgRisk = totalCapital > 0 ? (weightedRiskSum / totalCapital) : 0;

    // Scale risk 0-4 to 0-100%
    const globalExposureScore = (weightedAvgRisk / 4) * 100;

    const topHighRiskCommunes = [...data]
      .filter(d => d.risk >= 3)
      .sort((a, b) => b.capital - a.capital)
      .slice(0, 5);

    const safeOppCommunes = [...data]
      .filter(d => d.risk <= 1 && d.capital === 0)
      .slice(0, 5);

    return {
      ratio: globalExposureScore.toFixed(1),
      avgRisk: weightedAvgRisk.toFixed(2),
      stop: topHighRiskCommunes,
      grow: safeOppCommunes
    };
  }, [data]);

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans pb-12">
      <div className="bg-linear-to-br from-slate-900 to-black text-white p-12 md:p-20 mb-8 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none select-none">
          <span className="text-[18rem] font-black leading-none">RPA</span>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/20 uppercase tracking-widest">Stats Portefeuille en Direct</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[0.9]">ANALYSE <br /><span className="text-emerald-500">STRATÉGIQUE</span> D'EXPOSITION</h1>
              <p className="text-slate-400 font-medium text-lg leading-relaxed">
                Surveillance en temps réel de l'agrégation d'assurance à travers les zones sismiques algériennes.
                Intégration des normes <span className="text-white font-bold">RPA 99/2003</span> avec modélisation catastrophe Monte Carlo.
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Santé du Portefeuille</p>
                <div className="text-3xl font-black text-emerald-400">OPTIMISÉ</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Mis à jour: {new Date().toLocaleDateString('fr-FR')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-black uppercase tracking-tighter text-black">Capital Agrégé par Zone Sismique</h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 uppercase tracking-widest leading-none">Milliards DZD</span>
            </div>
            <div className="h-[400px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { weight: 'bold' } } },
                    x: { grid: { display: false }, ticks: { font: { weight: 'bold' } } }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter text-black">Tableau de bord des cumuls (Wilayas)</h2>
              <div className="relative w-full md:w-64">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher une wilaya..."
                  className="bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-10 pr-6 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all w-full font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Wilaya</th>
                    <th className="px-4 py-4 text-center">Risque Faible (0-I)</th>
                    <th className="px-4 py-4 text-center">Risque Moyen (IIa-IIb)</th>
                    <th className="px-4 py-4 text-center">Risque Élevé (III)</th>
                    <th className="px-8 py-4 text-right">Agrégat Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredWilayaSummary.map((w, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-700">{w.name}</td>
                      <td className="px-4 py-4 text-center text-slate-500 font-mono text-[11px]">{(w.low / 1000000).toFixed(1)}M</td>
                      <td className="px-4 py-4 text-center text-slate-500 font-mono text-[11px]">{(w.med / 1000000).toFixed(1)}M</td>
                      <td className="px-4 py-4 text-center text-red-500 font-bold font-mono text-[11px]">{(w.high / 1000000).toFixed(1)}M</td>
                      <td className="px-8 py-4 text-right">
                        <span className="font-black text-slate-900">{(w.total / 1000000).toFixed(1)}M</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-black text-blue-400 tracking-[0.3em] uppercase mb-4">Indice de Risque Portefeuille</p>
              <div className="text-6xl font-black mb-4 group-hover:scale-105 transition-transform">{recommendations.ratio}%</div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Moyenne pondérée de l'exposition au capital à travers tous les niveaux de risque.
                (Moyenne Actuelle: <span className="text-white">{recommendations.avgRisk}</span>)
              </p>
              <div className="mt-6 flex gap-2">
                {parseInt(recommendations.ratio) > 50 ?
                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[9px] font-black border border-red-500/20">🚨 SUREXPOSÉ</span>
                  : <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-500/20">✅ SOUS CONTRÔLE</span>
                }
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
              <span className="text-9xl">📊</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Alertes de Concentration
            </h3>
            <div className="space-y-4">
              {recommendations.stop.map((comm, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-red-50 rounded-2xl border border-red-100">
                  <div>
                    <p className="text-sm font-black text-slate-900">{comm.commune}</p>
                    <p className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Zone Risque: {comm.risk}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">{(comm.capital / 1000000).toFixed(1)}M</p>
                    <p className="text-[8px] text-slate-400 font-bold">DZD</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-xl">
            <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">Opportunités d'Expansion</h3>
            <div className="space-y-4">
              {recommendations.grow.map((comm, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div>
                    <p className="text-sm font-black text-white">{comm.commune}</p>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Secteur Sûr / Z{comm.risk}</p>
                  </div>
                  <span className="text-lg">📈</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;