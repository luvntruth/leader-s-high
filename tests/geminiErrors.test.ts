import { describe, expect, it } from 'vitest';

import { getAiErrorMessage } from '../src/lib/geminiErrors';

describe('getAiErrorMessage', () => {
  it('surfaces expired API key issues as deployment configuration failures', () => {
    expect(getAiErrorMessage({
      status: 400,
      detail: '{"error":{"message":"API key expired. Please renew the API key."}}',
    })).toMatch(/운영 설정 오류/);
  });

  it('keeps rate limiting guidance specific', () => {
    expect(getAiErrorMessage({
      status: 429,
      detail: 'Too many requests',
    })).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
  });
});
