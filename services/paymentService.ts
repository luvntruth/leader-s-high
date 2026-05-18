import { supabase } from '../src/lib/supabase';
import type { PlanType } from '../src/types/database';

const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL as string | undefined;

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (params: Record<string, unknown>) => Promise<{
        code?: string;
        message?: string;
        paymentId?: string;
        transactionType?: string;
      }>;
    };
  }
}

const STORE_ID = import.meta.env.VITE_PORTONE_STORE_ID as string | undefined;
const CHANNEL_KEY = import.meta.env.VITE_PORTONE_CHANNEL_KEY as string | undefined;

if (!STORE_ID || !CHANNEL_KEY) {
  console.error('PortOne credentials not configured. Set VITE_PORTONE_STORE_ID and VITE_PORTONE_CHANNEL_KEY.');
}

// ================================================================
// 플랜 결제 옵션
// ================================================================

export interface PaymentOption {
  id: string;
  plan: PlanType;
  name: string;
  amount: number;
  days: number;
}

// Spec v3 §3: Pro 는 10일/20일 유지, Ultra 는 30일 단일 옵션 ₩29,900
export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'pro-10', plan: 'pro', name: '프로 10일', amount: 8900, days: 10 },
  { id: 'pro-20', plan: 'pro', name: '프로 20일', amount: 13500, days: 20 },
  { id: 'ultra-30', plan: 'ultra', name: '울트라 30일', amount: 29900, days: 30 },
];

// ================================================================
// 골든 리포트 결제 옵션
// ================================================================

export interface ReportPaymentOption {
  id: string;
  name: string;
  amount: number;
}

export const REPORT_PAYMENT_OPTION: ReportPaymentOption = {
  id: 'golden-report',
  name: '전문가 코칭 플레이북',
  amount: 3900,
};

// ================================================================
// 결제 결과 타입
// ================================================================

interface PaymentResult {
  success: boolean;
  message: string;
  paymentId?: string;
}

// ================================================================
// paymentService
// ================================================================

