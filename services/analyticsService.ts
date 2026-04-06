import { supabase } from '../src/lib/supabase';

// 세션 ID: 탭 단위로 고유 (새 탭 = 새 세션)
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type EventName =
  | 'landing_view'
  | 'landing_variant_view'
  | 'cta_click'
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
  | 'share_card';

export type TrackingProperties = Record<string, unknown>;

export type GrowthAttribution = {
  lp?: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_adset?: string;
  utm_content?: string;
  persona?: string;
  angle?: string;
};

export const analyticsService = {
  /** fire-and-forget 이벤트 전송 */
  track(eventName: EventName, properties: TrackingProperties = {}, userId?: string) {
    supabase
      .from('analytics_events')
      .insert({
        user_id: userId || null,
        session_id: SESSION_ID,
        event_name: eventName,
        properties,
      })
      .then(() => {}, () => {});
  },

  /** 현재 세션 ID 조회 */
  getSessionId() {
    return SESSION_ID;
  },

  /** 현재 URL의 UTM/landing variant 정보 읽기
   *  HashRouter 방어: window.location.search와 hash 내부 query params 모두 확인
   *  - ?lp=v1#/onboarding → search에서 읽힘
   *  - #/onboarding?lp=v1 → hash 내부에서 읽힘
   */
  getAttribution(search?: string): GrowthAttribution {
    // 명시적 search가 없으면 window.location.search + hash 내부 params 병합
    let params: URLSearchParams;
    if (search) {
      params = new URLSearchParams(search);
    } else {
      params = new URLSearchParams(window.location.search);
      // HashRouter 방어: hash 내부에 ?가 있으면 그 params도 병합 (search 우선)
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
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_adset: params.get('utm_adset') || undefined,
      utm_content: params.get('utm_content') || undefined,
      persona: params.get('persona') || undefined,
      angle: params.get('angle') || undefined,
    };
  },

  withAttribution(properties: TrackingProperties = {}, search?: string): TrackingProperties {
    return {
      ...this.getAttribution(search),
      ...properties,
    };
  },
};
