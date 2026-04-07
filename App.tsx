
import React, { Suspense } from 'react';
// @ts-ignore
import { HashRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import Navigation from './components/Navigation';

// Lazy-loaded screen components
const Home = React.lazy(() => import('./screens/Home'));
const Missions = React.lazy(() => import('./screens/Missions'));
const Setup = React.lazy(() => import('./screens/Setup'));
const Simulation = React.lazy(() => import('./screens/Simulation'));
const VoiceSimulation = React.lazy(() => import('./screens/VoiceSimulation'));
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
const AuthCallback = React.lazy(() => import('./screens/AuthCallback'));

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const noNavPaths = ['/simulation', '/voice', '/setup', '/feedback', '/admin', '/team-office', '/login', '/signup', '/pricing', '/privacy', '/terms', '/reset-password', '/upgrade', '/landing', '/onboarding', '/dev', '/dev/playbook-sample', '/purchase/playbook'];
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

              {/* 보호 라우트 */}
              <Route path="/" element={<Navigate to="/onboarding" replace />} />
              <Route path="/missions" element={<AuthGuard><Missions /></AuthGuard>} />
              <Route path="/setup" element={<AuthGuard allowGuest><Setup /></AuthGuard>} />
              <Route path="/simulation" element={<AuthGuard allowGuest><Simulation /></AuthGuard>} />
              <Route path="/voice" element={<AuthGuard requiredPlan="pro"><VoiceSimulation /></AuthGuard>} />
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

export default App;
