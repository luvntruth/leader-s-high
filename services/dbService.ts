import { supabase } from '../src/lib/supabase';
import type { SimulationRecord, UsageRecord, Profile } from '../src/types/database';

export const dbService = {
  // ================================================================
  // 시뮬레이션 히스토리
  // ================================================================

  async saveSimulation(data: Omit<SimulationRecord, 'id' | 'created_at'>): Promise<string | null> {
    const { data: result, error } = await supabase
      .from('simulation_history')
      .insert(data)
      .select('id')
      .single();
    if (error) {
      console.error('시뮬레이션 저장 실패:', error);
      return null;
    }
    return result.id;
  },

  async getHistory(userId: string, limit = 50, offset = 0): Promise<SimulationRecord[]> {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      console.error('히스토리 조회 실패:', error);
      return [];
    }
    return data || [];
  },

  async getHistoryById(id: string): Promise<SimulationRecord | null> {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  async updateHistoryMemo(id: string, memo: string, tags: string[]): Promise<void> {
    const { error } = await supabase
      .from('simulation_history')
      .update({ memo, tags })
      .eq('id', id);
    if (error) console.error('메모 업데이트 실패:', error);
  },

  async deleteHistory(id: string): Promise<void> {
    const { error } = await supabase
      .from('simulation_history')
      .delete()
      .eq('id', id);
    if (error) console.error('히스토리 삭제 실패:', error);
  },

  // ================================================================
  // 사용자 통계
  // ================================================================

  async getSimulationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('simulation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) return 0;
    return count || 0;
  },

  async getScenarioTryCount(userId: string, scenarioId: string): Promise<number> {
    const { count, error } = await supabase
      .from('simulation_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('scenario_id', scenarioId);
    if (error) return 0;
    return count || 0;
  },

  async getRadarStats(userId: string): Promise<Record<string, number> | null> {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('radar_chart')
      .eq('user_id', userId)
      .not('radar_chart', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error || !data || data.length === 0) return null;

    // 최근 10건의 평균 레이더 차트
    const keys = ['trust', 'motivation', 'conflict', 'decision', 'strategy'];
    const avg: Record<string, number> = {};
    for (const key of keys) {
      const values = data
        .map((d) => (d.radar_chart as Record<string, number>)?.[key])
        .filter((v): v is number => typeof v === 'number');
      avg[key] = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
    }
    return avg;
  },

  async getCoachingSkillsAvg(userId: string): Promise<Record<string, number> | null> {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('coaching_skills')
      .eq('user_id', userId)
      .not('coaching_skills', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error || !data || data.length === 0) return null;

    const keys = ['empathyExpression', 'questionSkill', 'emotionControl', 'activeListening', 'actionGuidance'];
    const avg: Record<string, number> = {};
    for (const key of keys) {
      const values = data
        .map((d) => (d.coaching_skills as Record<string, number>)?.[key])
        .filter((v): v is number => typeof v === 'number');
      avg[key] = values.length > 0
        ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        : 0;
    }
    return avg;
  },

  // ================================================================
  // 사용량 추적
  // ================================================================

  async getTodayUsage(userId: string): Promise<UsageRecord | null> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    if (error) return null;
    return data;
  },

  async getMonthlySimCount(userId: string): Promise<number> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('usage_tracking')
      .select('simulation_count')
      .eq('user_id', userId)
      .gte('date', firstOfMonth);
    if (error || !data) return 0;
    return data.reduce((sum, r) => sum + (r.simulation_count || 0), 0);
  },

  async incrementUsage(userId: string, type: 'simulation' | 'coaching' | 'sos'): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);

    // UPSERT: 오늘 레코드가 없으면 생성, 있으면 업데이트
    const existing = await this.getTodayUsage(userId);
    if (!existing) {
      const insert: Record<string, unknown> = {
        user_id: userId,
        date: today,
        simulation_count: type === 'simulation' ? 1 : 0,
        coaching_count: type === 'coaching' ? 1 : 0,
        sos_count: type === 'sos' ? 1 : 0,
        token_count: 0,
      };
      await supabase.from('usage_tracking').insert(insert);
    } else {
      const field = type === 'simulation' ? 'simulation_count'
        : type === 'coaching' ? 'coaching_count' : 'sos_count';
      const current = (existing as Record<string, number>)[field] || 0;
      await supabase
        .from('usage_tracking')
        .update({ [field]: current + 1 })
        .eq('id', existing.id);
    }
  },

  // ================================================================
  // 조직 관리 (admin)
  // ================================================================

  async getOrgMembers(orgId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('org_id', orgId);
    if (error) return [];
    return data || [];
  },

  async getOrgHistory(orgId: string, limit = 50): Promise<SimulationRecord[]> {
    const { data, error } = await supabase
      .from('simulation_history')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) return [];
    return data || [];
  },
};
