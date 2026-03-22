-- ================================================================
-- Analytics Events Table
-- fire-and-forget 이벤트 트래킹 (게스트 포함)
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id  TEXT NOT NULL,
  event_name  TEXT NOT NULL,
  properties  JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 인덱스: 이벤트 이름별 조회 + 시간순 정렬
CREATE INDEX idx_analytics_events_name ON analytics_events(event_name, created_at DESC);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id, created_at DESC);

-- RLS: 비인증 게스트도 INSERT 가능, SELECT는 서비스 키만
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only service role can read analytics"
  ON analytics_events FOR SELECT
  USING (auth.role() = 'service_role');
