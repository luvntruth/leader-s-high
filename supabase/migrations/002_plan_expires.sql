-- 플랜 만료일 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- plan 타입 확장 (enterprise → ultra)
-- 기존 enterprise 값을 ultra로 변환
UPDATE profiles SET plan = 'ultra' WHERE plan = 'enterprise';
