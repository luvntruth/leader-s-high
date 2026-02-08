
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { useNavigate, useParams } from 'react-router-dom';

const HistoryDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('leadershigh_history') || '[]');
    const found = history.find((h: any) => h.id === id);
    if (found) {
      setData(found);
    } else {
      navigate('/history');
    }
  }, [id, navigate]);

  if (!data) return null;

  return (
    <div className="h-screen bg-[#0A0F1D] text-white flex flex-col font-manrope overflow-hidden">
      <header className="p-4 border-b border-white/5 flex items-center justify-between bg-background-dark/80 backdrop-blur-md sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 transition-transform active:scale-90">
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="text-center">
          <h1 className="text-sm font-bold">{data.scenarioTitle}</h1>
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">{data.memberName}님과의 면담 기록</p>
        </div>
        <button className="p-2 text-red-500 opacity-50"><span className="material-symbols-outlined">delete</span></button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar pb-10">
        {data.evaluation && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem]">
              <h3 className="text-[10px] font-bold text-primary uppercase mb-3 tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                AI 정밀 분석 요약
              </h3>
              <p className="text-sm font-bold text-slate-100 leading-tight">{data.evaluation.summary}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-2">
           <div className="h-px bg-white/5 flex-1"></div>
           <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Transcript Logs</p>
           <div className="h-px bg-white/5 flex-1"></div>
        </div>

        <div className="space-y-8 px-2">
          {data.transcript.map((msg: any, idx: number) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
               <div className={`max-w-[90%] p-5 rounded-[1.5rem] border ${
                 msg.role === 'user' 
                   ? 'bg-[#161D2F] border-primary/20 text-white rounded-tr-none' 
                   : 'bg-white/5 border-white/5 text-slate-200 rounded-tl-none'
               }`}>
                 <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
               </div>
               <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mt-2 ${msg.role === 'user' ? 'text-primary' : 'text-slate-500'}`}>
                 {msg.role === 'user' ? 'Leader' : data.memberName}
               </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-4 bg-background-dark/90 border-t border-white/5 flex gap-3">
         <button onClick={() => navigate('/')} className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs">홈으로</button>
         <button onClick={() => navigate('/missions')} className="flex-1 py-4 bg-primary text-navy-deep rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-widest">Next Mission</button>
      </footer>
    </div>
  );
};

export default HistoryDetail;
