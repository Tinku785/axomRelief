import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { needLabel, DISTRICTS } from '../i18n/strings';
import { PRIORITY_META, PRIORITY_ORDER } from '../utils/priority';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import { phoneError, normalizePhone } from '../utils/phone';
import { isRateLimited } from '../utils/rateLimit';
import { useReliefData } from '../hooks/useReliefData';
import { registerHelper } from '../api/helpers';
import { supabaseConfigured } from '../supabaseClient';
import { timeAgo, toTel } from '../utils/time';
import ReliefMap from '../components/ReliefMap';
import MapModal from '../components/MapModal';
import TurnstileWidget from '../components/TurnstileWidget';

const emptyHelperForm = { name: '', contact: '', districts: [], areas: '', given: '', boat: null };

export default function Helping() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { requests, helpers, loading, refetch } = useReliefData();

  const [hf, setHf] = useState(emptyHelperForm);
  const [registered, setRegistered] = useState(false);
  const [helperError, setHelperError] = useState('');
  const [registering, setRegistering] = useState(false);

  const [fPrio, setFPrio] = useState('All');
  const [mapOpen, setMapOpen] = useState(false);
  const [company, setCompany] = useState(''); // honeypot
  const [turnstileToken, setTurnstileToken] = useState('');

  const setField = (key) => (e) => setHf((f) => ({ ...f, [key]: e.target.value }));

  const toggleDistrict = (d) => {
    setHf((f) => ({
      ...f,
      districts: f.districts.includes(d) ? f.districts.filter((x) => x !== d) : [...f.districts, d],
    }));
  };

  const submitHelper = async (e) => {
    e.preventDefault();
    if (company) return; // honeypot tripped — silently drop
    if (!hf.name) {
      setHelperError(lang ? 'নাম দিয়ক।' : 'Please enter your name.');
      return;
    }
    const phoneErr = phoneError(hf.contact, lang);
    if (phoneErr) {
      setHelperError(phoneErr);
      return;
    }
    if (!hf.districts.length) {
      setHelperError(lang ? 'অন্ততঃ এখন জিলা বাছক।' : 'Select at least one district you are available in.');
      return;
    }
    if (!turnstileToken) {
      setHelperError(lang ? 'অনুগ্ৰহ কৰি মানুহ পৰীক্ষা সম্পূৰ্ণ কৰক।' : 'Please complete the human verification.');
      return;
    }
    setRegistering(true);
    setHelperError('');
    try {
      await registerHelper(hf);
      setRegistered(true);
      await refetch();
    } catch (err) {
      setHelperError(isRateLimited(err) ? t.rateLimited
        : (lang ? 'পঞ্জীয়ন কৰিব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।' : 'Could not register. Please try again.'));
    } finally {
      setRegistering(false);
    }
  };

  const visibleRequests = fPrio === 'All' ? requests : requests.filter((r) => r.priority === fPrio);

  const markers = [
    ...requestsToMarkers(requests, PRIORITY_META),
    ...helpersToMarkers(helpers),
  ];

  const needsText = (r) => {
    const parts = r.needs.map((k) => needLabel(k, lang));
    if (r.needs_other) parts.push(r.needs_other);
    return parts.join(', ');
  };

  return (
    <div className="screen">
      <button className="btn-back" onClick={() => navigate('/')}>‹ {t.back}</button>
      <div style={{ padding: '6px 14px 14px' }}>
        <div className="page-title">{t.amHelping}</div>
      </div>

      <div className="panel-card">
        <div className="panel-card__head">
          <div style={{ font: '700 14px system-ui', color: 'var(--text)' }}>{t.rescuerReg}</div>
          {registered && <span className="badge-registered">✓ {t.registered}</span>}
        </div>
        {!registered ? (
          <form className="stack gap-10" style={{ padding: 13 }} onSubmit={submitHelper}>
            <input className="input" value={hf.name} onChange={setField('name')} placeholder={t.phName} />
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={hf.contact}
              onChange={(e) => setHf((f) => ({ ...f, contact: normalizePhone(e.target.value) }))}
              placeholder={t.phPhone}
            />

            <div>
              <div className="field__label" style={{ marginBottom: 7 }}>{t.districtsAvailable}</div>
              <div className="chip-row">
                {DISTRICTS.map((d) => {
                  const on = hf.districts.includes(d);
                  return (
                    <button
                      type="button"
                      key={d}
                      className={`chip ${on ? 'active' : ''}`}
                      onClick={() => toggleDistrict(d)}
                    >
                      {on ? '✓ ' : ''}{d}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="field__label" style={{ marginBottom: 6 }}>{t.areasLabel}</div>
              <input className="input" value={hf.areas} onChange={setField('areas')} placeholder={t.phAreasText} />
            </div>

            <input className="input" value={hf.given} onChange={setField('given')} placeholder={t.phGiven} />

            <div>
              <div className="field__label" style={{ marginBottom: 6 }}>{t.boatAvailable}</div>
              <div className="toggle-row">
                <button type="button" className={`toggle-btn ${hf.boat === true ? 'on-green' : ''}`} onClick={() => setHf((f) => ({ ...f, boat: true }))}>
                  {t.yes}
                </button>
                <button type="button" className={`toggle-btn ${hf.boat === false ? 'on-neutral' : ''}`} onClick={() => setHf((f) => ({ ...f, boat: false }))}>
                  {t.no}
                </button>
              </div>
            </div>

            <label className="honeypot-field" aria-hidden="true">
              Company
              <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
            </label>
            <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
            {helperError && <div className="form-error" style={{ marginBottom: 0 }}>{helperError}</div>}
            <button className="btn btn-green" type="submit" disabled={registering || !supabaseConfigured}>
              {registering ? t.registering : t.register}
            </button>
          </form>
        ) : (
          <div style={{ padding: 13, font: '13px/1.6 system-ui', color: 'var(--text-secondary)' }}>{t.registeredBody}</div>
        )}
      </div>

      <div style={{ padding: '20px 14px 0' }}>
        <div className="section-title" style={{ marginBottom: 10 }}>{t.mapTitle}</div>
        <ReliefMap markers={markers} interactive={false} onExpand={() => setMapOpen(true)} />
      </div>

      <div style={{ padding: '20px 14px 0' }}>
        <div className="section-heading">
          <div className="section-title">{t.peopleNeedHelp}</div>
          <div className="section-meta">{visibleRequests.length}</div>
        </div>
        <div className="chip-row" style={{ marginTop: 10 }}>
          <button className={`chip ${fPrio === 'All' ? 'active' : ''}`} onClick={() => setFPrio('All')}>
            {lang ? 'সকলো' : 'All'}
          </button>
          {PRIORITY_ORDER.map((key) => {
            const p = PRIORITY_META[key];
            const on = fPrio === key;
            return (
              <button
                key={key}
                className="chip"
                style={on ? { borderColor: p.color, background: p.color, color: '#fff' } : undefined}
                onClick={() => setFPrio(key)}
              >
                {p.shape} {t[key]}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: '12px 14px 0' }} className="stack gap-10">
        {!supabaseConfigured && <div className="state-msg">{t.notConfigured}</div>}
        {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
        {supabaseConfigured && !loading && !visibleRequests.length && (
          <div className="state-msg">{t.noneYet}</div>
        )}
        {supabaseConfigured && !loading && visibleRequests.map((r) => {
          const p = PRIORITY_META[r.priority];
          return (
            <div key={r.id} className="request-card" style={{ borderLeft: `5px solid ${p.color}` }}>
              <div className="request-card__top">
                <div className="request-card__name">{r.name}</div>
                <span className="badge" style={{ background: p.bg, color: p.color }}>{p.shape} {t[r.priority]}</span>
              </div>
              <div className="request-card__line">{r.location}, {r.district} · {r.num_people} {t.peopleWord}</div>
              <div className="request-card__needs">{needsText(r)}</div>
              <div style={{ font: '13px/1.6 system-ui', color: r.boat_required ? 'var(--orange)' : 'var(--text-tertiary)' }}>
                {r.boat_required ? (lang ? 'নাও লাগে' : 'Boat required') : (lang ? 'নাও নালাগে' : 'Reachable by road')}
              </div>
              {r.notes && <div className="request-card__notes">{r.notes}</div>}
              <div className="request-card__foot">
                <span className="request-card__time">{timeAgo(r.created_at, lang)}</span>
                <a className="call-btn" href={toTel(r.contact_number)} aria-label={`${t.callNow} ${r.name}`}>
                  <span className="call-btn__icon" aria-hidden="true">📞</span>
                  {r.contact_number}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {mapOpen && <MapModal markers={markers} onClose={() => setMapOpen(false)} />}
    </div>
  );
}
