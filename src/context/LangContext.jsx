import { createContext, useContext, useState } from 'react';
import { t as translate } from '../i18n/strings';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(0); // 0 = English, 1 = Assamese

  return (
    <LangContext.Provider value={{ lang, setLang, t: translate(lang) }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
