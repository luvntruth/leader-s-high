import { dbService } from './dbService';
import { PLAN_LIMITS, type PlanType } from '../src/types/database';

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  remaining?: { daily: number; monthly: number };
}

export const usageService = {
  /** 시뮬레이션 시작 가능 여부 확인 */
  async canStartSimulation(userId: string, plan: PlanType): Promise<UsageCheckResult> {
    const limits = PLAN_LIMITS[plan];

    // 무제한 플랜
    if (limits.dailySim === Infinity) {
      return { allowed: true, remaining: { daily: Infinity, monthly: Infinity } };
    }

    const todayUsage = await dbService.getTodayUsage(userId);
    const todayCount = todayUsage?.simulation_count || 0;

    if (todayCount >= limits.dailySim) {
      return {
        allowed: false,
        reason: `오늘 시뮬레이션 제한(${limits.dailySim}회)에 도달했습니다.`,
        remaining: { daily: 0, monthly: 0 },
      };
    }

    const monthlyCount = await dbService.getMonthlySimCount(userId);
    if (monthlyCount >= limits.monthlySim) {
      return {
        allowed: false,
        reason: `이번 달 시뮬레이션 제한(${limits.monthlySim}회)에 도달했습니다.`,
        remaining: { daily: limits.dailySim - todayCount, monthly: 0 },
      };
    }

    return {
      allowed: true,
      remaining: {
        daily: limits.dailySim - todayCount,
        monthly: limits.monthlySim - monthlyCount,
      },
    };
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
    await dbService.incrementUsage(userId, type);
  },

  /** 남은 사용량 조회 (UI 표시용) */
  async getRemaining(userId: string, plan: PlanType): Promise<{ daily: number; monthly: number }> {
    const limits = PLAN_LIMITS[plan];
    if (limits.dailySim === Infinity) return { daily: Infinity, monthly: Infinity };

    const todayUsage = await dbService.getTodayUsage(userId);
    const monthlyCount = await dbService.getMonthlySimCount(userId);

    return {
      daily: Math.max(0, limits.dailySim - (todayUsage?.simulation_count || 0)),
      monthly: Math.max(0, limits.monthlySim - monthlyCount),
    };
  },
};
