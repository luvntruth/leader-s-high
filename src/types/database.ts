// ================================================================
// Supabase Database TypeScript Types
// Generated from: supabase/migrations/001_schema.sql
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
      };
      organizations: {
        Row: Organization;
        Insert: Partial<Organization> & { name: string };
        Update: Partial<Organization>;
      };
      simulation_history: {
        Row: SimulationRecord;
        Insert: Partial<SimulationRecord> & { user_id: string; scenario_id: string; scenario_title: string; character_name: string };
        Update: Partial<SimulationRecord>;
      };
      usage_tracking: {
        Row: UsageRecord;
        Insert: Partial<UsageRecord> & { user_id: string };
        Update: Partial<UsageRecord>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ================================================================
// Table Row Types
// ================================================================

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  org_id: string | null;
  role: 'owner' | 'admin' | 'member';
  plan: PlanType;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: PlanType;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  max_members: number;
  created_at: string;
  updated_at: string;
}

export interface SimulationRecord {
  id: string;
  user_id: string;
  org_id: string | null;
  scenario_id: string;
  scenario_title: string;
  scenario_category: string | null;
  character_name: string;
  character_generation: string | null;
  transcript: Array<{ role: 'user' | 'model'; text: string }>;
  message_count: number;
  duration_seconds: number | null;
  final_trust: number | null;
  trust_history: number[];
  trust_dimensions: Record<string, number> | null;
  feedback: Record<string, unknown> | null;
  coaching_skills: Record<string, number> | null;
  radar_chart: Record<string, number> | null;
  memo: string;
  tags: string[];
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  date: string;
  simulation_count: number;
  coaching_count: number;
  sos_count: number;
  token_count: number;
}

// ================================================================
// Plan Types & Limits
// ================================================================

export type PlanType = 'free' | 'pro' | 'ultra';

export interface PlanLimits {
  dailySim: number;
  monthlySim: number;
  totalSim: number;       // 총 시뮬레이션 횟수 제한 (free=3)
  coaching: boolean;
  voice: boolean;
  scenarios: number;
  historyLimit: number;
  fullReport: boolean;     // 풀 리포트 여부
  historyCompare: boolean; // 이전 기록 비교
  peerCompare: boolean;    // 타인 비교 리포트
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    dailySim: 1,
    monthlySim: 3,
    totalSim: 3,
    coaching: false,
    voice: false,
    scenarios: 3,
    historyLimit: 3,
    fullReport: false,
    historyCompare: false,
    peerCompare: false,
  },
  pro: {
    dailySim: 5,
    monthlySim: 30,
    totalSim: Infinity,
    coaching: true,
    voice: true,
    scenarios: 20,
    historyLimit: Infinity,
    fullReport: true,
    historyCompare: true,
    peerCompare: false,
  },
  ultra: {
    dailySim: Infinity,
    monthlySim: Infinity,
    totalSim: Infinity,
    coaching: true,
    voice: true,
    scenarios: 40,
    historyLimit: Infinity,
    fullReport: true,
    historyCompare: true,
    peerCompare: true,
  },
};

// ================================================================
// Plan Display Info
// ================================================================

export const PLAN_INFO: Record<PlanType, { name: string; price: string; period: string }> = {
  free: { name: '무료', price: '₩0', period: '월' },
  pro: { name: '프로', price: '₩9,900', period: '월' },
  ultra: { name: '울트라', price: '₩29,900', period: '월' },
};
