-- ================================================================
-- 광고 A/B 버전별 퍼널 뷰
-- analytics_events 는 SELECT 가 service_role 전용이므로,
-- 아래 뷰는 Supabase SQL/Table 에디터(service role)에서 조회한다.
--   SELECT * FROM ab_funnel_by_variant;
--   SELECT * FROM ab_funnel_by_ad;
-- 버전 식별: properties->>'lp' (practice/diagnosis/new-manager), 소재: properties->>'utm_content'
-- ================================================================

-- 랜딩 버전(lp)별 퍼널 — 세션 기준 유니크 카운트 + 전환율
CREATE OR REPLACE VIEW ab_funnel_by_variant AS
SELECT
  COALESCE(NULLIF(properties->>'lp', ''), '(none)')                                           AS variant,
  COUNT(DISTINCT CASE WHEN event_name = 'onboarding_start' THEN session_id END)               AS onboarding,
  COUNT(DISTINCT CASE WHEN event_name = 'sim_start' THEN session_id END)                      AS sim_start,
  COUNT(DISTINCT CASE WHEN event_name = 'signup_complete' THEN session_id END)                AS signups,
  COUNT(DISTINCT CASE WHEN event_name = 'pricing_view' THEN session_id END)                   AS pricing_views,
  COUNT(DISTINCT CASE WHEN event_name = 'checkout_success' THEN session_id END)               AS purchases,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_name = 'signup_complete' THEN session_id END)::numeric
    / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'onboarding_start' THEN session_id END), 0) * 100, 1
  )                                                                                           AS signup_rate_pct,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_name = 'checkout_success' THEN session_id END)::numeric
    / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'onboarding_start' THEN session_id END), 0) * 100, 1
  )                                                                                           AS purchase_rate_pct
FROM analytics_events
GROUP BY 1
ORDER BY onboarding DESC;

-- 광고 소재(utm_content)별 퍼널 — 같은 버전 내 소재 A/B 비교용
CREATE OR REPLACE VIEW ab_funnel_by_ad AS
SELECT
  COALESCE(NULLIF(properties->>'utm_content', ''), '(none)')                                  AS ad_content,
  COALESCE(NULLIF(properties->>'lp', ''), '(none)')                                           AS variant,
  COUNT(DISTINCT CASE WHEN event_name = 'onboarding_start' THEN session_id END)               AS onboarding,
  COUNT(DISTINCT CASE WHEN event_name = 'signup_complete' THEN session_id END)                AS signups,
  COUNT(DISTINCT CASE WHEN event_name = 'checkout_success' THEN session_id END)               AS purchases,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_name = 'checkout_success' THEN session_id END)::numeric
    / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'onboarding_start' THEN session_id END), 0) * 100, 1
  )                                                                                           AS purchase_rate_pct
FROM analytics_events
GROUP BY 1, 2
ORDER BY onboarding DESC;
