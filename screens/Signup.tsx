import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService } from '../services/analyticsService';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuestConversion = location.state?.guest === true;
  const intent = (location.state as any)?.intent as string | undefined;
  const pendingTranscript = (location.state as any)?.transcript;
  const pendingScenario = (location.state as any)?.scenario;
  const pendingSosTipHistory = (location.state as any)?.sosTipHistory;
  const pendingEvaluation = (location.state as any)?.evaluation;
  const { signUp, signInWithGoogle, user } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // intent 없이 직접 접근 시 온보딩으로 리다이렉트 (회원가입은 퍼널 통해서만)
  useEffect(() => {
    if (!intent && !isGuestConversion) {
      navigate('/onboarding', { replace: true });
    }
  }, []);

  // 가입 페이지 진입 이벤트
  useEffect(() => {
    analyticsService.track('signup_start', analyticsService.withAttribution({ source: isGuestConversion ? 'guest' : 'direct' }));
  }, [isGuestConversion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('이용약관 및 개인정보처리방침에 동의해주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      console.log('[Signup] 회원가입 시작...');
      await signUp(email, password, name);
      console.log('[Signup] 회원가입 성공');
      analyticsService.track('signup_complete', analyticsService.withAttribution({ source: isGuestConversion ? 'guest' : 'direct' }));

      // 전문가 코칭 플레이북 구매 intent
      if (intent === 'golden-script') {
        sessionStorage.setItem('leadershigh_pending_purchase', JSON.stringify({
          transcript: pendingTranscript,
          scenario: pendingScenario,
          sosTipHistory: pendingSosTipHistory,
          evaluation: pendingEvaluation,
        }));
        navigate('/purchase/playbook', { replace: true });
        return;
      }

      // 게스트 전환: location.state로 전달된 데이터 우선 사용, 없으면 localStorage 폴백
      if (isGuestConversion) {
        if (pendingTranscript) {
          // Feedback → Signup 경로: location.state에 데이터 있음
          navigate('/feedback', {
            state: { transcript: pendingTranscript, scenario: pendingScenario, sosTipHistory: pendingSosTipHistory },
            replace: true,
          });
        } else {
          // 구형 경로 폴백: localStorage 확인
          const guestData = localStorage.getItem('leadershigh_guest_transcript');
          if (guestData) {
            const { transcript, scenario, sosTipHistory } = JSON.parse(guestData);
            localStorage.removeItem('leadershigh_guest_transcript');
            navigate('/feedback', { state: { transcript, scenario, sosTipHistory }, replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      console.error('[Signup] 실패:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('already registered')) {
        setError('이미 가입된 이메일입니다.');
      } else {
        setError(msg || '회원가입에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    // Google OAuth 리다이렉트 전에 필요한 데이터 sessionStorage에 보존
    if (intent === 'golden-script' && pendingTranscript) {
      sessionStorage.setItem('leadershigh_pending_purchase', JSON.stringify({
        transcript: pendingTranscript,
        scenario: pendingScenario,
        sosTipHistory: pendingSosTipHistory,
        evaluation: pendingEvaluation,
      }));
    } else if (isGuestConversion && pendingTranscript) {
      sessionStorage.setItem('leadershigh_guest_conversion', JSON.stringify({
        transcript: pendingTranscript,
        scenario: pendingScenario,
        sosTipHistory: pendingSosTipHistory,
      }));
    }
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.');
    }
  };

  // 이미 로그인된 상태에서 golden-script intent로 접근 → 구매 진행 안내
  if (user && intent === 'golden-script') {
    const goToPurchase = () => {
      sessionStorage.setItem('leadershigh_pending_purchase', JSON.stringify({
        transcript: pendingTranscript,
        scenario: pendingScenario,
        sosTipHistory: pendingSosTipHistory,
        evaluation: pendingEvaluation,
      }));
      navigate('/purchase/playbook', { replace: true });
    };
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-amber-400 text-2xl">auto_awesome</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">이미 로그인되어 있어요</h2>
          <p className="text-slate-400 text-sm mb-6">
            저장된 결과를 이어서 확인하고, 필요하면 상세 리포트 또는 플레이북 구매를 진행할 수 있습니다.
          </p>
          <button
            onClick={goToPurchase}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 font-black text-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">credit_card</span>
            저장된 결과 이어서 보기
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="text-4xl mb-4">✉️</div>
          <h2 className="text-xl font-bold text-white mb-2">이메일을 확인하세요</h2>
          <p className="text-slate-400 text-sm mb-6">
            <span className="text-amber-500">{email}</span>으로 인증 링크를 보냈습니다.<br />
            이메일의 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-colors"
          >
            로그인 화면으로
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-white mb-1">
            <span className="text-amber-500">Leader's</span> High
          </div>
          {intent === 'golden-script' ? (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <p className="text-amber-400 text-sm font-bold">리포트 저장 후 이어서 보기</p>
              <p className="text-slate-400 text-xs mt-0.5">회원가입하면 결과를 저장하고, 이후 상세 리포트 또는 플레이북을 이어서 확인할 수 있어요</p>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">무료로 리더십 훈련을 시작하세요</p>
          )}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
            />
          </div>

          {/* 약관 동의 */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/30"
            />
            <span className="text-slate-400 text-xs leading-relaxed">
              <Link to="/terms" className="text-amber-500 hover:underline">이용약관</Link>
              {' '}및{' '}
              <Link to="/privacy" className="text-amber-500 hover:underline">개인정보처리방침</Link>
              에 동의합니다
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '가입 중...' : '무료로 시작하기'}
          </button>
        </form>

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-700/50" />
          <span className="text-slate-500 text-xs">또는</span>
          <div className="flex-1 h-px bg-slate-700/50" />
        </div>

        {/* Google 로그인 */}
        <button
          onClick={handleGoogle}
          className="w-full py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-slate-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google로 계속하기
        </button>

        {/* 하단 링크 */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-amber-500 text-sm hover:text-amber-400 transition-colors">
            이미 계정이 있으신가요? 로그인
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
