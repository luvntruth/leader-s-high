-- ================================================================
-- 013: 결제 멱등성 / 사용자 귀속 검증 테이블
-- ----------------------------------------------------------------
-- verify-payment 가 PortOne status=PAID + 금액만 확인하던 탓에
--  (1) 동일 paymentId 반복 호출로 plan_expires_at 무한 연장
--  (2) 한 결제를 다른 계정에 적용
-- 이 가능했다. paymentId 를 PK 로 1회만 기록해 재적용을 차단한다.
-- ================================================================
CREATE TABLE IF NOT EXISTS processed_payments (
  payment_id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_payments_user
  ON processed_payments (user_id);

-- 클라이언트 직접 접근 차단 — worker 의 service_role 키만 RLS 를 우회해 기록.
-- (정책을 두지 않으면 anon/authenticated 는 접근 불가)
ALTER TABLE processed_payments ENABLE ROW LEVEL SECURITY;
