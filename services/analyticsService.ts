import { supabase } from '../src/lib/supabase';

// 세션 ID: 탭 단위로 고유 (새 탭 = 새 세션)
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Spec v3 §8: 랜딩 variant + UTM 첫 진입값을 sessionStorage 에 보존 → 모든 이벤트에 자동 첨부
const ATTRIBUTION_STORAGE_KEY = 'lh_attribution';

export type EventName =
  | 'landing_view'
  | 'landing_variant_view'
  | 'cta_click'
  | 'scroll_depth_25'
  | 'scroll_depth_50'
  | 'scroll_depth_75'
  | 'scroll_depth_90'
  | 'guest_sim_start'
  | 'onboarding_start'
  | 'sim_start'
  | 'simulation_first_turn'
  | 'sim_complete'
  | 'sim_abandon'
  | 'signup_start'
  | 'signup_complete'
  | 'pricing_view'
  | 'checkout_start'
  | 'checkout_success'
  | 'report_view'
  | 'report_purchase'
  | 'share_card'
  // Spec v3 §8: 추가 이벤트
  | 'scenario_selection_start'
  | 'scenario_selection_complete'
  | 'ultra_coming_soon_click'
  | 'abandon_limit_reached';

export type TrackingProperties = Record<string, unknown>;

export type GrowthAttribution = {
  lp?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_adset?: string;
  utm_content?: string;
  utm_term?: string;
  persona?: string;
  angle?: string;
};

export const analyticsService = {
  /** fire-and-forget 이벤트 전송. Spec v3 §8: 모든 이벤트에 attribution 자동 첨부. */
  track(eventName: EventName, properties: TrackingProperties = {}, userId?: string) {
    const enriched = {
      ...this.getAttribution(),
      ...properties, // 호출자 명시 값이 우선
    };
    supabase
      .from('analytics_events')
      .insert({
        user_id: userId || null,
        session_id: SESSION_ID,
        event_name: eventName,
        properties: enriched,
      })
      .then(() => {}, () => {});
  },

  /** 현재 세션 ID 조회 */
  getSessionId() {
    return SESSION_ID;
  },

  /** 첫 진입 시 호출 — URL 의 lp/utm 을 sessionStorage 에 1회 저장.
   *  이후 페이지 이동으로 URL 에서 사라져도 모든 이벤트에 자동 첨부됨. */
  captureAttribution(): void {
    if (typeof window === 'undefined') return;
    // 이미 저장된 attribution 이 있으면 덮어쓰지 않음 (첫 진입값 보존)
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) return;

    const fromUrl = this.parseAttributionFromUrl();
    const hasAny = Object.values(fromUrl).some(v => v !== undefined);
    if (!hasAny) return; // lp/utm 없으면 저장 스킵

    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(fromUrl));
  },

  /** URL 에서 attribution parameters 파싱 (HashRouter 방어 포함) */
  parseAttributionFromUrl(search?: string): GrowthAttribution {
    let params: URLSearchParams;
    if (search) {
      params = new URLSearchParams(search);
    } else {
      params = new URLSearchParams(window.location.search);
      const hashQuery = window.location.hash.split('?')[1];
      if (hashQuery) {
        const hashParams = new URLSearchParams(hashQuery);
        hashParams.forEach((value, key) => {
          if (!params.has(key)) params.set(key, value);
        });
      }
    }
    return {
      lp: params.get('lp') || undefined,
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_adset: params.get('utm_adset') || undefined,
      utm_content: params.get('utm_content') || undefined,
      utm_term: params.get('utm_term') || undefined,
      persona: params.get('persona') || undefined,
      angle: params.get('angle') || undefined,
    };
  },

  /** Attribution 조회 — sessionStorage 우선, URL fallback */
  getAttribution(search?: string): GrowthAttribution {
    if (typeof window === 'undefined') return {};
    // 1순위: sessionStorage 에 보존된 첫 진입값
    const stored = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (stored && !search) {
      try { return JSON.parse(stored) as GrowthAttribution; } catch { /* fallthrough */ }
    }
    // 2순위: 현재 URL
    return this.parseAttributionFromUrl(search);
  },

  /** Legacy helper — track() 가 자동 첨부하므로 더 이상 필수 아님. 호출처 호환 유지. */
  withAttribution(properties: TrackingProperties = {}, search?: string): TrackingProperties {
    return {
      ...this.getAttribution(search),
      ...properties,
    };
  },
};
