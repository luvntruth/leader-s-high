import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}));

function createSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

const sessionStorageMock = createSessionStorage();

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorageMock.clear();
  vi.stubGlobal('sessionStorage', sessionStorageMock);
  vi.stubGlobal('window', {
    location: {
      search: '',
      hash: '#/landing?lp=new-manager&utm_source=meta&utm_medium=paid_social&utm_campaign=launch_001&utm_content=ad_a&utm_term=team_leader&cta=hero-primary',
    },
  });
});

describe('analytics attribution preservation', () => {
  it('parses hash-routed UTM, landing variant, and CTA placement from the first paid-ad entry URL', async () => {
    const { analyticsService } = await import('../services/analyticsService');

    const attribution = analyticsService.parseAttributionFromUrl();

    expect(attribution).toMatchObject({
      lp: 'new-manager',
      utm_source: 'meta',
      utm_medium: 'paid_social',
      utm_campaign: 'launch_001',
      utm_content: 'ad_a',
      utm_term: 'team_leader',
      cta: 'hero-primary',
    });
  });

  it('stores first-touch attribution once and attaches it to later funnel events after URL parameters disappear', async () => {
    const { analyticsService } = await import('../services/analyticsService');

    analyticsService.captureAttribution();
    vi.stubGlobal('window', {
      location: {
        search: '',
        hash: '#/onboarding',
      },
    });

    analyticsService.track('onboarding_start', { screen: 'onboarding' });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'onboarding_start',
        properties: expect.objectContaining({
          lp: 'new-manager',
          utm_source: 'meta',
          utm_medium: 'paid_social',
          utm_campaign: 'launch_001',
          utm_content: 'ad_a',
          utm_term: 'team_leader',
          cta: 'hero-primary',
          screen: 'onboarding',
        }),
      })
    );
  });
});
