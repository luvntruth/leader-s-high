-- 014: 구독 시작일 기록 — "이번 구독 주기 사용 횟수" 정확 집계용
-- ----------------------------------------------------------------
-- plan_expires_at(만료일)만으로는 구매 기간(days: Pro 10/20, Ultra 30)을 알 수 없어
-- 구독 시작 시점을 역산할 수 없다. 결제(plan 활성화) 시점을 직접 기록해
-- simulation_history.created_at >= plan_started_at 으로 구독 주기별 사용량을 집계한다.
-- 기존 유료 사용자는 NULL → 다음 결제 시점부터 정확히 채워진다.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.plan_started_at IS
  '현재 유료 플랜 구독이 시작(결제)된 시각. 무료 플랜/미결제는 NULL. 구독 주기별 사용 횟수 집계에 사용.';
