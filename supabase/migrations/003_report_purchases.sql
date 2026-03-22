-- 골든 리포트 구매 이력 테이블
CREATE TABLE IF NOT EXISTS report_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  simulation_id TEXT NOT NULL,
  payment_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 동일 시뮬레이션 중복 구매 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_purchases_user_sim
  ON report_purchases (user_id, simulation_id);

-- 유저별 구매 이력 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_report_purchases_user
  ON report_purchases (user_id);

-- RLS 정책
ALTER TABLE report_purchases ENABLE ROW LEVEL SECURITY;

-- 자기 구매 이력만 조회 가능
CREATE POLICY "Users can view own report purchases"
  ON report_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 자기 구매만 삽입 가능
CREATE POLICY "Users can insert own report purchases"
  ON report_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
