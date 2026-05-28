import { describe, expect, it } from 'vitest';
import { EXPERIENCES } from '../src/lib/letmefree-experience/experienceLibrary';
import { recommendExperience } from '../src/lib/letmefree-experience/recommendExperience';

describe('Letmefree experience recommendation', () => {
  it('routes leader loneliness to selfness affect coaching', () => {
    const result = recommendExperience('요즘 너무 외롭고 내가 왜 이렇게 혼자 감당하는지 모르겠어');

    expect(result.family).toBe('selfness_coaching');
    expect(result.primaryAxis).toBe('selfness_affect');
  });

  it('routes strengths clarity to selfness strengths coaching', () => {
    const result = recommendExperience('내가 리더로서 뭘 잘하는지, 내 강점과 핵심역량이 뭔지 잘 모르겠어');

    expect(result.family).toBe('selfness_coaching');
    expect(result.primaryAxis).toBe('selfness_strength');
  });

  it('routes desire and calling clarity to selfness calling coaching', () => {
    const result = recommendExperience('내가 진짜 원하는 게 뭔지, 앞으로 뭘 위해 일하고 싶은지 모르겠어');

    expect(result.family).toBe('selfness_coaching');
    expect(result.primaryAxis).toBe('selfness_calling');
  });

  it('routes difficult feedback to weness feedback training', () => {
    const result = recommendExperience('팀원에게 성과 피드백을 해야 하는데 뭐라고 말해야 할지 모르겠어');

    expect(result.family).toBe('weness_training');
    expect(result.primaryAxis).toBe('weness_feedback');
  });

  it('routes team goal ambiguity to weness execution training', () => {
    const result = recommendExperience('이번 주 팀 목표가 흐릿하고 역할과 책임도 애매해서 실행이 안 돼');

    expect(result.family).toBe('weness_training');
    expect(result.primaryAxis).toBe('weness_execution');
  });

  it('routes diversity and respect issues to weness diversity training', () => {
    const result = recommendExperience('서로 너무 다른 팀원들을 어떻게 존중하면서 조율해야 할지 모르겠어');

    expect(result.family).toBe('weness_training');
    expect(result.primaryAxis).toBe('weness_diversity');
  });

  it('recommends only existing v1 experiences', () => {
    const experienceIds = new Set(EXPERIENCES.map((item) => item.id));
    const result = recommendExperience('팀원에게 피드포워드 문장을 연습하고 싶어');

    expect(result.recommendedExperienceIds.length).toBeGreaterThan(0);
    for (const id of result.recommendedExperienceIds) {
      expect(experienceIds.has(id)).toBe(true);
    }
  });

  it('starts with a natural first question instead of generic AI advice', () => {
    const result = recommendExperience('퇴근길인데 오늘 팀 대화가 마음에 걸려');

    expect(result.firstQuestion).toContain('?');
    expect(result.firstQuestion).not.toContain('AI로서');
  });
});
