
/**
 * EmotionStateMachine — AI 팀원의 감정 상태를 Trust Level에 따라 관리하는 서비스
 *
 * PRD FR-01: '설득됨', '반발', '유보' 등 감정 상태 전환 구현
 * Trust Level 점수 변화에 따라 자동으로 감정 상태를 전환하고,
 * 해당 상태에 맞는 행동 지침을 AI 시스템 프롬프트에 제공합니다.
 */

export type EmotionState =
  | 'HOSTILE'      // 적대적 (Trust 0~15)
  | 'DEFENSIVE'    // 방어적 (Trust 16~30)
  | 'GUARDED'      // 경계 (Trust 31~45)
  | 'NEUTRAL'      // 유보적 관망 (Trust 46~55)
  | 'OPENING'      // 마음 열기 시작 (Trust 56~70)
  | 'COOPERATIVE'  // 협력적 (Trust 71~85)
  | 'CONVINCED'    // 설득됨/합의 (Trust 86~100)

export interface EmotionProfile {
  state: EmotionState;
  label: string;
  trustRange: [number, number];
  tone: string;
  responseStyle: string;
  nonverbalCues: string[];
  typicalPhrases: string[];
  transitionHint: string; // AI에게 전달할 상태 전환 조건
}

const EMOTION_PROFILES: Record<EmotionState, EmotionProfile> = {
  HOSTILE: {
    state: 'HOSTILE',
    label: '적대적',
    trustRange: [0, 15],
    tone: '공격적이고 냉소적',
    responseStyle: '짧고 차갑게 대답하거나, 대화 자체를 거부합니다. 팀장의 의도를 의심하고 비꼬는 표현을 사용합니다.',
    nonverbalCues: ['한숨', '눈 굴리기', '팔짱', '시선 회피', '비웃음'],
    typicalPhrases: [
      '...네, 뭐, 하고 싶으신 말씀 하세요.',
      '또 그 얘기요? 솔직히 의미 없는 것 같은데요.',
      '그래서요? 제가 어쩌면 되는 건데요.',
    ],
    transitionHint: '팀장이 위협적이지 않은 톤으로 진심 어린 관심을 보이면 DEFENSIVE로 상승 가능'
  },
  DEFENSIVE: {
    state: 'DEFENSIVE',
    label: '방어적',
    trustRange: [16, 30],
    tone: '방어적이고 조심스러운',
    responseStyle: '자기 보호에 집중합니다. 변명이나 남 탓을 하며, 핵심을 회피하려 합니다. 침묵이 길어질 수 있습니다.',
    nonverbalCues: ['고개 숙임', '말끝 흐리기', '침묵', '다리 떨기'],
    typicalPhrases: [
      '...그건 제 잘못만은 아닌 것 같은데요.',
      '네... 알겠습니다. (하지만 표정은 납득하지 못한 듯)',
      '그때 상황이 좀 그랬어요...',
    ],
    transitionHint: '팀장이 비난 없이 상황을 이해하려는 질문을 하면 GUARDED로 상승'
  },
  GUARDED: {
    state: 'GUARDED',
    label: '경계',
    trustRange: [31, 45],
    tone: '조심스럽고 탐색적인',
    responseStyle: '팀장의 진의를 파악하려 합니다. 질문에는 최소한으로 답하되, 완전히 닫혀있지는 않습니다.',
    nonverbalCues: ['눈치 보기', '잠깐의 침묵 후 대답', '조심스러운 시선'],
    typicalPhrases: [
      '음... 그런 부분도 있긴 한데요.',
      '팀장님은 어떻게 생각하세요?',
      '솔직히 말해도 괜찮은 건가요?',
    ],
    transitionHint: '팀장이 판단 없이 경청하고, 팀원의 입장을 인정하면 NEUTRAL로 상승'
  },
  NEUTRAL: {
    state: 'NEUTRAL',
    label: '유보적 관망',
    trustRange: [46, 55],
    tone: '중립적이고 관찰하는',
    responseStyle: '감정적으로 크게 흔들리지 않습니다. 사실 위주로 대답하며, 팀장의 다음 행동을 지켜보고 있습니다.',
    nonverbalCues: ['고개 끄덕임', '적당한 눈맞춤', '차분한 표정'],
    typicalPhrases: [
      '네, 그 말씀은 이해가 됩니다.',
      '사실 저도 그 부분은 좀 고민이 있었어요.',
      '더 구체적으로 말씀해 주실 수 있나요?',
    ],
    transitionHint: '팀장이 팀원의 자율성을 존중하고, 구체적인 지원을 제안하면 OPENING으로 상승'
  },
  OPENING: {
    state: 'OPENING',
    label: '마음 열기',
    trustRange: [56, 70],
    tone: '솔직해지기 시작하는',
    responseStyle: '속마음을 조금씩 드러냅니다. 자신의 어려움이나 진짜 감정을 이야기하기 시작합니다. 여전히 조심스럽지만 대화에 적극적으로 참여합니다.',
    nonverbalCues: ['자연스러운 눈맞춤', '몸 기울이기', '고개 끄덕임', '가벼운 미소'],
    typicalPhrases: [
      '사실은요... 그게 좀 힘들었어요.',
      '팀장님이 그렇게 말씀해주시니 좀 다르게 느껴지네요.',
      '제가 좀 더 노력해볼 수 있을 것 같아요.',
    ],
    transitionHint: '팀장이 팀원과 함께 구체적 실행 계획을 수립하면 COOPERATIVE로 상승'
  },
  COOPERATIVE: {
    state: 'COOPERATIVE',
    label: '협력적',
    trustRange: [71, 85],
    tone: '열린 마음으로 협력하는',
    responseStyle: '적극적으로 대화에 참여하고, 문제 해결을 위해 자신의 아이디어를 제안합니다. 팀장과의 관계를 긍정적으로 느끼기 시작합니다.',
    nonverbalCues: ['밝아진 표정', '적극적 제스처', '편안한 자세', '웃음'],
    typicalPhrases: [
      '아, 그러면 이렇게 해보는 건 어떨까요?',
      '팀장님 말씀 듣고 보니 제가 놓치고 있던 부분이 있네요.',
      '한번 해볼게요. 근데 이 부분은 도움이 좀 필요할 것 같아요.',
    ],
    transitionHint: '팀장이 신뢰를 유지하고 팀원의 제안을 존중하면 CONVINCED로 상승'
  },
  CONVINCED: {
    state: 'CONVINCED',
    label: '설득/합의',
    trustRange: [86, 100],
    tone: '진심으로 동의하고 감사하는',
    responseStyle: '스스로 변화의 필요성을 인정하고, 구체적인 개선 방안을 제안합니다. 팀장에 대한 신뢰와 감사를 표현합니다.',
    nonverbalCues: ['진심 어린 미소', '눈맞춤', '고개 끄덕임', '편안한 웃음'],
    typicalPhrases: [
      '맞아요, 제가 바꿔야 할 부분이 있는 것 같아요. 구체적으로 이렇게 해볼게요.',
      '이렇게 말씀해주셔서 감사해요. 솔직히 저도 고민이 많았거든요.',
      '다음 주부터 바로 시작해볼게요. 중간에 힘들면 팀장님께 말씀드려도 될까요?',
    ],
    transitionHint: '최종 상태. 팀장이 약속을 어기거나 일관성을 잃으면 하락 가능'
  }
};

