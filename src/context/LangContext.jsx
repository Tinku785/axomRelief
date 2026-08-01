import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { t as translate } from '../i18n/strings';

const STORAGE_KEY = 'axomrelief_lang';

const getInitialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (parsed === 0 || parsed === 1) return parsed;
    }
  } catch {
    // Ignore storage exceptions (e.g., restricted access or SSR)
  }
  return 0; // Default: 0 = English, 1 = Assamese
};

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(getInitialLang);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(lang));
    } catch {
      // Ignore storage exceptions
    }
  }, [lang]);

  const t = useMemo(() => translate(lang), [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return (
    <LangContext.Provider value={value}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}

