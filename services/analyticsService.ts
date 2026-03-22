import { supabase } from '../src/lib/supabase';

// 세션 ID: 탭 단위로 고유 (새 탭 = 새 세션)
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type EventName =
  | 'landing_view'
  | 'guest_sim_start'
  | 'sim_start'
  | 'sim_complete'
  | 'sim_abandon'
  | 'signup_start'
  | 'signup_complete'
  | 'report_view'
  | 'report_purchase'
  | 'share_card';

export const analyticsService = {
  /** fire-and-forget 이벤트 전송 */
  track(eventName: EventName, properties: Record<string, unknown> = {}, userId?: string) {
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
};
