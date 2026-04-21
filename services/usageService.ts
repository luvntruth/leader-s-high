import { dbService } from './dbService';
import { PLAN_LIMITS, type PlanType } from '../src/types/database';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
}

/** Spec v3 §2·§5.2: 비로그인/무료 플랜 전용 체험 시나리오 3개 (고정) */
export const FREE_SCENARIO_IDS = ['late-comer', 'boundaries', 'team-clash'] as const;

export const usageService = {
  /** 시뮬레이션 시작 가능 여부 확인 */
  async canStartSimulation(userId: string, plan: PlanType): Promise<UsageCheckResult> {
    // 방어: 빈/없는 userId 는 graceful 하게 "허용" 반환 (게스트는 호출되지 않아야 하나 안전망)
    if (!userId) return { allowed: true };

    const limits = PLAN_LIMITS[plan];

    // 무료 플랜: 총 시뮬레이션 횟수 제한
    if (plan === 'free') {
      const totalCount = await dbService.getSimulationCount(userId);
      if (totalCount >= limits.scenarios) {
        return {
          allowed: false,
          reason: `무료 체험 ${limits.scenarios}개 시나리오를 모두 사용했습니다.`,
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
