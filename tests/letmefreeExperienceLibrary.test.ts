import { describe, expect, it } from 'vitest';
import { EXPERIENCES } from '../src/lib/letmefree-experience/experienceLibrary';
import { EXPERIENCE_AXES, IMMERSION_GUARDRAILS } from '../src/lib/letmefree-experience/types';

describe('Letmefree v1 experience library', () => {
  it('covers all six axes with at least two experiences each', () => {
    for (const axis of EXPERIENCE_AXES) {
      expect(EXPERIENCES.filter((item) => item.axis === axis).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('uses coaching modes for selfness and training modes for weness', () => {
    for (const item of EXPERIENCES) {
      if (item.family === 'selfness_coaching') {
        expect(['coaching_dialogue', 'reflection']).toContain(item.mode);
      }
      if (item.family === 'weness_training') {
        expect(['roleplay', 'rehearsal', 'planning_drill', 'retrospective_drill']).toContain(item.mode);
      }
    }
  });

  it('requires analysis, action, reminder, safety, and immersion guardrails for every experience', () => {
    for (const item of EXPERIENCES) {
      expect(item.analysisReadoutSchema.length).toBeGreaterThan(0);
      expect(item.actionItemSchema.length).toBeGreaterThan(0);
      expect(item.reminderRule.length).toBeGreaterThan(0);
      expect(item.safetyNotes.length).toBeGreaterThan(0);
      expect(item.immersionGuardrails).toEqual(expect.arrayContaining([...IMMERSION_GUARDRAILS]));
    }
  });

  it('starts with the approved 12-experience MVP scope', () => {
    expect(EXPERIENCES).toHaveLength(12);
  });
});
