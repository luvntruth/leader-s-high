import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildMockExperienceSession } from '../src/lib/letmefree-experience/sessionMock';

const forbiddenAiIshPhrases = ['AI로서', '인공지능으로서', '저는 감정을 느낄 수 없지만'];

describe('Letmefree mock experience session flow', () => {
  it('builds a selfness coaching flow with reflection-focused steps', () => {
    const session = buildMockExperienceSession('요즘 너무 외롭고 혼자 감당하는 것 같아');

    expect(session.family).toBe('selfness_coaching');
    expect(session.routePath).toBe('/voice-coach');
    expect(session.steps.map((step) => step.kind)).toEqual([
      'intake',
      'exploration',
      'classification',
      'recommendation',
      'practice',
      'analysis_readout',
      'action_items',
      'reminder_setup',
    ]);
    expect(session.practiceStyle).toBe('coaching_dialogue');
  });

  it('builds a weness training flow with rehearsal-focused practice', () => {
    const session = buildMockExperienceSession('팀원에게 피드백을 해야 하는데 문장을 연습하고 싶어');

    expect(session.family).toBe('weness_training');
    expect(session.practiceStyle).toMatch(/rehearsal|roleplay|planning_drill/);
  });

  it('keeps readouts short, actionable, and safe for driving contexts', () => {
    const session = buildMockExperienceSession('이번 주 팀 목표가 흐릿하고 실행이 안 돼');

    expect(session.analysisReadout).toHaveLength(3);
    expect(session.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(session.actionItems.length).toBeLessThanOrEqual(3);
    expect(session.reminder).toContain('운전이 끝난 뒤');
  });

  it('does not include uncanny generic AI phrases', () => {
    const session = buildMockExperienceSession('오늘 팀 대화가 마음에 걸려');
    const serialized = JSON.stringify(session);

    for (const phrase of forbiddenAiIshPhrases) {
      expect(serialized).not.toContain(phrase);
    }
  });

  it('registers /voice-coach and wires it from the voice intake panel', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
    const intakeSource = readFileSync(resolve(process.cwd(), 'components/letmefree/VoiceIntakePanel.tsx'), 'utf8');

    expect(appSource).toContain('/voice-coach');
    expect(appSource).toContain('VoiceCoach');
    expect(intakeSource).toContain('/voice-coach');
  });
});
