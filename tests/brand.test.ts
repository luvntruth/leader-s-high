import { describe, expect, it } from 'vitest';

import { BRAND_NAME_EN, BRAND_NAME_KO, BRAND_NAME_FULL, APP_ORIGIN, SUPPORT_EMAIL, PRIVACY_EMAIL } from '../src/lib/brand';

describe('brand identity', () => {
  it('uses Letmefree/렛미프리 as the market-facing service name', () => {
    expect(BRAND_NAME_EN).toBe('Letmefree');
    expect(BRAND_NAME_KO).toBe('렛미프리');
    expect(BRAND_NAME_FULL).toBe('Letmefree 렛미프리');
  });

  it('uses letmefree.xyz as the production app origin', () => {
    expect(APP_ORIGIN).toBe('https://letmefree.xyz');
  });

  it('uses Letmefree contact emails for public policy pages', () => {
    expect(SUPPORT_EMAIL).toBe('support@letmefree.app');
    expect(PRIVACY_EMAIL).toBe('privacy@letmefree.app');
  });
});
