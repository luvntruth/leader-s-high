
import React from 'react';
// @ts-ignore
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogoClick = () => {
    navigate('/');
  };

  const navItems = [
    { label: '기지', labelEn: 'BASE', icon: 'grid_view', path: '/' },
    { label: '퀘스트', labelEn: 'QUEST', icon: 'swords', path: '/missions' },
    { label: '프로필', labelEn: 'PROFILE', icon: 'shield_person', path: '/profile' },
  ];

  return (
    <>
      {/* ── 데스크톱: 사이드바 ── */}
      <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 bg-[#060B18]/95 backdrop-blur-2xl border-r border-white/5 z-50">
        {/* 로고 영역 */}
        <div className="p-6 pb-4 cursor-pointer select-none group/logo" onClick={handleLogoClick}>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <div className="bg-primary/20 size-11 rounded-2xl flex items-center justify-center border border-primary/30 group-active/logo:scale-95 transition-transform"
                style={{ boxShadow: '0 0 20px rgba(0,242,255,0.3)' }}>
                <span className="material-symbols-outlined text-primary text-xl font-bold">military_tech</span>
              </div>
              <div className="absolute -top-1 -right-1 size-3 bg-accent-neon rounded-full pulse-cyan" />
            </div>
            <div>
              <h1 className="text-lg font-black italic tracking-tighter group-hover/logo:text-primary transition-colors">LEADER'S HIGH</h1>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Command System v2</p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent mt-4" />
        </div>

        {/* 네비게이션 아이템 */}
        <nav className="flex-1 px-4 space-y-1.5">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden ${isActive(item.path)
                ? 'bg-primary/10 text-primary font-black border border-primary/20 shadow-neon-cyan'
                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent'
                }`}
            >
              {/* 활성 표시 바 */}
              {isActive(item.path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  style={{ boxShadow: '0 0 8px rgba(0,242,255,0.6)' }} />
              )}
              <span className={`material-symbols-outlined text-2xl transition-transform ${isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'
                }`}>
                {item.icon}
              </span>
              <div className="flex flex-col items-start">
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
                <span className={`text-[7px] font-black uppercase tracking-[0.2em] ${isActive(item.path) ? 'text-primary/60' : 'text-slate-700'
                  }`}>{item.labelEn}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* 플랜 상태 */}
        {user && (
          <div className="px-4 mb-2">
            {profile?.plan === 'free' ? (
              <button
                onClick={() => navigate('/pricing')}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-500 bg-amber-500/20 px-1.5 py-0.5 rounded">FREE</span>
                  <span className="text-slate-400 text-xs">업그레이드</span>
                </div>
                <span className="text-amber-500 text-xs group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-slate-800/40 border border-slate-700/30">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                    profile?.plan === 'ultra' ? 'text-cyan-400 bg-cyan-500/20' : 'text-amber-500 bg-amber-500/20'
                  }`}>{profile?.plan === 'ultra' ? 'ULTRA' : 'PRO'}</span>
                  <span className="text-slate-400 text-xs">이용 중</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 하단: 로그아웃 + 시스템 정보 */}
        <div className="p-6 pt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-white/5 to-transparent mb-4" />
          {user && (
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 mb-3 group"
            >
              <span className="material-symbols-outlined text-lg group-hover:text-red-400">logout</span>
              <span className="text-xs font-semibold tracking-tight">로그아웃</span>
            </button>
          )}
          <div className="flex items-center gap-2 text-[8px] text-slate-700 font-bold uppercase tracking-widest">
            <div className="size-1.5 bg-accent-neon rounded-full pulse-cyan" />
            <span>System Online</span>
          </div>
        </div>
      </aside>

      {/* ── 모바일: 하단 게임패드 바 ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* 상단 글로우 라인 */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="bg-[#060B18]/95 backdrop-blur-2xl px-4 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] flex justify-around items-center">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 min-w-[60px] py-2 relative ${isActive(item.path) ? 'text-primary' : 'text-slate-600'
                }`}
            >
              {/* 활성 탭 상단 인디케이터 */}
              {isActive(item.path) && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
                  style={{ boxShadow: '0 0 8px rgba(0,242,255,0.6)' }} />
              )}

              <div className={`relative transition-transform duration-200 ${isActive(item.path) ? 'scale-110' : ''}`}>
                <span className={`material-symbols-outlined text-[22px] ${isActive(item.path) ? 'font-bold' : ''
                  }`} style={isActive(item.path) ? { filter: 'drop-shadow(0 0 6px rgba(0,242,255,0.5))' } : {}}>
                  {item.icon}
                </span>
              </div>

              <span className={`text-[9px] font-black tracking-wider transition-colors ${isActive(item.path) ? 'text-primary' : 'text-slate-700'
                }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navigation;
