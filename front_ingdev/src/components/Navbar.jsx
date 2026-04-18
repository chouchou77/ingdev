import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
    const location = useLocation();

    const navLinks = [
        { name: 'Dashboard', path: '/', icon: '🏠' },
        { name: 'Seismic Map', path: '/map', icon: '🗺️' },
        { name: 'Risk Prediction', path: '/prediction', icon: '🔮' },
        { name: 'Loss Simulation', path: '/simulation', icon: '📊' },
    ];

    return (
        <nav className="h-20 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-[100]">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                    🛡️
                </div>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight uppercase">
                        CATNAT<span className="text-emerald-500">DZ</span>
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                        RPA 99/2003 Engine
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
                                    : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-100'
                                }`}
                        >
                            <span>{link.icon}</span>
                            {link.name}
                        </Link>
                    );
                })}
            </div>

            <div className="flex items-center gap-4">
                <div className="h-8 w-[1px] bg-white/10 mx-2 hidden md:block"></div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-white uppercase leading-none">Admin User</p>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Verified Analyst</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-sm">
                        👤
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
