import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { useFooterData } from '../context/FooterDataContext';
import { supabaseConfigured } from '../supabaseClient';
import { timeAgo, formatDateTime, toTel } from '../utils/time';
import FeedbackSheet from './FeedbackSheet';

const CONTACT_EMAIL = 'Ankitabhagawati21@gmail.com';

export default function SiteFooter() {
  const { lang, t } = useLang();
  const { news, helplines, loading } = useFooterData();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
          <a className="app-footer__link" href={`mailto:${CONTACT_EMAIL}`}>{t.contactUs}</a>
          <button className="app-footer__link" onClick={() => setFeedbackOpen(true)}>{t.feedback}</button>
        </nav>
        <div className="app-footer__meta">AxomRelief v1, 2026</div>
      </div>

      {aboutOpen && (
        <div className="sheet-backdrop" onClick={() => setAboutOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__head">
              <div className="sheet__title">{t.aboutUs}</div>
              <button className="sheet__close" onClick={() => setAboutOpen(false)} aria-label={t.close}>✕</button>
            </div>
            <p className="sheet__body">{t.aboutBody}</p>
            <button className="btn btn-green" onClick={() => setAboutOpen(false)}>{t.close}</button>
          </div>
        </div>
      )}

      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
