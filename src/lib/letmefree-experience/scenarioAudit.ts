import { SCENARIOS } from '../../../constants';

export type ScenarioAuditDecision = 'KEEP' | 'MERGE' | 'REWRITE' | 'DROP';

export type ScenarioAuditItem = {
  sourceScenarioId: string;
  title: string;
  decision: ScenarioAuditDecision;
  targetExperienceIds: string[];
  reason: string;
};

const auditById: Record<string, Omit<ScenarioAuditItem, 'sourceScenarioId' | 'title'>> = {
  'late-comer': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-execution-weekly-goal', 'weness-feedback-30sec-feedforward'],
    reason: '성과 기준과 팀 규범을 다루는 좋은 소재지만 낙인 없이 실행 기준 대화로 재작성해야 한다.',
  },
  boundaries: {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-care-boundary'],
    reason: '워라밸 대 협업 기준의 균형 훈련으로는 유효하지만 현재 표현은 상대를 이기적으로 단정한다.',
  },
  'team-clash': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-perspective-taking', 'weness-feedback-difficult-1on1'],
    reason: '세대/연차 권위 갈등 소재는 유효하나 존중과 기준을 함께 세우는 훈련으로 톤을 바꿔야 한다.',
  },
  'feedback-defense': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward'],
    reason: '방어적 반응 대응은 30초 피드포워드 리허설의 대표 케이스로 흡수한다.',
  },
  'low-motivation': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-diversity-care-boundary', 'weness-feedback-difficult-1on1'],
    reason: '번아웃 의심 팀원 대화는 배려와 기준 균형 및 어려운 1:1 훈련에 통합한다.',
  },
  'change-resistance': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-perspective-taking', 'weness-execution-small-hypothesis'],
    reason: '변화 저항은 관점 탐색과 작은 검증 가설로 전환하면 우리다움 실행 훈련에 맞다.',
  },
  'promotion-fail': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-difficult-1on1'],
    reason: '승진 누락 후 실망 대화는 어려운 1:1 roleplay의 고난도 변형으로 흡수한다.',
  },
  'quiet-quitting': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-perspective-taking', 'weness-execution-weekly-goal'],
    reason: '조용한 퇴사 소재는 비난보다 의미/목표 연결 대화로 재작성해야 한다.',
  },
  'micro-management': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward'],
    reason: '신뢰와 점검 기준을 설명하는 피드포워드 연습 케이스로 적합하다.',
  },
  'skill-gap': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-execution-weekly-goal', 'weness-feedback-30sec-feedforward'],
    reason: '역량 갭과 책임 부여를 다루되 트러블 메이커식 낙인은 제거해야 한다.',
  },
  'remote-isolation': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-diversity-care-boundary'],
    reason: '재택 고립 상황은 배려와 업무 기준을 함께 잡는 훈련에 통합한다.',
  },
  'inter-gen-clash': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-diversity-perspective-taking'],
    reason: '세대 간 갈등은 다양성/관점 전환 훈련의 핵심 사례로 흡수한다.',
  },
  'over-commitment': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-small-hypothesis'],
    reason: '우선순위와 거절은 작은 실행/책임 분배 훈련의 하위 케이스로 통합한다.',
  },
  'negativity-virus': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-feedback-difficult-1on1', 'weness-diversity-care-boundary'],
    reason: '부정적 영향은 다룰 가치가 있지만 제목과 설명이 낙인적이라 전면 재작성해야 한다.',
  },
  'career-pivot': {
    decision: 'DROP',
    targetExperienceIds: [],
    reason: '개인의 커리어 전환 설득에 치우쳐 이번 v1의 자기다움/우리다움 핵심 루프와 거리가 있다.',
  },
  'transparency-demand': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-difficult-1on1'],
    reason: '보상/평가 항의는 민감한 1:1 대화 리허설의 변형으로 흡수한다.',
  },
  'quality-vs-speed': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-small-hypothesis'],
    reason: '완성도와 속도 균형은 작고 빠른 검증 가설 훈련에 잘 맞는다.',
  },
  'hidden-agenda': {
    decision: 'DROP',
    targetExperienceIds: [],
    reason: '정치질/의도 간파 중심이라 초반 MVP에서 안전하고 명확한 코칭 경험으로 다루기 어렵다.',
  },
  'recognition-starve': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-care-boundary', 'weness-feedback-difficult-1on1'],
    reason: '인정 욕구를 낙인찍지 않고 자립적 성장 피드백 대화로 재작성하면 유효하다.',
  },
  'tech-debt': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-small-hypothesis'],
    reason: '기술부채와 마감 갈등은 불확실성/검증 단위로 쪼개는 실행 훈련에 적합하다.',
  },
  'passive-aggressive-meeting': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-feedback-difficult-1on1'],
    reason: '회의 후 뒷말 문제는 건강한 소통 요청으로 재작성해 어려운 1:1에 넣는다.',
  },
  'fragile-ego-feedback': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-feedback-difficult-1on1'],
    reason: '민감한 피드백 소재는 유효하지만 가스라이팅/유리멘탈 표현은 제거해야 한다.',
  },
  'selective-work-allergy': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-execution-weekly-goal', 'weness-feedback-30sec-feedforward'],
    reason: '협업 책임과 역할 기준 대화로는 유효하지만 체리피커 낙인은 제거해야 한다.',
  },
  'growth-refusal': {
    decision: 'DROP',
    targetExperienceIds: [],
    reason: '성장 거부 시니어 설득은 v1의 출퇴근 음성 코칭 핵심 경험보다 우선순위가 낮다.',
  },
  'side-project-overload': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward', 'weness-execution-weekly-goal'],
    reason: '업무 몰입과 기준 설정 대화로 바꾸면 쓸 수 있지만 현재 표현은 비난적이다.',
  },
  'stealing-credit-misconception': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-difficult-1on1'],
    reason: '불신과 기여도 대화는 어려운 1:1 리허설의 신뢰 회복 케이스로 통합한다.',
  },
  'informal-leader': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-feedback-difficult-1on1', 'weness-execution-weekly-goal'],
    reason: '비공식 영향력 갈등은 역할/권한 정렬 대화로 재작성하면 우리다움 훈련에 맞다.',
  },
  'selective-honesty': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-diversity-perspective-taking', 'weness-feedback-30sec-feedforward'],
    reason: '솔직함과 무례함의 구분은 존중/피드포워드 훈련의 좋은 사례다.',
  },
  'tmi-energy-drainer': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-care-boundary'],
    reason: '정서적 경계 설정은 유효하지만 감정 쓰레기통 표현은 제거해야 한다.',
  },
  'emotional-rollercoaster': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-care-boundary', 'weness-feedback-difficult-1on1'],
    reason: '감정이 업무에 미치는 영향을 다루되 인격 평가 없이 기준/지원 대화로 재작성한다.',
  },
  'new-hire-lost': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-weekly-goal'],
    reason: '신입 온보딩과 역할 명확화는 목표/역할 공유 훈련에 적합하다.',
  },
  'presentation-anxiety': {
    decision: 'DROP',
    targetExperienceIds: [],
    reason: '발표 불안 코칭은 유용하지만 이번 6축 v1의 리더 자기다움/우리다움 핵심 흐름과 우선순위가 낮다.',
  },
  'always-last-minute': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-weekly-goal', 'weness-feedback-30sec-feedforward'],
    reason: '마감 습관 개선은 업무 기준과 목표 공유 훈련으로 흡수한다.',
  },
  'meeting-rambler': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward'],
    reason: '회의 발화 방식 개선은 관찰-영향-기대 피드포워드 리허설에 적합하다.',
  },
  'eighty-percent-finisher': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-execution-small-hypothesis'],
    reason: '마무리 기준과 회고 질문은 작은 실행/검증/회고 루프에 통합한다.',
  },
  'silent-struggle': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-diversity-care-boundary'],
    reason: '힘들어도 말 못 하는 팀원은 배려와 기준 균형 대화의 대표 케이스다.',
  },
  'upward-feedback-averse': {
    decision: 'REWRITE',
    targetExperienceIds: ['weness-diversity-perspective-taking', 'weness-feedback-difficult-1on1'],
    reason: '심리적 안전감과 상향 피드백은 유효하나 리더의 자기성찰 질문을 더 넣어 재작성한다.',
  },
  'unclear-instructions-confusion': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward', 'weness-execution-weekly-goal'],
    reason: '모호한 지시 문제는 명확한 기대 행동과 목표 문장 훈련에 적합하다.',
  },
  'learning-vs-delivering': {
    decision: 'DROP',
    targetExperienceIds: [],
    reason: '성장 욕구와 업무 연결은 좋지만 MVP v1에서는 리더 본인 voice-first 루프와 직접성이 낮다.',
  },
  'perfectionist-report-delay': {
    decision: 'MERGE',
    targetExperienceIds: ['weness-feedback-30sec-feedforward', 'weness-execution-small-hypothesis'],
    reason: '완성도와 타이밍의 균형은 피드포워드와 작은 검증 기준 훈련으로 통합한다.',
  },
};

export const SCENARIO_AUDIT: ScenarioAuditItem[] = SCENARIOS.map((scenario) => {
  const audit = auditById[scenario.id];

  if (!audit) {
    throw new Error(`Missing legacy scenario audit for ${scenario.id}`);
  }

  return {
    sourceScenarioId: scenario.id,
    title: scenario.title,
    ...audit,
  };
});
