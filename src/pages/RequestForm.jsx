import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { DISTRICTS, NEEDS } from '../i18n/strings';
import { PRIORITY_META, PRIORITY_ORDER } from '../utils/priority';
import { emptyFilters, filterHelpers } from '../utils/listFilter';
import { contactsError } from '../utils/phone';
import { isRateLimited } from '../utils/rateLimit';
import { useReliefData } from '../hooks/useReliefData';
import { submitRequest } from '../api/requests';
import { supabaseConfigured } from '../supabaseClient';
import TurnstileWidget from '../components/TurnstileWidget';
import HelperCard from '../components/HelperCard';
import TermsCheckbox from '../components/TermsCheckbox';
import Req from '../components/Req';
import ListControls from '../components/ListControls';
import PhoneFields from '../components/PhoneFields';
import Pager, { pageSlice } from '../components/Pager';

const emptyForm = {
  name: '', contacts: [''], location: '', district: DISTRICTS[0],
  numPeople: '', needs: [], other: '', notes: '', priority: '', boat: null,
  hasLiveLocation: false, lat: null, lng: null, accuracy: null,
};

export default function RequestForm() {
  const { lang, t } = useLang();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const { helpers, loading } = useReliefData();

  const [form, setForm] = useState(emptyForm);
  const [helperPage, setHelperPage] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [helperFilters, setHelperFilters] = useState(emptyFilters);
  const [company, setCompany] = useState(''); // honeypot
  const [turnstileToken, setTurnstileToken] = useState('');
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Below the state it reads, not above it: `const` is in the temporal dead
  // zone until its declaration runs, so hoisting this crashed the whole page.
  const districtHelpers = filterHelpers(helpers, helperFilters, lang);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // "They are helping" on the home screen lands here, at the rescuer list -
  // which only exists once the data has loaded.
  useEffect(() => {
    if (!hash || loading) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, loading]);

  const toggleNeed = (key) => {
    setForm((f) => ({
      ...f,
      needs: f.needs.includes(key) ? f.needs.filter((n) => n !== key) : [...f.needs, key],
    }));
  };

  const shareLoc = () => {
    if (!navigator.geolocation) {
      setGeoError(lang ? 'এই ব্ৰাউজাৰে অৱস্থান সমৰ্থন নকৰে।' : 'This browser does not support location.');
      return;
    }
    if (!window.isSecureContext) {
      setGeoError(lang
        ? 'অৱস্থানৰ বাবে সুৰক্ষিত (https) সংযোগ লাগে।'
        : 'Location needs a secure (https) connection. Type your address above instead.');
      return;
    }
    setGeoBusy(true);
    setGeoError('');

    const onOk = (pos) => {
      setForm((f) => ({
        ...f,
        hasLiveLocation: true,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }));
      setGeoBusy(false);
    };

    const onFail = (err) => {
      setGeoBusy(false);
      if (err.code === err.PERMISSION_DENIED) {
        setGeoError(lang
          ? 'অৱস্থানৰ অনুমতি নাই - ব্ৰাউজাৰত অনুমতি দিয়ক, বা ওপৰত ঠিকনা লিখক।'
          : 'Location permission denied. Allow it in your browser settings, or just type your address above.');
      } else {
        setGeoError(lang
          ? 'অৱস্থান পোৱা নগ’ল। খোলা ঠাইলৈ গৈ পুনৰ চেষ্টা কৰক, বা ওপৰত ঠিকনা লিখক।'
          : 'Could not get a location fix. Move near a window or outdoors and try again, or just type your address above.');
      }
    };

    // GPS indoors often never returns, which is what made this fail outright.
    // Try a precise fix first, then fall back to the coarse network position -
    // a 1km-accurate pin still tells a rescuer which village to head for.
    navigator.geolocation.getCurrentPosition(
      onOk,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) return onFail(err);
        navigator.geolocation.getCurrentPosition(onOk, onFail, {
          timeout: 15000,
          enableHighAccuracy: false,
          maximumAge: 120000,
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (company) return; // honeypot tripped - silently drop

    if (!form.name || !form.location || !form.contacts[0] || !form.priority || !form.needs.length) {
      setFormError(lang ? 'নাম, ঠিকনা, সামগ্ৰী, ফোন নম্বৰ আৰু অগ্ৰাধিকাৰ দিয়ক।' : 'Please fill name, address, supplies, phone number and priority.');
      return;
    }
    const phoneErr = contactsError(form.contacts, lang);
    if (phoneErr) {
      setFormError(phoneErr);
      return;
    }
    if (!agreed) {
      setFormError(t.termsRequired);
      return;
    }
    if (!turnstileToken) {
      setFormError(lang ? 'অনুগ্ৰহ কৰি মানুহ পৰীক্ষা সম্পূৰ্ণ কৰক।' : 'Please complete the human verification.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await submitRequest(form);
      navigate('/request/done');
    } catch (err) {
      setFormError(isRateLimited(err) ? t.rateLimited
        : (lang ? 'পঠিয়াব পৰা নগ’ল। পুনৰ চেষ্টা কৰক।' : 'Could not submit. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="screen">
      <button className="btn-back" onClick={() => navigate('/')}>‹ {t.back}</button>
      <div style={{ padding: '6px 14px 14px' }}>
        <div className="page-title">{t.wantHelp}</div>
      </div>

      <form style={{ padding: '0 14px' }} onSubmit={onSubmit}>
        <label className="field">
          <div className="field__label">{t.yourName}<Req /></div>
          <input className="input" value={form.name} onChange={set('name')} placeholder={t.phName} required />
        </label>
        {/* Extra numbers are what gets someone reached when the first phone is
            dead or out of signal. Not inside a <label>: a button in a label
            re-focuses the input on every click. */}
        <PhoneFields
          numbers={form.contacts}
          onChange={(contacts) => setForm((f) => ({ ...f, contacts }))}
          labelFirst
        />
        <label className="field">
          <div className="field__label">{t.address}<Req /></div>
          <textarea className="input" rows={2} value={form.location} onChange={set('location')} placeholder={t.phLoc} required />
        </label>
        <label className="field">
          <div className="field__label">{t.district}</div>
          <select
            className="input"
            value={form.district}
            onChange={set('district')}
          >
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        <div className="field">
          <div className="field__label">{t.locationPin}</div>
          <button
            type="button"
            className="btn"
            style={{
              border: `1.5px dashed ${form.hasLiveLocation ? 'var(--green)' : 'var(--orange)'}`,
              background: '#fff',
              color: form.hasLiveLocation ? 'var(--green)' : 'var(--orange)',
              font: '600 14px system-ui',
            }}
            onClick={shareLoc}
            disabled={geoBusy}
          >
            {geoBusy
              ? (lang ? 'অৱস্থান বিচাৰি আছে…' : 'Finding your location…')
              : form.hasLiveLocation
                ? (lang ? '↻ অৱস্থান আপডেট কৰক' : '↻ Update my location pin')
                : (lang ? 'মোৰ অৱস্থান দিয়ক' : 'Drop my live location pin')}
          </button>
          {form.hasLiveLocation && (
            <div className="pin-readout">
              ✓ {lang ? 'পিন সংলগ্ন' : 'Pin attached'}: {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
              {form.accuracy != null && ` (±${Math.round(form.accuracy)}m)`}
            </div>
          )}
          {geoError && <div className="form-error">{geoError}</div>}
        </div>

        <label className="field">
          <div className="field__label">{t.numPeople}</div>
          <input className="input" type="number" min="1" value={form.numPeople} onChange={set('numPeople')} placeholder="4" />
        </label>

        <div className="field">
          <div className="field__label" style={{ marginBottom: 7 }}>{t.supplies}<Req /></div>
          <div className="chip-row">
            {NEEDS.map((n) => {
              const on = form.needs.includes(n.key);
              return (
                <button
                  type="button"
                  key={n.key}
                  className={`chip ${on ? 'active' : ''}`}
                  onClick={() => toggleNeed(n.key)}
                >
                  {on ? '✓ ' : ''}{n.label[lang] ?? n.label[0]}
                </button>
              );
            })}
          </div>
          {form.needs.includes('other') && (
            <input
              className="input"
              style={{ marginTop: 9 }}
              value={form.other}
              onChange={set('other')}
              placeholder={t.phOther}
            />
          )}
        </div>

        <div className="field">
          <div className="field__label" style={{ marginBottom: 7 }}>{t.priority}<Req /></div>
          {PRIORITY_ORDER.map((key) => {
            const p = PRIORITY_META[key];
            const on = form.priority === key;
            return (
              <label
                key={key}
                className="prio-option"
                style={{ borderColor: on ? p.color : 'var(--border)', background: on ? p.bg : '#fff' }}
              >
                <input
                  type="radio"
                  name="prio"
                  checked={on}
                  onChange={() => setForm((f) => ({ ...f, priority: key }))}
                  style={{ accentColor: p.color }}
                />
                <span>
                  <span className="prio-option__label" style={{ color: p.color }}>{p.shape} {t[key]}</span>
                  <br />
                  <span className="prio-option__desc">{p.desc[lang] ?? p.desc[0]}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="field">
          <div className="field__label" style={{ marginBottom: 7 }}>{t.boatNeeded}</div>
          <div className="toggle-row">
            <button
              type="button"
              className={`toggle-btn ${form.boat === true ? 'on-green' : ''}`}
              onClick={() => setForm((f) => ({ ...f, boat: true }))}
            >
              {t.yes}
            </button>
            <button
              type="button"
              className={`toggle-btn ${form.boat === false ? 'on-neutral' : ''}`}
              onClick={() => setForm((f) => ({ ...f, boat: false }))}
            >
              {t.no}
            </button>
          </div>
        </div>

        <label className="field">
          <div className="field__label">{t.otherDetails}</div>
          <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder={t.phNotes} />
        </label>

        <label className="honeypot-field" aria-hidden="true">
          Company
          <input tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
        </label>

        <TermsCheckbox checked={agreed} onChange={setAgreed} />

        <TurnstileWidget onToken={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

        {formError && <div className="form-error">{formError}</div>}

        <button className="btn btn-primary" type="submit" disabled={submitting || !supabaseConfigured}>
          {submitting ? t.submitting : t.submitRequest}
        </button>
      </form>

      <div
        id="rescuers"
        style={{ margin: '28px 14px 0', borderTop: '1.5px solid var(--border-light)', paddingTop: 18, scrollMarginTop: 76 }}
      >
        <div className="section-heading">
          <div className="section-title">
            <span className="section-count">{districtHelpers.length}</span> {t.activeRescuers}
          </div>
        </div>
        <ListControls
          filters={helperFilters}
          onChange={(next) => { setHelperFilters(next); setHelperPage(0); }}
        />
        <div className="stack gap-9" style={{ marginTop: 11 }}>
          {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
          {!loading && !districtHelpers.length && <div className="state-msg">{t.noHelpersHere}</div>}
          {pageSlice(districtHelpers, helperPage).map((h) => (
            <HelperCard key={h.id} helper={h} variant="compact" />
          ))}
          <Pager total={districtHelpers.length} page={helperPage} onPage={setHelperPage} />
        </div>
      </div>
    </div>
  );
}
