import { supabase } from '../src/lib/supabase';
import type { Profile } from '../src/types/database';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/** fetch로 직접 Supabase Auth API 호출 (JS 클라이언트 우회) */
async function authFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1${path}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || data.error_description || 'Auth error');
  return data;
}

export const authService = {
  /** 이메일 회원가입 */
  async signUp(email: string, password: string, name: string) {
    const data = await authFetch('/signup', {
      email,
      password,
      data: { full_name: name },
    });

    // 세션이 반환되면 Supabase 클라이언트에 설정 (2초 타임아웃)
    if (data.access_token) {
      try {
        await Promise.race([
          supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('setSession timeout')), 2000)),
        ]);
      } catch (e) {
        console.warn('setSession 실패/타임아웃 (무시):', e);
      }
    }
    return data;
  },

  /** 이메일 로그인 */
  async signIn(email: string, password: string) {
    const data = await authFetch('/token?grant_type=password', {
      email,
      password,
    });

    // 세션을 Supabase 클라이언트에 설정 (2초 타임아웃)
    if (data.access_token) {
      try {
        await Promise.race([
          supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('setSession timeout')), 2000)),
        ]);
      } catch (e) {
        console.warn('setSession 실패/타임아웃 (무시):', e);
      }
    }
    return data;
  },

  /** Google OAuth 로그인 */
  async signInWithGoogle() {
    const callbackUrl = `${window.location.origin}/#/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
    return data;
  },

  /** 로그아웃 */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /** 비밀번호 재설정 이메일 전송 */
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    if (error) throw error;
  },

  /** 프로필 조회 */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('프로필 조회 실패:', error);
      return null;
    }
    return data;
  },

  /** 프로필 업데이트 */
  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** 계정 삭제 */
  async deleteAccount(userId: string) {
    await supabase.from('simulation_history').delete().eq('user_id', userId);
    await supabase.from('usage_tracking').delete().eq('user_id', userId);
    await supabase.auth.signOut();
  },

  /** 데이터 내보내기 (JSON) */
  async exportData(userId: string): Promise<string> {
    const [profileRes, historyRes, usageRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('simulation_history').select('*').eq('user_id', userId),
      supabase.from('usage_tracking').select('*').eq('user_id', userId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: profileRes.data,
      simulationHistory: historyRes.data || [],
      usageTracking: usageRes.data || [],
    };

    return JSON.stringify(exportData, null, 2);
  },
};
