import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appSource = readFileSync(resolve(__dirname, '../App.tsx'), 'utf-8');
const landingSource = readFileSync(resolve(__dirname, '../screens/Landing.tsx'), 'utf-8');

describe('onboarding navigation shell flicker prevention', () => {
  it('does not render the sidebar shell on the transient root route before onboarding redirect', () => {
    expect(appSource).toMatch(/const noNavPaths = \[[\s\S]*'\/'/);
  });

  it('does not send authenticated landing visitors through root before onboarding', () => {
    expect(landingSource).not.toContain("navigate('/', { replace: true })");
    expect(landingSource).toContain("navigate(`/onboarding?");
  });
});
