import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { needLabel, DISTRICTS, NEEDS } from '../i18n/strings';
import { PRIORITY_META, PRIORITY_ORDER, matchCount, sortByMatch } from '../utils/priority';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import { contactsError } from '../utils/phone';
import { requestShareText } from '../utils/share';
import { emptyFilters, filterRequests } from '../utils/listFilter';
import { isRateLimited } from '../utils/rateLimit';
import { useReliefData } from '../hooks/useReliefData';
import { registerHelper } from '../api/helpers';
import { STATUS_META, statusOf, isResolved } from '../utils/status';
import { supabaseConfigured } from '../supabaseClient';
import { timeAgo, formatDate } from '../utils/time';
import ReliefMap from '../components/ReliefMap';
import MapModal from '../components/MapModal';
import PhoneFields from '../components/PhoneFields';
import ShareButton from '../components/ShareButton';
import ClampText from '../components/ClampText';
import ListControls from '../components/ListControls';
import PhoneButtons from '../components/PhoneButtons';
import TermsCheckbox from '../components/TermsCheckbox';
import TurnstileWidget from '../components/TurnstileWidget';
import Pager, { pageSlice, PAGE_SIZE } from '../components/Pager';
import Req from '../components/Req';

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
  // Always open: this page exists to sign rescuers up, and a folded form on
  // arrival reads as "nothing to do here". The chevron still collapses it.
  const [formOpen, setFormOpen] = useState(true);

  const [filters, setFilters] = useState(emptyFilters);
  const [agreed, setAgreed] = useState(false);
  // created_at of the newest request the reader has actually seen. Anything
  // that arrives after this is what the "new requests" pill counts.
  const [seenUpTo, setSeenUpTo] = useState(null);
  const [jumpTo, setJumpTo] = useState(null);
  // 'open' = still needs help, 'done' = help received. Two lists, because a
  // rescuer scanning for work should not have to skip past finished jobs.
  const [listTab, setListTab] = useState('open');
  const [page, setPage] = useState(0);
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

  // First load establishes the baseline; everything newer is "new" until the
  // reader taps the pill.
  useEffect(() => {
    if (seenUpTo || !requests.length) return;
    setSeenUpTo(requests.reduce((max, r) => (r.created_at > max ? r.created_at : max), ''));
  }, [requests, seenUpTo]);

  const newOnes = seenUpTo ? requests.filter((r) => r.created_at > seenUpTo) : [];

  // Oldest-first means the newest row is at the *end* of a paged list, so
  // jumping to it is a page change plus a scroll, not just a scroll.
  const jumpToNewest = () => {
    const newest = newOnes.reduce((a, b) => (a.created_at > b.created_at ? a : b));
    setSeenUpTo(newest.created_at);
    const idx = visibleRequests.findIndex((r) => r.id === newest.id);
    if (idx < 0) return; // filtered out of the current view
    setPage(Math.floor(idx / PAGE_SIZE));
    setJumpTo(newest.id); // scrolled by the effect below, once the page renders
  };

  // A rAF here fires before React has painted the new page, so the scroll
  // lands on the old layout. An effect runs after the DOM is updated.
  useEffect(() => {
    if (!jumpTo) return;
    document.getElementById(`req-${jumpTo}`)?.scrollIntoView({ block: 'center' });
    setJumpTo(null);
  }, [jumpTo, page]);

  // A new filter is a new list, so page 3 of the old one is meaningless.
  const changeFilters = (next) => { setFilters(next); setPage(0); };
  const pickPrio = (v) => changeFilters({ ...filters, priority: v });

  const toggleIn = (key, value) => {
    setHf((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value],
    }));
  };

  const submitHelper = async (e) => {
    e.preventDefault();
    if (company) return; // honeypot tripped - silently drop
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
    if (!agreed) {
      setHelperError(t.termsRequired);
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

  const openRequests = requests.filter((r) => !isResolved(r));
  const doneRequests = requests.filter((r) => isResolved(r));
  // Counts on the priority chips describe the tab you are in, not the whole
  // table - "Critical 18" has to mean 18 of the rows you can actually see.
  const tabPool = listTab === 'done' ? doneRequests : openRequests;
  const filtered = filterRequests(tabPool, filters, lang);
  // Once a rescuer has ticked what they can bring, the useful order is "who can
  // I actually help most" rather than "who posted last".
  const scoring = hf.supplies.some((s) => s !== 'other');
  const visibleRequests = sortByMatch(filtered, hf.supplies);
  const pageRequests = pageSlice(visibleRequests, page);

  // null, not PRIORITY_META: requesters are plain green here so the pin colours
  // mean the same thing on every map in the app - green asks, orange answers.
  const markers = [
    ...requestsToMarkers(requests, null),
    ...helpersToMarkers(helpers),
  ];

  const needsText = (r) => {
    const parts = r.needs.map((k) => needLabel(k, lang));
    if (r.needs_other) parts.push(r.needs_other);
    return parts.join(', ');
  };

  const showOnMap = (r) => {
    setFocus({ id: r.id, lat: r.lat, lng: r.lng });
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
            <div>
              <div className="field__label">{t.yourName}<Req /></div>
              <input className="input" value={hf.name} onChange={setField('name')} placeholder={t.phName} />
            </div>
            <PhoneFields
              numbers={hf.contacts}
              onChange={(contacts) => setHf((f) => ({ ...f, contacts }))}
              labelFirst
            />

            <div>
              <div className="field__label" style={{ marginBottom: 7 }}>{t.districtsAvailable}<Req /></div>
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
              <div className="field__label" style={{ marginBottom: 7 }}>{t.suppliesCanGive}<Req /></div>
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
            <TermsCheckbox checked={agreed} onChange={setAgreed} />
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
            <div className="map-legend">
              <span className="map-legend__item">
                <i className="relief-pin relief-pin--dot" style={{ background: 'var(--green)' }} />
                {t.legendRequesters} ({openRequests.length})
              </span>
              <span className="map-legend__item">
                <i className="relief-pin relief-pin--dot" style={{ background: 'var(--orange)' }} />
                {t.legendRescuers} ({helpers.length})
              </span>
            </div>
          </div>
        </ReliefMap>
      </div>

      <div id="list" style={{ padding: '20px 14px 0', scrollMarginTop: 76 }}>
        {/* One panel, above the list and visibly separate from it: the filters
            were previously loose controls that read as page furniture and got
            scrolled straight past. */}
        <ListControls filters={filters} onChange={changeFilters} withStatus withWhen>
          <div className="chip-row chip-row--priority" style={{ marginTop: 8 }}>
            <button className={`chip ${filters.priority === 'All' ? 'active' : ''}`} onClick={() => pickPrio('All')}>
              {lang ? 'সকলো' : 'All'} <span className="chip__count">{tabPool.length}</span>
            </button>
            {PRIORITY_ORDER.map((key) => {
              const p = PRIORITY_META[key];
              const on = filters.priority === key;
              return (
                <button
                  key={key}
                  className="chip"
                  style={on ? { borderColor: p.color, background: p.color, color: '#fff' } : undefined}
                  onClick={() => pickPrio(key)}
                >
                  {p.shape} {t[key]} <span className="chip__count">{tabPool.filter((r) => r.priority === key).length}</span>
                </button>
              );
            })}
          </div>
        </ListControls>
        <div className="list-tabs">
          <button
            type="button"
            className={`list-tab ${listTab === 'open' ? 'active' : ''}`}
            onClick={() => { setListTab('open'); setPage(0); }}
          >
            {t.peopleNeedHelp} <span className="section-count">({openRequests.length})</span>
          </button>
          <button
            type="button"
            className={`list-tab ${listTab === 'done' ? 'active' : ''}`}
            onClick={() => { setListTab('done'); setPage(0); }}
          >
            {t.peopleReceivedHelp} <span className="section-count">({doneRequests.length})</span>
          </button>
        </div>
        {scoring && <div className="section-hint">{t.matchNote}</div>}
      </div>

      <div style={{ padding: '12px 14px 0' }} className="stack gap-10">
        {listTab === 'open' && !!newOnes.length && (
          <button type="button" className="new-pill" onClick={jumpToNewest}>
            ↓ {newOnes.length} {newOnes.length === 1 ? t.newRequests : t.newRequestsPlural}
          </button>
        )}
        {!supabaseConfigured && <div className="state-msg">{t.notConfigured}</div>}
        {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
        {supabaseConfigured && !loading && !visibleRequests.length && (
          <div className="state-msg">
            {(listTab === 'done' ? doneRequests : openRequests).length ? t.noMatch
              : (listTab === 'done' ? t.noResolvedYet : t.noneYet)}
          </div>
        )}
        {supabaseConfigured && !loading && pageRequests.map((r) => {
          const p = PRIORITY_META[r.priority];
          const matched = matchCount(hf.supplies, r);
          const st = statusOf(r);
          const sm = STATUS_META[st];
          const done = st === 'resolved';
          return (
            <div
              key={r.id}
              id={`req-${r.id}`}
              className={`request-card ${done ? 'request-card--done' : ''} ${r.created_at > (seenUpTo || '') ? 'request-card--new' : ''}`}
              style={{ borderLeft: `5px solid ${done ? 'var(--border)' : p.color}` }}
            >
              <div className="request-card__top">
                <div className="request-card__name">{r.name}</div>
                {/* Priority and status side by side: two badges on one line
                    read as one answer ("urgent, nobody has gone yet") where
                    stacked rows read as two paragraphs. */}
                <div className="badge-row">
                  <span className="badge" style={{ background: p.bg, color: p.color }}>{p.shape} {t[r.priority]}</span>
                  <span className="status-badge" style={{ background: sm.bg, color: sm.color, borderColor: sm.border }}>
                    {t[sm.key]}
                  </span>
                </div>
              </div>
              {st === 'in_progress' && r.helper_name && (
                <div className="status-row__who">{r.helper_name}</div>
              )}
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
              <ClampText text={r.notes} className="request-card__notes" />
              <div className="request-card__foot">
                <span className="request-card__time">
                  {formatDate(r.created_at, lang)} · {timeAgo(r.created_at, lang)}
                </span>
                <div className="request-card__calls">
                  <ShareButton title={r.name} build={() => requestShareText(r, t, lang)} />
                  {r.lat != null && (
                    <button type="button" className="map-btn" onClick={() => showOnMap(r)}>
                      📍 {t.showOnMap}
                    </button>
                  )}
                  <PhoneButtons row={r} label={r.name} />
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
