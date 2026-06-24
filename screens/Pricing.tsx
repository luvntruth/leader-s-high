import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { paymentService, REPORT_PAYMENT_OPTION } from '../services/paymentService';
import { analyticsService } from '../services/analyticsService';
import { trackPixelEvent } from '../services/metaPixelService';
import PolicyFooter from '../components/PolicyFooter';
import PlansSection from '../components/PlansSection';
import { getPendingPurchaseLabel, loadPendingPurchaseIntent, type PendingPurchaseIntent } from '../services/purchaseIntentService';

export default function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const currentPlan = profile?.plan || 'free';
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingPurchaseIntent, setPendingPurchaseIntent] = useState<PendingPurchaseIntent | null>(null);

  useEffect(() => {
    const stateIntent = (location.state as { purchaseIntent?: PendingPurchaseIntent } | null)?.purchaseIntent;
    setPendingPurchaseIntent(stateIntent || loadPendingPurchaseIntent());
  }, [location.state]);

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

  // 모바일 결제 redirect 복귀 처리 — 결제 후 이 화면으로 돌아오면 query 를 읽어 검증
  useEffect(() => {
    (async () => {
      const r = await paymentService.completeRedirectedPayment();
      if (!r.handled) return;
      window.history.replaceState(null, '', `${window.location.origin}/#/pricing`);
      setResult({ ok: !!r.success, msg: r.message || '' });
      if (r.success) {
        // Meta 전환: 모바일 redirect 복귀 결제 완료
        trackPixelEvent('Purchase', { value: r.amount ?? 0, currency: 'KRW', content_name: r.plan });
        await refreshProfile();
        // Spec v3 §4-B: Pro 는 결제 후 시나리오 선택 화면으로, 그 외는 홈으로
        const nextPath = r.plan === 'pro' ? '/select-scenarios' : '/';
        setTimeout(() => navigate(nextPath), 2000);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1020] text-white pb-24 lg:pb-12 overflow-x-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.14),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.12),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(34,211,238,0.08),transparent_22%)]" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto mb-12">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300/80 font-bold mb-3">Continue only if you need more</p>
          <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black tracking-[-0.04em] leading-[1.1] sm:leading-[1.04] text-white mb-4 break-keep">
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

        {pendingPurchaseIntent && user && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 mx-auto max-w-3xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm text-amber-100"
          >
            <p className="font-black text-amber-300">선택한 플랜으로 이어서 결제하세요</p>
            <p className="mt-1 text-xs text-amber-100/80">{getPendingPurchaseLabel(pendingPurchaseIntent)} · 아래 상단의 “결제 이어가기” 버튼을 누르면 바로 결제 단계로 이어집니다.</p>
          </motion.div>
        )}

        <PlansSection source="pricing" loginRedirect="/pricing" resumeOptionId={user ? pendingPurchaseIntent?.optionId : undefined} />

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
