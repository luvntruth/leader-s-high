
import React from 'react';
// @ts-ignore
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Home from './screens/Home';
import Missions from './screens/Missions';
import Setup from './screens/Setup';
import Simulation from './screens/Simulation';
import VoiceSimulation from './screens/VoiceSimulation';
import Feedback from './screens/Feedback';
import Insights from './screens/Insights';
import Profile from './screens/Profile';
import CustomLab from './screens/CustomLab';
import StreakDetail from './screens/StreakDetail';
import AdminDashboard from './screens/AdminDashboard';
import HistoryList from './screens/HistoryList';
import HistoryDetail from './screens/HistoryDetail';
import Navigation from './components/Navigation';

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const noNavPaths = ['/simulation', '/voice', '/setup', '/feedback', '/admin'];
  const showNav = !noNavPaths.includes(location.pathname);

  return (
    <div className="min-h-screen bg-navy-deep flex flex-col lg:flex-row">
      {showNav && <Navigation />}
      <main className={`flex-1 transition-all duration-300 ${showNav ? 'lg:ml-64' : ''}`}>
        <div className="max-w-screen-2xl mx-auto h-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/voice" element={<VoiceSimulation />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/custom-lab" element={<CustomLab />} />
          <Route path="/streak" element={<StreakDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/history" element={<HistoryList />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
        </Routes>
      </LayoutWrapper>
    </HashRouter>
  );
};

export default App;
