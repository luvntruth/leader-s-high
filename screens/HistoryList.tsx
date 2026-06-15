
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DataService } from '../services/dataService';

interface NormalizedListItem {
  id: string;
  scenarioTitle: string;
  memberName: string;
  createdAt: string;  // ISO
  source: 'supabase' | 'local';
}

/** Supabase(snake_case) + Legacy localStorage(camelCase) 를 공통 shape 로 변환 */
function normalize(raw: any): NormalizedListItem {
  const isSupabase = 'scenario_title' in raw || 'character_name' in raw || 'created_at' in raw;
  return {
    id: raw.id,
    scenarioTitle: raw.scenario_title || raw.scenarioTitle || '시나리오',
    memberName: raw.character_name || raw.memberName || '팀원',
    createdAt: raw.created_at || raw.date || new Date().toISOString(),
    source: isSupabase ? 'supabase' : 'local',
  };
}

const HistoryList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<NormalizedListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    DataService.getUserHistoryAsync(user?.id)
      .then((records: any[]) => {
        if (cancelled) return;
        setHistory(records.map(normalize));
      })
      .catch(() => {
        if (cancelled) return;
        const data = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
        setHistory(data.map(normalize));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="h-screen bg-background-dark text-white flex flex-col font-manrope overflow-hidden">
      <header className="p-4 border-b border-white/5 flex items-center gap-4 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-white/10 rounded-full shrink-0">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold break-keep">대화 히스토리</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Leadership Logs</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 hide-scrollbar pb-24">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 opacity-60">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">기록 불러오는 중...</p>
          </div>
        ) : history.length > 0 ? (
          history.map((item) => (
            <div
              key={item.id}
              onClick={() => navigate(`/history/${item.id}`)}
              className="bg-surface-dark/40 border border-white/5 p-4 sm:p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all hover:border-primary/30 cursor-pointer"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="size-10 sm:size-12 rounded-2xl flex items-center justify-center shrink-0 bg-accent-neon/20 text-accent-neon shadow-[0_0_15px_rgba(0,242,255,0.2)]">
                  <span className="material-symbols-outlined text-xl sm:text-2xl">chat</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-200 group-hover:text-white transition-colors break-keep text-sm sm:text-base leading-snug">{item.scenarioTitle}</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-tighter truncate">
                    {item.memberName} • {new Date(item.createdAt).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-700 group-hover:text-primary transition-colors shrink-0 ml-2">chevron_right</span>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
            <span className="material-symbols-outlined text-6xl mb-4">history_toggle_off</span>
            <p className="text-sm font-medium">아직 완료된 시뮬레이션이 없습니다.</p>
            <button
              onClick={() => navigate('/')}
              className="mt-6 px-6 py-2 bg-primary/20 text-primary rounded-full text-xs font-bold"
            >
              미션 시작하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryList;
