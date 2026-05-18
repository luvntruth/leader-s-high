import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, PAYMENT_OPTIONS, REPORT_PAYMENT_OPTION } from '../services/paymentService';
import { analyticsService } from '../services/analyticsService';
import PolicyFooter from '../components/PolicyFooter';

// Spec v3 §3: 3단 플랜 (Free / Pro / Ultra). Ultra 의 Coming Soon 기능은 카드에 명시
const PLAN_SUMMARY = {
  free: {
    badge: '가볍게 체험',
    title: '무료 체험',
    subtitle: '리더십 훈련 첫 경험',
    price: '₩0',
    description: '먼저 3개 시나리오로 서비스가 나에게 맞는지 부담 없이 확인하세요.',
    features: ['3개 시나리오 체험', '시나리오당 1회 시도', '12턴 시뮬레이션', '간략 피드백 리포트'],
  },
  pro: {
    badge: '가장 인기',
    title: '프로',
    subtitle: '반복 훈련에 가장 적합한 대표 플랜',
    price: '₩8,900',
    description: '40개 중 내가 원하는 20개를 골라 반복 훈련하고, 풀 리포트·기록 비교까지 가져가세요.',
    features: ['20개 시나리오 선택 가능', '시나리오당 최대 3회까지 도전 가능', '풀 리포트 무제한', '이전 기록 보관 및 비교', '실시간 즉시 코칭'],
  },
  ultra: {
    badge: '프리미엄',
    title: '울트라',
    subtitle: '모든 시나리오를 깊이 있게',
    price: '₩29,900',
    description: '40개 시나리오 전체 + 5회 도전 + 타인 비교 분석까지. 리더십을 본격적으로 확장하세요.',
    features: [
      '40개 시나리오 전체 이용',
      '시나리오당 최대 5회까지 도전',
      '풀 리포트 무제한',
      '이전 기록 보관 및 비교',
      '실시간 즉시 코칭',
    ],
    comingSoon: ['타인 비교 리더십 분석', '커스텀랩 (본인 캐릭터 생성)'],
  },
} as const;

// Spec v3 §3.4: 플랜 대비표 (Ultra 열 추가)
const FEATURE_ROWS = [
  ['시나리오 수', '3개', '20개 선택', '40개 전체'],
  ['시나리오당 시도', '1회', '최대 3회', '최대 5회'],
  ['사용 기간', '무제한', '10일 / 20일', '30일'],
  ['피드백 리포트', '간략', '풀 리포트', '풀 리포트'],
  ['이전 기록 비교', '—', '✓', '✓'],
  ['즉시 코칭', '—', '✓', '✓'],
  ['타인 비교 분석', '—', '—', '🔜 Soon'],
  ['커스텀랩', '—', '—', '🔜 Soon'],
] as const;

