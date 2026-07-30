import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useFooterData } from '../context/FooterDataContext';
import { supabaseConfigured } from '../supabaseClient';
import { timeAgo, formatDateTime, toTel } from '../utils/time';
import FeedbackSheet from './FeedbackSheet';

// The people running this, in the order they should be tried. Not in the
// database: these are the operators, not editable helpline rows.
const CONTACTS = [
  ['Mrigakshee K', '+91 91010 29532'],
  ['Tinku M. Kaushik', '+91 95313 58175'],
  ['Nikumoni Borah', '+91 84718 69773'],
  ['Tonmoy Mahanta', '+91 80119 34179'],
  ['Ankita Bhagawati', '+91 99546 49124'],
];

function Sheet({ title, onClose, children }) {
  const { t } = useLang();
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div className="sheet__title">{title}</div>
          <button className="sheet__close" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        {children}
        <button className="btn btn-green" onClick={onClose}>{t.close}</button>
      </div>
    </div>
  );
}

export default function SiteFooter() {
  const { lang, t } = useLang();
  const { news, helplines, loading } = useFooterData();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div style={{ marginTop: 30 }}>
      <div className="news-band">
        <div className="news-band__head">
          <span className="news-band__live">{t.live}</span>
          <span className="news-band__title">{t.latestUpdates}</span>
        </div>
        <div className="stack gap-9">
          {!supabaseConfigured && <div className="state-msg">{t.notConfigured}</div>}
          {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
          {supabaseConfigured && !loading && !news.length && (
            <div className="news-empty">{t.noNews}</div>
          )}
          {supabaseConfigured && !loading && news.map((n) => (
            <div className="news-card" key={n.id}>
              <div className="news-card__text">{n.message}</div>
              <div className="news-card__time">
                {formatDateTime(n.created_at, lang)} · {timeAgo(n.created_at, lang)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="site-footer">
        <div className="site-footer__title">{t.helplines}</div>
        <div className="helpline-list">
          {helplines.map((h) => (
            <a className="helpline-row" key={h.id} href={toTel(h.phone_number)}>
              <span className="helpline-row__label">{h.label}</span>
              <span className="helpline-row__phone">
                <span aria-hidden="true">📞</span>
                {h.phone_number}
              </span>
            </a>
          ))}
        </div>
      </div>

      <div className="app-footer">
        <nav className="app-footer__links">
          <button className="app-footer__link" onClick={() => setAboutOpen(true)}>{t.aboutUs}</button>
          <button className="app-footer__link" onClick={() => setContactOpen(true)}>{t.contactUs}</button>
          <button className="app-footer__link" onClick={() => setFeedbackOpen(true)}>{t.feedback}</button>
        </nav>
        <div className="app-footer__meta">AxomRelief v1, 2026</div>
      </div>

      {aboutOpen && (
        <Sheet title={t.aboutUs} onClose={() => setAboutOpen(false)}>
          <p className="sheet__body">{t.aboutBody}</p>
        </Sheet>
      )}

      {contactOpen && (
        <Sheet title={t.contactUs} onClose={() => setContactOpen(false)}>
          {/* Same row as the helpline list: a name, and a number that dials. */}
          <div className="helpline-list" style={{ marginBottom: 14 }}>
            {CONTACTS.map(([name, phone]) => (
              <a className="helpline-row" key={phone} href={toTel(phone)}>
                <span className="helpline-row__label">{name}</span>
                <span className="helpline-row__phone">
                  <span aria-hidden="true">📞</span>
                  {phone}
                </span>
              </a>
            ))}
          </div>
        </Sheet>
      )}

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
