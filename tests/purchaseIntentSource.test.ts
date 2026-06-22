import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const plansSource = readFileSync(resolve(__dirname, '../components/PlansSection.tsx'), 'utf-8');
const loginSource = readFileSync(resolve(__dirname, '../screens/Login.tsx'), 'utf-8');
const signupSource = readFileSync(resolve(__dirname, '../screens/Signup.tsx'), 'utf-8');
const pricingSource = readFileSync(resolve(__dirname, '../screens/Pricing.tsx'), 'utf-8');

describe('purchase intent funnel source contract', () => {
  it('saves pending purchase intent before sending unauthenticated buyers to login', () => {
    expect(plansSource).toContain('createPendingPurchaseIntent(option, source, loginRedirect)');
    expect(plansSource).toContain('savePendingPurchaseIntent(intent)');
    expect(plansSource).toContain("navigate('/login', { state: { from: intent.loginRedirect, purchaseIntent: intent } })");
  });

  it('keeps purchase intent when moving from login to signup', () => {
    expect(loginSource).toContain('loadPendingPurchaseIntent()');
    expect(loginSource).toContain("state={{ intent: 'direct', from, purchaseIntent: pendingPurchaseIntent || undefined }}");
    expect(loginSource).toContain('선택한 플랜을 이어서 결제할 수 있어요');
  });

  it('returns newly signed-up buyers to the selected pricing path', () => {
    expect(signupSource).toContain('loadPendingPurchaseIntent()');
    expect(signupSource).toContain("navigate(pendingPurchaseIntent.loginRedirect || from || '/pricing'");
    expect(signupSource).toContain('가입 후 가격 페이지로 돌아갑니다');
  });

  it('shows a pricing reminder after login/signup when purchase intent exists', () => {
    expect(pricingSource).toContain('loadPendingPurchaseIntent()');
    expect(pricingSource).toContain('선택한 플랜으로 이어서 결제하세요');
  });
});
