import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useFooterData } from '../context/FooterDataContext';
import { needLabel } from '../i18n/strings';
import { PRIORITY_META } from '../utils/priority';
import { STATUS_META, STATUS_ORDER, statusOf } from '../utils/status';
import { timeAgo, formatDateTime, toTel } from '../utils/time';
import { phoneList } from '../utils/phone';
import { toCsv, downloadCsv, stampedName } from '../utils/csv';
import { emptyFilters, filterRequests, filterHelpers, isFiltered } from '../utils/listFilter';
import {
  fetchAllRequestsForAdmin, setRequestHidden, deleteRequest, setRequestStatus,
} from '../api/requests';
import {
  fetchAllHelpersForAdmin, setHelperHidden, deleteHelper,
} from '../api/helpers';
import { addHelpline, updateHelpline, deleteHelpline } from '../api/helplines';
import { addNews, updateNews, deleteNews } from '../api/news';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import ReliefMap from '../components/ReliefMap';
import Pager, { pageSlice } from '../components/Pager';
import ShareButton from '../components/ShareButton';
import ListControls from '../components/ListControls';
import Sheet from '../components/Sheet';
import { requestShareText, helperShareText } from '../utils/share';

// Ordered by how often an operator needs them: the queues first, the reference
// data next, the map last. Requests is also the default tab.
const TABS = [
  ['requests', 'Requests'],
  ['helpers', 'Rescuers'],
  ['news', 'News'],
  ['helplines', 'Helplines'],
  ['map', 'Map'],
];

