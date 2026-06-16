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

export default function GrowthDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('get_ab_funnel');
      if (error) {
        setError(
          error.message.includes('forbidden')
            ? '이 대시보드는 owner 계정만 볼 수 있습니다.'
            : `데이터를 불러오지 못했습니다: ${error.message}`,
        );
      } else {
        setRows((data as FunnelRow[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        onboarding: acc.onboarding + (r.onboarding || 0),
        signups: acc.signups + (r.signups || 0),
        purchases: acc.purchases + (r.purchases || 0),
      }),
      { onboarding: 0, signups: 0, purchases: 0 },
    );
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#05070a] text-gray-100 pb-24 px-5 lg:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-300 mb-6">← 돌아가기</button>
        <h1 className="text-2xl font-black text-white italic">광고 A/B 성과</h1>
        <p className="text-xs text-slate-500 font-bold mt-1 mb-8">랜딩 버전(lp)별 진입 → 가입 → 결제 퍼널 · 세션 기준</p>

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
                        <td className="px-5 py-4 text-right text-slate-300">{r.purchases?.toLocaleString()}</td>
                        <td className="px-5 py-4 text-right font-bold text-emerald-400">{r.purchase_rate_pct ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-[11px] text-slate-600 mt-4">버전: practice=연습 / diagnosis=진단 / new-manager=신임팀장 (광고 URL의 lp 파라미터 기준)</p>
          </>
        )}
      </div>
    </div>
  );
}
