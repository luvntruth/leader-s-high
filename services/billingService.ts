const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

export const billingService = {
  /** Stripe Checkout Session 생성 → 결제 페이지 리다이렉트 */
  async createCheckoutSession(priceId: string): Promise<void> {
    if (!PROXY_URL) {
      alert('결제 시스템이 설정되지 않았습니다.');
      return;
    }
    // Worker의 /api/create-checkout 엔드포인트 호출
    // TODO: Worker에 Stripe Checkout Session 생성 엔드포인트 추가
    const res = await fetch(`${PROXY_URL}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  /** Stripe Customer Portal (구독 관리/취소) */
  async createPortalSession(): Promise<void> {
    if (!PROXY_URL) return;
    const res = await fetch(`${PROXY_URL}/api/customer-portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnUrl: window.location.origin }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  },
};
