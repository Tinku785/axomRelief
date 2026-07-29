import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import SiteFooter from './components/SiteFooter';
import Home from './pages/Home';
import RequestForm from './pages/RequestForm';
import RequestDone from './pages/RequestDone';
import Helping from './pages/Helping';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const { pathname } = useLocation();
  // Admin screens are a working tool, not the public site.
  const isAdmin = pathname.startsWith('/admin');

  // The browser keeps the old scroll position across a route change, so after
  // submitting a long form you land on the confirmation page already scrolled
  // past the confirmation. One place, covers every route.
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
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
  );
}