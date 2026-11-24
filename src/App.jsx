import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { HOME } from './lib/constants.js';
import Layout from './components/Layout.jsx';
import { ToastHost, Spinner } from './components/ui.jsx';
import Report from './pages/Report.jsx';
import Track from './pages/Track.jsx';
import { Login, Forgot } from './pages/AuthPages.jsx';
import Dashboard from './pages/Dashboard.jsx';
import IncidentDetail from './pages/IncidentDetail.jsx';
import Dispatch from './pages/Dispatch.jsx';
import Assignments from './pages/Assignments.jsx';
import MapPage from './pages/MapPage.jsx';
import Analytics from './pages/Analytics.jsx';
import AuditLog from './pages/AuditLog.jsx';
import AdminPage from './pages/AdminPage.jsx';
import Alerts from './pages/Alerts.jsx';
import { useState } from 'react';
import SplashScreen from './components/SplashScreen.jsx';
/** Frontend guard is only for UX — the real permission checks run on the server. */
function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  if (!ready) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />;
  return children;
}

const OPS = ['ADMIN', 'DISPATCHER'], ALL = ['ADMIN', 'DISPATCHER', 'VIEWER'];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
    {showSplash && (
  <SplashScreen onFinish={() => setShowSplash(false)} />
)}
      <ToastHost />
      <Routes>
        <Route path="/" element={<Report />} />
        <Route path="/track/:id" element={<Track />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route path="/app" element={<Guard><Layout /></Guard>}>
          <Route index element={<Guard roles={ALL}><Dashboard /></Guard>} />
          <Route path="dispatch" element={<Guard roles={OPS}><Dispatch /></Guard>} />
          <Route path="assignments" element={<Guard roles={['RESPONDER']}><Assignments /></Guard>} />
          <Route path="map" element={<MapPage />} />
          <Route path="analytics" element={<Guard roles={ALL}><Analytics /></Guard>} />
          <Route path="audit" element={<Guard roles={['ADMIN']}><AuditLog /></Guard>} />
          <Route path="admin" element={<Guard roles={['ADMIN']}><AdminPage /></Guard>} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="incident/:id" element={<IncidentDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
