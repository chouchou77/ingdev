import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const navLinks = [
        { name: 'Tableau de bord', path: '/', icon: '🏠' },
        { name: 'Carte Sismique', path: '/map', icon: '🗺️' },
        { name: 'Prédiction Risque', path: '/prediction', icon: '🔮' },
        { name: 'Simulation Pertes', path: '/simulation', icon: '📊' },
    ];

    return (
        <aside className="w-72 h-screen border-r border-slate-200 bg-white/70 backdrop-blur-xl flex flex-col sticky top-0 left-0 z-[100]">
            <div className="p-8 border-b border-slate-100">
                <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                        🛡️
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                            CATNAT<span className="text-emerald-500">DZ</span>
                        </h1>
                    </div>
                </div>
                <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                    Moteur RPA 99/2003
                </p>
            </div>

            <nav className="flex-1 p-6 space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-4">Navigation Principale</p>
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`px-5 py-4 rounded-xl text-xs font-black transition-all flex items-center gap-3 border ${isActive
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 shadow-sm'
                                : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <span className="text-lg">{link.icon}</span>
                            {link.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-8 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Système</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[11px] font-bold text-slate-700">Moteur IA Actif</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
