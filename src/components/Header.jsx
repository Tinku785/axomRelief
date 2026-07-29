import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import logoMark from '../assets/logo-mark.png';
import logoWordmark from '../assets/logo-wordmark.png';

export default function Header() {
  const { lang, setLang, t } = useLang();

  return (
    <header className="app-header">
      <div className="app-header__top">
        <Link className="app-header__brand" to="/" aria-label="Axom Relief home">
          <img className="app-header__mark" src={logoMark} alt="" width="34" height="34" />
          <div style={{ minWidth: 0 }}>
            <img className="app-header__wordmark" src={logoWordmark} alt="Axom Relief" />
            <div className="app-header__tagline">{t.tagline}</div>
          </div>
        </Link>
        <div className="lang-toggle">
          <button className={lang === 0 ? 'active' : ''} onClick={() => setLang(0)}>EN</button>
          <button className={lang === 1 ? 'active' : ''} onClick={() => setLang(1)}>অস</button>
        </div>
      </div>
    </header>
  );
}
