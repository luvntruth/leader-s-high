
import React, { useState, useEffect, useMemo } from 'react';
import { DataService, LeaderData, RadarStats } from '../services/dataService';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';

type TabType = 'STRATEGY' | 'INTELLIGENCE' | 'LOGS';

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('STRATEGY');
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptRanking, setDeptRanking] = useState<any[]>([]);

  useEffect(() => {
    // 조직 데이터 초기화 (DB 우선, localStorage 폴백)
    if (profile?.org_id) {
      dbService.getOrgMembers(profile.org_id).then(members => {
        if (members.length > 0) {
          console.log(`조직 멤버 ${members.length}명 로드 (DB)`);
        }
      });
      dbService.getOrgHistory(profile.org_id).then(history => {
        if (history.length > 0) {
          setLogs(history.map((h, i) => ({
            id: `log-${i}`,
            timestamp: h.created_at,
            leaderName: h.user_id,
            scenarioTitle: h.scenario_title,
            score: h.final_trust || 0,
            category: h.scenario_category || '기타',
          })));
        }
      });
    }
    DataService.initOrgData();
    const adminStats = DataService.getAdminStats();
    const feedbackLogs = DataService.getFeedbackLogs();
    const deptMetrics = DataService.getDeptMetrics();

    setStats(adminStats);
    setLogs(feedbackLogs);
    setDeptRanking(deptMetrics);
  }, []);

  // 유연한 설계를 위한 설정 데이터 (Config)
  const STRATEGY_CONFIG = {
    heatmapAttributes: [
      { key: 'trust', label: '신뢰 구축', icon: 'handshake' },
      { key: 'motivation', label: '동기 부여', icon: 'bolt' },
      { key: 'conflict', label: '갈등 해결', icon: 'Gavel' },
      { key: 'decision', label: '피드백', icon: 'chat' },
      { key: 'strategy', label: '성과 관리', icon: 'trending_up' }
    ]
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    return logs.filter(log =>
      log.leaderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.scenarioTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [logs, searchQuery]);

  if (!stats) return <div className="min-h-screen bg-[#060B18] flex items-center justify-center text-primary animate-pulse">데이터 로드 중...</div>;

  return (
    <div className="min-h-screen bg-[#05070a] text-gray-100 pb-24 font-sans selection:bg-primary/30">

      {/* ═══════════════ TOP COMMAND NAV ═══════════════ */}
      <header className="sticky top-0 z-50 bg-[#0c0f14]/80 backdrop-blur-xl border-b border-white/5 px-6 lg:px-10 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white uppercase italic">HR Strategic Command Center</h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Organizational Intelligence & Tactical Support</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-8">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Total Trainings</p>
                <p className="text-lg font-black text-primary">{stats.totalTrainings.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase">Average LQ</p>
                <p className="text-lg font-black text-accent-amber">{stats.averageLQ}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
              <span className="material-symbols-outlined text-sm text-slate-400">refresh</span>
              <span className="text-xs font-bold text-slate-300">리포트 갱신</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-8">

        {/* ── TAB NAVIGATION ── */}
        <nav className="flex gap-2 mb-10 bg-[#111B2E]/50 p-1.5 rounded-2xl w-fit border border-white/5">
          {(['STRATEGY', 'INTELLIGENCE', 'LOGS'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl text-xs font-black tracking-widest transition-all duration-300 flex items-center gap-3 ${activeTab === tab
                  ? 'bg-primary text-black shadow-[0_0_25px_rgba(0,242,255,0.3)] scale-105'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="material-symbols-outlined text-base">
                {tab === 'STRATEGY' ? 'insights' : tab === 'INTELLIGENCE' ? 'query_stats' : 'history_edu'}
              </span>
              {tab === 'STRATEGY' ? '전략 분석' : tab === 'INTELLIGENCE' ? '리더 지능' : '활동 로그'}
            </button>
          ))}
        </nav>

        {/* ── TAB CONTENT: STRATEGY ── */}
        {activeTab === 'STRATEGY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-avatar-entrance">
            {/* 리더십 역량 페인포인트 히트맵 */}
            <div className="lg:col-span-12 xl:col-span-7 bg-[#0c0f14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[120px]">grid_view</span>
              </div>
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white italic">조직 역량 페인포인트 히트맵</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">부서별·역량별 평균 성취도 분석 (Lower score = High priority)</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {stats.painPoints.map((point: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border transition-all duration-500 ${point.status === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 shadow-neon-red' :
                          point.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/20 shadow-neon-amber' :
                            'bg-emerald-500/10 border-emerald-500/20 shadow-neon-green'
                        }`}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <span className={`material-symbols-outlined text-3xl ${point.status === 'CRITICAL' ? 'text-red-400' :
                            point.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                          {STRATEGY_CONFIG.heatmapAttributes.find(a => a.label === point.attribute)?.icon || 'star'}
                        </span>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{point.attribute}</p>
                          <p className="text-2xl font-black text-white">{point.score}%</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${point.status === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                            point.status === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                          {point.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 퀘스트 인기도 (Top 5) */}
            <div className="lg:col-span-12 xl:col-span-5 bg-[#0c0f14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white italic">퀘스트 수락 트렌드</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">리더들이 실제로 가장 많이 고민하는 주제</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {stats.questPopularity.slice(0, 5).map((q: any, i: number) => (
                    <div key={i} className="space-y-2 group/item">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-primary italic">0{i + 1}</span>
                          <span className="text-xs font-bold text-slate-300">{q.name}</span>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase">{q.value} Occurrences</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/50 to-primary origin-left transition-transform duration-1000 ease-out"
                          style={{ width: `${(q.value / stats.questPopularity[0].value) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: INTELLIGENCE ── */}
        {activeTab === 'INTELLIGENCE' && (
          <div className="space-y-8 animate-avatar-entrance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 부서별 LQ 랭킹 */}
              <div className="bg-[#0c0f14] border border-white/5 rounded-3xl p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-white italic">부서별 리더십 랭킹</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">부서별 리더십 평균 LQ 지수 비교</p>
                  </div>
                </div>
                <div className="space-y-6">
                  {deptRanking.map((dept, idx) => (
                    <div key={idx} className="flex items-center gap-5 group">
                      <div className={`size-10 rounded-xl flex items-center justify-center font-black italic border ${idx === 0 ? 'bg-game-gold/10 border-game-gold/30 text-game-gold' :
                          idx === 1 ? 'bg-slate-300/10 border-slate-300/30 text-slate-300' :
                            idx === 2 ? 'bg-orange-500/10 border-orange-500/30 text-orange-500' :
                              'bg-white/5 border-white/10 text-slate-500'
                        }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">{dept.name}</span>
                          <span className="text-sm font-black text-primary">{dept.score} <span className="text-[10px] text-slate-600 font-bold">LQ</span></span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary/40 rounded-full"
                            style={{ width: `${(dept.score / 1000) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 고위험(High-Risk) 리더 드릴다운 */}
              <div className="bg-red-500/5 border border-red-500/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 text-red-500/10">
                  <span className="material-symbols-outlined text-[100px]">warning_amber</span>
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-black text-red-500 italic">High-Risk 리더 모니터링</h3>
                  <p className="text-xs text-red-500/60 font-bold mt-1 mb-8 italic">집중 코칭 및 지원이 필요한 대상 (LQ 710 미만)</p>

                  <div className="space-y-4">
                    {stats.highRiskLeaders.map((leader: LeaderData) => (
                      <div key={leader.id} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-red-500/30 transition-all cursor-pointer group">
                        <div className="flex items-center gap-4">
                          <div className="size-10 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-black">
                            {leader.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">{leader.name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{leader.dept}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-red-500">{leader.lq}</p>
                          <div className="flex items-center justify-end gap-1">
                            <span className="material-symbols-outlined text-[10px] text-red-500">trending_down</span>
                            <span className="text-[9px] text-red-500/60 font-black uppercase">Critical</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: LOGS ── */}
        {activeTab === 'LOGS' && (
          <div className="animate-avatar-entrance space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
              <div className="relative w-full md:w-96">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">search</span>
                <input
                  type="text"
                  placeholder="팀장명, 시나리오, 카테고리 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111B2E] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">download</span> 내보내기 (CSV)
                </button>
              </div>
            </div>

            <div className="bg-[#0c0f14] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">날짜 / 시간</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">수행 리더</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">미션 시나리오</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">점수</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">주요 피드백</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <p className="text-xs text-slate-400 font-medium">{new Date(log.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-black">
                              {log.leaderName[0]}
                            </div>
                            <p className="text-sm font-bold text-white">{log.leaderName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black text-slate-500 uppercase">{log.category}</span>
                          <p className="text-sm font-bold text-slate-300 mt-1.5">{log.scenarioTitle}</p>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`text-lg font-black ${log.score >= 85 ? 'text-emerald-400' : log.score >= 70 ? 'text-accent-amber' : 'text-red-400'}`}>
                            {log.score}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="max-w-xs xl:max-w-md">
                            <p className="text-xs text-slate-400 line-clamp-1 italic">"{log.feedback}"</p>
                            <button className="text-[10px] font-black text-primary mt-1 hover:underline underline-offset-4 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Full Tactical Report</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER STATS ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c0f14]/90 backdrop-blur-xl border-t border-white/5 px-8 pt-2 pb-6 flex justify-center items-center gap-12">
        <div className="flex items-center gap-3">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><span className="text-white">{stats.activeLeaders}</span> Active Leaders Synchronized</p>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-600 text-sm">security</span>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tactical Data Encryption Active</p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
