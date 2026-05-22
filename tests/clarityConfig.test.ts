import { describe, expect, it } from 'vitest';

import { buildClarityScriptUrl, resolveClarityConfig } from '../src/lib/clarityConfig';

describe('resolveClarityConfig', () => {
  it('disables Clarity when the project id is missing', () => {
    expect(resolveClarityConfig({ projectId: undefined, hostname: 'www.letmefree.xyz' })).toEqual({
      enabled: false,
      reason: 'missing-project-id',
    });
  });

  it('does not load Clarity on localhost even when configured', () => {
    expect(resolveClarityConfig({ projectId: 'abc123', hostname: 'localhost' })).toEqual({
      enabled: false,
      reason: 'local-development',
    });
  });

  it('enables Clarity on the public Letmefree domain when configured', () => {
    expect(resolveClarityConfig({ projectId: 'abc123', hostname: 'www.letmefree.xyz' })).toEqual({
      enabled: true,
      projectId: 'abc123',
    });
  });

  it('trims accidental whitespace from the project id', () => {
    expect(resolveClarityConfig({ projectId: '  abc123  ', hostname: 'letmefree.xyz' })).toEqual({
      enabled: true,
      projectId: 'abc123',
    });
  });
});

describe('buildClarityScriptUrl', () => {
  it('uses the official Microsoft Clarity script endpoint', () => {
    expect(buildClarityScriptUrl('abc123')).toBe('https://www.clarity.ms/tag/abc123');
  });
});
