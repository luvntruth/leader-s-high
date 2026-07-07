// ─────────────────────────────────────────────────────────────
// 대화 유형 진단 (Diagnosis) — 5차원 신뢰 점수 기반 유형 판정
//
// 광고 앵글 "내 대화 진단받기"와 제품 경험을 일치시키는 핵심 로직.
// 판정은 AI 프롬프트가 아니라 코드에서 결정적으로 수행한다:
//   - 가장 낮은 차원 = 급소 → 유형 결정
//   - 가장 높은 차원 = 강점
// AI(리포트 생성)는 판정된 유형 프레임으로 "서술만" 담당한다.
// ─────────────────────────────────────────────────────────────

import type { TrustLevelOutput } from './trustLevelService';

export type TrustDimensions = TrustLevelOutput['dimensions'];
export type DimensionKey = keyof TrustDimensions;

export interface DiagnosisTypeDef {
  typeName: string;      // 유형명 — 공유되는 이름 (MBTI식 규정 프레임)
  identity: string;      // 한 줄 정체성 — 유형명에 따라다니는 문장
  strengthTitle: string; // 이 차원이 "최고"일 때 강점 제목
  strengthDesc: string;  // 강점 서술 템플릿 ({score} 치환)
  gapTitle: string;      // 이 차원이 "최저"(급소)일 때 제목
  gapDesc: string;       // 급소 서술 템플릿 ({score} 치환)
}

export const DIM_LABEL: Record<DimensionKey, string> = {
  psychological_safety: '심리적 안전',
  understanding_alignment: '이해·정렬',
  autonomy_fairness: '자율·공정',
  integrity_consistency: '진정성·일관',
  competence_support: '역량·지원',
};

// 유형명·카피는 상수로 분리 — 감수/교체 용이
export const TYPE_MAP: Record<DimensionKey, DiagnosisTypeDef> = {
  psychological_safety: {
    typeName: '돌직구형',
    identity: '맞는 말만 하는데, 사람이 다친다',
    strengthTitle: '명확하게 말한다',
    strengthDesc: '돌려 말하지 않고 핵심을 짚는 힘. \'심리적 안전\'이 {score}로 가장 높아, 팀원이 편하게 속말을 꺼냅니다.',
    gapTitle: '말이 맞을수록, 방어벽이 올라간다',
    gapDesc: '내용은 옳지만 전달이 상대의 안전감을 깎습니다. \'심리적 안전\'이 {score}로 가장 낮아, 팀원이 속말을 멈추고 방어부터 하게 될 위험이 큽니다.',
  },
  understanding_alignment: {
    typeName: '속단형',
    identity: '다 듣기 전에 답이 나온다',
    strengthTitle: '상대를 정확히 읽는다',
    strengthDesc: '경청과 요약으로 서로의 그림을 맞추는 힘. \'이해·정렬\'이 {score}로 가장 높습니다.',
    gapTitle: '듣기 전에 결론이 먼저 도착한다',
    gapDesc: '상대의 상황을 다 읽기 전에 밀어붙입니다. \'이해·정렬\'이 {score}로 가장 낮아, 팀원은 "어차피 말해도 안 듣는다"고 느끼기 시작합니다.',
  },
  autonomy_fairness: {
    typeName: '해결사형',
    identity: '답을 줘버려서, 팀원이 생각을 멈춘다',
    strengthTitle: '스스로 하게 만든다',
    strengthDesc: '통제 대신 선택권을 주는 힘. \'자율·공정\'이 {score}로 가장 높습니다.',
    gapTitle: '당신이 풀수록, 팀원은 수동적이 된다',
    gapDesc: '답을 먼저 줘서 상대의 자율이 줄어듭니다. \'자율·공정\'이 {score}로 가장 낮아, 단기엔 빠르지만 팀원이 스스로 판단하는 힘이 자라지 않습니다.',
  },
  integrity_consistency: {
    typeName: '평화주의형',
    identity: '분위기는 지키는데, 진짜 문제는 남는다',
    strengthTitle: '말과 행동이 일치한다',
    strengthDesc: '약속과 실행의 아귀가 맞는 힘. \'진정성·일관\'이 {score}로 가장 높아, 신뢰가 쌓입니다.',
    gapTitle: '갈등을 피한 자리에, 문제가 쌓인다',
    gapDesc: '불편한 진실을 돌려 말하거나 미룹니다. \'진정성·일관\'이 {score}로 가장 낮아, 당장은 평화롭지만 신뢰가 서서히 샙니다.',
  },
  competence_support: {
    typeName: '공감형',
    identity: '잘 들어주는데, 방향이 없다',
    strengthTitle: '실질적으로 돕는다',
    strengthDesc: '장벽을 치워주고 다음 행동을 함께 잡는 힘. \'역량·지원\'이 {score}로 가장 높습니다.',
    gapTitle: '공감 뒤, 방향이 사라진다',
    gapDesc: "잘 들어주지만 '그래서 다음에 무엇을'이 약합니다. '역량·지원'이 {score}로 가장 낮아, 대화 후 팀원이 무엇을 해야 할지 모른 채 끝날 위험이 큽니다.",
  },
};

const ORDER: DimensionKey[] = [
  'psychological_safety',
  'understanding_alignment',
  'autonomy_fairness',
  'integrity_consistency',
  'competence_support',
];

export interface DiagnosisResult {
  typeKey: DimensionKey;   // 급소 차원 (유형 결정 축)
  typeName: string;
  identity: string;
  strength: { key: DimensionKey; label: string; score: number; title: string; desc: string };
  gap: { key: DimensionKey; label: string; score: number; title: string; desc: string };
  dims: TrustDimensions;
}

const fill = (tpl: string, score: number) => tpl.replace('{score}', String(score));

/**
 * 5차원 점수 → 유형 판정.
 * 동점 시 ORDER 앞선 차원 우선 (결정적 판정 보장).
 * 모든 값이 유효 숫자가 아니면 null 반환 (렌더 측 폴백용).
 */
export function diagnose(dims: TrustDimensions | null | undefined): DiagnosisResult | null {
  if (!dims) return null;
  for (const k of ORDER) {
    const v = (dims as any)[k];
    if (typeof v !== 'number' || Number.isNaN(v)) return null;
  }

  let lowest: DimensionKey = ORDER[0];
  let highest: DimensionKey = ORDER[0];
  for (const k of ORDER) {
    if (dims[k] < dims[lowest]) lowest = k;
    if (dims[k] > dims[highest]) highest = k;
  }
  // 전 차원 동점 등으로 강점==급소가 되면, 강점은 차순위 최고로 대체
  if (highest === lowest) {
    let second: DimensionKey | null = null;
    for (const k of ORDER) {
      if (k === lowest) continue;
      if (second === null || dims[k] > dims[second]) second = k;
    }
    if (second) highest = second;
  }

  const gapDef = TYPE_MAP[lowest];
  const strDef = TYPE_MAP[highest];

  return {
    typeKey: lowest,
    typeName: gapDef.typeName,
    identity: gapDef.identity,
    strength: {
      key: highest,
      label: DIM_LABEL[highest],
      score: dims[highest],
      title: strDef.strengthTitle,
      desc: fill(strDef.strengthDesc, dims[highest]),
    },
    gap: {
      key: lowest,
      label: DIM_LABEL[lowest],
      score: dims[lowest],
      title: gapDef.gapTitle,
      desc: fill(gapDef.gapDesc, dims[lowest]),
    },
    dims,
  };
}
