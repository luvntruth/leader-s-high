// ================================================================
// 전술(Tactic) 서비스 — 시뮬레이션 게임화 (접근 B)
// ----------------------------------------------------------------
// 사용자가 매 턴 "이번 한 수의 의도"를 카드로 선택하면,
// 현재 신뢰 수준(밴드)에 비춰 적합도(crit/good/weak)를 즉시 판정한다.
// 무거운 AI 스코어링(TrustLevelService)과 분리 — 매 턴 클라이언트에서 즉시 계산.
// 적합도 표는 SDT/심리적 안전감 휴리스틱 기반(상황에 맞는 프레임워크 선택 학습).
// ================================================================

export type TacticId = 'empathy' | 'sbi' | 'question' | 'acknowledge';

export interface TacticDef {
  id: TacticId;
  label: string;
  icon: string;   // material-symbols
  hint: string;   // 카드 의도 설명 (선택 시 배지)
}

export const DEFAULT_TACTICS: TacticDef[] = [
  { id: 'empathy', label: '공감', icon: 'favorite', hint: '상대 감정을 먼저 인정·반영' },
  { id: 'sbi', label: '사실 짚기', icon: 'fact_check', hint: 'SBI: 상황·행동·영향을 사실로' },
  { id: 'question', label: '열린 질문', icon: 'help', hint: '판단 대신 자율성을 여는 질문' },
  { id: 'acknowledge', label: '인정', icon: 'thumb_up', hint: '강점·노력을 구체적으로 인정' },
];

export type TacticFit = 'crit' | 'good' | 'weak';

// 신뢰 밴드 인덱스 (getEmotionState 6단계와 정렬)
// 0: 강한 반발(≤20) / 1: 경계·방어(≤40) / 2: 유보적 관망(≤55)
// 3: 점진적 수용(≤70) / 4: 열린 대화(≤85) / 5: 설득·합의(>85)
function trustBandIndex(trust: number): number {
  if (trust <= 20) return 0;
  if (trust <= 40) return 1;
  if (trust <= 55) return 2;
  if (trust <= 70) return 3;
  if (trust <= 85) return 4;
  return 5;
}

// [밴드][전술] → 적합도. 낮은 신뢰엔 공감·인정이 효과적, 높은 신뢰엔 사실 짚기·인정이 결정적.
const EFFECTIVENESS: Record<TacticId, TacticFit[]> = {
  //          b0      b1      b2      b3      b4      b5
  empathy:    ['crit', 'crit', 'good', 'good', 'good', 'good'],
  acknowledge:['good', 'good', 'good', 'good', 'crit', 'crit'],
  question:   ['good', 'good', 'crit', 'good', 'good', 'good'],
  sbi:        ['weak', 'weak', 'good', 'good', 'crit', 'crit'],
};

export function evaluateTactic(trust: number, tactic: TacticId): TacticFit {
  const band = trustBandIndex(trust);
  return EFFECTIVENESS[tactic]?.[band] ?? 'good';
}

export function getTacticDef(id: TacticId): TacticDef {
  return DEFAULT_TACTICS.find(t => t.id === id) || DEFAULT_TACTICS[0];
}

// 시나리오별 전술 — Phase 1 은 기본 세트. (Phase 2 에서 시나리오 커스터마이즈)
export function getTactics(_scenarioId?: string): TacticDef[] {
  return DEFAULT_TACTICS;
}

// 적합도 + 콤보 → 화면 표시용 라벨/색
export function tacticFlashLabel(fit: TacticFit, combo: number): { label: string; tone: 'crit' | 'good' | 'weak' } {
  if (fit === 'weak') return { label: '역효과 주의', tone: 'weak' };
  if (fit === 'crit') return { label: combo >= 2 ? `CRITICAL · COMBO x${combo}` : 'CRITICAL!', tone: 'crit' };
  return { label: combo >= 2 ? `좋은 선택 · COMBO x${combo}` : '좋은 선택', tone: 'good' };
}

// 콤보 갱신: weak 면 리셋, 그 외 +1
export function nextCombo(prev: number, fit: TacticFit): number {
  return fit === 'weak' ? 0 : prev + 1;
}
