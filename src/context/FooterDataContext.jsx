import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchNews } from '../api/news';
import { fetchHelplines } from '../api/helplines';
import { supabaseConfigured } from '../supabaseClient';

const FooterDataContext = createContext(null);

// Shared "Latest updates" + helpline numbers, fetched once per app load and
// refetched (via refetch()) whenever the admin dashboard adds/removes one,
// so the persistent footer band on every page stays in sync.
export function FooterDataProvider({ children }) {
  const [news, setNews] = useState([]);
  const [helplines, setHelplines] = useState([]);
  const [loading, setLoading] = useState(supabaseConfigured);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [n, h] = await Promise.all([fetchNews(), fetchHelplines()]);
      setNews(n);
      setHelplines(h);
    } catch {
      setError('load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <FooterDataContext.Provider value={{ news, helplines, loading, error, refetch }}>
      {children}
    </FooterDataContext.Provider>
  );
}

export function useFooterData() {
  const ctx = useContext(FooterDataContext);
  if (!ctx) throw new Error('useFooterData must be used within FooterDataProvider');
  return ctx;
}
