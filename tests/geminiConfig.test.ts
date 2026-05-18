import { describe, expect, it } from 'vitest';

import { resolveGeminiRuntimeConfig } from '../src/lib/geminiConfig';

describe('resolveGeminiRuntimeConfig', () => {
  it('uses the proxy when available', () => {
    expect(resolveGeminiRuntimeConfig({
      proxyUrl: 'https://proxy.example.com',
      apiKey: 'direct-key',
      hostname: 'letmefree.xyz',
      authToken: 'jwt-token',
    })).toEqual({
      mode: 'proxy',
      baseUrl: 'https://proxy.example.com',
      credential: 'jwt-token',
    });
  });

  it('allows direct API keys on localhost for local development', () => {
    expect(resolveGeminiRuntimeConfig({
      proxyUrl: undefined,
      apiKey: 'dev-key',
      hostname: 'localhost',
      authToken: null,
    })).toEqual({
      mode: 'direct',
      credential: 'dev-key',
    });
  });

  it('throws a descriptive error when production is missing the proxy URL', () => {
    expect(() => resolveGeminiRuntimeConfig({
      proxyUrl: undefined,
      apiKey: 'expired-key',
      hostname: 'letmefree.xyz',
      authToken: null,
    })).toThrow(/VITE_GEMINI_PROXY_URL/);
  });
});
