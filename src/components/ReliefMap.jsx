import { useEffect, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLang } from '../context/LangContext';
import { REGION_CENTER, REGION_ZOOM } from '../utils/mapGeo';
import { toTel } from '../utils/time';

// OpenStreetMap: no API key, no billing account, no daily quota to run out of
// mid-flood. The tile usage policy asks for attribution, which TileLayer adds.
const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const MAX_FIT_ZOOM = 13;
const HELPER_COLOR = '#C0632A';
const REQUEST_COLOR = '#2E7D4A';

// Leaflet's default marker is a PNG sprite loaded from a CDN path that breaks
// under a bundler. A plain coloured dot is smaller and matches the legend.
function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<span class="relief-pin" style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -8],
  });
}

// A fixed region zoom either shows the whole of upper Assam (pins as specks) or
// crops most pins out. Framing the actual pins is the only zoom that is right
// for both a two-pin day and a fifty-pin day.
function FitToMarkers({ markers }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(',');

  // Leaflet measures its container once at mount and never notices later size
  // changes, so the full-screen modal (which mounts, then expands) draws tiles
  // for the old box. Watching the container covers that and phone rotation.
  useEffect(() => {
    const box = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(box);
    return () => ro.disconnect();
  }, [map]);

  useEffect(() => {
    if (!markers.length) return;
    map.fitBounds(markers.map((m) => [m.position.lat, m.position.lng]), {
      padding: [24, 24],
      maxZoom: MAX_FIT_ZOOM, // one marker alone would fit to a random alley
    });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function MarkerPopup({ marker }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  // "26.971032, 94.676497" — what Google Maps' search box accepts verbatim.
  const coords = `${marker.position.lat.toFixed(6)}, ${marker.position.lng.toFixed(6)}`;

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
    <div className="map-info">
      <span
        className="map-info__role"
        style={{ color: marker.kind === 'helper' ? HELPER_COLOR : REQUEST_COLOR }}
      >
        {marker.kind === 'helper' ? t.roleHelping : t.roleNeedsHelp}
      </span>
      <div className="map-info__title">{marker.title}</div>
      {marker.subtitle && <div className="map-info__sub">{marker.subtitle}</div>}
      {marker.phone && (
        <a className="map-info__call" href={toTel(marker.phone)}>
          {t.callNow} {marker.phone}
        </a>
      )}
      {marker.kind !== 'helper' && (
        <div className="map-info__coords">
          <code>{coords}</code>
          <button type="button" onClick={copyCoords}>{copied ? t.copied : t.copy}</button>
        </div>
      )}
    </div>
  );
}

export default function ReliefMap({ markers = [], interactive = true, onExpand }) {
  const { t } = useLang();

  return (
    <div className={`relief-map ${interactive ? '' : 'relief-map--preview'}`}>
      <MapContainer
        className="relief-map__canvas"
        center={[REGION_CENTER.lat, REGION_CENTER.lng]}
        zoom={REGION_ZOOM}
        zoomControl={interactive}
        dragging={interactive}
        scrollWheelZoom={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        keyboard={interactive}
        attributionControl
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <FitToMarkers markers={markers} />

        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.position.lat, m.position.lng]}
            title={m.title}
            icon={pinIcon(m.kind === 'helper' ? HELPER_COLOR : (m.color || REQUEST_COLOR))}
          >
            <Popup>
              <MarkerPopup marker={m} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!interactive && (
        <button type="button" className="relief-map__expand" onClick={onExpand}>
          ⤢ {t.tapMap}
        </button>
      )}
    </div>
  );
}
