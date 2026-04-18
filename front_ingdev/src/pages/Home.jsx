import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Home = () => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const parsed = rows.map(row => {
          const cols = row.split(',');
          // Structure: ID, WILLAYA_ID, COMMUNE_ID, COMMUNE, COMMUNE_ARABIC, RISK, CAPITAL_ASSURE
          const wId = parseInt(cols[1]);
          return {
            wilaya: wilayaIdNames[wId] || `Wilaya ${wId}`,
            commune: cols[3],
            risk: parseFloat(cols[5]),
            capital: parseFloat(cols[6] || 0)
          };
        });
        setData(parsed);
        setIsLoading(false);
      });
  }, []);

  // 1. Chart Data: Aggregate Capital by Risk Zone
  const zoneStats = useMemo(() => {
    const zones = {
      '4.0': { label: 'Zone III (Severe)', total: 0 },
      '3.0': { label: 'Zone IIb', total: 0 },
      '2.0': { label: 'Zone IIa', total: 0 },
      '1.0': { label: 'Zone I', total: 0 },
      '0.5': { label: 'Zone 0', total: 0 }
    };

    data.forEach(item => {
      const key = item.risk.toFixed(1);
      if (zones[key]) {
        zones[key].total += item.capital;
      }
    });

    return zones;
  }, [data]);

  const chartData = {
    labels: Object.values(zoneStats).map(z => z.label),
    datasets: [
      {
        label: 'Total Capital at Risk (Billion DZD)',
        data: Object.values(zoneStats).map(z => z.total / 1000000000),
        backgroundColor: ['#b91c1c', '#f97316', '#eab308', '#3b82f6', '#10b981'],
        borderRadius: 8,
      },
    ],
  };

  // 2. Table Data: Aggregate by Wilaya and Risk Categories
  const wilayaSummary = useMemo(() => {
    const summary = {};
    data.forEach(item => {
      if (!summary[item.wilaya]) {
        summary[item.wilaya] = { name: item.wilaya, low: 0, med: 0, high: 0, total: 0 };
      }
      const val = item.capital;
      summary[item.wilaya].total += val;
      if (item.risk >= 3) summary[item.wilaya].high += val;
      else if (item.risk >= 1.5) summary[item.wilaya].med += val;
      else summary[item.wilaya].low += val;
    });
    return Object.values(summary).sort((a, b) => b.total - a.total);
  }, [data]);

  // 3. Recommendations
  const recommendations = useMemo(() => {
    const total = data.reduce((acc, curr) => acc + curr.capital, 0);
    const highRiskTotal = Object.values(zoneStats).filter(z => z.label.includes('III') || z.label.includes('IIb')).reduce((acc, curr) => acc + curr.total, 0);
    const highRiskRatio = total > 0 ? (highRiskTotal / total) * 100 : 0;

    const topHighRiskCommunes = [...data]
      .filter(d => d.risk >= 3 && d.capital > 0)
      .sort((a, b) => b.capital - a.capital)
      .slice(0, 5);

    const safeOppCommunes = [...data]
      .filter(d => d.risk <= 1 && d.capital === 0)
      .slice(0, 5);

    return {
      ratio: highRiskRatio.toFixed(1),
      stop: topHighRiskCommunes,
      grow: safeOppCommunes
    };
  }, [data, zoneStats]);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      <div className="bg-linear-to-r from-slate-900 to-blue-900 text-white p-8 md:p-12 mb-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <span className="text-[12rem] font-black">RPA</span>
        </div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">PORTFOLIO INTELLIGENCE <span className="text-blue-400">RPA99</span></h1>
              <p className="text-slate-400 font-medium max-w-2xl leading-relaxed">
                Strategic analysis of earthquake insurance exposure across Algeria. Leveraging technical seismic zones B.C 2.48 for risk aggregation and capital optimization.
              </p>
            </div>
            <div className="flex gap-4">
              <Link to="/map" className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2 border border-blue-400/30">
                🗺️ INTERACTIVE MAP
              </Link>
              <Link to="/simulation" className="bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2 border border-emerald-400/30">
                📊 SIMULATOR
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Aggregated Capital by Seismic Zone</h2>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 uppercase tracking-widest leading-none">Billion DZD</span>
            </div>
            <div className="h-[400px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: { color: '#f1f5f9' },
                      ticks: { font: { weight: 'bold' } }
                    },
                    x: {
                      grid: { display: false },
                      ticks: { font: { weight: 'bold' } }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Tableau de bord des cumuls (Toutes les Wilayas)</h2>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400"></span>
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-8 py-4">Wilaya</th>
                    <th className="px-4 py-4 text-center">Low Risk (0-I)</th>
                    <th className="px-4 py-4 text-center">Med Risk (IIa-IIb)</th>
                    <th className="px-4 py-4 text-center">High Risk (III)</th>
                    <th className="px-8 py-4 text-right">Total Aggregate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {wilayaSummary.map((w, idx) => (
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
              <p className="text-[10px] font-black text-blue-400 tracking-[0.3em] uppercase mb-4">Risk Exposure Ratio</p>
              <div className="text-6xl font-black mb-4 group-hover:scale-105 transition-transform">{recommendations.ratio}%</div>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Percentage of portfolio capital located in High Hazard Zones (IIb & III).
              </p>
              <div className="mt-6 flex gap-2">
                {parseInt(recommendations.ratio) > 50 ?
                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-[9px] font-black border border-red-500/20">🚨 OVEREXPOSED</span>
                  : <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[9px] font-black border border-emerald-500/20">✅ HEALTHY</span>
                }
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
              <span className="text-9xl">📉</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              Portfolio Optimization
            </h3>

            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 text-emerald-600 mb-4">
                  <span className="text-lg">📈</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Recommended Growth</span>
                </div>
                <ul className="space-y-3">
                  {recommendations.grow.length > 0 ? recommendations.grow.map((c, i) => (
                    <li key={i} className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex justify-between items-center group hover:bg-emerald-50 transition-colors">
                      <span className="text-xs font-bold text-slate-700">{c.commune}</span>
                      <span className="text-[9px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-200">SAFE OPS</span>
                    </li>
                  )) : <li className="text-xs text-slate-400 italic">No low-risk opportunities identified.</li>}
                </ul>
              </div>

              <div>
                <div className="flex items-center gap-2 text-red-600 mb-4">
                  <span className="text-lg">📉</span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-700">De-risking Necessary</span>
                </div>
                <ul className="space-y-3">
                  {recommendations.stop.length > 0 ? recommendations.stop.map((c, i) => (
                    <li key={i} className="bg-red-50/50 border border-red-100 p-3 rounded-2xl flex justify-between items-center group hover:bg-red-50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">{c.commune}</span>
                        <span className="text-[9px] text-slate-400">Exposure: {(c.capital / 1000000).toFixed(1)}M</span>
                      </div>
                      <span className="text-[9px] font-black text-red-600 bg-white px-2 py-0.5 rounded-full border border-red-200 uppercase">Cease Granting</span>
                    </li>
                  )) : <li className="text-xs text-slate-400 italic">No critical overexposure detected.</li>}
                </ul>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-50">
              <p className="text-[10px] text-slate-400 font-medium italic leading-relaxed">
                *AI-driven recommendations based on RPA99 vulnerability mapping. Consult risk managers before adjusting underwriting rules.
              </p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};

export default Home;