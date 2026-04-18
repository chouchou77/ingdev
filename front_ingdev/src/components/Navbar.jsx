import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const navLinks = [
        { name: 'Tableau de bord', path: '/', icon: '🏠' },
        { name: 'Carte Sismique', path: '/map', icon: '🗺️' },
        { name: 'Prédiction Risque', path: '/prediction', icon: '🔮' },
        { name: 'Simulation Pertes', path: '/simulation', icon: '📊' },
    ];

    return (
        <nav className="h-20 border-b border-slate-200 bg-white/70 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-[100]">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    🛡️
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                        CATNAT<span className="text-emerald-500">DZ</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                        Moteur RPA 99/2003
                    </p>
                </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
                {navLinks.map((link) => {
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 border ${isActive
                                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                                : 'text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <span>{link.icon}</span>
                            {link.name}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default Navbar;
