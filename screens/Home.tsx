
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { SCENARIOS } from '../constants';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen pb-24 lg:pb-12 bg-transparent font-manrope text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0A0F1D]/80 backdrop-blur-md px-6 py-5 flex items-center justify-between border-b border-white/5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 size-10 rounded-xl flex items-center justify-center border border-primary/30 shadow-neon-cyan lg:hidden">
            <span className="material-symbols-outlined text-primary text-xl">military_tech</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white lg:text-2xl">대시보드</h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="hidden lg:block text-right">
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Logged in as</p>
             <p className="text-sm font-bold">엘리트 리더</p>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="size-11 flex items-center justify-center rounded-xl border border-primary/20 p-0.5 active:scale-90 transition-transform shadow-neon-cyan/20"
          >
            <img 
              src={`https://ui-avatars.com/api/?name=User&background=00F2FF&color=0A0F1D`} 
              alt="Profile" 
              className="size-full rounded-lg object-cover" 
            />
          </button>
        </div>
      </div>

      <div className="lg:px-12 lg:py-12">
        {/* Hero Section */}
        <div className="px-6 py-12 lg:px-0 lg:py-0 lg:mb-16 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 size-96 bg-primary/5 rounded-full blur-[120px]"></div>
          
          <p className="text-primary font-black text-[10px] tracking-[0.4em] uppercase mb-3">Strategic Leadership Simulation</p>
          {/* 글자 크기를 줄이고 줄간격 170% (1.7) 적용, 문구 최적화 */}
          <h1 className="text-2xl lg:text-4xl font-bold tracking-tight text-white leading-[1.7]">
            팀원 퇴사율 0% 도전, <br/>
            <span className="text-primary italic">게임</span>처럼 익히는 팀장 리더십 시뮬레이션
          </h1>
          <p className="text-slate-400 mt-6 text-sm lg:text-base font-medium leading-[1.7] max-w-[550px]">
            반복된 시뮬레이션은 결정적 순간에 당신의 가장 강력한 무기가 됩니다.<br/>심리학 기반의 정밀 훈련으로 팀원의 마음을 움직이는 기술을 체득하세요.
          </p>
        </div>

        {/* Responsive Layout Container */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 space-y-8 lg:space-y-0">
          
          {/* Stats Grid - Column 1-4 */}
          <div className="px-6 lg:px-0 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
            <div 
              onClick={() => navigate('/insights')}
              className="bg-navy-card border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group cursor-pointer hover:border-primary/30 transition-all"
            >
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Missions</p>
              <p className="text-4xl font-black text-white">30</p>
              <div className="mt-6 flex items-center gap-1 text-[10px] text-primary font-bold">
                <span className="material-symbols-outlined text-xs">analytics</span>
                <span>역량 분석 리포트 확인</span>
              </div>
            </div>
            <div 
              onClick={() => navigate('/streak')}
              className="bg-navy-card border border-white/5 p-8 rounded-[2.5rem] shadow-2xl cursor-pointer hover:border-accent-amber/30 transition-all relative overflow-hidden"
            >
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Streak</p>
              <p className="text-4xl font-black text-accent-amber drop-shadow-[0_0_10px_rgba(255,184,0,0.3)]">5 <span className="text-xs text-white/40 font-bold uppercase ml-1">Days</span></p>
              <div className="mt-6 flex items-center gap-1 text-[10px] text-accent-amber font-bold">
                <span className="material-symbols-outlined text-xs animate-pulse">local_fire_department</span>
                <span>불꽃 유지 중</span>
              </div>
            </div>
          </div>

          {/* Action Cards - Column 5-12 */}
          <div className="px-6 lg:px-0 lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold tracking-tight text-white uppercase tracking-widest px-2">오늘의 추천 훈련</h3>
              <button onClick={() => navigate('/missions')} className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline">훈련 전체 보기</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 lg:pb-0">
              {SCENARIOS.slice(0, 4).map(scenario => (
                <div 
                  key={scenario.id} 
                  onClick={() => navigate('/setup', { state: { scenario } })}
                  className="bg-navy-card border border-white/5 rounded-[3rem] overflow-hidden p-8 shadow-2xl flex flex-col justify-between active:scale-95 transition-all cursor-pointer hover:border-primary/50 group"
                >
                  <div>
                    <span className="bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-lg text-[9px] font-black mb-6 inline-block uppercase tracking-[0.2em]">
                      {scenario.category}
                    </span>
                    <h4 className="text-xl font-bold mb-3 tracking-tight text-white group-hover:text-primary transition-colors">{scenario.title}</h4>
                    <p className="text-slate-500 text-xs mb-10 line-clamp-2 leading-relaxed font-medium">{scenario.description}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-auto pt-6 border-t border-white/5">
                    <div className="size-10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                       <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(scenario.memberName)}&background=00F2FF&color=0A0F1D`} 
                        alt={scenario.memberName} 
                        className="size-full object-cover" 
                       />
                    </div>
                    <div className="text-[11px]">
                      <p className="font-bold text-white">{scenario.memberName} 매니저</p>
                      <p className="text-slate-500 font-bold uppercase">{scenario.generation}</p>
                    </div>
                    <span className="material-symbols-outlined ml-auto text-primary opacity-0 group-hover:opacity-100 transition-all">play_arrow</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/team-office')}
              className="w-full bg-navy-card border border-white/10 p-8 rounded-[3rem] flex items-center justify-between transition-all active:scale-[0.98] hover:border-accent-purple/40 group shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-8xl">groups</span>
              </div>
              <div className="flex items-center gap-5 text-left relative z-10">
                <div className="bg-accent-purple/10 p-4 rounded-2xl border border-accent-purple/30 group-hover:border-accent-purple/70 transition-colors">
                  <span className="material-symbols-outlined text-accent-purple text-3xl font-black">groups</span>
                </div>
                <div>
                  <p className="font-bold text-xl tracking-tight">팀 오피스 현황판</p>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-1">Team Office — 팀원 현황 보기</p>
                </div>
              </div>
              <div className="size-12 bg-white/5 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
                <span className="material-symbols-outlined text-accent-purple">arrow_forward_ios</span>
              </div>
            </button>

            <button
              onClick={() => navigate('/custom-lab')}
              className="w-full bg-navy-card border border-white/10 p-10 rounded-[3.5rem] flex items-center justify-between transition-all active:scale-[0.98] hover:bg-white/5 group shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <span className="material-symbols-outlined text-8xl">psychology_alt</span>
              </div>
              <div className="flex items-center gap-6 text-left relative z-10">
                <div className="bg-primary/10 p-4 rounded-2xl border border-primary/30 group-hover:border-primary/70 transition-colors shadow-neon-cyan/20">
                  <span className="material-symbols-outlined text-primary text-3xl font-black">add_reaction</span>
                </div>
                <div>
                  <p className="font-bold text-2xl tracking-tight">나만의 상황 커스텀 설계</p>
                  <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Personalized AI AI Scenario Lab</p>
                </div>
              </div>
              <div className="size-12 bg-white/5 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform">
                <span className="material-symbols-outlined text-primary">arrow_forward_ios</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
