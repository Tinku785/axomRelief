import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useFooterData } from '../context/FooterDataContext';
import { needLabel } from '../i18n/strings';
import { PRIORITY_META } from '../utils/priority';
import { timeAgo, formatDateTime } from '../utils/time';
import {
  fetchAllRequestsForAdmin, setRequestHidden, deleteRequest,
} from '../api/requests';
import {
  fetchAllHelpersForAdmin, setHelperHidden, deleteHelper,
} from '../api/helpers';
import { addHelpline, updateHelpline, deleteHelpline } from '../api/helplines';
import { addNews, updateNews, deleteNews } from '../api/news';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import ReliefMap from '../components/ReliefMap';

const TABS = [
  ['map', 'Map'],
  ['requests', 'Requests'],
  ['helpers', 'Rescuers'],
  ['helplines', 'Helplines'],
  ['news', 'News'],
];

export default function AdminDashboard() {
  const { lang } = useLang();
  const { isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const footer = useFooterData();

  const [tab, setTab] = useState('map');
  const [requests, setRequests] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [hlLabel, setHlLabel] = useState('');
  const [hlPhone, setHlPhone] = useState('');
  const [newsMsg, setNewsMsg] = useState('');
  // ponytail: one edit slot shared by the helpline and news tabs — only one tab
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

  const needsText = (r) => {
    const parts = r.needs.map((k) => needLabel(k, lang));
    if (r.needs_other) parts.push(r.needs_other);
    return parts.join(', ');
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
              <i className="relief-pin relief-pin--dot" style={{ background: '#2E7D4A' }} /> Requesters ({requests.filter((r) => !r.hidden).length})
            </span>
            <span className="map-legend__item">
              <i className="relief-pin relief-pin--dot" style={{ background: '#C0632A' }} /> Rescuers ({helpers.filter((h) => !h.hidden).length})
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
          {requests.map((r) => {
            const p = PRIORITY_META[r.priority];
            return (
              <div key={r.id} className={`admin-row ${r.hidden ? 'admin-row--hidden' : ''}`}>
                <div className="admin-row__top">
                  <span className="admin-row__name">{r.name} · {r.location}</span>
                  <span className="admin-row__prio" style={{ color: p.color }}>{p.shape} {r.priority}</span>
                </div>
                <div className="admin-row__meta">
                  {r.district} · {r.num_people} people · {needsText(r)} · {timeAgo(r.created_at, lang)}
                  {r.hidden ? ' · HIDDEN' : ''}
                </div>
                <div className="admin-row__actions">
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
        </div>
      )}

      {!loadingList && tab === 'helpers' && (
        <div className="admin-panel">
          {helpers.map((h) => (
            <div key={h.id} className={`admin-row ${h.hidden ? 'admin-row--hidden' : ''}`}>
              <div className="admin-row__name">{h.name} <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-secondary)' }}>· {h.contact_number}</span></div>
              <div className="admin-row__meta">
                {(h.districts_covered?.length ? h.districts_covered.join(', ') : '—')}
                {h.areas_text ? ` · ${h.areas_text}` : ''}
                {h.what_given ? ` · ${h.what_given}` : ''}
                {h.hidden ? ' · HIDDEN' : ''}
              </div>
              <div className="admin-row__actions">
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
