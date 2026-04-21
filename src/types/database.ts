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
      report_purchases: {
        Row: ReportPurchase;
        Insert: Omit<ReportPurchase, 'id' | 'created_at'>;
        Update: Partial<ReportPurchase>;
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
  plan_expires_at: string | null;
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
  leadership_type: LeadershipType | null;
  communication_pattern: CommunicationPattern | null;
  memo: string;
  tags: string[];
  created_at: string;
}

// ================================================================
// 골든 리포트 구매 이력
// ================================================================

export interface ReportPurchase {
  id: string;
  user_id: string;
  simulation_id: string;
  payment_id: string;
  amount: number;
  created_at: string;
}

// ================================================================
// 리더십 분석 타입
// ================================================================

export type LeadershipType = 'coaching' | 'directing' | 'delegating' | 'participating';

export interface CommunicationPattern {
  questionRatio: number;    // 질문 비율 (0~100)
  empathyRatio: number;     // 공감 표현 비율
  directiveRatio: number;   // 지시/명령 비율
  listeningRatio: number;   // 경청/반영 비율
}

export const LEADERSHIP_TYPE_INFO: Record<LeadershipType, { name: string; emoji: string; desc: string; color: string }> = {
  coaching: { name: '코칭형', emoji: '🎯', desc: '질문과 경청으로 팀원의 잠재력을 끌어내는 리더', color: '#10B981' },
  directing: { name: '지시형', emoji: '📋', desc: '명확한 방향과 기준을 제시하는 리더', color: '#3B82F6' },
  delegating: { name: '위임형', emoji: '🤝', desc: '팀원을 신뢰하고 자율성을 부여하는 리더', color: '#8B5CF6' },
  participating: { name: '참여형', emoji: '💬', desc: '함께 논의하고 합의를 이끄는 리더', color: '#F59E0B' },
};

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
  scenarios: number;          // 사용 가능 시나리오 수
  maxTriesPerScenario: number; // 시나리오당 최대 시도 횟수
  coaching: boolean;
  voice: boolean;
  historyLimit: number;
  fullReport: boolean;
  historyCompare: boolean;
  peerCompare: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    scenarios: 3,
    maxTriesPerScenario: 1,
    coaching: false,
    voice: false,
    historyLimit: 3,
    fullReport: false,
    historyCompare: false,
    peerCompare: false,
  },
  pro: {
    scenarios: 20,
    maxTriesPerScenario: 3,
    coaching: true,
    voice: true,
    historyLimit: Infinity,
    fullReport: true,
    historyCompare: true,
    peerCompare: false,
  },
  ultra: {
    scenarios: 40,
    maxTriesPerScenario: 5,
    coaching: true,
    voice: true,
    historyLimit: Infinity,
    fullReport: true,
    historyCompare: true,
    peerCompare: true,
  },
};

// ================================================================
// 기간제 요금 옵션
// ================================================================

export interface PricingOption {
  id: string;
  plan: PlanType;
  name: string;
  price: number;        // 원
  priceLabel: string;   // 표시용
  days: number;         // 사용 기간 (일)
  scenarios: number;
  maxTriesPerScenario: number;
  priceId?: string;     // Stripe Price ID
}

export const PRICING_OPTIONS: PricingOption[] = [
  {
    id: 'free',
    plan: 'free',
    name: '무료 체험',
    price: 0,
    priceLabel: '₩0',
    days: Infinity,
    scenarios: 3,
    maxTriesPerScenario: 1,
  },
  {
    id: 'pro-10',
    plan: 'pro',
    name: '프로 10일',
    price: 8900,
    priceLabel: '₩8,900',
    days: 10,
    scenarios: 20,
    maxTriesPerScenario: 3,
    priceId: 'price_pro_10d',
  },
  {
    id: 'pro-20',
    plan: 'pro',
    name: '프로 20일',
    price: 13500,
    priceLabel: '₩13,500',
    days: 20,
    scenarios: 20,
    maxTriesPerScenario: 3,
    priceId: 'price_pro_20d',
  },
  // Spec v3 §3.3: Ultra 는 30일 단일 옵션 ₩29,900
  {
    id: 'ultra-30',
    plan: 'ultra',
    name: '울트라 30일',
    price: 29900,
    priceLabel: '₩29,900',
    days: 30,
    scenarios: 40,
    maxTriesPerScenario: 5,
    priceId: 'price_ultra_30d',
  },
  // Deprecated legacy options (kept for backward compat, not shown in UI)
  {
    id: 'ultra-15',
    plan: 'ultra',
    name: '울트라 15일 (단종)',
    price: 17900,
    priceLabel: '₩17,900',
    days: 15,
    scenarios: 40,
    maxTriesPerScenario: 5,
    priceId: 'price_ultra_15d',
  },
  {
    id: 'ultra-25',
    plan: 'ultra',
    name: '울트라 25일 (단종)',
    price: 24500,
    priceLabel: '₩24,500',
    days: 25,
    scenarios: 40,
    maxTriesPerScenario: 5,
    priceId: 'price_ultra_25d',
  },
];
