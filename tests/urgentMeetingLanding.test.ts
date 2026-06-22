import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const landingSource = readFileSync(resolve(__dirname, '../screens/Landing.tsx'), 'utf-8');

describe('urgent-meeting landing variant', () => {
  it('adds an urgent-meeting paid-ad variant focused on immediate meeting risk', () => {
    expect(landingSource).toContain("'urgent-meeting'");
    expect(landingSource).toContain('이번 주 어려운 면담이 있다면');
    expect(landingSource).toContain('10분 리허설로 말의 순서부터 점검하세요');
    expect(landingSource).toContain('면담 전 10분 리허설 시작 →');
  });

  it('makes the pricing CTA risk-reduction oriented for first payment intent', () => {
    expect(landingSource).toContain('₩8,900으로 이번 면담 리스크 줄이기');
    expect(landingSource).toContain('지금 결제하고 풀 리포트 보기 →');
  });

  it('keeps the urgent-meeting variant attributable through lp query handling', () => {
    expect(landingSource).toContain("variant: variantKey");
    expect(landingSource).toContain("lp: variantKey");
    expect(landingSource).toContain("cta: `${placement}-pricing`");
  });
});
