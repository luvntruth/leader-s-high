import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, PAYMENT_OPTIONS } from '../services/paymentService';
import { analyticsService } from '../services/analyticsService';
import { trackPixelEvent } from '../services/metaPixelService';

// Spec v3 §3: 3단 플랜 (Free / Pro / Ultra). Ultra 의 Coming Soon 기능은 카드에 명시
export const PLAN_SUMMARY = {
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
    description: '무료 체험 3개는 그대로 이용하고, 원하는 20개를 더 골라 총 23개를 반복 훈련하세요. 풀 리포트·기록 비교까지 가져갑니다.',
    features: ['무료 체험 3개 + 직접 고르는 20개 (총 23개)', '시나리오당 최대 3회까지 도전 가능', '풀 리포트 무제한', '이전 기록 보관 및 비교', '실시간 즉시 코칭'],
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
export const FEATURE_ROWS = [
  ['시나리오 수', '3개', '무료 3개+선택 20개', '40개 전체'],
  ['시나리오당 시도', '1회', '최대 3회', '최대 5회'],
  ['사용 기간', '무제한', '10일 / 20일', '30일'],
  ['피드백 리포트', '간략', '풀 리포트', '풀 리포트'],
  ['이전 기록 비교', '—', '✓', '✓'],
  ['즉시 코칭', '—', '✓', '✓'],
  ['타인 비교 분석', '—', '—', '🔜 Soon'],
  ['커스텀랩', '—', '—', '🔜 Soon'],
] as const;

interface PlansSectionProps {
  /** 분석 이벤트 source 라벨 (예: 'pricing' | 'onboarding') */
  source?: string;
  /** 비로그인 사용자가 플랜을 누를 때 로그인/가입 후 복귀할 경로 */
  loginRedirect?: string;
  /** 무료·프로·울트라 비교표 노출 여부 */
  showComparison?: boolean;
}

/**
 * 3단 플랜 카드 + (선택) 비교표 + 결제 처리를 담은 재사용 컴포넌트.
 * Pricing 페이지와 Onboarding(가입 직후 화면) 양쪽에서 공유한다.
 *
 * 주의: 모바일 결제 redirect 복귀 처리(completeRedirectedPayment)는
 * /pricing 을 return URL 로 가정하므로 이 컴포넌트가 아닌 Pricing 페이지에만 둔다.
 */
export default function PlansSection({ source = 'pricing', loginRedirect = '/pricing', showComparison = true }: PlansSectionProps) {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const currentPlan = profile?.plan || 'free';
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const proOptions = PAYMENT_OPTIONS.filter(o => o.plan === 'pro');
  // Spec v3 §3.3: Ultra 30일 단일 옵션
  const ultraOption = PAYMENT_OPTIONS.find(o => o.plan === 'ultra' && o.days === 30) || PAYMENT_OPTIONS.find(o => o.plan === 'ultra');

  const handlePurchase = async (optionId: string) => {
    if (!user || !profile) {
      navigate('/login', { state: { from: loginRedirect } });
      return;
    }
    const option = PAYMENT_OPTIONS.find(o => o.id === optionId);
    if (!option) return;

    analyticsService.track(
      'checkout_start',
      analyticsService.withAttribution({
        source,
        option_id: option.id,
        plan: option.plan,
        days: option.days,
        amount: option.amount,
      }),
      user.id,
    );
    // Meta 전환: 결제 시작(깔때기 중간 신호) — 드문 Purchase 보완용 최적화 이벤트
    trackPixelEvent('InitiateCheckout', { value: option.amount, currency: 'KRW', content_name: option.plan, source });

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
          source,
          option_id: option.id,
          plan: option.plan,
          days: option.days,
          amount: option.amount,
        }),
        user.id,
      );
      // Meta 전환: PC 팝업 결제 완료
      trackPixelEvent('Purchase', { value: option.amount, currency: 'KRW', content_name: option.plan });
      await refreshProfile();
      // Spec v3 §4-B: Pro 는 결제 후 시나리오 선택 화면으로, Ultra/기타는 홈으로
      const nextPath = option.plan === 'pro' ? '/select-scenarios' : '/';
      setTimeout(() => navigate(nextPath), 2000);
    }
  };

  return (
    <div>
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
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
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
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

      {showComparison && (
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.2 }}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 lg:p-8 max-w-5xl mx-auto"
        >
          <div className="text-center mb-8">
            <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300/80 font-bold mb-3">Compare</p>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-3 break-keep">무료 · 프로 · 울트라 한눈에 비교</h2>
            <p className="text-slate-400 text-sm">사용 기간, 시나리오 수, 풀 리포트·기록 비교 지원 여부를 빠르게 확인하세요.</p>
          </div>

          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs sm:text-sm min-w-[320px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-2 sm:py-4 sm:px-4 text-slate-500 font-medium">기능</th>
                  <th className="text-center py-3 px-2 sm:py-4 sm:px-4 text-slate-400 font-medium">무료</th>
                  <th className="text-center py-3 px-2 sm:py-4 sm:px-4 text-amber-300 font-bold">프로</th>
                  <th className="text-center py-3 px-2 sm:py-4 sm:px-4 text-cyan-300 font-bold">울트라</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {FEATURE_ROWS.map(([feature, free, pro, ultra], idx) => (
                  <tr key={idx} className="border-b border-white/[0.06]">
                    <td className="py-3 px-2 sm:py-4 sm:px-4 text-slate-400 whitespace-nowrap">{feature}</td>
                    <td className="py-3 px-2 sm:py-4 sm:px-4 text-center whitespace-nowrap">{free}</td>
                    <td className="py-3 px-2 sm:py-4 sm:px-4 text-center font-medium whitespace-nowrap">{pro}</td>
                    <td className="py-3 px-2 sm:py-4 sm:px-4 text-center font-medium whitespace-nowrap">{ultra}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
