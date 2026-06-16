import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexSource = readFileSync(resolve(__dirname, '../index.tsx'), 'utf-8');

describe('Microsoft Clarity bootstrap', () => {
  it('initializes Clarity with the environment project id at app startup', () => {
    // initMicrosoftClarity 가 clarityService 에서 import 되는지 (다른 named import 동반 허용)
    expect(indexSource).toMatch(/import \{[^}]*\binitMicrosoftClarity\b[^}]*\} from '\.\/services\/clarityService';/);
    expect(indexSource).toContain('initMicrosoftClarity(import.meta.env.VITE_MS_CLARITY_PROJECT_ID');
  });
});
