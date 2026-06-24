-- ================================================================
-- 012: plan CHECK 제약에 'ultra' 추가
-- ----------------------------------------------------------------
-- 001_schema.sql 의 CHECK (plan IN ('free','pro','enterprise')) 가
-- 002 의 enterprise→ultra 전환 이후에도 그대로 남아 있어,
-- 울트라(₩29,900) 결제 시 worker 의 profiles.plan='ultra' 쓰기가
-- CHECK 위반으로 전부 실패하던 버그를 수정한다.
-- (PortOne 결제는 성공하지만 플랜 미반영 → "결제됐으나 활성화 실패")
-- ================================================================

-- 잔존 enterprise 값 정리 (002 재확인 — 제약 교체 전 위반 방지)
UPDATE profiles SET plan = 'ultra' WHERE plan = 'enterprise';
UPDATE organizations SET plan = 'ultra' WHERE plan = 'enterprise';

-- profiles.plan
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'pro', 'ultra'));

-- organizations.plan
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'pro', 'ultra'));
