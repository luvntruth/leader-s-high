import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/dbService';
import type { SimulationRecord } from '../src/types/database';

// recharts(~367KB) 초기 번들 제외
const CompetencyRadar = lazy(() => import('../components/CompetencyRadar'));

// 5개 역량 축 (Supabase radar_chart 키와 매핑)
const RADAR_KEYS = [
  { key: 'trust', label: '신뢰 구축' },
  { key: 'motivation', label: '동기 부여' },
  { key: 'conflict', label: '갈등 관리' },
  { key: 'strategy', label: '전략 사고' },
  { key: 'decision', label: '의사 결정' },
] as const;

// 역량별 "오늘부터 실천" 정형화 팁 (약점 기반 추천에 사용)
const IMPROVEMENT_TIPS: Record<string, string> = {
  trust: '대화 초반 30초를 지적 대신 공감 표현("요즘 어떠세요?")으로 시작해보세요.',
  motivation: '지시보다 "이 일이 당신 성장에 어떻게 도움이 될지"를 먼저 짚어보세요.',
  conflict: '반박하기 전에 상대의 입장을 한 문장으로 요약해 되돌려주세요.',
  strategy: '업무를 맡길 때 목표·우선순위·마감을 한 번에 명확히 전달하세요.',
  decision: '결정을 내릴 땐 근거를 한 문장으로 정리해 함께 전달하세요.',
};

// 데이터가 충분히 쌓이기 전까지 분석을 열지 않는 최소 완주 횟수
const MIN_COMPLETED = 3;

