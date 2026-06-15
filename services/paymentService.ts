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
// 모바일 결제 redirect 복귀 처리
// ----------------------------------------------------------------
// PortOne V2 모바일은 REDIRECTION 방식 — 결제 후 페이지가 redirectUrl 로
// 통째로 이동하므로 requestPayment Promise 가 resolve 되지 않는다.
// 따라서 결제 시작 전 검증 컨텍스트를 sessionStorage 에 저장하고,
// 복귀 후 URL query(paymentId/code)를 읽어 서버 검증을 수행한다.
// ================================================================

const PENDING_PAYMENT_KEY = 'lh_pending_payment';

interface PendingPayment {
  paymentId: string;
  verifyParams: { type: 'plan' | 'report'; plan?: string; days?: number; simulationId?: string; amount: number };
  successMessage: string;
}

function isMobileEnv(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function newPaymentId(): string {
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildRedirectUrl(hashPath: string): string {
  return `${window.location.origin}/#${hashPath}`;
}

function savePendingPayment(p: PendingPayment): void {
  try { sessionStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(p)); } catch { /* noop */ }
}
function loadPendingPayment(): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PAYMENT_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch { return null; }
}
function clearPendingPayment(): void {
  try { sessionStorage.removeItem(PENDING_PAYMENT_KEY); } catch { /* noop */ }
}

// PortOne redirect 복귀 query 추출 — PG/환경에 따라 query 가 top-level search
// (`?paymentId=..#/path`) 또는 hash 내부(`#/path?paymentId=..`)에 올 수 있어 둘 다 확인.
function extractRedirectQuery(): URLSearchParams {
  const top = new URLSearchParams(window.location.search);
  if (top.get('paymentId') || top.get('code')) return top;
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) return new URLSearchParams(hash.slice(qIdx + 1));
  return new URLSearchParams();
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
    opts?: { paymentId?: string; redirectUrl?: string },
  ): Promise<PaymentResult> {
    if (!window.PortOne) {
      return { success: false, message: '결제 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.' };
    }
    if (!STORE_ID || !CHANNEL_KEY) {
      return { success: false, message: '결제 시스템이 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }

    const paymentId = opts?.paymentId || newPaymentId();

    try {
      // 카카오페이 채널은 간편결제(EASY_PAY)로 요청해야 함 (CARD 불가).
      // 채널이 카카오페이 단독이므로 easyPayProvider 는 채널이 자동 결정.
      // redirectUrl 지정 시(모바일) 결제 후 해당 URL 로 리다이렉트되어 이 Promise 는 resolve 되지 않음.
      const params: Record<string, unknown> = {
        storeId: STORE_ID,
        channelKey: CHANNEL_KEY,
        paymentId,
        orderName,
        totalAmount: amount,
        currency: 'KRW',
        payMethod: 'EASY_PAY',
        customer: { email: userEmail },
      };
      if (opts?.redirectUrl) params.redirectUrl = opts.redirectUrl;

      const response = await window.PortOne.requestPayment(params);

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

  /** 플랜 결제: 결제 + Server-side 검증 (PC: Promise / 모바일: redirect 후 복귀 검증) */
  async requestPayment(
    option: PaymentOption,
    user: { id: string; email: string }
  ): Promise<{ success: boolean; message: string }> {
    const verifyParams = { type: 'plan' as const, plan: option.plan, days: option.days, amount: option.amount };
    const successMessage = `${option.name} 플랜이 활성화되었습니다!`;

    // 모바일: 컨텍스트 저장 후 redirect (페이지가 떠나므로 복귀 시 completeRedirectedPayment 가 검증)
    if (isMobileEnv()) {
      const paymentId = newPaymentId();
      savePendingPayment({ paymentId, verifyParams, successMessage });
      const r = await this.requestPay(`Letmefree ${option.name}`, option.amount, user.email, {
        paymentId,
        redirectUrl: buildRedirectUrl('/pricing'),
      });
      // 정상 모바일 흐름은 redirect 로 페이지를 떠나 여기 도달하지 않음.
      // 도달했다면(PortOne 미로드 등) 실패이므로 컨텍스트 정리.
      if (!r.success) { clearPendingPayment(); return r; }
      return { success: true, message: successMessage };
    }

    // PC: 기존 Promise 흐름
    const result = await this.requestPay(`Letmefree ${option.name}`, option.amount, user.email);
    if (!result.success) return result;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const verified = await this.verifyPaymentOnServer(result.paymentId || '', verifyParams, token);
    if (!verified.success) return { success: false, message: verified.message };

    return { success: true, message: successMessage };
  },

  /** 골든 리포트 구매: 결제 + Server-side 검증 (PC: Promise / 모바일: redirect 후 복귀 검증) */
  async purchaseReport(
    simulationId: string,
    user: { id: string; email: string },
  ): Promise<{ success: boolean; message: string }> {
    const option = REPORT_PAYMENT_OPTION;
    const verifyParams = { type: 'report' as const, simulationId, amount: option.amount };
    const successMessage = '골든 리포트가 활성화되었습니다!';

    // 모바일: 컨텍스트 저장 후 redirect
    if (isMobileEnv()) {
      const paymentId = newPaymentId();
      savePendingPayment({ paymentId, verifyParams, successMessage });
      const r = await this.requestPay(`Letmefree ${option.name}`, option.amount, user.email, {
        paymentId,
        redirectUrl: buildRedirectUrl('/purchase/playbook'),
      });
      if (!r.success) { clearPendingPayment(); return r; }
      return { success: true, message: successMessage };
    }

    // PC: 기존 Promise 흐름
    const result = await this.requestPay(`Letmefree ${option.name}`, option.amount, user.email);
    if (!result.success) return result;

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const verified = await this.verifyPaymentOnServer(result.paymentId || '', verifyParams, token);
    if (!verified.success) return { success: false, message: verified.message };

    return { success: true, message: successMessage };
  },

  /**
   * 모바일 redirect 복귀 처리.
   * 결제 화면 진입 시 호출 — URL query 에 결제 결과가 있고 대기 중인 결제가 있으면 검증한다.
   * @returns handled=false 면 복귀 상황이 아님(일반 진입). handled=true 면 success/message 로 결과 처리.
   */
  async completeRedirectedPayment(): Promise<{ handled: boolean; success?: boolean; message?: string; plan?: string }> {
    const pending = loadPendingPayment();
    if (!pending) return { handled: false };

    const query = extractRedirectQuery();
    const paymentId = query.get('paymentId');
    // 복귀 query 의 paymentId 가 대기 건과 일치해야 처리 (불일치/누락 시 무시)
    if (!paymentId || paymentId !== pending.paymentId) return { handled: false };

    clearPendingPayment();

    // code 가 있으면 결제 실패/취소
    const code = query.get('code');
    if (code) {
      return { handled: true, success: false, message: query.get('message') || '결제가 취소되었습니다.' };
    }

    // 서버 검증
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token || '';
    const verified = await this.verifyPaymentOnServer(paymentId, pending.verifyParams, token);
    return {
      handled: true,
      success: verified.success,
      message: verified.success ? pending.successMessage : verified.message,
      plan: pending.verifyParams.plan,
    };
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
