import { dbService } from './dbService';
import { PLAN_LIMITS, type PlanType } from '../src/types/database';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  /** abandon limit 도달 시 true — UI 에서 차단 메시지/Pricing 유도에 사용 */
  abandonBlocked?: boolean;
}

/** Spec v3 §2·§5.2: 비로그인/무료 플랜 전용 체험 시나리오 3개 (고정) */
export const FREE_SCENARIO_IDS = ['late-comer', 'boundaries', 'team-clash'] as const;

/** Spec v3 §3.1: 게스트 중단 카운트 (sessionStorage 기반).
 *  로그인 사용자는 simulation_history.completed 로 카운트. */
const GUEST_ABANDON_KEY = 'lh_guest_abandon_count';

export const usageService = {
  /** 게스트 중단 카운트 읽기 */
  getGuestAbandonCount(): number {
    if (typeof window === 'undefined') return 0;
    const raw = sessionStorage.getItem(GUEST_ABANDON_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  },

  /** 게스트 중단 카운트 증가 */
  incrementGuestAbandonCount(): number {
    if (typeof window === 'undefined') return 0;
    const next = this.getGuestAbandonCount() + 1;
    sessionStorage.setItem(GUEST_ABANDON_KEY, String(next));
    return next;
  },

  /** 게스트 중단 카운트 리셋 (가입/결제 시 호출) */
  resetGuestAbandonCount(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(GUEST_ABANDON_KEY);
  },

  /** 시뮬레이션 시작 가능 여부 확인 (Spec v3 §3 abandon limit 포함) */
  async canStartSimulation(userId: string, plan: PlanType, scenarioId?: string): Promise<UsageCheckResult> {
    const limits = PLAN_LIMITS[plan];

    // 게스트 (userId 없음): 총 5회 중단 시 차단 → 가입/Pro 유도
    if (!userId) {
      const guestAbandon = this.getGuestAbandonCount();
      if (guestAbandon >= limits.abandonLimit) {
        return {
          allowed: false,
          abandonBlocked: true,
          reason: `무료 체험에서 ${limits.abandonLimit}회 이상 중단하셨어요. 계속 연습하시려면 요금제를 업그레이드해주세요.`,
        };
      }
      return { allowed: true };
    }

    // 로그인 사용자
    if (plan === 'free') {
      // 무료: 총 시뮬레이션 횟수 + 누적 중단 5회 검증
      const totalCount = await dbService.getSimulationCount(userId);
      if (totalCount >= limits.scenarios) {
        return {
          allowed: false,
          reason: `무료 체험 ${limits.scenarios}개 시나리오를 모두 사용했습니다.`,
        };
      }
      const abandonCount = await dbService.getAbandonCount(userId);
      if (abandonCount >= limits.abandonLimit) {
        return {
          allowed: false,
          abandonBlocked: true,
          reason: `무료 체험에서 ${limits.abandonLimit}회 이상 중단하셨어요. 계속 연습하시려면 요금제를 업그레이드해주세요.`,
        };
      }
    } else if (scenarioId) {
      // Pro/Ultra: 시나리오당 10회 중단 시 해당 시나리오 차단
      const abandonCount = await dbService.getAbandonCount(userId, scenarioId);
      if (abandonCount >= limits.abandonLimit) {
        return {
          allowed: false,
          abandonBlocked: true,
          reason: `이 시나리오에서 ${limits.abandonLimit}회 이상 중단하셨어요. 다른 시나리오에 도전해보세요.`,
        };
      }
    }

    return { allowed: true };
  },

  /** 특정 시나리오의 시도 횟수 확인 */
  async canTryScenario(userId: string, scenarioId: string, plan: PlanType): Promise<UsageCheckResult> {
    if (!userId) return { allowed: true };
    const limits = PLAN_LIMITS[plan];
    const tryCount = await dbService.getScenarioTryCount(userId, scenarioId);

    if (tryCount >= limits.maxTriesPerScenario) {
      return {
        allowed: false,
        reason: `이 시나리오의 최대 시도 횟수(${limits.maxTriesPerScenario}회)에 도달했습니다.`,
      };
    }

    return { allowed: true };
  },

  /** 즉시 코칭 사용 가능 여부 */
  canUseCoaching(plan: PlanType): boolean {
    return PLAN_LIMITS[plan].coaching;
  },

  /** 음성 시뮬레이션 사용 가능 여부 */
  canUseVoice(plan: PlanType): boolean {
    return PLAN_LIMITS[plan].voice;
  },

  /** 시나리오 접근 가능 여부 (인덱스 기준, 레거시 유지)
   *  Spec v3 §5: 새로 구현하는 곳은 canAccessScenarioById 사용 권장 */
  canAccessScenario(scenarioIndex: number, plan: PlanType): boolean {
    return scenarioIndex < PLAN_LIMITS[plan].scenarios;
  },

  /** Spec v3 §7: 시나리오 ID + 사용자 선택 기반 접근 판정
   *  - Ultra: 전체 허용
   *  - Pro: selected_scenarios 에 포함된 ID 만 허용. 선택 미완료 상태면 아직 결제 직후로 간주해 전체 허용(선택 화면으로 유도 전제)
   *  - Free: FREE_SCENARIO_IDS 만 허용
   */
  canAccessScenarioById(
    scenarioId: string,
    plan: PlanType,
    selectedScenarios?: string[] | null,
  ): boolean {
    if (plan === 'ultra') return true;
    if (plan === 'pro') {
      if (!selectedScenarios || selectedScenarios.length === 0) return true;
      return selectedScenarios.includes(scenarioId);
    }
    return (FREE_SCENARIO_IDS as readonly string[]).includes(scenarioId);
  },

  /** 사용량 기록 */
  async recordUsage(userId: string, type: 'simulation' | 'coaching' | 'sos'): Promise<void> {
    if (!userId) return; // 게스트·미인증 상태: DB 증분 스킵
    await dbService.incrementUsage(userId, type);
  },
};
