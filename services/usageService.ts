import { dbService } from './dbService';
import { PLAN_LIMITS, type PlanType } from '../src/types/database';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
}

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

  /** 시나리오 접근 가능 여부 (인덱스 기준) */
  canAccessScenario(scenarioIndex: number, plan: PlanType): boolean {
    return scenarioIndex < PLAN_LIMITS[plan].scenarios;
  },

  /** 사용량 기록 */
  async recordUsage(userId: string, type: 'simulation' | 'coaching' | 'sos'): Promise<void> {
    if (!userId) return; // 게스트·미인증 상태: DB 증분 스킵
    await dbService.incrementUsage(userId, type);
  },
};