const Insights: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setLoading(false); return; }
    dbService.getHistory(user.id, 50)
      .then(recs => {
        if (cancelled) return;
        setHistory(recs.filter(r => r.completed));
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  // ── 실데이터 기반 정형화 집계 ──
  const stats = useMemo(() => {
    const completed = history;
    const count = completed.length;
    if (count < MIN_COMPLETED) return null;

    // 역량 레이더 평균 (radar_chart 실데이터)
    const radarAvg: Record<string, number> = {};
    for (const { key } of RADAR_KEYS) {
      const vals = completed
        .map(r => (r.radar_chart as Record<string, number> | null)?.[key])
        .filter((v): v is number => typeof v === 'number');
      radarAvg[key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    }

    // 평균 신뢰도
    const trustVals = completed
      .map(r => r.final_trust)
      .filter((v): v is number => typeof v === 'number');
    const avgTrust = trustVals.length ? Math.round(trustVals.reduce((a, b) => a + b, 0) / trustVals.length) : null;

    // 성장 추이 — 오래된 → 최신 순, 세션별 신뢰도
    const trend = [...completed]
      .reverse()
      .map((r, i) => ({ session: i + 1, trust: typeof r.final_trust === 'number' ? r.final_trust : 0, title: r.scenario_title }));

    // 신뢰도 개선폭 (첫 절반 평균 vs 나중 절반 평균)
    let growth: number | null = null;
    if (trend.length >= 4) {
      const half = Math.floor(trend.length / 2);
      const early = trend.slice(0, half);
      const late = trend.slice(half);
      const avg = (arr: typeof trend) => arr.reduce((a, b) => a + b.trust, 0) / arr.length;
      growth = Math.round(avg(late) - avg(early));
    }

    // 강점/약점 (레이더 최고/최저)
    const ranked = RADAR_KEYS.map(k => ({ key: k.key, label: k.label, value: radarAvg[k.key] })).sort((a, b) => b.value - a.value);
    const strength = ranked[0];
    const weakness = ranked[ranked.length - 1];

    const radarData = RADAR_KEYS.map(k => ({ subject: k.label, A: radarAvg[k.key], fullMark: 100 }));

    return { count, radarAvg, avgTrust, trend, growth, strength, weakness, radarData };
  }, [history]);

  // ── 로딩 ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060B18] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const remaining = Math.max(0, MIN_COMPLETED - history.length);

  return (
    <div className="min-h-screen bg-[#060B18] text-white pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-[#060B18]/90 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <span className="material-symbols-outlined text-slate-400">arrow_back</span>
        </button>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Performance</p>
          <h1 className="text-sm font-bold">성과 분석</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 데이터 부족 안내 */}
        {stats === null ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="size-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-amber-400 text-3xl">query_stats</span>
            </div>
            <h2 className="text-white font-black text-xl mb-2">성과 분석 준비 중</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-6">
              시뮬레이션을 <span className="text-amber-400 font-bold">{MIN_COMPLETED}회 이상 완주</span>하면,
              누적 대화 데이터를 기반으로 역량 분석과 성장 추이가 자동 생성됩니다.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="text-slate-500 text-xs">분석까지</span>
              <span className="text-amber-400 font-black text-sm">{history.length}/{MIN_COMPLETED}회</span>
            </div>
            <button onClick={() => navigate('/missions')} className="px-6 py-3 rounded-xl bg-amber-500 text-slate-900 font-bold text-sm active:scale-95 transition-all">
              시뮬레이션 시작하기 →
            </button>
          </div>
        ) : (
          <>
            {/* 핵심 지표 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111A2E]/60 rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">완주</p>
                <p className="text-2xl font-black text-amber-400">{stats.count}<span className="text-xs text-slate-500 ml-0.5">회</span></p>
              </div>
              <div className="bg-[#111A2E]/60 rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">평균 신뢰도</p>
                <p className="text-2xl font-black text-emerald-400">{stats.avgTrust ?? '-'}<span className="text-xs text-slate-500 ml-0.5">점</span></p>
              </div>
              <div className="bg-[#111A2E]/60 rounded-2xl p-4 border border-white/5 text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">성장</p>
                <p className={`text-2xl font-black ${stats.growth == null ? 'text-slate-500' : stats.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.growth == null ? '-' : `${stats.growth >= 0 ? '+' : ''}${stats.growth}`}
                </p>
              </div>
            </div>

            {/* 역량 레이더 */}
            <section className="bg-[#111A2E]/50 rounded-[2rem] p-6 border border-white/5">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">radar</span>
                역량 레이더 · 최근 {stats.count}회 평균
              </h2>
              <Suspense fallback={<div className="min-h-[280px] w-full animate-pulse bg-white/[0.02] rounded-xl" />}>
                <CompetencyRadar data={stats.radarData} />
              </Suspense>
            </section>

            {/* 성장 추이 */}
            <section className="bg-[#111A2E]/50 rounded-[2rem] p-6 border border-white/5">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-base">trending_up</span>
                신뢰도 성장 추이
              </h2>
              <div className="flex items-end justify-between gap-1.5 h-32">
                {stats.trend.map((t, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="w-full bg-white/5 rounded-t-md relative flex-1 flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/70 to-primary transition-all duration-700"
                        style={{ height: `${Math.max(4, t.trust)}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-600 font-bold">{t.session}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-2 text-center">세션별 최종 신뢰도 (오래된 → 최신)</p>
            </section>

            {/* 정형화 인사이트 */}
            <section className="space-y-3">
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-base">lightbulb</span>
                맞춤 인사이트
              </h2>

              {/* 강점 */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-emerald-400 text-sm">verified</span>
                  <p className="text-xs font-black text-emerald-400">가장 강한 역량 · {stats.strength.label} ({stats.strength.value}점)</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  누적 대화에서 <span className="text-white font-bold">{stats.strength.label}</span> 역량이 가장 안정적으로 나타났습니다. 이 강점을 팀과의 신뢰 자산으로 계속 활용하세요.
                </p>
              </div>

              {/* 개선점 + 추천 실천 */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="material-symbols-outlined text-amber-400 text-sm">trending_up</span>
                  <p className="text-xs font-black text-amber-400">우선 강화 역량 · {stats.weakness.label} ({stats.weakness.value}점)</p>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  <span className="text-white font-bold">{stats.weakness.label}</span> 역량이 상대적으로 낮습니다. 아래 한 가지를 다음 대화에서 바로 적용해보세요.
                </p>
                <div className="bg-black/30 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-amber-300 text-base mt-0.5">💬</span>
                  <p className="text-[13px] text-amber-200/90 leading-relaxed">{IMPROVEMENT_TIPS[stats.weakness.key] || '다음 대화에서 상대의 입장을 먼저 확인해보세요.'}</p>
                </div>
              </div>

              {/* 추천 다음 행동 */}
              <div className="bg-[#111A2E]/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {stats.weakness.label} 강화에 좋은 시나리오로 다음 훈련을 이어가세요.
                </p>
                <button onClick={() => navigate('/missions')} className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-black active:scale-95 transition-all">
                  퀘스트로 →
                </button>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Insights;
