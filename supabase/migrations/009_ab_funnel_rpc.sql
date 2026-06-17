-- ================================================================
-- 광고 A/B 버전별 퍼널 RPC (본인=owner 전용)
-- analytics_events 는 SELECT 가 service_role 전용이지만,
-- SECURITY DEFINER 함수로 안전하게 집계만 반환한다(원본 행 노출 X).
-- 권한: 호출자의 profiles.role 이 'owner' 일 때만. 그 외에는 예외.
-- 프런트: supabase.rpc('get_ab_funnel') (로그인한 owner 세션으로 호출)
-- ================================================================

CREATE OR REPLACE FUNCTION get_ab_funnel()
RETURNS TABLE (
  variant            text,
  onboarding         bigint,
  sim_start          bigint,
  signups            bigint,
  pricing_views      bigint,
  purchases          bigint,
  signup_rate_pct    numeric,
  purchase_rate_pct  numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 본인(owner)만 조회 가능
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner') THEN
    RAISE EXCEPTION 'forbidden: owner only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(e.properties->>'lp', ''), '(none)')                                         AS variant,
    COUNT(DISTINCT CASE WHEN e.event_name = 'onboarding_start' THEN e.session_id END)           AS onboarding,
    COUNT(DISTINCT CASE WHEN e.event_name = 'sim_start' THEN e.session_id END)                  AS sim_start,
    COUNT(DISTINCT CASE WHEN e.event_name = 'signup_complete' THEN e.session_id END)            AS signups,
    COUNT(DISTINCT CASE WHEN e.event_name = 'pricing_view' THEN e.session_id END)               AS pricing_views,
    COUNT(DISTINCT CASE WHEN e.event_name = 'checkout_success' THEN e.session_id END)           AS purchases,
    ROUND(
      COUNT(DISTINCT CASE WHEN e.event_name = 'signup_complete' THEN e.session_id END)::numeric
      / NULLIF(COUNT(DISTINCT CASE WHEN e.event_name = 'onboarding_start' THEN e.session_id END), 0) * 100, 1
    )                                                                                           AS signup_rate_pct,
    ROUND(
      COUNT(DISTINCT CASE WHEN e.event_name = 'checkout_success' THEN e.session_id END)::numeric
      / NULLIF(COUNT(DISTINCT CASE WHEN e.event_name = 'onboarding_start' THEN e.session_id END), 0) * 100, 1
    )                                                                                           AS purchase_rate_pct
  FROM analytics_events e
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_ab_funnel() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_ab_funnel() TO authenticated;

-- 본인 계정을 owner 로 지정(한 번만 실행, 본인 로그인 이메일로 교체):
--   UPDATE profiles SET role = 'owner' WHERE email = 'your-login@email.com';
