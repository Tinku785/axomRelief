import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useReliefData } from '../hooks/useReliefData';
import { requestsToMarkers, helpersToMarkers } from '../utils/mapGeo';
import { supabaseConfigured } from '../supabaseClient';
import ReliefMap from '../components/ReliefMap';
import MapModal from '../components/MapModal';
import iconWantHelp from '../assets/icon-want-help.png';
import iconAmHelping from '../assets/icon-am-helping.png';

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { requests, helpers, loading } = useReliefData();
  const [mapOpen, setMapOpen] = useState(false);

  // Home shows the whole operating area, so requesters are plain green rather
  // than priority-coloured — priority shading belongs on the rescuer page.
  const markers = [...requestsToMarkers(requests, null), ...helpersToMarkers(helpers)];

  return (
    <div className="screen">
      <div className="placard-grid">
        <button className="placard placard-green" onClick={() => navigate('/request')}>
          <img className="placard__icon" src={iconWantHelp} alt="" width="64" height="64" />
          <span className="placard__title-green">{t.wantHelp}</span>
        </button>
        <button className="placard placard-orange" onClick={() => navigate('/helping')}>
          <img className="placard__icon" src={iconAmHelping} alt="" width="64" height="64" />
          <span className="placard__title-orange">{t.amHelping}</span>
        </button>
      </div>

      <div style={{ padding: '22px 14px 0' }}>
        <div className="section-title" style={{ marginBottom: 10 }}>{t.mapTitle}</div>
        <div className="map-legend" style={{ marginBottom: 10 }}>
          <span className="map-legend__item">
            <i className="relief-pin relief-pin--dot" style={{ background: 'var(--green)' }} />
            {t.legendRequesters} ({requests.length})
          </span>
          <span className="map-legend__item">
            <i className="relief-pin relief-pin--dot" style={{ background: 'var(--orange)' }} />
            {t.legendRescuers} ({helpers.length})
          </span>
        </div>
        {!supabaseConfigured && <div className="state-msg">{t.notConfigured}</div>}
        {supabaseConfigured && loading && <div className="state-msg">{t.loading}</div>}
        {supabaseConfigured && !loading && (
          <ReliefMap markers={markers} interactive={false} onExpand={() => setMapOpen(true)} />
        )}
      </div>

      {mapOpen && <MapModal markers={markers} onClose={() => setMapOpen(false)} />}
    </div>
  );
}
