export type ScenarioLike = {
  intensity?: 'high' | 'medium' | 'low' | string;
  [key: string]: unknown;
};

export const getInitialTrustForIntensity = (intensity?: ScenarioLike['intensity']) => {
  // high 25→32 (2026-07): 시작부터 '강한 반발' 직전 구간이라 무료 5턴 내 목표 달성이
  // 체감상 불가능하던 문제 완화. 난이도 서열(high<medium<low)은 유지.
  if (intensity === 'high') return 32;
  if (intensity === 'low') return 65;
  return 45;
};

export const buildSimulationRouteState = (scenario: ScenarioLike, isGuest = false) => ({
  scenario,
  initialTrust: getInitialTrustForIntensity(scenario?.intensity),
  ...(isGuest ? { guest: true } : {}),
});
