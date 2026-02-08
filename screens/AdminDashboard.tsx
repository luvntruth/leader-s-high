
import { DataService, LeaderData } from '../services/dataService';
import React, { useState, useEffect, useMemo } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderData[]>([]);
  const [activeTab, setActiveTab] = useState<'stats' | 'leaders' | 'feedback'>('stats');
  const [feedbackLogs, setFeedbackLogs] = useState<any[]>([]);

  useEffect(() => {
    DataService.initOrgData();
    setLeaders(DataService.getOrgData());
    setFeedbackLogs(JSON.parse(localStorage.getItem('leadershigh_ai_feedback_logs') || '[]'));
  }, []);

  const stats = useMemo(() => {
    const total = feedbackLogs.length;
    const positive = feedbackLogs.filter(f => f.type === 'positive').length;
    const satisfaction = total > 0 ? Math.floor((positive / total) * 100) : 0;
    return { ...DataService.getOrgStats(), satisfaction };
  }, [feedbackLogs]);

  return (
    <div className="h-screen bg-[#0A0F1D] text-white flex flex-col font-manrope overflow-hidden">
      <header className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-navy-card/50 backdrop-blur-2xl z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/profile')} className="size-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <span className="material-symbols-outlined text-slate-400">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight italic">COMMAND CENTER</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">실시간 운영 지표 및 피드백 로그</p>
          </div>
        </div>
      </header>

      <nav className="flex px-4 bg-navy-card/30 border-b border-white/5 z-10">
        {[
          { id: 'stats', label: '운영 지표', icon: 'monitoring' },
          { id: 'leaders', label: '리더 관리', icon: 'groups' },
          { id: 'feedback', label: 'AI 피드백 로그', icon: 'rate_review' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-5 text-[10px] font-black uppercase tracking-widest relative ${activeTab === tab.id ? 'text-primary bg-white/5' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-neon-cyan"></div>}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-32 hide-scrollbar">
        {activeTab === 'stats' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-navy-card border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">리포트 만족도 (MVP)</p>
                 <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-white">{stats.satisfaction}%</h2>
                    <span className="text-[10px] text-primary font-bold">POSITIVE</span>
                 </div>
              </div>
              <div className="bg-navy-card border border-white/5 p-6 rounded-[2.5rem] shadow-xl">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">총 훈련 수</p>
                 <div className="flex items-baseline gap-2">
                    <h2 className="text-3xl font-black text-white">{leaders.length * 3}</h2>
                    <span className="text-[10px] text-accent-neon font-bold">ACTIVE</span>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-4 animate-in fade-in duration-500">
            <h3 className="text-sm font-bold px-1">사용자 피드백 실시간 로그</h3>
            {feedbackLogs.length > 0 ? (
              feedbackLogs.slice().reverse().map((log) => (
                <div key={log.id} className="bg-navy-card p-5 rounded-[2rem] border border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${log.type === 'positive' ? 'bg-primary/20 text-primary' : 'bg-red-500/20 text-red-500'}`}>
                         <span className="material-symbols-outlined">{log.type === 'positive' ? 'thumb_up' : 'thumb_down'}</span>
                      </div>
                      <div>
                         <p className="text-sm font-bold text-white">{log.scenarioId || '알 수 없는 시나리오'}</p>
                         <p className="text-[9px] text-slate-500 uppercase">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                   </div>
                   <span className="text-[10px] font-black text-slate-600">ID: {log.id.toString().slice(-4)}</span>
                </div>
              ))
            ) : (
              <div className="py-24 text-center opacity-30">
                <span className="material-symbols-outlined text-4xl mb-4">analytics</span>
                <p className="text-sm">수집된 피드백 데이터가 아직 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