export default function AdminDashboard() {
  const { lang, t } = useLang();
  const { isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const footer = useFooterData();

  const [tab, setTab] = useState('requests');
  const [reqPage, setReqPage] = useState(0);
  const [helpPage, setHelpPage] = useState(0);
  const [reqFilters, setReqFilters] = useState(emptyFilters);
  const [helpFilters, setHelpFilters] = useState(emptyFilters);
  // Which export is waiting on an "all or filtered?" answer: 'requests',
  // 'helpers', or null.
  const [askExport, setAskExport] = useState(null);
  const [requests, setRequests] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [hlLabel, setHlLabel] = useState('');
  const [hlPhone, setHlPhone] = useState('');
  const [newsMsg, setNewsMsg] = useState('');
  // ponytail: one edit slot shared by the helpline and news tabs - only one tab
  // is on screen at a time, so two separate states would never both be in use.
  const [edit, setEdit] = useState(null); // { id, a, b }

  const loadRequests = () => fetchAllRequestsForAdmin().then(setRequests);
  const loadHelpers = () => fetchAllHelpersForAdmin().then(setHelpers);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingList(true);
    Promise.all([loadRequests(), loadHelpers()]).finally(() => setLoadingList(false));
  }, [isAdmin]);

  if (!authLoading && !isAdmin) return <Navigate to="/admin/login" replace />;
  if (authLoading) return <div className="state-msg">Loading…</div>;

  const logout = async () => {
    await signOut();
    navigate('/');
  };

  // A shared GPS pin is the exact spot; anything else is only the scattered
  // district-centre placeholder, and saying so stops a dispatcher trusting it.
  const coordsCell = (r) => {
    if (r.lat == null) return '-';
    const coords = `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`;
    return (
      <>
        <a href={`https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">
          {coords}
        </a>
        {r.has_live_location ? ' · shared GPS pin' : ' · approximate (district centre)'}
      </>
    );
  };

  const needsText = (r) => {
    const parts = r.needs.map((k) => needLabel(k, lang));
    if (r.needs_other) parts.push(r.needs_other);
    return parts.join(', ');
  };

  // Every column an operator would otherwise re-type by hand, including the
  // ones the card view summarises away (exact coordinates, all numbers, notes).
  const exportRequests = (rows) => downloadCsv(stampedName('axomrelief-requests'), toCsv(rows, [
    ['Name', (r) => r.name],
    ['Phones', (r) => phoneList(r)],
    ['District', (r) => r.district],
    ['Address', (r) => r.location],
    ['People', (r) => r.num_people],
    ['Needs', (r) => (r.needs || []).map((k) => needLabel(k, 0))],
    ['Other needs', (r) => r.needs_other],
    ['Priority', (r) => r.priority],
    ['Status', (r) => STATUS_META[statusOf(r)].label],
    ['Boat required', (r) => (r.boat_required ? 'Yes' : 'No')],
    ['Notes', (r) => r.notes],
    ['Latitude', (r) => r.lat],
    ['Longitude', (r) => r.lng],
    ['Pin type', (r) => (r.has_live_location ? 'shared GPS' : 'approximate')],
    ['Rescuer', (r) => r.helper_name],
    ['Submitted', (r) => r.created_at],
    ['Hidden', (r) => (r.hidden ? 'Yes' : 'No')],
  ]));

  const exportHelpers = (rows) => downloadCsv(stampedName('axomrelief-rescuers'), toCsv(rows, [
    ['Name', (h) => h.name],
    ['Phones', (h) => phoneList(h)],
    ['Districts', (h) => h.districts_covered],
    ['Areas', (h) => h.areas_text || h.areas_covered],
    ['Supplies', (h) => h.what_given],
    ['Boat available', (h) => (h.boat_available ? 'Yes' : 'No')],
    ['Notes', (h) => h.notes],
    ['Latitude', (h) => h.lat],
    ['Longitude', (h) => h.lng],
    ['Registered', (h) => h.created_at],
    ['Hidden', (h) => (h.hidden ? 'Yes' : 'No')],
  ]));

  const shownRequests = filterRequests(requests, reqFilters, lang);
  const shownHelpers = filterHelpers(helpers, helpFilters, lang);

  // Everything an export needs to know about one of the two lists.
  const exportSet = (kind) => (kind === 'requests'
    ? { filtered: shownRequests, all: requests, noun: 'requests', run: exportRequests, narrowed: isFiltered(reqFilters) }
    : { filtered: shownHelpers, all: helpers, noun: 'rescuers', run: exportHelpers, narrowed: isFiltered(helpFilters) });

  // Exporting the visible 12 rows when you meant all 128 - or the reverse - is
  // the kind of mistake you only notice after sending the file on, so when a
  // filter is active the button asks instead of guessing.
  const exportBar = (kind) => {
    const { filtered, all, noun, run, narrowed } = exportSet(kind);
    return (
      <div className="admin-export">
        <span>
          {filtered.length}
          {filtered.length !== all.length ? ` of ${all.length}` : ''} {noun}
        </span>
        <button className="admin-btn" onClick={() => (narrowed ? setAskExport(kind) : run(all))}>
          ⤓ Export CSV
        </button>
      </div>
    );
  };

  const exportDialog = () => {
    if (!askExport) return null;
    const { filtered, all, noun, run } = exportSet(askExport);
    const choose = (rows) => { run(rows); setAskExport(null); };
    return (
      <Sheet title="Export CSV" onClose={() => setAskExport(null)} showClose={false}>
        <p className="sheet__body">
          A filter is applied. Export only the {filtered.length} {noun} currently shown,
          or all {all.length}?
        </p>
        <div className="stack gap-9">
          <button className="btn btn-green" onClick={() => choose(filtered)}>
            Export filtered ({filtered.length})
          </button>
          <button className="btn btn-outline-green" onClick={() => choose(all)}>
            Export all ({all.length})
          </button>
        </div>
      </Sheet>
    );
  };

  const addHelplineRow = async () => {
    if (!hlLabel || !hlPhone) return;
    await addHelpline({ label: hlLabel, phone: hlPhone });
    setHlLabel('');
    setHlPhone('');
    footer.refetch();
  };

  const addNewsRow = async () => {
    if (!newsMsg) return;
    await addNews(newsMsg);
    setNewsMsg('');
    footer.refetch();
  };

  return (
    <div className="screen">
      <div className="admin-head">
        <div className="admin-head__title">Admin</div>
        <button className="admin-logout" onClick={logout}>Log out</button>
      </div>

      <div className="admin-tabs">
        {TABS.map(([key, label]) => (
          <button key={key} className={`admin-tab ${tab === key ? 'active' : ''}`} onClick={() => { setTab(key); setEdit(null); }}>
            {label}
          </button>
        ))}
      </div>

      {loadingList && <div className="state-msg">Loading…</div>}

      {!loadingList && tab === 'map' && (
        <div style={{ padding: '0 14px' }}>
          <div className="map-legend" style={{ margin: '0 0 10px' }}>
            <span className="map-legend__item">
              <i className="relief-pin relief-pin--dot" style={{ background: 'var(--green)' }} /> Requesters ({requests.filter((r) => !r.hidden).length})
            </span>
            <span className="map-legend__item">
              <i className="relief-pin relief-pin--dot" style={{ background: 'var(--orange)' }} /> Rescuers ({helpers.filter((h) => !h.hidden).length})
            </span>
          </div>
          <div className="admin-map">
            <ReliefMap
              markers={[
                ...requestsToMarkers(requests.filter((r) => !r.hidden), null),
                ...helpersToMarkers(helpers.filter((h) => !h.hidden)),
              ]}
              interactive
            />
          </div>
        </div>
      )}

      {!loadingList && tab === 'requests' && (
        <div className="admin-panel">
          {exportBar('requests')}
          <ListControls
            filters={reqFilters}
            onChange={(next) => { setReqFilters(next); setReqPage(0); }}
            withStatus
            withWhen
          />
          {!shownRequests.length && <div className="state-msg">No requests match these filters.</div>}
          {pageSlice(shownRequests, reqPage).map((r) => {
            const p = PRIORITY_META[r.priority];
            return (
              <div key={r.id} className={`admin-row ${r.hidden ? 'admin-row--hidden' : ''}`}>
                <div className="admin-row__top">
                  <span className="admin-row__name">{r.name} · {r.location}</span>
                  <span className="admin-row__prio" style={{ color: p.color }}>{p.shape} {r.priority}</span>
                </div>
                <div className="admin-row__meta">
                  {timeAgo(r.created_at, lang)} · {formatDateTime(r.created_at, lang)}
                  {r.hidden ? ' · HIDDEN' : ''}
                </div>
                <dl className="admin-detail">
                  <dt>Phone</dt>
                  <dd>
                    {phoneList(r).map((num, i) => (
                      <span key={num}>{i ? ' · ' : ''}<a href={toTel(num)}>{num}</a></span>
                    ))}
                  </dd>
                  <dt>Address</dt>
                  <dd>{r.location}, {r.district}</dd>
                  <dt>Coordinates</dt>
                  <dd>{coordsCell(r)}</dd>
                  <dt>People</dt>
                  <dd>{r.num_people}</dd>
                  <dt>Needs</dt>
                  <dd>{needsText(r) || '-'}</dd>
                  <dt>Boat</dt>
                  <dd>{r.boat_required ? 'Required' : 'Not required'}</dd>
                  <dt>Status</dt>
                  <dd>{STATUS_META[statusOf(r)].label}</dd>
                  {r.notes && <><dt>Notes</dt><dd>{r.notes}</dd></>}
                  {r.helper_name && (
                    <>
                      <dt>Rescuer</dt>
                      <dd>
                        {r.helper_name}
                        {r.helper_from ? ` · from ${r.helper_from}` : ''}
                        {r.helper_eta_minutes != null ? ` · ETA ${r.helper_eta_minutes} min` : ''}
                      </dd>
                    </>
                  )}
                </dl>
                <div className="admin-row__actions">
                  <ShareButton title={r.name} build={() => requestShareText(r, t, lang)} />
                  {/* Only ever set "Help received" after phoning the family:
                      a rescuer saying they set off is not confirmation that
                      anyone arrived. */}
                  <select
                    className="admin-select"
                    value={statusOf(r)}
                    onChange={async (e) => { await setRequestStatus(r.id, e.target.value); loadRequests(); }}
                  >
                    {STATUS_ORDER.map((key) => (
                      <option key={key} value={key}>{STATUS_META[key].label}</option>
                    ))}
                  </select>
                  <button
                    className="admin-btn"
                    onClick={async () => { await setRequestHidden(r.id, !r.hidden); loadRequests(); }}
                  >
                    {r.hidden ? 'Unhide' : 'Hide'}
                  </button>
                  <button
                    className="admin-btn admin-btn--danger"
                    onClick={async () => { await deleteRequest(r.id); loadRequests(); }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          <Pager total={shownRequests.length} page={reqPage} onPage={setReqPage} />
        </div>
      )}

      {!loadingList && tab === 'helpers' && (
        <div className="admin-panel">
          {exportBar('helpers')}
          <ListControls
            filters={helpFilters}
            onChange={(next) => { setHelpFilters(next); setHelpPage(0); }}
          />
          {!shownHelpers.length && <div className="state-msg">No rescuers match these filters.</div>}
          {pageSlice(shownHelpers, helpPage).map((h) => (
            <div key={h.id} className={`admin-row ${h.hidden ? 'admin-row--hidden' : ''}`}>
              <div className="admin-row__name">{h.name}</div>
              <div className="admin-row__meta">
                {timeAgo(h.created_at, lang)}{h.hidden ? ' · HIDDEN' : ''}
              </div>
              <dl className="admin-detail">
                <dt>Phone</dt>
                <dd>
                  {phoneList(h).map((num, i) => (
                    <span key={num}>{i ? ' · ' : ''}<a href={toTel(num)}>{num}</a></span>
                  ))}
                </dd>
                <dt>Districts</dt>
                <dd>{h.districts_covered?.length ? h.districts_covered.join(', ') : '-'}</dd>
                <dt>Areas</dt>
                <dd>{h.areas_text || '-'}</dd>
                <dt>Supplies</dt>
                <dd>{h.what_given || '-'}</dd>
                <dt>Boat</dt>
                <dd>{h.boat_available ? 'Available' : 'No'}</dd>
                {h.notes && <><dt>Notes</dt><dd>{h.notes}</dd></>}
              </dl>
              <div className="admin-row__actions">
                <ShareButton title={h.name} build={() => helperShareText(h, t, lang)} />
                <button
                  className="admin-btn"
                  onClick={async () => { await setHelperHidden(h.id, !h.hidden); loadHelpers(); }}
                >
                  {h.hidden ? 'Unhide' : 'Hide'}
                </button>
                <button
                  className="admin-btn admin-btn--danger"
                  onClick={async () => { await deleteHelper(h.id); loadHelpers(); }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          <Pager total={shownHelpers.length} page={helpPage} onPage={setHelpPage} />
        </div>
      )}

      {!loadingList && tab === 'helplines' && (
        <div style={{ padding: '0 14px' }}>
          {footer.helplines.map((h) => (
            <div key={h.id} className="admin-list-row">
              {edit?.id === h.id ? (
                <>
                  <input value={edit.a} onChange={(e) => setEdit({ ...edit, a: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                  <input value={edit.b} onChange={(e) => setEdit({ ...edit, b: e.target.value })} style={{ width: 100 }} />
                  <button
                    className="admin-btn"
                    onClick={async () => {
                      if (!edit.a || !edit.b) return;
                      await updateHelpline(h.id, { label: edit.a, phone: edit.b });
                      setEdit(null);
                      footer.refetch();
                    }}
                  >
                    Save
                  </button>
                  <button className="admin-btn" onClick={() => setEdit(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ font: '13.5px system-ui', color: 'var(--text)', flex: 1, minWidth: 0 }}>{h.label} · <b>{h.phone_number}</b></span>
                  <button className="admin-btn" onClick={() => setEdit({ id: h.id, a: h.label, b: h.phone_number })}>Edit</button>
                  <button
                    className="admin-btn admin-btn--danger"
                    onClick={async () => { await deleteHelpline(h.id); footer.refetch(); }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="admin-inline-form">
            <input value={hlLabel} onChange={(e) => setHlLabel(e.target.value)} placeholder="Label" style={{ flex: 1, minWidth: 0 }} />
            <input value={hlPhone} onChange={(e) => setHlPhone(e.target.value)} placeholder="Number" style={{ width: 100 }} />
            <button className="admin-inline-form__add" onClick={addHelplineRow}>Add</button>
          </div>
        </div>
      )}

      {exportDialog()}

      {!loadingList && tab === 'news' && (
        <div style={{ padding: '0 14px' }}>
          <div className="admin-inline-form admin-inline-form--news">
            <input value={newsMsg} onChange={(e) => setNewsMsg(e.target.value)} placeholder="New update message…" style={{ flex: 1, minWidth: 0 }} />
            <button className="admin-inline-form__add" onClick={addNewsRow}>Post</button>
          </div>
          {footer.news.map((n) => (
            <div key={n.id} className="admin-list-row admin-list-row--news">
              {edit?.id === n.id ? (
                <>
                  <input value={edit.a} onChange={(e) => setEdit({ ...edit, a: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                  <button
                    className="admin-btn"
                    style={{ flex: 'none' }}
                    onClick={async () => {
                      if (!edit.a) return;
                      await updateNews(n.id, edit.a);
                      setEdit(null);
                      footer.refetch();
                    }}
                  >
                    Save
                  </button>
                  <button className="admin-btn" style={{ flex: 'none' }} onClick={() => setEdit(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ font: '13px/1.5 system-ui', color: 'var(--text)', flex: 1, minWidth: 0 }}>
                    {n.message} <span style={{ font: '11px system-ui', color: 'var(--text-tertiary)' }}>· {formatDateTime(n.created_at, lang)}</span>
                  </span>
                  <button className="admin-btn" style={{ flex: 'none' }} onClick={() => setEdit({ id: n.id, a: n.message })}>Edit</button>
                  <button
                    className="admin-btn admin-btn--danger"
                    style={{ flex: 'none' }}
                    onClick={async () => { await deleteNews(n.id); footer.refetch(); }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
