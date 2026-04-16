export type ScenarioLike = {
  intensity?: 'high' | 'medium' | 'low' | string;
  [key: string]: unknown;
};

export const getInitialTrustForIntensity = (intensity?: ScenarioLike['intensity']) => {
  if (intensity === 'high') return 25;
  if (intensity === 'low') return 65;
  return 45;
};

export const buildSimulationRouteState = (scenario: ScenarioLike, isGuest = false) => ({
  scenario,
  initialTrust: getInitialTrustForIntensity(scenario?.intensity),
  ...(isGuest ? { guest: true } : {}),
});
