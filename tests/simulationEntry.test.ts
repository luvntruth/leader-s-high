import { describe, expect, it } from 'vitest';

import { buildSimulationRouteState, getInitialTrustForIntensity } from '../src/lib/simulationEntry';

describe('simulationEntry', () => {
  it('maps intensity levels to initial trust values', () => {
    expect(getInitialTrustForIntensity('high')).toBe(25);
    expect(getInitialTrustForIntensity('medium')).toBe(45);
    expect(getInitialTrustForIntensity('low')).toBe(65);
    expect(getInitialTrustForIntensity(undefined)).toBe(45);
  });

  it('preserves guest intent when creating simulation route state', () => {
    const scenario = { id: 'late-comer', intensity: 'high' } as const;

    expect(buildSimulationRouteState(scenario, true)).toEqual({
      scenario,
      initialTrust: 25,
      guest: true,
    });
  });

  it('does not mark authenticated users as guests', () => {
    const scenario = { id: 'boundaries', intensity: 'low' } as const;

    expect(buildSimulationRouteState(scenario, false)).toEqual({
      scenario,
      initialTrust: 65,
    });
  });
});
