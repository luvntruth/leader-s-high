
import React, { Suspense } from 'react';
import * as Sentry from '@sentry/react';
// @ts-ignore
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import Navigation from './components/Navigation';

// (H10) 전역 Error Boundary fallback — 백지 화면 방지 + Sentry 자동 수집
const ErrorFallback: React.FC<{ error: unknown; resetError: () => void }> = ({ error, resetError }) => (
  <div className="min-h-screen bg-[#060B18] text-white flex items-center justify-center px-6">
    <div className="max-w-sm w-full text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-xl font-bold mb-2">앱에 오류가 발생했어요</h1>
      <p className="text-slate-400 text-sm mb-1">잠시 후 다시 시도해주세요.</p>
      <p className="text-slate-600 text-[11px] mb-6">
        문제가 계속되면 새로고침하거나 고객센터에 문의해주세요.
      </p>
      {error instanceof Error && (
        <p className="text-slate-700 text-[10px] font-mono mb-5 truncate" title={error.message}>
          {error.message}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <button
          onClick={resetError}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm"
        >
          다시 시도
        </button>
        <button
          onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
        >
          홈으로
        </button>
      </div>
    </div>
  </div>
);

// Lazy-loaded screen components
const Home = React.lazy(() => import('./screens/Home'));
const Missions = React.lazy(() => import('./screens/Missions'));
const Setup = React.lazy(() => import('./screens/Setup'));
const Simulation = React.lazy(() => import('./screens/Simulation'));
// VoiceSimulation 은 2026-04 런치에서 일시 제외 (geminiLiveService 국가 차단 이슈). 코드는 보존.
// const VoiceSimulation = React.lazy(() => import('./screens/VoiceSimulation'));
const Feedback = React.lazy(() => import('./screens/Feedback'));
const Insights = React.lazy(() => import('./screens/Insights'));
const Profile = React.lazy(() => import('./screens/Profile'));
const CustomLab = React.lazy(() => import('./screens/CustomLab'));
const TeamOffice = React.lazy(() => import('./screens/TeamOffice'));
const StreakDetail = React.lazy(() => import('./screens/StreakDetail'));
const AdminDashboard = React.lazy(() => import('./screens/AdminDashboard'));
const HistoryList = React.lazy(() => import('./screens/HistoryList'));
const HistoryDetail = React.lazy(() => import('./screens/HistoryDetail'));
const Login = React.lazy(() => import('./screens/Login'));
const Signup = React.lazy(() => import('./screens/Signup'));
const Pricing = React.lazy(() => import('./screens/Pricing'));
const Privacy = React.lazy(() => import('./screens/Privacy'));
const Terms = React.lazy(() => import('./screens/Terms'));
const ResetPassword = React.lazy(() => import('./screens/ResetPassword'));
const UpgradePrompt = React.lazy(() => import('./screens/UpgradePrompt'));
const Landing = React.lazy(() => import('./screens/Landing'));
const Onboarding = React.lazy(() => import('./screens/Onboarding'));
const DevPanel = React.lazy(() => import('./screens/DevPanel'));
const PlaybookSample = React.lazy(() => import('./screens/PlaybookSample'));
const PurchasePlaybook = React.lazy(() => import('./screens/PurchasePlaybook'));
// Spec v3 §5.9: Pro 결제 후 20개 시나리오 선택 화면
const SelectScenarios = React.lazy(() => import('./screens/SelectScenarios'));
const AuthCallback = React.lazy(() => import('./screens/AuthCallback'));

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const noNavPaths = ['/simulation', '/setup', '/feedback', '/admin', '/team-office', '/login', '/signup', '/pricing', '/privacy', '/terms', '/reset-password', '/upgrade', '/landing', '/onboarding', '/dev', '/dev/playbook-sample', '/purchase/playbook', '/select-scenarios'];
  const showNav = !noNavPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-navy-deep flex flex-col lg:flex-row">
      {showNav && <Navigation />}
      <main className={`flex-1 min-h-screen transition-all duration-300 ${showNav ? 'lg:ml-72' : ''}`}>
        {children}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  if (import.meta.env.VITE_MAINTENANCE === 'true') {
    return (
      <div style={{ minHeight: '100vh', background: '#060B18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>🔧</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '1rem' }}>점검 중입니다</h1>
          <p style={{ color: '#64748b', lineHeight: 1.8 }}>더 나은 서비스를 위해 잠시 점검 중입니다.<br />곧 돌아올게요!</p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <HashRouter>
        <LayoutWrapper>
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/upgrade" element={<UpgradePrompt />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dev" element={<DevPanel />} />
              <Route path="/dev/playbook-sample" element={<PlaybookSample />} />

              {/* 보호 라우트 - 구매 */}
              <Route path="/purchase/playbook" element={<AuthGuard><PurchasePlaybook /></AuthGuard>} />
              {/* Spec v3 §5.9: Pro 플랜 시나리오 선택 화면 — 결제 직후 자동 진입 */}
              <Route path="/select-scenarios" element={<AuthGuard><SelectScenarios /></AuthGuard>} />

              {/* 보호 라우트 */}
              <Route path="/" element={<Navigate to="/onboarding" replace />} />
              <Route path="/missions" element={<AuthGuard><Missions /></AuthGuard>} />
              <Route path="/setup" element={<AuthGuard allowGuest><Setup /></AuthGuard>} />
              <Route path="/simulation" element={<AuthGuard allowGuest><Simulation /></AuthGuard>} />
              {/* /voice 라우트는 2026-04 런치에서 일시 제거. 코드는 screens/VoiceSimulation.tsx 에 보존됨. */}
              <Route path="/feedback" element={<AuthGuard allowGuest><Feedback /></AuthGuard>} />
              <Route path="/insights" element={<AuthGuard><Insights /></AuthGuard>} />
              <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
              <Route path="/custom-lab" element={<AuthGuard requiredPlan="ultra"><CustomLab /></AuthGuard>} />
              <Route path="/team-office" element={<AuthGuard><TeamOffice /></AuthGuard>} />
              <Route path="/streak" element={<AuthGuard><StreakDetail /></AuthGuard>} />
              {/* B2B: 추후 활성화 */}
              {/* <Route path="/admin" element={<AuthGuard requiredRole="admin"><AdminDashboard /></AuthGuard>} /> */}
              <Route path="/history" element={<AuthGuard><HistoryList /></AuthGuard>} />
              <Route path="/history/:id" element={<AuthGuard><HistoryDetail /></AuthGuard>} />
            </Routes>
          </Suspense>
        </LayoutWrapper>
      </HashRouter>
    </AuthProvider>
  );
};

// (H10) 전역 Error Boundary로 App 래핑 — 렌더 중 에러 시 ErrorFallback 표시 + Sentry 자동 보고
export default Sentry.withErrorBoundary(App, {
  fallback: ({ error, resetError }) => <ErrorFallback error={error} resetError={resetError} />,
  showDialog: false,
});
