import { useState } from 'react';
import { useLang } from '../context/LangContext';

const TYPES = [
  ['Improvement', 'উন্নতি'],
  ['Bug', 'ভুল'],
  ['Wrong info', 'ভুল তথ্য'],
  ['Other', 'অন্য'],
];

const FORM_ID = import.meta.env.VITE_FORMSPREE_FORM_ID;

export default function FeedbackSheet({ open, onClose }) {
  const { lang, t } = useLang();
  const [type, setType] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const reset = () => {
    setType(0); setName(''); setEmail(''); setMsg(''); setCompany('');
    setError(''); setSent(false); setSending(false);
  };

  const close = () => { onClose(); reset(); };

  const send = async () => {
    if (company) return; // bot caught by honeypot - silently drop
    if (!msg || !email) {
      setError(lang ? 'ইমেইল আৰু বাৰ্তা দিয়ক।' : 'Please add your email and a short message.');
      return;
    }
    if (!FORM_ID) {
      setError(
        lang
          ? 'ফৰ্মস্প্ৰী ছেট কৰা হোৱা নাই - VITE_FORMSPREE_FORM_ID যোগ কৰক।'
          : 'Formspree is not configured yet - set VITE_FORMSPREE_FORM_ID in .env.local.'
      );
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`https://formspree.io/f/${FORM_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          type: TYPES[type][0],
          name: name || '(not provided)',
          email,
          message: msg,
          _subject: `Axom Relief feedback - ${TYPES[type][0]}`,
        }),
      });
      if (!res.ok) throw new Error('Formspree request failed');
      setSent(true);
    } catch {
      setError(lang ? 'পঠাব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।' : 'Could not send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={close}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div className="sheet__title">{t.sendFeedback}</div>
          <button className="sheet__close" onClick={close}>✕</button>
        </div>

        {sent ? (
          <div style={{ padding: '26px 4px', textAlign: 'center' }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', font: '28px/54px system-ui', margin: '0 auto 12px' }}>✓</div>
            <div style={{ font: '700 15.5px system-ui', color: 'var(--text)' }}>{t.thanks}</div>
            <button className="btn btn-green" style={{ marginTop: 18, width: 'auto', padding: '13px 24px' }} onClick={close}>
              {t.close}
            </button>
          </div>
        ) : (
          <div className="stack gap-9" style={{ marginTop: 16 }}>
            <div>
              <div className="field__label" style={{ marginBottom: 7 }}>{t.fbAbout}</div>
              <div className="chip-row">
                {TYPES.map((ft, i) => (
                  <button key={ft[0]} className={`chip ${type === i ? 'active' : ''}`} onClick={() => setType(i)}>
                    {ft[lang] ?? ft[0]}
                  </button>
                ))}
              </div>
            </div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.phNameOpt} />
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.phEmail} />
            <textarea className="input" rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={t.phFbMsg} />
            <label className="honeypot-field" aria-hidden="true">
              Company
              <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            {error && <div className="form-error" style={{ marginBottom: 0 }}>{error}</div>}
            <button className="btn btn-primary" onClick={send} disabled={sending}>
              {sending ? t.sending : t.send}
            </button>
            <div style={{ font: '11px/1.5 system-ui', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Delivered by Formspree to the Axom Relief inbox.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