export const paymentService = {
  /**
   * 포트원 결제 요청 (결제만 담당, DB 후처리 없음)
   *
   *   ┌─────────────┐     ┌──────────┐     ┌─────────────┐
   *   │ requestPay  │────▶│ PortOne  │────▶│ PaymentResult│
   *   │ (결제만)     │     │ 팝업     │     │ paymentId   │
   *   └─────────────┘     └──────────┘     └─────────────┘
   *         │                                     │
   *         │              ┌──────────────────────┘
   *         ▼              ▼
   *   activatePlan()  OR  purchaseReport()
   */
  async requestPay(
    orderName: string,
    amount: number,
    userEmail: string,
  ): Promise<PaymentResult> {
    if (!window.PortOne) {
      return { success: false, message: '결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.' };
    }
    if (!STORE_ID || !CHANNEL_KEY) {
      return { success: false, message: '결제 시스템이 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }

    const paymentId = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const response = await window.PortOne.requestPayment({
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: 'KRW',
        payMethod: 'CARD',
        customer: { email: userEmail },
      });

      if (response.code === 'FAILURE_TYPE_PG') {
        return { success: false, message: '결제가 취소되었습니다.' };
      }

      if (response.code) {
        return { success: false, message: response.message || '결제에 실패했습니다.' };
      }

      return { success: true, message: '결제가 완료되었습니다.', paymentId };
    } catch (err) {
      console.error('결제 오류:', err);
      return { success: false, message: '결제 처리 중 오류가 발생했습니다.' };
    }
  },

  /** Server-side 결제 검증 (Worker /api/verify-payment 호출) */
  async verifyPaymentOnServer(
    paymentId: string,
    params: { type: 'plan' | 'report'; plan?: string; days?: number; simulationId?: string; amount: number },
    authToken: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!PROXY_URL) {
      // 프록시 미설정 시 폴백 (개발 환경)
      return this.verifyPaymentFallback(params);
    }

    try {
      const res = await fetch(`${PROXY_URL}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ paymentId, ...params }),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        return { success: false, message: data.error || '결제 검증에 실패했습니다.' };
      }

      return { success: true, message: '결제가 확인되었습니다.' };
    } catch (err) {
      console.error('결제 검증 오류:', err);
      return { success: false, message: '결제 검증 중 오류가 발생했습니다.' };
    }
  },

  /** 개발 환경 폴백: 직접 DB 업데이트 (프로덕션에서는 사용 안 함) */
  async verifyPaymentFallback(
    _params: { type: 'plan' | 'report'; plan?: string; days?: number; simulationId?: string; amount: number },
  ): Promise<{ success: boolean; message: string }> {
    if (import.meta.env.PROD) {
      return { success: false, message: '결제 검증 서버가 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }
    console.warn('결제 검증 폴백 모드 (개발 환경)');
    return { success: true, message: '개발 환경: 결제 검증 스킵' };
  },

  /** 플랜 결제: 결제 + Server-side 검증 */
  async requestPayment(
    option: PaymentOption,
    user: { id: string; email: string }
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.requestPay(
      `Letmefree ${option.name}`,
      option.amount,
      user.email,
    );

    if (!result.success) return result;

    // 결제 성공 → Worker에서 검증 + DB 활성화
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const verified = await this.verifyPaymentOnServer(
      result.paymentId || '',
      { type: 'plan', plan: option.plan, days: option.days, amount: option.amount },
      token,
    );

    if (!verified.success) return { success: false, message: verified.message };

    return { success: true, message: `${option.name} 플랜이 활성화되었습니다!` };
  },

  /** 골든 리포트 구매: 결제 + Server-side 검증 */
  async purchaseReport(
    simulationId: string,
    user: { id: string; email: string },
  ): Promise<{ success: boolean; message: string }> {
    const option = REPORT_PAYMENT_OPTION;

    const result = await this.requestPay(
      `Letmefree ${option.name}`,
      option.amount,
      user.email,
    );

    if (!result.success) return result;

    // 결제 성공 → Worker에서 검증 + DB 기록
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';

    const verified = await this.verifyPaymentOnServer(
      result.paymentId || '',
      { type: 'report', simulationId, amount: option.amount },
      token,
    );

    if (!verified.success) return { success: false, message: verified.message };

    return { success: true, message: '골든 리포트가 활성화되었습니다!' };
  },

  /** 사용자의 전체 플레이북 구매 목록 조회 */
  async getPurchasedPlaybooks(userId: string): Promise<Array<{ id: string; simulation_id: string; created_at: string; scenario_title?: string }>> {
    const { data: purchases } = await supabase
      .from('report_purchases')
      .select('id, simulation_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!purchases || purchases.length === 0) return [];

    // simulation_id(TEXT)로 scenario_title 별도 조회 (FK 미설정으로 relation query 불가)
    const simIds = purchases.map((p: any) => p.simulation_id);
    const { data: sims } = await supabase
      .from('simulation_history')
      .select('id, scenario_title')
      .in('id', simIds);

    const simMap = new Map((sims || []).map((s: any) => [s.id, s.scenario_title]));

    return purchases.map((p: any) => ({
      id: p.id,
      simulation_id: p.simulation_id,
      created_at: p.created_at,
      scenario_title: simMap.get(p.simulation_id),
    }));
  },

  /** 특정 시뮬레이션에 대한 리포트 구매 여부 확인 */
  async hasReportPurchase(userId: string, simulationId: string): Promise<boolean> {
    const { data } = await supabase
      .from('report_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('simulation_id', simulationId)
      .limit(1);

    return (data?.length ?? 0) > 0;
  },

  /** 플랜 만료 여부 확인 */
  isPlanExpired(expiresAt: string | null): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  },

  /** 남은 일수 계산 */
  getRemainingDays(expiresAt: string | null): number {
    if (!expiresAt) return Infinity;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },
};
