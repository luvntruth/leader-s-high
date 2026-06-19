-- ================================================================
-- 광고 A/B 퍼널 RPC 에 날짜 범위 필터 추가 (본인=owner 전용)
-- Meta Ads Manager 는 기간별로 성과를 보므로, 대시보드도 동일 기간으로
-- 대조할 수 있도록 p_from / p_to (선택) 파라미터를 받는다.
--   - 둘 다 NULL  → 전체 기간 (기존 동작과 동일)
--   - p_from 만   → 해당 시점 이후
--   - p_to 만     → 해당 시점 이전
-- 프런트: supabase.rpc('get_ab_funnel', { p_from, p_to })  // 인자 생략 시 전체
--
-- 기존 무인자 함수를 DROP 하고, 기본값(NULL) 파라미터 버전으로 대체한다.
-- (오버로딩으로 두면 무인자 호출 시 PostgREST 가 함수를 특정하지 못함)
-- ================================================================

DROP FUNCTION IF EXISTS get_ab_funnel();

CREATE OR REPLACE FUNCTION get_ab_funnel(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
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
  WHERE (p_from IS NULL OR e.created_at >= p_from)
    AND (p_to   IS NULL OR e.created_at <  p_to)
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_ab_funnel(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_ab_funnel(timestamptz, timestamptz) TO authenticated;
