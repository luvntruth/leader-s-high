
import React from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

const StreakDetail: React.FC = () => {
  const navigate = useNavigate();

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const activityData = [false, true, true, true, true, true, false]; // 임시 데이터

  return (
    <div className="h-screen bg-navy-deep text-white flex flex-col font-display overflow-hidden">
      <header className="px-4 py-4 sm:p-6 flex items-center justify-between z-10">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Activity Report</h2>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 pb-20 scroll-smooth hide-scrollbar">
        <div className="flex flex-col items-center mt-4 mb-8 sm:mb-10 animate-in fade-in zoom-in duration-500">
          <div className="relative mb-4 sm:mb-6">
             <div className="absolute inset-0 bg-accent-amber/20 blur-[60px] rounded-full"></div>
             <span className="material-symbols-outlined text-[80px] sm:text-[100px] text-accent-amber relative z-10 drop-shadow-[0_0_20px_rgba(230,154,60,0.5)]">
               local_fire_department
             </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-2">5 DAYS</h1>
          <p className="text-slate-400 font-medium text-sm sm:text-base break-keep text-center">연속 리더십 챌린지 달성 중!</p>
        </div>

        <div className="bg-navy-card p-4 sm:p-6 rounded-[2.5rem] border border-white/5 mb-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
            <h3 className="font-bold text-sm sm:text-base">이번 주 활동</h3>
            <span className="text-xs text-primary font-bold text-right break-keep">완벽한 주까지 2일 남음</span>
          </div>
          <div className="flex justify-between items-center px-1 sm:px-2">
            {weekDays.map((day, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 sm:gap-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{day}</span>
                <div className={`size-8 sm:size-10 rounded-full flex items-center justify-center transition-all ${
                  activityData[idx]
                    ? 'bg-accent-amber text-navy-deep shadow-[0_0_15px_rgba(230,154,60,0.4)]'
                    : 'bg-white/5 border border-white/10 text-slate-700'
                }`}>
                  {activityData[idx] && <span className="material-symbols-outlined text-xs sm:text-sm font-bold">check</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <div className="bg-navy-card p-4 sm:p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">최장 기록</p>
            <p className="text-xl sm:text-2xl font-bold">12일</p>
          </div>
          <div className="bg-navy-card p-4 sm:p-5 rounded-3xl border border-white/5">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">총 학습 일수</p>
            <p className="text-xl sm:text-2xl font-bold">48일</p>
          </div>
        </div>

        <div className="bg-primary/5 p-4 sm:p-6 rounded-[2rem] border border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-5xl">format_quote</span>
          </div>
          <h3 className="text-xs font-bold text-primary uppercase mb-3 tracking-widest">오늘의 리더십 습관</h3>
          <p className="text-sm italic leading-relaxed text-slate-200 break-keep">
            "리더십은 지위가 아니라 매일 행하는 행동입니다. Alex님의 꾸준함이 팀의 문화를 바꿉니다."
          </p>
        </div>

        <div className="mt-6 sm:mt-8">
           <button
             onClick={() => navigate('/missions')}
             className="w-full bg-accent-amber text-navy-deep py-4 sm:py-5 rounded-2xl font-bold shadow-xl shadow-accent-amber/10 active:scale-95 transition-all text-sm sm:text-base"
           >
             오늘의 미션 참여하기
           </button>
           <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-widest">Keep the flame alive!</p>
        </div>
      </main>
    </div>
  );
};

export default StreakDetail;
