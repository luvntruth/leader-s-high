-- ================================================================
-- 소재별(utm_content) 퍼널 RPC — launch2607 캠페인 광고 3종 비교용.
--
-- 배경: get_ab_funnel 은 랜딩 버전(lp) 기준이라 같은 lp=diagnosis 로
-- 들어오는 광고 3종(diagnosis_v1/v2/v3)이 한 행으로 합쳐진다.
-- 소재별로 하류 퍼널(리포트·가입·결제)까지 갈라 보기 위해 신설.
--
-- diagnosis_shown(진단 노출) 컬럼: 무료 리포트에서 진단 섹션이 실제로
-- 렌더링된 세션 수. report_views 대비 낮으면 trustDimensions 유실로
-- 폴백 배너가 뜨고 있다는 신호 (제품 버그 탐지용).
-- ================================================================

CREATE OR REPLACE FUNCTION get_creative_funnel(
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS TABLE (
  creative        text,
  onboarding      bigint,
  sim_start       bigint,
  report_views    bigint,
  diagnosis_shown bigint,
  signup_starts   bigint,
  signups         bigint,
  purchases       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 본인(owner)만 조회 가능 (get_ab_funnel 과 동일 가드)
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner') THEN
    RAISE EXCEPTION 'forbidden: owner only';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(NULLIF(e.properties->>'utm_content', ''), '(직접 유입)')                              AS creative,
    COUNT(DISTINCT CASE WHEN e.event_name = 'onboarding_start' THEN e.session_id END)           AS onboarding,
    COUNT(DISTINCT CASE WHEN e.event_name = 'sim_start' THEN e.session_id END)                  AS sim_start,
    COUNT(DISTINCT CASE WHEN e.event_name = 'report_view' THEN e.session_id END)                AS report_views,
    COUNT(DISTINCT CASE WHEN e.event_name = 'diagnosis_type_shown' THEN e.session_id END)       AS diagnosis_shown,
    COUNT(DISTINCT CASE WHEN e.event_name = 'signup_start' THEN e.session_id END)               AS signup_starts,
    COUNT(DISTINCT CASE WHEN e.event_name = 'signup_complete' THEN e.session_id END)            AS signups,
    COUNT(DISTINCT CASE WHEN e.event_name = 'checkout_success' THEN e.session_id END)           AS purchases
  FROM analytics_events e
  WHERE (p_from IS NULL OR e.created_at >= p_from)
    AND (p_to   IS NULL OR e.created_at <  p_to)
  GROUP BY 1
  ORDER BY 2 DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_creative_funnel(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_creative_funnel(timestamptz, timestamptz) TO authenticated;
