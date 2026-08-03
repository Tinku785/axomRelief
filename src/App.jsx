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
import Terms from './pages/Terms';

export default function App() {
  const { pathname, hash } = useLocation();
  // Admin screens are a working tool, not the public site.
  const isAdmin = pathname.startsWith('/admin');

  // The browser keeps the old scroll position across a route change, so after
  // submitting a long form you land on the confirmation page already scrolled
  // past the confirmation. One place, covers every route - except a link that
  // deliberately targets a section, which scrolls itself.
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);

  return (
    <main className="app-root">
      <div className="app-shell">
        <Header />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/request" element={<RequestForm />} />
          <Route path="/request/done" element={<RequestDone />} />
          <Route path="/helping" element={<Helping />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>

        <footer>
          {!isAdmin && <SiteFooter showNews={pathname === '/'} />}
        </footer>
      </div>
    </main>
  );
}