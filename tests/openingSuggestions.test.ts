import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getOpeningSuggestions } from '../services/missionBriefings';

const simSource = readFileSync(resolve(__dirname, '../screens/Simulation.tsx'), 'utf-8');

// 게스트 시뮬 최대 누수(시뮬 시작→첫 발화 42%, 58% 이탈) 대응:
// 첫 턴에 한 번 탭하면 보내지는 추천 시작 문장으로 빈 입력창 마찰을 제거한다.
describe('opening suggestions (first-turn quick start)', () => {
  it('returns 2-3 ready-to-send opening lines', () => {
    const s = getOpeningSuggestions('late-comer', '김철수');
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.length).toBeLessThanOrEqual(3);
    s.forEach(line => expect(line.trim().length).toBeGreaterThan(0));
  });

  it('interpolates the character name and never leaks the {name} token', () => {
    const s = getOpeningSuggestions('late-comer', '김철수');
    expect(s.join(' ')).not.toContain('{name}');
    expect(s.some(line => line.includes('김철수'))).toBe(true);
  });

  it('falls back to default suggestions for an unknown scenario', () => {
    const s = getOpeningSuggestions('___unknown___', '박지민');
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.join(' ')).not.toContain('{name}');
  });

  it('handles missing scenario and name gracefully', () => {
    const s = getOpeningSuggestions();
    expect(s.length).toBeGreaterThanOrEqual(2);
    expect(s.join(' ')).not.toContain('{name}');
    expect(s.join(' ')).not.toContain('undefined');
  });

  it('is wired into the simulation composer', () => {
    expect(simSource).toContain('getOpeningSuggestions');
  });
});
