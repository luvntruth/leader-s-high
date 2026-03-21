-- ================================================================
-- Leader's High SaaS Foundation Schema
-- Version: 1.0
-- Date: 2026-03-21
-- ================================================================

-- ================================================================
-- 1. organizations (조직)
-- ================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  max_members INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 2. profiles (사용자 프로필 — auth.users 확장)
-- ================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================================================================
-- 3. simulation_history (시뮬레이션 이력)
-- ================================================================
CREATE TABLE simulation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- 시나리오 메타
  scenario_id TEXT NOT NULL,
  scenario_title TEXT NOT NULL,
  scenario_category TEXT,
  character_name TEXT NOT NULL,
  character_generation TEXT,

  -- 대화 데이터
  transcript JSONB NOT NULL DEFAULT '[]',
  message_count INT NOT NULL DEFAULT 0,
  duration_seconds INT,

  -- 신뢰도 결과
  final_trust INT,
  trust_history JSONB DEFAULT '[]',
  trust_dimensions JSONB,

  -- AI 피드백
  feedback JSONB,
  coaching_skills JSONB,
  radar_chart JSONB,

  -- 사용자 메모
  memo TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sim_history_user ON simulation_history(user_id, created_at DESC);
CREATE INDEX idx_sim_history_org ON simulation_history(org_id, created_at DESC);

-- ================================================================
-- 4. usage_tracking (일일 사용량)
-- ================================================================
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  simulation_count INT NOT NULL DEFAULT 0,
  coaching_count INT NOT NULL DEFAULT 0,
  sos_count INT NOT NULL DEFAULT 0,
  token_count INT NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_usage_user_date ON usage_tracking(user_id, date DESC);

-- ================================================================
-- 5. Auto-create profile on signup (트리거)
-- ================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ================================================================
-- 6. RLS 정책
-- ================================================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_select_org_admin"
  ON profiles FOR SELECT
  USING (
    org_id IS NOT NULL AND org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')
    )
  );

-- simulation_history
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_history_select_own"
  ON simulation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sim_history_insert_own"
  ON simulation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sim_history_update_own"
  ON simulation_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "sim_history_delete_own"
  ON simulation_history FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "sim_history_select_org_admin"
  ON simulation_history FOR SELECT
  USING (
    org_id IS NOT NULL AND org_id IN (
      SELECT p.org_id FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner')
    )
  );

-- usage_tracking
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own"
  ON usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usage_upsert_own"
  ON usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_update_own"
  ON usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_member"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
  );
