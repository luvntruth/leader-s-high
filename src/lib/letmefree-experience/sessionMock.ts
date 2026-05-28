import { EXPERIENCES } from './experienceLibrary';
import { recommendExperience } from './recommendExperience';
import type { ExperienceFamily, ExperienceMode } from './types';

export type MockSessionStepKind =
  | 'intake'
  | 'exploration'
  | 'classification'
  | 'recommendation'
  | 'practice'
  | 'analysis_readout'
  | 'action_items'
  | 'reminder_setup';

export type MockSessionStep = {
  kind: MockSessionStepKind;
  title: string;
  prompt: string;
};

export type MockExperienceSession = {
  routePath: '/voice-coach';
  transcript: string;
  family: ExperienceFamily;
  axis: ReturnType<typeof recommendExperience>['primaryAxis'];
  experienceId: string;
  experienceTitle: string;
  practiceStyle: ExperienceMode;
  steps: MockSessionStep[];
  analysisReadout: string[];
  actionItems: string[];
  reminder: string;
};

const fallbackTranscript = '오늘 팀 대화가 마음에 걸려. 무엇부터 정리해야 할지 모르겠어.';

const familyLabel = (family: ExperienceFamily) => (family === 'selfness_coaching' ? '자기다움 코칭' : '우리다움 훈련');

const buildPracticePrompt = (family: ExperienceFamily, firstQuestion: string) => {
  if (family === 'selfness_coaching') {
    return `${firstQuestion} 한 번에 하나씩만 천천히 답해볼게요. 지금 떠오르는 장면 하나만 말해 주세요.`;
  }

  return `${firstQuestion} 답이 떠오르면 실제로 전할 30초 문장으로 한 번 리허설해볼게요.`;
};

const buildAnalysisReadout = (family: ExperienceFamily) => {
  if (family === 'selfness_coaching') {
    return [
      '첫째, 지금 핵심은 문제 해결보다 혼자 감당하던 마음을 안전하게 내려놓는 것입니다.',
      '둘째, 반복해서 떠오르는 장면 안에 당신이 지키고 싶은 기준이 숨어 있습니다.',
      '셋째, 오늘은 큰 결론보다 내일 하나의 태도를 정하는 것이 충분합니다.',
    ];
  }

  return [
    '첫째, 상대를 바꾸려 하기보다 관찰한 사실과 기대를 분리해 말하는 것이 중요합니다.',
    '둘째, 비난 문장은 실행 요청 문장으로 바꿀 때 현장 전이가 좋아집니다.',
    '셋째, 다음 대화는 “무엇을 언제까지 다시 시도할지”를 확인하며 마무리하세요.',
  ];
};

const buildActionItems = (family: ExperienceFamily) => {
  if (family === 'selfness_coaching') {
    return [
      '운전이 끝난 뒤 오늘 가장 무거웠던 감정에 이름을 하나 붙이기',
      '내일 리더로서 지키고 싶은 태도 한 문장을 메모하기',
    ];
  }

  return [
    '운전이 끝난 뒤 전달할 피드포워드 문장 3줄을 메모하기',
    '다음 대화에서 관찰 사실, 기대, 첫 실행을 각각 한 문장으로 말하기',
  ];
};

export const buildMockExperienceSession = (transcript = fallbackTranscript): MockExperienceSession => {
  const normalizedTranscript = transcript.trim() || fallbackTranscript;
  const recommendation = recommendExperience(normalizedTranscript);
  const experience =
    EXPERIENCES.find((item) => item.id === recommendation.recommendedExperienceIds[0]) ?? EXPERIENCES[0];
  const practiceStyle =
    recommendation.family === 'selfness_coaching'
      ? 'coaching_dialogue'
      : experience.mode === 'coaching_dialogue' || experience.mode === 'reflection'
        ? 'rehearsal'
        : experience.mode;

  return {
    routePath: '/voice-coach',
    transcript: normalizedTranscript,
    family: recommendation.family,
    axis: recommendation.primaryAxis,
    experienceId: experience.id,
    experienceTitle: experience.title,
    practiceStyle,
    steps: [
      {
        kind: 'intake',
        title: '고민 듣기',
        prompt: '말씀하신 고민을 먼저 그대로 받아 적고, 지금 필요한 방향을 찾습니다.',
      },
      {
        kind: 'exploration',
        title: '한 질문으로 탐색',
        prompt: recommendation.firstQuestion,
      },
      {
        kind: 'classification',
        title: `${familyLabel(recommendation.family)} 분류`,
        prompt: recommendation.reason,
      },
      {
        kind: 'recommendation',
        title: '추천 경험',
        prompt: `${experience.title}로 시작해보겠습니다.`,
      },
      {
        kind: 'practice',
        title: recommendation.family === 'selfness_coaching' ? '대화형 코칭' : '말하기 리허설',
        prompt: buildPracticePrompt(recommendation.family, recommendation.firstQuestion),
      },
      {
        kind: 'analysis_readout',
        title: '3포인트 분석',
        prompt: '방금 대화에서 제가 들은 핵심을 세 가지만 정리합니다.',
      },
      {
        kind: 'action_items',
        title: '작은 실천',
        prompt: '오늘은 큰 숙제가 아니라 바로 해볼 수 있는 작은 행동만 남깁니다.',
      },
      {
        kind: 'reminder_setup',
        title: '다음 회고 알림',
        prompt: '운전이 끝난 뒤 안전한 순간에 오늘 정한 행동을 다시 확인합니다.',
      },
    ],
    analysisReadout: buildAnalysisReadout(recommendation.family),
    actionItems: buildActionItems(recommendation.family),
    reminder: '운전이 끝난 뒤 10분 안에, 오늘 정한 한 문장을 다시 확인해볼까요?',
  };
};
