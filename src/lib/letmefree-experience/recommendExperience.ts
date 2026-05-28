import { EXPERIENCES } from './experienceLibrary';
import type { ExperienceAxis, ExperienceRecommendation } from './types';

const axisRules: Array<{
  axis: ExperienceAxis;
  keywords: string[];
  fallbackQuestion: string;
}> = [
  {
    axis: 'selfness_affect',
    keywords: ['외롭', '혼자', '감당', '지쳤', '지쳐', '부담', '감정', '마음이 복잡', '퇴근길'],
    fallbackQuestion: '오늘 가장 혼자 감당하고 있다고 느낀 순간은 언제였나요?',
  },
  {
    axis: 'selfness_strength',
    keywords: ['강점', '잘하는', '잘한', '역량', '핵심역량', '패턴', '자신감'],
    fallbackQuestion: '오늘 별다른 노력 없이도 자연스럽게 해낸 일은 무엇이었나요?',
  },
  {
    axis: 'selfness_calling',
    keywords: ['원하는', '원하', '욕망', '소명', '의도', '인생', '의미', '위해 일'],
    fallbackQuestion: '그 상황에서 당신이 진짜 원했던 것은 무엇이었나요?',
  },
  {
    axis: 'weness_diversity',
    keywords: ['존중', '다양', '배려', '조율', '다른', '다름', '관점', '세대'],
    fallbackQuestion: '그 사람 입장에서 보면 어떤 선한 의도나 걱정이 있었을까요?',
  },
  {
    axis: 'weness_feedback',
    keywords: ['피드백', '피드포워드', '말해야', '뭐라고 말', '1:1', '성과 면담', '성과면담', '대화가 마음에 걸려'],
    fallbackQuestion: '그 대화가 끝났을 때 상대가 무엇을 이해하면 좋겠나요?',
  },
  {
    axis: 'weness_execution',
    keywords: ['목표', '역할', '책임', '권한', '가설', '실행', '회고', '흐릿', '애매'],
    fallbackQuestion: '이번 주 팀이 반드시 만들어야 하는 변화는 무엇인가요?',
  },
];

const scoreAxis = (normalizedTranscript: string, axis: ExperienceAxis) => {
  const rule = axisRules.find((item) => item.axis === axis);

  if (!rule) return 0;

  return rule.keywords.reduce((score, keyword) => {
    return normalizedTranscript.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
};

const pickAxis = (transcript: string): ExperienceAxis => {
  const normalizedTranscript = transcript.toLowerCase();
  const [best] = axisRules
    .map((rule) => ({ axis: rule.axis, score: scoreAxis(normalizedTranscript, rule.axis) }))
    .sort((a, b) => b.score - a.score);

  if (!best || best.score === 0) return 'selfness_affect';

  return best.axis;
};

const familyForAxis = (axis: ExperienceAxis) => {
  return axis.startsWith('selfness') ? 'selfness_coaching' : 'weness_training';
};

const reasonForAxis = (axis: ExperienceAxis) => {
  const reasonByAxis: Record<ExperienceAxis, string> = {
    selfness_affect: '말씀 안에 혼자 감당하는 정서와 리더의 외로움 신호가 보여요.',
    selfness_strength: '말씀 안에 강점과 핵심역량을 다시 선명하게 보고 싶은 신호가 보여요.',
    selfness_calling: '말씀 안에 진짜 원하는 것, 의도, 소명을 정리하고 싶은 신호가 보여요.',
    weness_diversity: '말씀 안에 서로 다른 관점과 존중/조율이 필요한 관계 신호가 보여요.',
    weness_feedback: '말씀 안에 실제로 말해야 하는 피드백/피드포워드 대화 과제가 보여요.',
    weness_execution: '말씀 안에 목표, 역할, 실행, 회고를 정렬해야 하는 팀 운영 과제가 보여요.',
  };

  return reasonByAxis[axis];
};

export const recommendExperience = (transcript: string): ExperienceRecommendation => {
  const primaryAxis = pickAxis(transcript);
  const family = familyForAxis(primaryAxis);
  const recommendedExperienceIds = EXPERIENCES.filter((experience) => experience.axis === primaryAxis)
    .slice(0, 3)
    .map((experience) => experience.id);
  const firstQuestion =
    EXPERIENCES.find((experience) => experience.axis === primaryAxis)?.explorationQuestions[0] ??
    axisRules.find((rule) => rule.axis === primaryAxis)?.fallbackQuestion ??
    '지금 이 대화가 끝났을 때 무엇이 조금 선명해지면 좋겠나요?';

  return {
    family,
    primaryAxis,
    recommendedExperienceIds,
    reason: reasonForAxis(primaryAxis),
    firstQuestion,
  };
};