export default function Pricing() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const currentPlan = profile?.plan || 'free';
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const attribution = useMemo(() => analyticsService.getAttribution(), []);

  const remainingDays = paymentService.getRemainingDays(profile?.plan_expires_at || null);
  const isExpired = profile?.plan !== 'free' && paymentService.isPlanExpired(profile?.plan_expires_at || null);

  useEffect(() => {
    analyticsService.track(
      'pricing_view',
      analyticsService.withAttribution({
        current_plan: currentPlan,
        is_logged_in: Boolean(user),
      }),
      user?.id,
    );
  }, [currentPlan, user]);

  const handlePurchase = async (optionId: string) => {
    if (!user || !profile) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }
    const option = PAYMENT_OPTIONS.find(o => o.id === optionId);
    if (!option) return;

    analyticsService.track(
      'checkout_start',
      analyticsService.withAttribution({
        option_id: option.id,
        plan: option.plan,
        days: option.days,
        amount: option.amount,
      }),
      user.id,
    );

    setLoading(optionId);
    setResult(null);

    const res = await paymentService.requestPayment(option, {
      id: user.id,
      email: user.email || profile?.email || '',
    });

    setLoading(null);
    setResult({ ok: res.success, msg: res.message });

    if (res.success) {
      analyticsService.track(
        'checkout_success',
        analyticsService.withAttribution({
          option_id: option.id,
          plan: option.plan,
          days: option.days,
          amount: option.amount,
        }),
        user.id,
      );
      await refreshProfile();
      // Spec v3 §4-B: Pro 는 결제 후 시나리오 선택 화면으로, Ultra/기타는 홈으로
      const nextPath = option.plan === 'pro' ? '/select-scenarios' : '/';
      setTimeout(() => navigate(nextPath), 2000);
    }
  };

  const proOptions = PAYMENT_OPTIONS.filter(o => o.plan === 'pro');
  // Spec v3 §3.3: Ultra 30일 단일 옵션
  const ultraOption = PAYMENT_OPTIONS.find(o => o.plan === 'ultra' && o.days === 30) || PAYMENT_OPTIONS.find(o => o.plan === 'ultra');

  return (
    <div className="min-h-screen bg-[#0B1020] text-white pb-24 lg:pb-12 overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.12),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.08),transparent_22%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80 font-bold mb-3">Continue only if you need more</p>
          <h1 className="text-3xl lg:text-5xl font-black tracking-[-0.04em] leading-[1.04] text-white mb-4">
            무료 체험 후, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-200 to-amber-400">더 필요할 때만 확장하세요</span>
          </h1>
          <p className="text-slate-300 text-sm lg:text-base leading-7">
            지금은 여러 옵션을 비교할 필요 없습니다. 무료 체험으로 가치를 확인했고 반복 훈련이 필요할 때만 프로 플랜을 선택하면 됩니다.
          </p>

          {isExpired && (
            <p className="text-red-400 text-sm mt-4">현재 플랜이 만료되었습니다. 새 플랜을 구매해주세요.</p>
          )}
          {!isExpired && currentPlan !== 'free' && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
              <span className="size-2 rounded-full bg-amber-400" />
              현재 {currentPlan === 'pro' ? '프로' : '유료'} · 남은 기간 {remainingDays}일
            </div>
          )}
        </motion.div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 mx-auto max-w-3xl p-4 rounded-2xl text-center text-sm font-semibold border ${
              result.ok ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {result.msg}
          </motion.div>
        )}

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-14 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-7"
          >
            <div className="mb-6">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold tracking-[0.18em] uppercase text-slate-300">
                {PLAN_SUMMARY.free.badge}
              </span>
              <h3 className="text-white font-bold text-2xl mt-4 mb-1">{PLAN_SUMMARY.free.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{PLAN_SUMMARY.free.subtitle}</p>
              <div className="text-4xl font-black text-white mb-3">{PLAN_SUMMARY.free.price}</div>
              <p className="text-slate-400 text-sm leading-6">{PLAN_SUMMARY.free.description}</p>
            </div>

            <ul className="space-y-3 mb-8">
              {PLAN_SUMMARY.free.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="text-slate-500 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <button
              disabled
              className="w-full py-3.5 rounded-2xl bg-slate-700/40 text-slate-500 text-sm font-semibold cursor-not-allowed border border-white/5"
            >
              {currentPlan === 'free' ? '현재 플랜' : '무료 체험'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="relative rounded-[28px] border border-amber-500/30 bg-amber-500/[0.08] backdrop-blur-sm p-7 shadow-[0_16px_40px_rgba(245,158,11,0.12)]"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-bold tracking-[0.08em]">
              {PLAN_SUMMARY.pro.badge}
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-amber-300 font-bold text-2xl mb-1">{PLAN_SUMMARY.pro.title}</h3>
              <p className="text-slate-300 text-sm mb-4">{PLAN_SUMMARY.pro.subtitle}</p>
              <div className="text-4xl font-black text-white mb-3">{PLAN_SUMMARY.pro.price}</div>
              <p className="text-slate-300 text-sm leading-6">{PLAN_SUMMARY.pro.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              {proOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => handlePurchase(option.id)}
                  disabled={loading === option.id}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-amber-500/20 hover:border-amber-500/45 bg-slate-950/40 hover:bg-amber-500/10 transition-all group"
                >
                  <div className="text-left">
                    <span className="text-white text-base font-bold">₩{option.amount.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm ml-2">/ {option.days}일</span>
                  </div>
                  <span className="text-amber-300 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    {loading === option.id ? '처리 중...' : `${option.days}일 시작하기 →`}
                  </span>
                </button>
              ))}
            </div>

            <ul className="space-y-3">
              {PLAN_SUMMARY.pro.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="text-amber-400 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Spec v3 §3.3: Ultra 카드 — ₩29,900 / 30일 + Coming Soon 배지 */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="relative rounded-[28px] border border-cyan-500/30 bg-cyan-500/[0.06] backdrop-blur-sm p-7 shadow-[0_16px_40px_rgba(34,211,238,0.10)]"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-cyan-400 text-slate-950 text-[11px] font-bold tracking-[0.08em]">
              {PLAN_SUMMARY.ultra.badge}
            </div>

            <div className="mb-6 mt-2">
              <h3 className="text-cyan-300 font-bold text-2xl mb-1">{PLAN_SUMMARY.ultra.title}</h3>
              <p className="text-slate-300 text-sm mb-4">{PLAN_SUMMARY.ultra.subtitle}</p>
              <div className="text-4xl font-black text-white mb-3">{PLAN_SUMMARY.ultra.price}</div>
              <p className="text-slate-300 text-sm leading-6">{PLAN_SUMMARY.ultra.description}</p>
            </div>

            <div className="space-y-3 mb-6">
              {ultraOption && (
                <button
                  key={ultraOption.id}
                  onClick={() => handlePurchase(ultraOption.id)}
                  disabled={loading === ultraOption.id}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/45 bg-slate-950/40 hover:bg-cyan-500/10 transition-all group"
                >
                  <div className="text-left">
                    <span className="text-white text-base font-bold">₩{ultraOption.amount.toLocaleString()}</span>
                    <span className="text-slate-400 text-sm ml-2">/ {ultraOption.days}일</span>
                  </div>
                  <span className="text-cyan-300 text-xs font-semibold group-hover:translate-x-0.5 transition-transform">
                    {loading === ultraOption.id ? '처리 중...' : '울트라 시작하기 →'}
                  </span>
                </button>
              )}
            </div>

            <ul className="space-y-3 mb-4">
              {PLAN_SUMMARY.ultra.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="text-cyan-400 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {PLAN_SUMMARY.ultra.comingSoon.length > 0 && (
              <div className="pt-3 border-t border-cyan-500/15">
                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/70 font-bold mb-2">곧 출시</p>
                <ul className="space-y-2">
                  {PLAN_SUMMARY.ultra.comingSoon.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs text-slate-400">
                      <span className="text-cyan-400/60 mt-0.5">🔜</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-8 max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80 font-bold mb-3">Compare</p>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">무료 · 프로 · 울트라 한눈에 비교</h2>
            <p className="text-slate-400 text-sm">사용 기간, 시나리오 수, 풀 리포트·기록 비교 지원 여부를 빠르게 확인하세요.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-4 text-slate-500 font-medium">기능</th>
                  <th className="text-center py-4 px-4 text-slate-400 font-medium">무료</th>
                  <th className="text-center py-4 px-4 text-amber-300 font-bold">프로</th>
                  <th className="text-center py-4 px-4 text-cyan-300 font-bold">울트라</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {FEATURE_ROWS.map(([feature, free, pro, ultra], idx) => (
                  <tr key={idx} className="border-b border-white/[0.06]">
                    <td className="py-4 px-4 text-slate-400">{feature}</td>
                    <td className="py-4 px-4 text-center">{free}</td>
                    <td className="py-4 px-4 text-center font-medium">{pro}</td>
                    <td className="py-4 px-4 text-center font-medium">{ultra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8 rounded-[28px] border border-amber-500/20 bg-amber-500/[0.05] p-6 lg:p-8 max-w-5xl mx-auto"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80 font-bold mb-3">One-time Playbook</p>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-3">전문가 코칭 플레이북 단건 구매</h2>
              <p className="text-slate-300 text-sm leading-7">
                시뮬레이션 완료 후 더 깊은 대화 전략이 필요할 때, 완료한 대화 1건에 대한 3단계 전략·상황별 핵심 문장·심리적 트리거 분석·코치 총평을 구매할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <span className="text-slate-300 text-sm font-semibold">전문가 코칭 플레이북 1건</span>
                <span className="text-amber-300 text-xl font-black">₩{REPORT_PAYMENT_OPTION.amount.toLocaleString()}</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                <li>✓ 결제 후 계정 내 구매 플레이북으로 저장</li>
                <li>✓ 디지털 콘텐츠 생성·열람 완료 후 환불 제한 가능</li>
                <li>✓ 자세한 기준은 환불정책에서 확인</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <section className="max-w-5xl mx-auto mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-400 leading-7">
          <h2 className="text-white font-bold mb-2">결제·환불 안내</h2>
          <p>
            유료 상품은 별도 표시가 없는 한 자동 갱신되지 않는 기간제 또는 단건 상품입니다. 결제 후 이용권은 회원 계정에 반영되며,
            환불은 이용 여부, 이용 기간, 생성·열람 완료된 디지털 콘텐츠 제공 여부에 따라 처리됩니다.
          </p>
          <button onClick={() => navigate('/refund')} className="mt-3 text-amber-400 hover:text-amber-300 font-semibold">
            환불정책 자세히 보기 →
          </button>
        </section>

        <div className="text-center mt-8">
          <button onClick={() => navigate(-1)} className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
            ← 돌아가기
          </button>
        </div>
      </div>
      <PolicyFooter />
    </div>
  );
}
