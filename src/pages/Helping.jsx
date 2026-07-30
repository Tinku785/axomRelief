import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { needLabel, DISTRICTS, NEEDS } from '../i18n/strings';
import { PRIORITY_META, PRIORITY_ORDER, matchCount, sortByMatch } from '../utils/priority';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import { contactsError, phoneList } from '../utils/phone';
import { isRateLimited } from '../utils/rateLimit';
import { useReliefData } from '../hooks/useReliefData';
import { registerHelper } from '../api/helpers';
import { supabaseConfigured } from '../supabaseClient';
import { timeAgo, toTel } from '../utils/time';
import ReliefMap from '../components/ReliefMap';
import MapModal from '../components/MapModal';
import HelperCard from '../components/HelperCard';
import PhoneFields from '../components/PhoneFields';
import TurnstileWidget from '../components/TurnstileWidget';
import Pager, { pageSlice } from '../components/Pager';

const emptyHelperForm = {
  name: '', contacts: [''], districts: [],
  areas: '', supplies: [], suppliesOther: '', boat: null, notes: '',
};

export default function Helping() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { requests, helpers, loading, refetch } = useReliefData();

  const [hf, setHf] = useState(emptyHelperForm);
  const [registered, setRegistered] = useState(false);
  const [helperError, setHelperError] = useState('');
  const [registering, setRegistering] = useState(false);
  // Arriving from "See who is helping" means the visitor wants the lists, not
  // the sign-up form — so the form starts folded away rather than filling the
  // first screen.
  const [formOpen, setFormOpen] = useState(!hash);

  const [fPrio, setFPrio] = useState('All');
  const [page, setPage] = useState(0);
  const [helperPage, setHelperPage] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [focus, setFocus] = useState(null);
  const [company, setCompany] = useState(''); // honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const mapRef = useRef(null);

  const setField = (key) => (e) => setHf((f) => ({ ...f, [key]: e.target.value }));

  // React Router does not scroll to a hash on its own, and the target section
  // only exists once the data has loaded.
  useEffect(() => {
    if (!hash || loading) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, loading]);

  // A new filter is a new list, so page 3 of the old one is meaningless.
  const pickPrio = (v) => { setFPrio(v); setPage(0); };

  const toggleIn = (key, value) => {
    setHf((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));
  };

  const submitHelper = async (e) => {
    e.preventDefault();
    if (company) return; // honeypot tripped — silently drop
    if (!hf.name) {
      setHelperError(lang ? 'নাম দিয়ক।' : 'Please enter your name.');
      return;
    }
    const phoneErr = contactsError(hf.contacts, lang);
    if (phoneErr) {
      setHelperError(phoneErr);
      return;
    }
    if (!hf.districts.length) {
      setHelperError(lang ? 'অন্ততঃ এখন জিলা বাছক।' : 'Select at least one district you are available in.');
      return;
    }
    if (!hf.supplies.length) {
      setHelperError(lang ? 'আপুনি কি সামগ্ৰী দিব পাৰে বাছক।' : 'Select at least one supply you can bring.');
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
      // No route change here, so App's scroll reset does not fire: the
      // "Registered" confirmation sits at the top, the submit button at the
      // bottom.
      window.scrollTo(0, 0);
      await refetch();
    } catch (err) {
      setHelperError(isRateLimited(err) ? t.rateLimited
        : (lang ? 'পঞ্জীয়ন কৰিব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।' : 'Could not register. Please try again.'));
    } finally {
      setRegistering(false);
    }
  };

  const byPrio = fPrio === 'All' ? requests : requests.filter((r) => r.priority === fPrio);
  // Once a rescuer has ticked what they can bring, the useful order is "who can
  // I actually help most" rather than "who posted last".
  const scoring = hf.supplies.some((s) => s !== 'other');
  const visibleRequests = sortByMatch(byPrio, hf.supplies);
  const pageRequests = pageSlice(visibleRequests, page);

  const markers = [
    ...requestsToMarkers(requests, PRIORITY_META),
    ...helpersToMarkers(helpers),
  ];

  const needsText = (r) => {
    const parts = r.needs.map((k) => needLabel(k, lang));
    if (r.needs_other) parts.push(r.needs_other);
    return parts.join(', ');
  };

  const showOnMap = (r) => {
    setFocus({ lat: r.lat, lng: r.lng });
    // No smooth behaviour: it is ignored under reduced-motion and in several
    // in-app browsers, which silently leaves the map off-screen.
    mapRef.current?.scrollIntoView({ block: 'center' });
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
          {registered
            ? <span className="badge-registered">✓ {t.registered}</span>
            : <button type="button" className="link-btn" onClick={() => setFormOpen((v) => !v)}>
              {formOpen ? '▴' : '▾'}
            </button>}
        </div>
        {registered && (
          <div style={{ padding: 13, font: '13px/1.6 system-ui', color: 'var(--text-secondary)' }}>{t.registeredBody}</div>
        )}
        {!registered && formOpen && (
          <form className="stack gap-10" style={{ padding: 13 }} onSubmit={submitHelper}>
            <input className="input" value={hf.name} onChange={setField('name')} placeholder={t.phName} />
            <PhoneFields
              numbers={hf.contacts}
              onChange={(contacts) => setHf((f) => ({ ...f, contacts }))}
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
                      onClick={() => toggleIn('districts', d)}
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

            {/* Same category keys the request form uses, which is the whole
                point: a free-text "rice and water" cannot be matched against a
                request's needs, a ticked list can. */}
            <div>
              <div className="field__label" style={{ marginBottom: 7 }}>{t.suppliesCanGive}</div>
              <div className="chip-row">
                {NEEDS.map((n) => {
                  const on = hf.supplies.includes(n.key);
                  return (
                    <button
                      type="button"
                      key={n.key}
                      className={`chip ${on ? 'active' : ''}`}
                      onClick={() => { toggleIn('supplies', n.key); setPage(0); }}
                    >
                      {on ? '✓ ' : ''}{n.label[lang] ?? n.label[0]}
                    </button>
                  );
                })}
              </div>
              {hf.supplies.includes('other') && (
                <input
                  className="input"
                  style={{ marginTop: 9 }}
                  value={hf.suppliesOther}
                  onChange={setField('suppliesOther')}
                  placeholder={t.phSuppliesOther}
                />
              )}
            </div>

            <div>
              <div className="field__label" style={{ marginBottom: 6 }}>{t.otherDetails}</div>
              <textarea
                className="input"
                rows={2}
                value={hf.notes}
                onChange={setField('notes')}
                placeholder={t.phHelperNotes}
              />
            </div>

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
        )}
      </div>

      <div style={{ padding: '20px 14px 0' }} ref={mapRef}>
        <ReliefMap markers={markers} interactive={false} focus={focus} onExpand={() => setMapOpen(true)}>
          <div className="map-badge">
            <div className="map-badge__title">{t.mapTitle}</div>
          </div>
        </ReliefMap>
      </div>

      <div id="helpers" style={{ padding: '20px 14px 0', scrollMarginTop: 76 }}>
        <div className="section-heading">
          <div className="section-title">{t.activeRescuers}</div>
          <div className="section-meta">{helpers.length}</div>
        </div>
        <div className="stack gap-9" style={{ marginTop: 11 }}>
          {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
          {supabaseConfigured && !loading && !helpers.length && <div className="state-msg">{t.noHelpersHere}</div>}
          {pageSlice(helpers, helperPage).map((h) => <HelperCard key={h.id} helper={h} />)}
          <Pager total={helpers.length} page={helperPage} onPage={setHelperPage} />
        </div>
      </div>

      <div id="list" style={{ padding: '20px 14px 0', scrollMarginTop: 76 }}>
        <div className="section-heading">
          <div className="section-title">{t.peopleNeedHelp}</div>
          <div className="section-meta">{visibleRequests.length}</div>
        </div>
        {scoring && <div className="section-hint">{t.matchNote}</div>}
        <div className="chip-row" style={{ marginTop: 10 }}>
          <button className={`chip ${fPrio === 'All' ? 'active' : ''}`} onClick={() => pickPrio('All')}>
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
                onClick={() => pickPrio(key)}
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
        {supabaseConfigured && !loading && pageRequests.map((r) => {
          const p = PRIORITY_META[r.priority];
          const matched = matchCount(hf.supplies, r);
          return (
            <div key={r.id} className="request-card" style={{ borderLeft: `5px solid ${p.color}` }}>
              <div className="request-card__top">
                <div className="request-card__name">{r.name}</div>
                <span className="badge" style={{ background: p.bg, color: p.color }}>{p.shape} {t[r.priority]}</span>
              </div>
              <div className="request-card__line">{r.location}, {r.district} · {r.num_people} {t.peopleWord}</div>
              <div className="request-card__needs">{needsText(r)}</div>
              {scoring && (
                <div className={`match-badge ${matched ? '' : 'match-badge--none'}`}>
                  {matched}/{r.needs.length} {t.matchWord}
                </div>
              )}
              <div style={{ font: '13px/1.6 system-ui', color: r.boat_required ? 'var(--orange)' : 'var(--text-tertiary)' }}>
                {r.boat_required ? (lang ? 'নাও লাগে' : 'Boat required') : (lang ? 'নাও নালাগে' : 'Reachable by road')}
              </div>
              {r.notes && <div className="request-card__notes">{r.notes}</div>}
              <div className="request-card__foot">
                <span className="request-card__time">{timeAgo(r.created_at, lang)}</span>
                <div className="request-card__calls">
                  {r.lat != null && (
                    <button type="button" className="map-btn" onClick={() => showOnMap(r)}>
                      📍 {t.showOnMap}
                    </button>
                  )}
                  {phoneList(r).map((num) => (
                    <a key={num} className="call-btn" href={toTel(num)} aria-label={`${t.callNow} ${r.name}`}>
                      <span className="call-btn__icon" aria-hidden="true">📞</span>
                      {num}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <Pager total={visibleRequests.length} page={page} onPage={setPage} />
      </div>

      {mapOpen && <MapModal markers={markers} onClose={() => setMapOpen(false)} />}
    </div>
  );
}
