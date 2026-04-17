/**
 * @deprecated 2026-04 런치부터 국내 결제는 `services/paymentService.ts` (PortOne V2) 로 단일화되었습니다.
 * 이 파일의 Stripe Checkout / Customer Portal 경로는 글로벌 확장 시 재활성화 예정이며,
 * 현재 프론트엔드 UI 에서는 호출되지 않습니다. Worker 측 핸들러는 보존되어 있습니다.
 */
import { supabase } from '../src/lib/supabase';

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

const DEPRECATED_WARN = '[billingService] Stripe path is disabled for current launch. Use paymentService.ts (PortOne) instead.';

export const billingService = {
  /** @deprecated Stripe Checkout Session — 글로벌 런치 시 재활성화 */
  async createCheckoutSession(priceId: string): Promise<void> {
    console.warn(DEPRECATED_WARN);
    if (!PROXY_URL) {
      alert('결제 시스템이 설정되지 않았습니다.');
      return;
    }
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const res = await fetch(`${PROXY_URL}/api/create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ priceId, returnUrl: window.location.origin }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  },

  /** 현재 구독 상태 조회 (profiles 테이블 기반) */
  async getSubscription(profile: { plan: string; stripe_subscription_id: string | null }): Promise<{
    plan: string;
    status: string;
    cancelAtPeriodEnd: boolean;
  } | null> {
    if (!profile.stripe_subscription_id) return null;
    return {
      plan: profile.plan,
      status: 'active',
      cancelAtPeriodEnd: false,
    };
  },

  /** @deprecated Stripe Customer Portal — 글로벌 런치 시 재활성화 */
  async createPortalSession(): Promise<void> {
    console.warn(DEPRECATED_WARN);
    if (!PROXY_URL) return;
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const res = await fetch(`${PROXY_URL}/api/customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ returnUrl: window.location.origin }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  },
};
