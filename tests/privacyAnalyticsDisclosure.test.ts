import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const privacySource = readFileSync(resolve(__dirname, '../screens/Privacy.tsx'), 'utf-8');

describe('behavior analytics privacy disclosure', () => {
  it('discloses Microsoft Clarity and session behavior analytics before paid ads', () => {
    expect(privacySource).toContain('Microsoft Clarity');
    expect(privacySource).toContain('세션 리플레이');
    expect(privacySource).toContain('히트맵');
    expect(privacySource).toContain('광고 유입 경로');
    expect(privacySource).toContain('서비스 개선 및 광고 성과 분석');
  });
});
