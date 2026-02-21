
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-200 p-6 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="bg-primary/10 size-10 rounded-xl flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary text-xl" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900">LEADERSHIGH</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">AI 리더십 트레이닝</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-semibold ${
                isActive(item.path)
                  ? 'bg-primary text-white shadow-neon-cyan'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}
            >
              <span
                className="material-symbols-outlined text-[22px]"
                style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-100 pt-4 mt-4">
          <button
            onClick={() => navigate('/custom-lab')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold ${
              isActive('/custom-lab')
                ? 'bg-primary text-white shadow-neon-cyan'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">science</span>
            <span>커스텀 랩</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] flex justify-around items-center z-50">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 transition-all duration-200 min-w-[60px] px-3 py-1 rounded-xl ${
              isActive(item.path) ? 'text-primary' : 'text-gray-400'
            }`}
          >
            <span
              className="material-symbols-outlined text-[24px]"
              style={{ fontVariationSettings: isActive(item.path) ? "'FILL' 1" : "'FILL' 0" }}
            >
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
