-- Spec v3 §7.1: Pro 플랜 결제 후 사용자가 40개 중 선택한 20개 시나리오 ID 저장
-- Free: 빈 배열 → FREE_SCENARIOS 상수로 access
-- Pro: 20개 ID 배열 → 해당 ID 만 access 허용
-- Ultra: 빈 배열로 두어도 무방 → canAccessScenarioById 에서 plan==='ultra' 체크로 전체 허용

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS selected_scenarios JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.selected_scenarios IS
  'Pro 플랜 사용자가 40개 중 선택한 20개 시나리오 ID 배열. Free/Ultra 는 빈 배열.';
