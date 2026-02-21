
import React from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { label: '홈', icon: 'grid_view', path: '/' },
    { label: '미션', icon: 'military_tech', path: '/missions' },
    { label: '성장', icon: 'leaderboard', path: '/insights' },
    { label: '프로필', icon: 'shield_person', path: '/profile' },
  ];

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-navy-card/50 backdrop-blur-2xl border-r border-white/5 p-6 z-50">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="bg-primary/20 size-10 rounded-xl flex items-center justify-center border border-primary/30 shadow-neon-cyan">
            <span className="material-symbols-outlined text-primary text-xl font-bold">military_tech</span>
          </div>
          <h1 className="text-xl font-black italic tracking-tighter">LEADERSHIGH</h1>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                isActive(item.path) 
                  ? 'bg-primary text-navy-deep font-black shadow-neon-cyan' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              }`}
            >
              <span className={`material-symbols-outlined text-2xl ${isActive(item.path) ? 'fill-current' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0A0F1D]/90 backdrop-blur-2xl border-t border-white/5 px-6 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] flex justify-between items-center z-50 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 min-w-[64px] ${
              isActive(item.path) ? 'text-primary' : 'text-slate-500'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${isActive(item.path) ? 'font-black drop-shadow-[0_0_8px_rgba(0,242,255,0.4)]' : ''}`}>
                {item.icon}
            </span>
            <span className={`text-[10px] font-bold ${isActive(item.path) ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
};

export default Navigation;
