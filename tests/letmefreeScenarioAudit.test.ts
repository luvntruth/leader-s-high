import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../constants';
import { EXPERIENCES } from '../src/lib/letmefree-experience/experienceLibrary';
import { SCENARIO_AUDIT } from '../src/lib/letmefree-experience/scenarioAudit';

describe('legacy scenario audit', () => {
  it('accounts for every legacy scenario exactly once', () => {
    const sourceIds = SCENARIOS.map((scenario) => scenario.id).sort();
    const auditIds = SCENARIO_AUDIT.map((item) => item.sourceScenarioId).sort();

    expect(auditIds).toEqual(sourceIds);
  });

  it('does not force every scenario into the new library', () => {
    const hasDropOrRewrite = SCENARIO_AUDIT.some((item) => ['DROP', 'REWRITE'].includes(item.decision));

    expect(hasDropOrRewrite).toBe(true);
  });

  it('targets existing v1 experiences when scenarios are kept, merged, or rewritten', () => {
    const experienceIds = new Set(EXPERIENCES.map((item) => item.id));

    for (const item of SCENARIO_AUDIT) {
      if (item.decision !== 'DROP') {
        expect(item.targetExperienceIds.length).toBeGreaterThan(0);
        for (const targetExperienceId of item.targetExperienceIds) {
          expect(experienceIds.has(targetExperienceId)).toBe(true);
        }
      }
    }
  });

  it('documents a reason for every audit decision', () => {
    for (const item of SCENARIO_AUDIT) {
      expect(item.reason.length).toBeGreaterThan(10);
    }
  });
});
