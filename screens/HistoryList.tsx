
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

const HistoryList: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    setHistory(data);
  }, []);

  return (
    <div className="h-screen bg-background-dark text-gray-900 flex flex-col font-manrope overflow-hidden">
      <header className="p-4 border-b border-gray-200 flex items-center gap-4 bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate('/profile')} className="p-2 hover:bg-gray-100 rounded-full">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div>
          <h1 className="text-lg font-bold">대화 히스토리</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Leadership Logs</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar pb-20">
        {history.length > 0 ? (
          history.map((item) => (
            <div 
              key={item.id}
              onClick={() => navigate(`/history/${item.id}`)}
              className="bg-surface-dark/40 border border-gray-200 p-5 rounded-[2rem] flex items-center justify-between group active:scale-[0.98] transition-all hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  item.type === 'voice' ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,108,117,0.3)]' : 'bg-accent-neon/20 text-accent-neon shadow-[0_0_15px_rgba(49,130,246,0.2)]'
                }`}>
                  <span className="material-symbols-outlined text-2xl">{item.type === 'voice' ? 'mic' : 'chat'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-600 group-hover:text-gray-900 transition-colors">{item.scenarioTitle}</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-tighter">
                    {item.memberName} • {new Date(item.date).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-primary transition-colors">chevron_right</span>
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
