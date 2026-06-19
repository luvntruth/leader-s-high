import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

type FunnelRow = {
  variant: string;
  onboarding: number;
  sim_start: number;
  signups: number;
  pricing_views: number;
  purchases: number;
  signup_rate_pct: number | null;
  purchase_rate_pct: number | null;
};

// 랜딩 버전(lp) → 한글 라벨
const VARIANT_LABEL: Record<string, string> = {
  practice: '연습 강조',
  diagnosis: '진단 강조',
  'new-manager': '신임 팀장',
  '(none)': '미지정',
};

// 날짜 범위 프리셋 — Meta Ads Manager 기간과 맞춰 대조하기 위함.
// from() 은 시작 시점(ISO) 또는 null(전체). 종료는 항상 현재까지.
type RangeKey = 'all' | '7d' | '30d' | 'month';
const RANGES: { key: RangeKey; label: string; from: () => string | null }[] = [
  { key: '7d', label: '최근 7일', from: () => new Date(Date.now() - 7 * 864e5).toISOString() },
  { key: '30d', label: '최근 30일', from: () => new Date(Date.now() - 30 * 864e5).toISOString() },
  { key: 'month', label: '이번 달', from: () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString(); } },
  { key: 'all', label: '전체', from: () => null },
];

export default function GrowthDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('7d');
  // A: 광고비/객단가 입력 (브라우저에 보존) → CPA·ROAS 자동 계산.
  // 광고비는 기간에 종속되므로 range 별로 분리 저장한다(7일치/30일치를 섞지 않기 위함).
  const [adSpend, setAdSpend] = useState<number>(() => Number(localStorage.getItem('growth_ad_spend_7d')) || 0);
  const [aov, setAov] = useState<number>(() => Number(localStorage.getItem('growth_aov')) || 8900);

  // 기간 전환 시 해당 기간에 저장된 광고비를 다시 불러온다.
  useEffect(() => {
    setAdSpend(Number(localStorage.getItem(`growth_ad_spend_${range}`)) || 0);
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const p_from = RANGES.find(r => r.key === range)?.from() ?? null;
      const { data, error } = await supabase.rpc('get_ab_funnel', { p_from, p_to: null });
      if (cancelled) return;
      if (error) {
        setError(
          error.message.includes('forbidden')
            ? '이 대시보드는 owner 계정만 볼 수 있습니다.'
            : `데이터를 불러오지 못했습니다: ${error.message}`,
        );
      } else {
        setError(null);
        setRows((data as FunnelRow[]) || []);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [range]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        onboarding: acc.onboarding + (r.onboarding || 0),
        sim_start: acc.sim_start + (r.sim_start || 0),
        signups: acc.signups + (r.signups || 0),
        pricing_views: acc.pricing_views + (r.pricing_views || 0),
        purchases: acc.purchases + (r.purchases || 0),
      }),
      { onboarding: 0, sim_start: 0, signups: 0, pricing_views: 0, purchases: 0 },
    );
  }, [rows]);

  // A: 단위 경제성 — CPA(결제 1건당 광고비), 매출(=결제수×객단가), ROAS, 손익분기
  const econ = useMemo(() => {
    const cpa = totals.purchases > 0 ? adSpend / totals.purchases : null;   // 광고비/결제수
    const cpSignup = totals.signups > 0 ? adSpend / totals.signups : null;  // 가입 1건당 광고비
    const revenue = totals.purchases * aov;
    const roas = adSpend > 0 ? revenue / adSpend : null;                    // 매출/광고비 (1 이상이면 흑자)
    const profitable = cpa !== null && cpa <= aov;                          // CPA ≤ 객단가면 결제 단건 기준 흑자
    return { cpa, cpSignup, revenue, roas, profitable };
  }, [adSpend, aov, totals]);

  // B: 단계별 전환율 + 최대 누수 구간. 가장 낮은 통과율 단계를 병목으로 본다.
  const funnel = useMemo(() => {
    const steps = [
      { from: '진입', to: '시뮬 시작', a: totals.onboarding, b: totals.sim_start },
      { from: '시뮬 시작', to: '가입', a: totals.sim_start, b: totals.signups },
      { from: '가입', to: '플랜조회', a: totals.signups, b: totals.pricing_views },
      { from: '플랜조회', to: '결제', a: totals.pricing_views, b: totals.purchases },
    ].map(s => ({ ...s, rate: s.a > 0 ? (s.b / s.a) * 100 : null }));
    const measurable = steps.filter(s => s.rate !== null && s.a >= 5); // 표본 5건 미만은 노이즈라 병목 판정 제외
    const worst = measurable.length ? measurable.reduce((m, s) => (s.rate! < m.rate! ? s : m)) : null;
    return { steps, worst };
  }, [totals]);

  const saveSpend = (v: number) => { setAdSpend(v); localStorage.setItem(`growth_ad_spend_${range}`, String(v)); };
  const rangeLabel = RANGES.find(r => r.key === range)?.label ?? '';
  const saveAov = (v: number) => { setAov(v); localStorage.setItem('growth_aov', String(v)); };
  const won = (n: number) => '₩' + Math.round(n).toLocaleString();

  return (
    <div className="min-h-screen bg-[#05070a] text-gray-100 pb-24 px-5 lg:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-300 mb-6">← 돌아가기</button>
        <h1 className="text-2xl font-black text-white italic">광고 A/B 성과</h1>
        <p className="text-xs text-slate-500 font-bold mt-1 mb-4">랜딩 버전(lp)별 진입 → 가입 → 결제 퍼널 · 세션 기준</p>

        {/* 날짜 범위 — Meta 광고 기간과 맞춰 대조 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                range === r.key
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-primary animate-pulse">데이터 로드 중...</div>}
        {error && <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-300">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400">
            아직 집계된 데이터가 없습니다. 광고 집행 후 유입이 쌓이면 표시됩니다.
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            {/* 합계 카드 */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                ['총 진입', totals.onboarding],
                ['총 가입', totals.signups],
                ['총 결제', totals.purchases],
              ].map(([label, val]) => (
                <div key={label as string} className="rounded-2xl border border-white/10 bg-[#0c0f14] p-5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className="text-2xl font-black text-primary mt-1">{(val as number).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* A: 단위 경제성 — 광고가 남는 장사인지 판정 */}
            <div className="rounded-3xl border border-white/5 bg-[#0c0f14] p-5 lg:p-6 mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">단위 경제성 (광고 회수 판정)</p>
              <div className="flex flex-wrap gap-4 mb-5">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400">광고비 ({rangeLabel}, ₩)</span>
                  <input
                    type="number" inputMode="numeric" value={adSpend || ''}
                    onChange={e => saveSpend(Number(e.target.value) || 0)}
                    placeholder="예: 300000"
                    className="w-40 rounded-xl border border-white/10 bg-[#05070a] px-3 py-2 text-sm text-white focus:border-primary/50 outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400">평균 객단가 (₩)</span>
                  <input
                    type="number" inputMode="numeric" value={aov || ''}
                    onChange={e => saveAov(Number(e.target.value) || 0)}
                    placeholder="8900"
                    className="w-40 rounded-xl border border-white/10 bg-[#05070a] px-3 py-2 text-sm text-white focus:border-primary/50 outline-none"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-white/10 bg-[#05070a] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">결제 CPA</p>
                  <p className={`text-xl font-black mt-1 ${econ.cpa === null ? 'text-slate-600' : econ.profitable ? 'text-emerald-400' : 'text-red-400'}`}>
                    {econ.cpa === null ? '—' : won(econ.cpa)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">결제 1건당 광고비</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#05070a] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">가입 CPA</p>
                  <p className="text-xl font-black mt-1 text-slate-200">{econ.cpSignup === null ? '—' : won(econ.cpSignup)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">가입 1건당 광고비</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#05070a] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">매출(추정)</p>
                  <p className="text-xl font-black mt-1 text-slate-200">{won(econ.revenue)}</p>
                  <p className="text-[10px] text-slate-500 mt-1">결제수 × 객단가</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#05070a] p-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ROAS</p>
                  <p className={`text-xl font-black mt-1 ${econ.roas === null ? 'text-slate-600' : econ.roas >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {econ.roas === null ? '—' : econ.roas.toFixed(2) + '×'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">1.0× 이상이면 흑자</p>
                </div>
              </div>
              {econ.cpa !== null && (
                <p className={`text-xs font-bold mt-4 ${econ.profitable ? 'text-emerald-400' : 'text-red-400'}`}>
                  {econ.profitable
                    ? `✓ 결제 CPA(${won(econ.cpa)}) ≤ 객단가(${won(aov)}) — 결제 단건 기준 회수됩니다.`
                    : `⚠ 결제 CPA(${won(econ.cpa)}) > 객단가(${won(aov)}) — 단건으론 손해. 전환율 개선 또는 재구매(LTV)로 회수해야 합니다.`}
                </p>
              )}
              {adSpend === 0 && <p className="text-[11px] text-slate-600 mt-3">Meta Ads Manager의 이 기간 지출(Spend)을 입력하면 CPA·ROAS가 계산됩니다.</p>}
            </div>

            {/* B: 깔때기 누수 분석 — 단계별 통과율 + 최대 병목 */}
            <div className="rounded-3xl border border-white/5 bg-[#0c0f14] p-5 lg:p-6 mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">깔때기 누수 분석 (어디서 가장 많이 새는가)</p>
              <div className="space-y-3">
                {funnel.steps.map(s => {
                  const isWorst = funnel.worst && s.from === funnel.worst.from && s.to === funnel.worst.to;
                  return (
                    <div key={s.from + s.to}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-300">{s.from} → {s.to} {isWorst && <span className="ml-1 text-red-400">· 최대 누수</span>}</span>
                        <span className={`font-black ${isWorst ? 'text-red-400' : 'text-slate-300'}`}>{s.rate === null ? '—' : s.rate.toFixed(1) + '%'}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className={`h-full rounded-full ${isWorst ? 'bg-red-500/70' : 'bg-primary/60'}`} style={{ width: `${Math.min(s.rate ?? 0, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {funnel.worst
                ? <p className="text-xs font-bold text-red-300 mt-4">→ 우선 개선 대상: <span className="text-white">{funnel.worst.from} → {funnel.worst.to}</span> 구간 (통과율 {funnel.worst.rate!.toFixed(1)}%). 여기를 끌어올리는 게 같은 광고비로 결제를 늘리는 가장 빠른 길입니다.</p>
                : <p className="text-[11px] text-slate-600 mt-3">표본이 더 쌓이면(단계별 5건 이상) 최대 누수 구간을 자동으로 짚어줍니다.</p>}
            </div>

            {/* 버전별 퍼널 테이블 */}
            <div className="rounded-3xl border border-white/5 bg-[#0c0f14] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-5 py-4">버전</th>
                      <th className="px-5 py-4 text-right">진입</th>
                      <th className="px-5 py-4 text-right">시뮬 시작</th>
                      <th className="px-5 py-4 text-right">가입</th>
                      <th className="px-5 py-4 text-right">가입률</th>
                      <th className="px-5 py-4 text-right">플랜조회</th>
                      <th className="px-5 py-4 text-right">결제</th>
                      <th className="px-5 py-4 text-right">결제율</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rows.map(r => (
                      <tr key={r.variant} className="hover:bg-white/[0.02]">
                        <td className="px-5 py-4 font-bold text-white">{VARIANT_LABEL[r.variant] || r.variant}
                          <span className="ml-2 text-[10px] text-slate-600">{r.variant}</span>
                        </td>
                        <td className="px-5 py-4 text-right text-slate-300">{r.onboarding?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-slate-400">{r.sim_start?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-slate-300">{r.signups?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-accent-amber">{r.signup_rate_pct ?? 0}%</td>
                        <td className="px-5 py-4 text-right text-slate-400">{r.pricing_views?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right text-slate-300">{r.purchases?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-400">{r.purchase_rate_pct ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-4">버전: practice=연습 / diagnosis=진단 / new-manager=신임팀장 (광고 URL의 lp 파라미터 기준)</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-[11px] leading-5 text-slate-400">
              <p className="font-bold text-slate-300 mb-1">Meta 광고 성과 대조법</p>
              여기 <span className="text-slate-200">가입·결제</span>는 DB 실측치(전체 기간 누적, 세션 기준)입니다. Meta Ads Manager의 보고 전환수와 비교해
              차이가 크면 Meta가 조회 기여로 과대 집계 중일 수 있습니다. Meta는 <span className="text-slate-200">7일 클릭</span> 기여로 보고,
              기간을 맞춰 대조하세요. CPA는 (Meta 광고비 ÷ 위 결제수)로 계산하면 실질 전환단가가 나옵니다.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
