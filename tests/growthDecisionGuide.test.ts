import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const growthSource = readFileSync(resolve(__dirname, '../screens/GrowthDashboard.tsx'), 'utf-8');

describe('growth dashboard first-purchase decision guide', () => {
  it('states the north star as the first real purchase', () => {
    expect(growthSource).toContain('목표: 첫 결제 1건');
    expect(growthSource).toContain('첫 결제 1건까지 남은 거리');
  });

  it('maps each funnel leak to a concrete next loop recommendation', () => {
    expect(growthSource).toContain('getLoopRecommendation');
    expect(growthSource).toContain('리포트 후 Pro bridge');
    expect(growthSource).toContain('결제 의도 보존');
    expect(growthSource).toContain('urgent-meeting');
    expect(growthSource).toContain('플랜조회 → 결제');
  });

  it('shows a 48-hour keep/discard rule for the next experiment', () => {
    expect(growthSource).toContain('48시간 판정 기준');
    expect(growthSource).toContain('checkout_start');
    expect(growthSource).toContain('Keep / Discard');
  });

  it('labels the urgent-meeting variant in the funnel table', () => {
    expect(growthSource).toContain("'urgent-meeting': '긴급 면담'");
  });
});
