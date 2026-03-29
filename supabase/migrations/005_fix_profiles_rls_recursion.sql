-- ================================================================
-- Fix: profiles RLS 무한 재귀 버그
-- 원인: profiles_select_org_admin 정책이 profiles 테이블을 재귀 참조
-- 해결: SECURITY DEFINER 함수로 RLS를 우회하는 헬퍼 함수 사용
-- ================================================================

-- 1. 기존 재귀 정책 삭제
DROP POLICY IF EXISTS "profiles_select_org_admin" ON profiles;

-- 2. SECURITY DEFINER 헬퍼 함수 생성 (RLS 우회하여 자신의 org/role 조회)
CREATE OR REPLACE FUNCTION get_my_org_role()
RETURNS TABLE(org_id uuid, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT org_id, role
  FROM profiles
  WHERE id = auth.uid();
$$;

-- 3. 재귀 없는 새 정책 생성
CREATE POLICY "profiles_select_org_admin"
  ON profiles FOR SELECT
  USING (
    org_id IS NOT NULL
    AND org_id IN (
      SELECT r.org_id
      FROM get_my_org_role() r
      WHERE r.role IN ('admin', 'owner')
    )
  );
