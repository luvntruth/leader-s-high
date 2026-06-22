import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ insert: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
  },
}));

function createSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
  };
}

const sessionStorageMock = createSessionStorage();

beforeEach(() => {
  sessionStorageMock.clear();
  vi.stubGlobal('sessionStorage', sessionStorageMock);
  vi.stubGlobal('window', {
    location: {
      search: '',
      hash: '#/pricing?lp=diagnosis&utm_source=meta&utm_medium=paid_social&utm_campaign=launch_001&utm_content=ad_b&utm_term=manager&cta=hero-pricing',
    },
  });
});

describe('pending purchase intent preservation', () => {
  it('builds a post-auth pricing redirect that preserves attribution and selected option', async () => {
    const { buildPurchaseRedirectPath } = await import('../services/purchaseIntentService');

    const redirect = buildPurchaseRedirectPath('/pricing', {
      lp: 'diagnosis',
      utm_source: 'meta',
      utm_medium: 'paid_social',
      utm_campaign: 'launch_001',
      utm_content: 'ad_b',
      utm_term: 'manager',
      cta: 'hero-pricing',
    }, 'pro-10');

    expect(redirect).toBe('/pricing?lp=diagnosis&utm_source=meta&utm_medium=paid_social&utm_campaign=launch_001&utm_content=ad_b&utm_term=manager&cta=hero-pricing&intent=purchase&option=pro-10');
  });

  it('stores the selected payment option so login/signup can resume the purchase path', async () => {
    const { PAYMENT_OPTIONS } = await import('../services/paymentService');
    const { createPendingPurchaseIntent, loadPendingPurchaseIntent, savePendingPurchaseIntent } = await import('../services/purchaseIntentService');

    const option = PAYMENT_OPTIONS.find(o => o.id === 'pro-10')!;
    const intent = createPendingPurchaseIntent(option, 'pricing', '/pricing');
    savePendingPurchaseIntent(intent);

    const loaded = loadPendingPurchaseIntent();
    expect(loaded).toMatchObject({
      optionId: 'pro-10',
      plan: 'pro',
      days: 10,
      amount: 8900,
      source: 'pricing',
      loginRedirect: expect.stringContaining('/pricing?'),
      attribution: expect.objectContaining({
        lp: 'diagnosis',
        utm_source: 'meta',
        cta: 'hero-pricing',
      }),
    });
  });
});
