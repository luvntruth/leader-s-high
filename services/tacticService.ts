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
  icon: string;     // material-symbols
  hint: string;     // 카드 의도 설명 (선택 시 배지)
  whenToUse: string; // 선택 전 미니 가이드 — "이럴 때 효과적"
}

export const DEFAULT_TACTICS: TacticDef[] = [
  { id: 'empathy', label: '공감', icon: 'favorite', hint: '상대 감정을 먼저 인정·반영', whenToUse: '상대가 방어적·반발할 때 — 감정을 받아줘 안전감을 먼저 만들 때' },
  { id: 'sbi', label: '사실 짚기', icon: 'fact_check', hint: 'SBI: 상황·행동·영향을 사실로', whenToUse: '신뢰가 어느 정도 쌓인 뒤 — 비난 없이 문제를 직면시킬 때' },
  { id: 'question', label: '열린 질문', icon: 'help', hint: '판단 대신 자율성을 여는 질문', whenToUse: '상대가 관망·머뭇거릴 때 — 스스로 답을 찾게 물꼬를 틀 때' },
  { id: 'acknowledge', label: '인정', icon: 'thumb_up', hint: '강점·노력을 구체적으로 인정', whenToUse: '대화가 풀리기 시작할 때 — 협력·합의로 끌어올릴 때' },
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

// 현재 신뢰 상태 코칭 힌트 (정답 노출이 아니라 '접근 방향'만 약하게 제시)
const STATE_HINTS: string[] = [
  '상대가 강하게 반발 중 — 설득보다 감정을 먼저 받아주는 접근이 통하기 쉬워요',
  '경계·방어 상태 — 사실을 들이대기 전에 안전감을 먼저 만들어 주세요',
  '관망 중 — 스스로 말하게 하는 질문이 물꼬를 틀 수 있어요',
  '조금씩 수용 중 — 공감과 사실 정리를 함께 가져가기 좋아요',
  '열린 대화 — 구체적 사실과 인정으로 합의를 향해 가세요',
  '협력 단계 — 인정과 다음 스텝 합의가 효과적이에요',
];

function bandIndex(trust: number): number {
  if (trust <= 20) return 0;
  if (trust <= 40) return 1;
  if (trust <= 55) return 2;
  if (trust <= 70) return 3;
  if (trust <= 85) return 4;
  return 5;
}

export function stateHint(trust: number): string {
  return STATE_HINTS[bandIndex(trust)];
}

// 전송 후 '왜' 이 결과가 나왔는지 한 줄 설명 — 매 수가 학습이 되도록.
export function tacticReason(trust: number, tactic: TacticId, fit: TacticFit): string {
  const low = bandIndex(trust) <= 1;   // 반발·방어
  const mid = bandIndex(trust) === 2;  // 관망
  const high = bandIndex(trust) >= 4;  // 열린·협력

  if (fit === 'weak') {
    if (tactic === 'sbi') return '방어적인 상대에겐 사실부터 짚으면 "추궁"처럼 느껴져 더 닫혀요. 공감·인정으로 안전감을 먼저 주세요.';
    return '지금 상태엔 이 방식이 잘 안 통해요. 상대 감정 상태에 맞는 접근을 골라보세요.';
  }

  if (fit === 'crit') {
    if (tactic === 'empathy') return '감정을 먼저 인정하니 상대가 방어를 풀고 마음을 열어요.';
    if (tactic === 'acknowledge') return '노력을 구체적으로 인정하니 협력 의지가 올라가요.';
    if (tactic === 'question' && mid) return '스스로 답을 찾게 하니 방어가 줄고 주도성이 살아나요.';
    if (tactic === 'sbi' && high) return '신뢰가 쌓인 지금은 사실을 짚어도 추궁이 아니라 "함께 보는 문제"로 받아들여요.';
    return '지금 상황에 딱 맞는 한 수예요.';
  }

  // good
  if (tactic === 'empathy') return '감정을 받아주는 건 거의 항상 안전한 한 수예요.';
  if (tactic === 'question') return '질문은 상대를 대화에 끌어들이는 무난한 선택이에요.';
  if (tactic === 'acknowledge') return '인정은 관계를 데우는 데 도움이 돼요.';
  if (tactic === 'sbi') return low ? '사실 짚기는 통했지만, 더 신뢰가 쌓인 뒤가 안전해요.' : '사실을 차분히 정리해 전달했어요.';
  return '무난한 선택이에요.';
}
