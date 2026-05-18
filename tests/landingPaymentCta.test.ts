import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const landingSource = readFileSync(resolve(__dirname, '../screens/Landing.tsx'), 'utf-8');

describe('landing conversion CTA', () => {
  it('routes the secondary CTA to pricing instead of consultation', () => {
    expect(landingSource).toContain("target: '/pricing'");
    expect(landingSource).toContain("navigate(`/pricing?");
  });

  it('does not expose consultation CTA copy or event tracking', () => {
    expect(landingSource).not.toContain('상담 신청');
    expect(landingSource).not.toContain('consultation_click');
    expect(landingSource).not.toContain('mailto:');
  });
});
