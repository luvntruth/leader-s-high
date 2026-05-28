import { describe, expect, it } from 'vitest';
import { EXPERIENCE_AXES, EXPERIENCE_FAMILIES, IMMERSION_GUARDRAILS } from '../src/lib/letmefree-experience/types';
import type { LetmefreeExperience } from '../src/lib/letmefree-experience/types';

describe('Letmefree experience types', () => {
  it('exports the approved family and axis vocabulary', () => {
    expect(EXPERIENCE_FAMILIES).toEqual(['selfness_coaching', 'weness_training']);
    expect(EXPERIENCE_AXES).toEqual([
      'selfness_affect',
      'selfness_strength',
      'selfness_calling',
      'weness_diversity',
      'weness_feedback',
      'weness_execution',
    ]);
  });

  it('exports the voice immersion guardrails as product constraints', () => {
    expect(IMMERSION_GUARDRAILS).toEqual(
      expect.arrayContaining([
        'natural_voice_and_tone',
        'contextually_relevant_answers',
        'no_ai_uncanny_mannerisms',
      ]),
    );
  });

  it('separates selfness coaching from weness training', () => {
    const selfness: LetmefreeExperience = {
      id: 'selfness-affect-evening-reset',
      title: '퇴근길 감정 정리 코칭',
      family: 'selfness_coaching',
      axis: 'selfness_affect',
      mode: 'coaching_dialogue',
      estimatedMinutes: 10,
      inputTriggers: ['오늘 너무 외롭고 지쳤어'],
      explorationQuestions: ['오늘 가장 혼자 감당하고 있다고 느낀 순간은 언제였나요?'],
      flow: ['감정 반영', '외로움의 맥락 탐색', '작은 회복 행동 정리'],
      analysisReadoutSchema: ['감정', '혼자 감당한 책임', '회복 행동'],
      actionItemSchema: ['오늘 밤 5분 회복 루틴'],
      reminderRule: '오늘 밤 9시에 회복 루틴 알림',
      safetyNotes: ['진단/치료처럼 말하지 않기'],
    };

    const weness: LetmefreeExperience = {
      id: 'weness-feedback-30sec-feedforward',
      title: '30초 피드포워드 리허설',
      family: 'weness_training',
      axis: 'weness_feedback',
      mode: 'rehearsal',
      estimatedMinutes: 5,
      inputTriggers: ['팀원에게 피드백을 해야 하는데 뭐라고 말해야 할지 모르겠어'],
      explorationQuestions: ['지금 가장 전하고 싶은 기대 행동은 무엇인가요?'],
      flow: ['상황 정리', '30초 발화 연습', '피드포워드 문장 개선'],
      analysisReadoutSchema: ['관찰', '기대 행동', '다음 요청'],
      actionItemSchema: ['내일 1:1에서 3문장 피드포워드 실행'],
      reminderRule: '내일 오전 9시에 1분 리허설 알림',
      safetyNotes: ['인격 평가 대신 관찰 가능한 행동 중심으로 말하기'],
    };

    expect(selfness.family).toBe('selfness_coaching');
    expect(selfness.mode).toBe('coaching_dialogue');
    expect(weness.family).toBe('weness_training');
    expect(weness.mode).toBe('rehearsal');
  });
});
