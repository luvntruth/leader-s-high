import { describe, expect, it } from 'vitest';

import {
  resolveSupabaseAuthConfig,
  redactSupabaseUrl,
} from '../src/lib/supabaseAuthConfig';

describe('resolveSupabaseAuthConfig', () => {
  it('accepts a well-formed Supabase project URL with anon key', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result).toEqual({
      ok: true,
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
      projectRef: 'abcdefghijklmnopqrst',
    });
  });

  it('strips a trailing slash from the URL', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrst.supabase.co/',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result).toEqual({
      ok: true,
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
      projectRef: 'abcdefghijklmnopqrst',
    });
  });

  it('reports missing url', () => {
    const result = resolveSupabaseAuthConfig({ url: '', anonKey: 'anon' });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('missing-url');
    expect(result.message).toMatch(/VITE_SUPABASE_URL/);
    expect(result.message).toMatch(/설정/);
  });

  it('reports missing anon key', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: '',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('missing-anon-key');
    expect(result.message).toMatch(/VITE_SUPABASE_ANON_KEY/);
  });

  it('rejects the .env.example placeholder URL', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://your-project.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('placeholder-url');
    expect(result.message).toMatch(/placeholder|예시|템플릿/i);
  });

  it('rejects the supabase.ts fallback placeholder URL', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://placeholder.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('placeholder-url');
  });

  it('rejects the literal placeholder anon key', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'your_supabase_anon_key_here',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('placeholder-anon-key');
  });

  it('rejects an unparseable URL', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'not a url',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('invalid-url');
  });

  it('rejects Supabase URLs with path/query/hash segments', () => {
    const cases = [
      'https://abcdefghijklmnopqrst.supabase.co/auth/v1',
      'https://abcdefghijklmnopqrst.supabase.co?foo=bar',
      'https://abcdefghijklmnopqrst.supabase.co/#/auth',
    ];
    for (const url of cases) {
      const result = resolveSupabaseAuthConfig({
        url,
        anonKey: 'sb-anon-key-placeholder',
      });
      expect(result.ok).toBe(false);
      if (result.ok !== false) throw new Error('expected invalid config');
      expect(result.reason).toBe('invalid-url');
    }
  });

  it('rejects non-https URLs (http)', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'http://abcdefghijklmnopqrst.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('insecure-scheme');
    expect(result.message).toMatch(/https/i);
  });

  it('rejects malformed Supabase project ref (too short)', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abc.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('malformed-project-ref');
  });

  it('rejects malformed Supabase project ref (too long)', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrstuvwxyz.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('malformed-project-ref');
  });

  it('rejects malformed Supabase project ref with invalid characters', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcd_fghijklmnopqrst.supabase.co',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('malformed-project-ref');
  });

  it('rejects hosts that are not under supabase.co', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://abcdefghijklmnopqrst.example.com',
      anonKey: 'sb-anon-key-placeholder',
    });
    expect(result.ok).toBe(false);
    if (result.ok !== false) throw new Error('expected invalid config');
    expect(result.reason).toBe('non-supabase-host');
  });

  it('allows self-hosted Supabase domains when explicitly opted in', () => {
    const result = resolveSupabaseAuthConfig({
      url: 'https://auth.letmefree.xyz',
      anonKey: 'sb-anon-key-placeholder',
      allowSelfHosted: true,
    });
    expect(result.ok).toBe(true);
  });

  it('trims surrounding whitespace from inputs', () => {
    const result = resolveSupabaseAuthConfig({
      url: '  https://abcdefghijklmnopqrst.supabase.co  ',
      anonKey: '  sb-anon-key-placeholder  ',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.url).toBe('https://abcdefghijklmnopqrst.supabase.co');
    expect(result.anonKey).toBe('sb-anon-key-placeholder');
  });
});

describe('redactSupabaseUrl', () => {
  it('masks the Supabase project ref', () => {
    expect(redactSupabaseUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe(
      'https://abcd***qrst.supabase.co',
    );
  });

  it('returns a sentinel for empty input', () => {
    expect(redactSupabaseUrl('')).toBe('<empty>');
    expect(redactSupabaseUrl(undefined)).toBe('<empty>');
  });

  it('does not throw on unparseable input and redacts it', () => {
    const out = redactSupabaseUrl('not a url');
    expect(out).toBe('<invalid-url>');
  });

  it('still masks the subdomain on non-supabase hosts', () => {
    expect(redactSupabaseUrl('https://abcdefghijklmnop.example.com')).toMatch(
      /\*\*\*/,
    );
  });
});
