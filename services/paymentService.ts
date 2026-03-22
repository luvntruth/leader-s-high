import { supabase } from '../src/lib/supabase';
import type { PlanType } from '../src/types/database';

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

const STORE_ID = 'iamporttest_3';
const CHANNEL_KEY = 'channel-key-0856e897-bc18-47e8-a2f3-2dfe0ef5e8a1';

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

export const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'pro-10', plan: 'pro', name: '프로 10일', amount: 8900, days: 10 },
  { id: 'pro-20', plan: 'pro', name: '프로 20일', amount: 13500, days: 20 },
  { id: 'ultra-15', plan: 'ultra', name: '울트라 15일', amount: 17900, days: 15 },
  { id: 'ultra-25', plan: 'ultra', name: '울트라 25일', amount: 24500, days: 25 },
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
  name: '골든 리포트',
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

  /** 플랜 결제: 결제 + DB 플랜 활성화 (기존 requestPayment 대체) */
  async requestPayment(
    option: PaymentOption,
    user: { id: string; email: string }
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.requestPay(
      `Leader's High ${option.name}`,
      option.amount,
      user.email,
    );

    if (!result.success) return result;

    // 결제 성공 → DB에 플랜 활성화
    const activated = await this.activatePlan(user.id, option.plan, option.days);
    if (!activated.success) return activated;

    return { success: true, message: `${option.name} 플랜이 활성화되었습니다!` };
  },

  /** DB에 플랜 활성화 */
  async activatePlan(
    userId: string,
    plan: PlanType,
    days: number,
  ): Promise<{ success: boolean; message: string }> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const { error } = await supabase
      .from('profiles')
      .update({
        plan,
        plan_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('플랜 활성화 실패:', error);
      return { success: false, message: '결제는 완료되었으나 플랜 활성화에 실패했습니다. 고객센터에 문의해주세요.' };
    }

    return { success: true, message: '플랜이 활성화되었습니다.' };
  },

  /** 골든 리포트 구매: 결제 + report_purchases INSERT */
  async purchaseReport(
    simulationId: string,
    user: { id: string; email: string },
  ): Promise<{ success: boolean; message: string }> {
    const option = REPORT_PAYMENT_OPTION;

    const result = await this.requestPay(
      `Leader's High ${option.name}`,
      option.amount,
      user.email,
    );

    if (!result.success) return result;

    // 결제 성공 → report_purchases에 기록
    const { error } = await supabase
      .from('report_purchases')
      .insert({
        user_id: user.id,
        simulation_id: simulationId,
        payment_id: result.paymentId || '',
        amount: option.amount,
      });

    if (error) {
      console.error('리포트 구매 기록 실패:', error);
      return { success: false, message: '결제는 완료되었으나 리포트 활성화에 실패했습니다. 고객센터에 문의해주세요.' };
    }

    return { success: true, message: '골든 리포트가 활성화되었습니다!' };
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
