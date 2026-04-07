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
        // URL에서 code 파라미터 추출 (PKCE flow)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // 세션 확인 후 이동
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // 우선순위: 구매 intent → 게스트 전환 → 온보딩
          const pendingPurchase = sessionStorage.getItem('leadershigh_pending_purchase');
          const guestConversion = sessionStorage.getItem('leadershigh_guest_conversion');

          if (pendingPurchase) {
            navigate('/purchase/playbook', { replace: true });
          } else if (guestConversion) {
            const { transcript, scenario, sosTipHistory } = JSON.parse(guestConversion);
            sessionStorage.removeItem('leadershigh_guest_conversion');
            navigate('/feedback', { state: { transcript, scenario, sosTipHistory }, replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('[AuthCallback] 오류:', err);
        setError('로그인 처리 중 오류가 발생했습니다.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
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
