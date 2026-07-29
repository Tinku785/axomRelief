import { Route, Routes, useLocation } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import Header from './components/Header';
import SiteFooter from './components/SiteFooter';
import Home from './pages/Home';
import RequestForm from './pages/RequestForm';
import RequestDone from './pages/RequestDone';
import Helping from './pages/Helping';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  // Admin screens are a working tool, not the public site.
  const isAdmin = useLocation().pathname.startsWith('/admin');

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div className="app-root">
        <div className="app-shell">
          <Header />

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/request" element={<RequestForm />} />
            <Route path="/request/done" element={<RequestDone />} />
            <Route path="/helping" element={<Helping />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>

          {!isAdmin && <SiteFooter />}
        </div>
      </div>
    </APIProvider>
  );
}