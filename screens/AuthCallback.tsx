import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const href = window.location.href;
        const hash = window.location.hash || '';

        // HashRouter 환경 대응: /#/auth/callback?code=... 또는 #access_token=... 모두 처리
        const codeMatch = href.match(/[?#&]code=([^&#]+)/);
        const accessTokenMatch = href.match(/[?#&]access_token=([^&#]+)/);
        const refreshTokenMatch = href.match(/[?#&]refresh_token=([^&#]+)/);
        const errorMatch = href.match(/[?#&]error=([^&#]+)/);
        const errorDescMatch = href.match(/[?#&]error_description=([^&#]+)/);

        const code = codeMatch ? decodeURIComponent(codeMatch[1]) : null;
        const accessToken = accessTokenMatch ? decodeURIComponent(accessTokenMatch[1]) : null;
        const refreshToken = refreshTokenMatch ? decodeURIComponent(refreshTokenMatch[1]) : null;
        const authError = errorMatch ? decodeURIComponent(errorMatch[1]) : null;
        const authErrorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1].replace(/\+/g, ' ')) : null;

        if (authError) {
          throw new Error(authErrorDesc || authError);
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const pendingPurchase = sessionStorage.getItem('leadershigh_pending_purchase');
          const guestConversion = sessionStorage.getItem('leadershigh_guest_conversion');
          const postAuthRedirect = sessionStorage.getItem('leadershigh_post_auth_redirect');

          if (pendingPurchase) {
            navigate('/purchase/playbook', { replace: true });
          } else if (guestConversion) {
            try {
              const { transcript, scenario, sosTipHistory } = JSON.parse(guestConversion);
              sessionStorage.removeItem('leadershigh_guest_conversion');
              navigate('/feedback', {
                state: { transcript, scenario, sosTipHistory },
                replace: true,
              });
            } catch {
              sessionStorage.removeItem('leadershigh_guest_conversion');
              navigate('/onboarding', { replace: true });
            }
          } else if (postAuthRedirect) {
            sessionStorage.removeItem('leadershigh_post_auth_redirect');
            navigate(postAuthRedirect, { replace: true });
          } else if (hash.includes('access_token')) {
            navigate('/profile', { replace: true });
          } else {
            navigate('/profile', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('[AuthCallback] 오류:', err);
        const message = err instanceof Error ? err.message : '로그인 처리 중 오류가 발생했습니다.';
        setError(message);
        setTimeout(() => navigate('/login', { replace: true }), 2500);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-navy-deep flex items-center justify-center">
      {error ? (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">{error}</p>
          <p className="text-slate-500 text-xs">로그인 페이지로 이동합니다...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">로그인 처리 중...</p>
        </div>
      )}
    </div>
  );
};

export default AuthCallback;
