import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import { authService } from '../services/authService';
import { setAuthToken, clearAuthToken } from '../src/lib/geminiClient';
import type { Profile } from '../src/types/database';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const signingOut = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const p = await authService.getProfile(userId);
      if (!signingOut.current) {
        if (p) {
          setProfile(p);
        } else {
          // 프로필 조회 실패 시 기본 free 프로필 설정
          setProfile({
            id: userId,
            email: '',
            display_name: '',
            avatar_url: null,
            org_id: null,
            role: 'member',
            plan: 'free',
            plan_expires_at: null,
            plan_started_at: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            onboarding_completed: false,
            selected_scenarios: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    } catch {
      // 프로필 조회 실패 시에도 기본 free 프로필
      if (!signingOut.current) {
        setProfile({
          id: userId,
          email: '',
          display_name: '',
          avatar_url: null,
          org_id: null,
          role: 'member',
          plan: 'free',
          plan_expires_at: null,
          plan_started_at: null,
          stripe_customer_id: null,
          stripe_subscription_id: null,
          onboarding_completed: false,
          selected_scenarios: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, []);

  // localStorage → Supabase 마이그레이션
  const migrateLocalStorage = useCallback(async (userId: string) => {
    const migrated = localStorage.getItem('leadershigh_migrated');
    if (migrated) return;

    const raw = localStorage.getItem('leadershigh_history');
    if (!raw) {
      localStorage.setItem('leadershigh_migrated', 'true');
      return;
    }

    try {
      const items = JSON.parse(raw) as Array<Record<string, unknown>>;
      if (items.length === 0) return;

      const records = items.map((item: Record<string, unknown>) => ({
        user_id: userId,
        scenario_id: (item.scenario as Record<string, unknown>)?.id as string || 'unknown',
        scenario_title: item.scenarioTitle as string || '',
        scenario_category: (item.scenario as Record<string, unknown>)?.category as string || null,
        character_name: item.memberName as string || '',
        character_generation: (item.scenario as Record<string, unknown>)?.generation as string || null,
        transcript: item.transcript || [],
        message_count: Array.isArray(item.transcript) ? item.transcript.length : 0,
        feedback: item.evaluation || null,
        coaching_skills: (item.evaluation as Record<string, unknown>)?.coachingSkills || null,
        radar_chart: (item.evaluation as Record<string, unknown>)?.radarChart || null,
        memo: item.memo as string || '',
        tags: (item.tags as string[]) || [],
      }));

      const { error } = await supabase.from('simulation_history').insert(records);
      if (!error) {
        localStorage.removeItem('leadershigh_history');
        localStorage.setItem('leadershigh_migrated', 'true');
        console.log(`마이그레이션 완료: ${records.length}건`);
      } else {
        console.error('마이그레이션 실패:', error);
      }
    } catch (e) {
      console.error('마이그레이션 파싱 오류:', e);
    }
  }, []);

  useEffect(() => {
    // 초기 세션 확인
    let resolved = false;
    const finishLoading = () => {
      if (!resolved) { resolved = true; setLoading(false); }
    };

    // 최후 안전장치만 유지 (너무 빠른 loading 종료 방지)
    setTimeout(finishLoading, 8000);

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user && s.access_token) {
        setAuthToken(s.access_token);
        fetchProfile(s.user.id).catch(() => {});
        migrateLocalStorage(s.user.id).catch(() => {});
      }
      finishLoading();
    }).catch(() => {
      finishLoading();
    });

    // 세션 변화 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        // 로그아웃 중이면 리스너 무시
        if (signingOut.current) return;

        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user && s.access_token) {
          setAuthToken(s.access_token);
          fetchProfile(s.user.id).catch(() => {});
          migrateLocalStorage(s.user.id).catch(() => {});
        } else {
          clearAuthToken();
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile, migrateLocalStorage]);

  const signUp = async (email: string, password: string, name: string) => {
    const data = await authService.signUp(email, password, name);
    if (data.access_token && data.user) {
      setAuthToken(data.access_token);
      setUser(data.user);
      setSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user } as Session);
      fetchProfile(data.user.id).catch(() => {});
    }
  };

  const signIn = async (email: string, password: string) => {
    signingOut.current = false;
    const data = await authService.signIn(email, password);
    if (data.access_token && data.user) {
      setAuthToken(data.access_token);
      setUser(data.user);
      setSession({ access_token: data.access_token, refresh_token: data.refresh_token, user: data.user } as Session);
      fetchProfile(data.user.id).catch(() => {});
      migrateLocalStorage(data.user.id).catch(() => {});
    }
  };

  const signInWithGoogle = async () => {
    signingOut.current = false;
    await authService.signInWithGoogle();
  };

  const signOut = async () => {
    // 플래그 설정 → onAuthStateChange 리스너가 상태를 복원하지 않도록
    signingOut.current = true;
    // 즉시 상태 클리어
    clearAuthToken();
    setUser(null);
    setProfile(null);
    setSession(null);
    // signOut은 행할 수 있으므로 타임아웃
    try {
      await Promise.race([
        authService.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
    } catch {
      // 타임아웃이어도 상태는 이미 클리어됨
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