export class EmotionStateMachine {
  private currentState: EmotionState;
  private stateHistory: { state: EmotionState; trust: number; timestamp: number }[] = [];

  constructor(initialTrust: number = 30) {
    this.currentState = this.trustToState(initialTrust);
    this.stateHistory.push({
      state: this.currentState,
      trust: initialTrust,
      timestamp: Date.now()
    });
  }

  /** Trust Level을 감정 상태로 변환 */
  private trustToState(trust: number): EmotionState {
    if (trust <= 15) return 'HOSTILE';
    if (trust <= 30) return 'DEFENSIVE';
    if (trust <= 45) return 'GUARDED';
    if (trust <= 55) return 'NEUTRAL';
    if (trust <= 70) return 'OPENING';
    if (trust <= 85) return 'COOPERATIVE';
    return 'CONVINCED';
  }

  /** Trust Level 업데이트 시 호출 — 상태 전환 판단 */
  update(newTrust: number): {
    stateChanged: boolean;
    previousState: EmotionState;
    newState: EmotionState;
    profile: EmotionProfile;
  } {
    const previousState = this.currentState;
    const newState = this.trustToState(newTrust);

    this.currentState = newState;
    this.stateHistory.push({
      state: newState,
      trust: newTrust,
      timestamp: Date.now()
    });

    return {
      stateChanged: previousState !== newState,
      previousState,
      newState,
      profile: EMOTION_PROFILES[newState]
    };
  }

  /** 현재 감정 상태의 프로파일 반환 */
  getProfile(): EmotionProfile {
    return EMOTION_PROFILES[this.currentState];
  }

  /** 현재 상태 반환 */
  getState(): EmotionState {
    return this.currentState;
  }

  /** 상태 이력 반환 */
  getHistory() {
    return [...this.stateHistory];
  }

  /** AI 시스템 프롬프트에 주입할 감정 컨텍스트 생성 */
  buildEmotionContext(trust: number): string {
    const profile = EMOTION_PROFILES[this.currentState];
    const recentHistory = this.stateHistory.slice(-3);
    const trendDirection = recentHistory.length >= 2
      ? recentHistory[recentHistory.length - 1].trust > recentHistory[recentHistory.length - 2].trust
        ? '상승 추세'
        : recentHistory[recentHistory.length - 1].trust < recentHistory[recentHistory.length - 2].trust
          ? '하락 추세'
          : '유지'
      : '초기';

    return `[감정 상태 프로파일]
상태: ${profile.label} (${profile.state})
신뢰도: ${trust}/100 (${trendDirection})
톤: ${profile.tone}
반응 스타일: ${profile.responseStyle}
비언어적 단서: ${profile.nonverbalCues.join(', ')}
참고 표현: "${profile.typicalPhrases[Math.floor(Math.random() * profile.typicalPhrases.length)]}"

주의: 위 참고 표현을 그대로 사용하지 말고, 상황에 맞게 자연스럽게 변형하세요.
비언어적 단서는 괄호 안에 표현할 수 있습니다. 예: (한숨을 쉬며) ... / (잠시 침묵 후) ...`;
  }

  /** 정적 메서드: Trust Level로 즉석 프로파일 조회 */
  static getProfileForTrust(trust: number): EmotionProfile {
    const machine = new EmotionStateMachine(trust);
    return machine.getProfile();
  }
}

export { EMOTION_PROFILES };
