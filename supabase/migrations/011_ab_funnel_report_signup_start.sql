-- ================================================================
-- Step ⑤ (측정 분리): get_ab_funnel 에 진단용 중간 단계 2개 추가.
--
-- 기존 퍼널은 sim_start → signup_complete 사이가 한 칸이라
-- "시뮬→가입 0%"가 (a)대화 미완 (b)CTA 미클릭 (c)가입폼 이탈
-- 중 어디서 죽는지 보이지 않았다. 두 컬럼을 끼워 넣어 분해한다.
--   report_views  = report_view      (리포트까지 도달 = 대화 완료 후 결과 확인)
--   signup_starts = signup_start     (가입 CTA 클릭 = 가입 시도 진입)
--
-- 퍼널 순서:
--   진입 → 시뮬시작 → 리포트 → 가입클릭 → 가입완료 → 플랜조회 → 결제
--
-- 반환 컬럼이 바뀌므로(시그니처는 동일) CREATE OR REPLACE 로 본문만 교체.
-- ================================================================

DROP FUNCTION IF EXISTS get_ab_funnel(timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_ab_funnel(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  variant            text,
  onboarding         bigint,
  sim_start          bigint,
  report_views       bigint,
  signup_starts      bigint,
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
    COUNT(DISTINCT CASE WHEN e.event_name = 'report_view' THEN e.session_id END)                AS report_views,
    COUNT(DISTINCT CASE WHEN e.event_name = 'signup_start' THEN e.session_id END)               AS signup_starts,
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
