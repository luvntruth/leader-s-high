
import React from 'react';
// @ts-ignore
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import Home from './screens/Home';
import Missions from './screens/Missions';
import Setup from './screens/Setup';
import Simulation from './screens/Simulation';
import VoiceSimulation from './screens/VoiceSimulation';
import Feedback from './screens/Feedback';
import Insights from './screens/Insights';
import Profile from './screens/Profile';
import CustomLab from './screens/CustomLab';
import TeamOffice from './screens/TeamOffice';
import StreakDetail from './screens/StreakDetail';
import AdminDashboard from './screens/AdminDashboard';
import HistoryList from './screens/HistoryList';
import HistoryDetail from './screens/HistoryDetail';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Pricing from './screens/Pricing';
import Privacy from './screens/Privacy';
import Terms from './screens/Terms';
import Navigation from './components/Navigation';

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const noNavPaths = ['/simulation', '/voice', '/setup', '/feedback', '/admin', '/team-office', '/login', '/signup', '/pricing', '/privacy', '/terms'];
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
  return (
    <AuthProvider>
      <HashRouter>
        <LayoutWrapper>
          <Routes>
            {/* 공개 라우트 */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* 보호 라우트 */}
            <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
            <Route path="/missions" element={<AuthGuard><Missions /></AuthGuard>} />
            <Route path="/setup" element={<AuthGuard><Setup /></AuthGuard>} />
            <Route path="/simulation" element={<AuthGuard><Simulation /></AuthGuard>} />
            <Route path="/voice" element={<AuthGuard requiredPlan="pro"><VoiceSimulation /></AuthGuard>} />
            <Route path="/feedback" element={<AuthGuard><Feedback /></AuthGuard>} />
            <Route path="/insights" element={<AuthGuard><Insights /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
            <Route path="/custom-lab" element={<AuthGuard requiredPlan="enterprise"><CustomLab /></AuthGuard>} />
            <Route path="/team-office" element={<AuthGuard><TeamOffice /></AuthGuard>} />
            <Route path="/streak" element={<AuthGuard><StreakDetail /></AuthGuard>} />
            <Route path="/admin" element={<AuthGuard requiredRole="admin"><AdminDashboard /></AuthGuard>} />
            <Route path="/history" element={<AuthGuard><HistoryList /></AuthGuard>} />
            <Route path="/history/:id" element={<AuthGuard><HistoryDetail /></AuthGuard>} />
          </Routes>
        </LayoutWrapper>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
