import { useEffect, useState } from 'react';
import {
  APIProvider, Map, AdvancedMarker, InfoWindow, useMap,
} from '@vis.gl/react-google-maps';
import { useLang } from '../context/LangContext';
import { REGION_CENTER, REGION_ZOOM } from '../utils/mapGeo';
import { toTel } from '../utils/time';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// Google requires a Map ID for AdvancedMarker; DEMO_MAP_ID is their public
// one and works without extra cloud config.
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

const MAX_FIT_ZOOM = 13;
const HELPER_COLOR = '#C0632A';
const REQUEST_COLOR = '#2E7D4A';

function Pin({ color }) {
  return <span className="relief-pin" style={{ background: color }} />;
}

// A fixed region zoom either shows the whole of upper Assam (pins as specks) or
// crops most pins out. Framing the actual pins is the only zoom that is right
// for both a two-pin day and a fifty-pin day.
function FitToMarkers({ markers }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(',');

  useEffect(() => {
    if (!map || !markers.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend(m.position));
    map.fitBounds(bounds, 24);
    // One marker fits to street level, which reads as a random alley. Cap it.
    const cap = window.google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
    return () => window.google.maps.event.removeListener(cap);
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MapBody({ markers, interactive }) {
  const { t } = useLang();
  const [openId, setOpenId] = useState(null);
  const [copied, setCopied] = useState(false);
  const open = markers.find((m) => m.id === openId);
  // "26.985512, 94.637601" — what Google Maps' search box accepts verbatim.
  const coords = open && `${open.position.lat.toFixed(6)}, ${open.position.lng.toFixed(6)}`;

  const copyCoords = async () => {
    try {
      await navigator.clipboard.writeText(coords);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ponytail: no fallback. If the clipboard API is blocked the text is
      // still on screen and selectable, which is the same outcome by hand.
    }
  };

  return (
    <Map
      mapId={MAP_ID}
      defaultCenter={REGION_CENTER}
      defaultZoom={REGION_ZOOM}
      gestureHandling={interactive ? 'greedy' : 'none'}
      disableDefaultUI={!interactive}
      zoomControl={interactive}
      fullscreenControl={false}
      streetViewControl={false}
      mapTypeControl={false}
      className="relief-map__canvas"
    >
      <FitToMarkers markers={markers} />

      {markers.map((m) => (
        <AdvancedMarker
          key={m.id}
          position={m.position}
          title={m.title}
          onClick={() => { setOpenId(m.id); setCopied(false); }}
        >
          <Pin color={m.kind === 'helper' ? HELPER_COLOR : (m.color || REQUEST_COLOR)} />
        </AdvancedMarker>
      ))}

      {open && (
        <InfoWindow position={open.position} onCloseClick={() => setOpenId(null)}>
          <div className="map-info">
            <span
              className="map-info__role"
              style={{ color: open.kind === 'helper' ? HELPER_COLOR : REQUEST_COLOR }}
            >
              {open.kind === 'helper' ? t.roleHelping : t.roleNeedsHelp}
            </span>
            <div className="map-info__title">{open.title}</div>
            {open.subtitle && <div className="map-info__sub">{open.subtitle}</div>}
            {open.phone && (
              <a className="map-info__call" href={toTel(open.phone)}>
                {t.callNow} {open.phone}
              </a>
            )}
            {open.kind !== 'helper' && (
              <div className="map-info__coords">
                <code>{coords}</code>
                <button type="button" onClick={copyCoords}>{copied ? t.copied : t.copy}</button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

export default function ReliefMap({ markers = [], interactive = true, onExpand }) {
  const { t } = useLang();

  if (!API_KEY) {
    return (
      <div className="relief-map relief-map--placeholder">
        Map unavailable — set VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }

  return (
    <div className={`relief-map ${interactive ? '' : 'relief-map--preview'}`}>
      <APIProvider apiKey={API_KEY}>
        <MapBody markers={markers} interactive={interactive} />
      </APIProvider>
      {!interactive && (
        <button type="button" className="relief-map__expand" onClick={onExpand}>
          ⤢ {t.tapMap}
        </button>
      )}
    </div>
  );
}
