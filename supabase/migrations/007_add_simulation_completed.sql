-- Spec v3 §3·§7.2: 중단 정책 카운팅 인프라
-- - simulation_history.completed: 12턴 완주(true) vs 중단(false)
-- - Free: 누적 5회 중단 시 무료 체험 차단
-- - Pro/Ultra: 시나리오당 10회 중단 시 해당 시나리오 차단
--
-- 기존 row 는 모두 완주로 간주 (false 로 두면 기존 사용자가 갑자기 차단됨)
ALTER TABLE simulation_history
ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN simulation_history.completed IS
  '12턴 완주 여부. true=완주, false=중단. usageService.canStartSimulation 의 abandon limit 검증에 사용.';

-- 중단 카운트 조회 인덱스 (user_id + scenario_id + completed=false 조합)
CREATE INDEX IF NOT EXISTS idx_simulation_history_abandon
  ON simulation_history (user_id, scenario_id)
  WHERE completed = false;
