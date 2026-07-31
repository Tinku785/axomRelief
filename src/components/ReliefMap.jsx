import { useEffect, useRef, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, AttributionControl,
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
// CSS variables, not literals: these end up inside injected HTML and inline
// styles, both of which resolve var() normally, so the palette stays in one file.
const HELPER_COLOR = 'var(--orange)';
const REQUEST_COLOR = 'var(--green)';

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
function FitToMarkers({ markers, focus }) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(',');

  // Leaflet measures its container once at mount and never notices later size
  // changes, so the full-screen modal (which mounts, then expands) draws tiles
  // for the old box. Watching the container covers that and phone rotation.
  const fit = () => {
    // Once a row is selected the user asked for that one pin; re-fitting to all
    // of them would yank the map straight back out.
    if (focus || !markers.length) return;
    map.fitBounds(markers.map((m) => [m.position.lat, m.position.lng]), {
      padding: [24, 24],
      maxZoom: MAX_FIT_ZOOM, // one marker alone would fit to a random alley
    });
  };

  useEffect(() => {
    const ro = new ResizeObserver(() => { map.invalidateSize(); fit(); });
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, key, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(fit, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// "Which area is this person in?" is unanswerable from a map framed on every
// pin at once, so picking a row flies the map to that one pin.
const FOCUS_ZOOM = 14;

function FocusOnPoint({ focus, markerRefs }) {
  const map = useMap();
  useEffect(() => {
    if (!focus) return;
    // setView, not flyTo. The animated version needed a 'moveend' to know when
    // to open the popup, and that event never arrived: React runs this effect
    // twice, and the second flyTo aborts the first flight and eats the event.
    // Jumping straight there needs no completion callback at all.
    map.setView([focus.lat, focus.lng], FOCUS_ZOOM);
    // Same popup a tap on the pin gives — the point of "show on map" is to see
    // who this is, not just where.
    markerRefs.current[focus.id]?.openPopup();
    // Deliberately keyed on object identity, not lat/lng: the caller stores
    // focus in state and sets a fresh object per click, so tapping the same
    // row again re-centres a map the user has since panned away.
  }, [map, focus]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// The legend badge and the expand button sit on top of the map, and a popup
// pushed up by keepInView lands underneath them — the name and address end up
// behind the legend. They are decoration; the popup is the answer to a
// question someone just asked, so the overlays get out of the way.
function PopupWatcher({ onChange }) {
  useMapEvents({
    popupopen: () => onChange(true),
    popupclose: () => onChange(false),
  });
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
      {marker.phones?.map((p) => (
        <a key={p} className="map-info__call" href={toTel(p)}>
          {t.callNow} {p}
        </a>
      ))}
      {marker.kind !== 'helper' && (
        <>
          {/* Copying coordinates assumes the rescuer then pastes them somewhere.
              This is the one tap that just starts the navigation. */}
          <a
            className="map-info__maps"
            href={`https://www.google.com/maps/search/?api=1&query=${marker.position.lat},${marker.position.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            ➤ {t.openInMaps}
          </a>
          <div className="map-info__coords">
            <code>{coords}</code>
            <button type="button" onClick={copyCoords}>{copied ? t.copied : t.copy}</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ReliefMap({
  markers = [], interactive = true, onExpand, focus = null, children,
}) {
  const { t } = useLang();
  const markerRefs = useRef({});
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <div className={`relief-map ${interactive ? '' : 'relief-map--preview'}`}>
      <MapContainer
        className="relief-map__canvas"
        center={[REGION_CENTER.lat, REGION_CENTER.lng]}
        zoom={REGION_ZOOM}
        zoomControl={interactive}
        // The preview pans and zooms like any other map; only the wheel is off,
        // so scrolling past it down the page does not get swallowed.
        scrollWheelZoom={interactive}
        attributionControl={false}
      >
        {/* Attribution is a licence condition of the OSM tiles, not decoration:
            it cannot be removed. prefix={false} drops the Leaflet flag so only
            the one required credit is left. */}
        <AttributionControl position="bottomright" prefix={false} />
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
        <PopupWatcher onChange={setPopupOpen} />
        <FitToMarkers markers={markers} focus={focus} />
        <FocusOnPoint focus={focus} markerRefs={markerRefs} />

        {markers.map((m) => (
          <Marker
            key={m.id}
            ref={(inst) => { markerRefs.current[m.id] = inst; }}
            position={[m.position.lat, m.position.lng]}
            title={m.title}
            icon={pinIcon(m.kind === 'helper' ? HELPER_COLOR : (m.color || REQUEST_COLOR))}
          >
            {/* The preview map is only ~240px tall, so a popup opened near the
                top edge lands outside it and gets cut off by the rounded-corner
                overflow — which is what made "See on Google Maps" unclickable.
                keepInView pans the map to hold the whole popup inside. */}
            <Popup autoPan keepInView autoPanPadding={[12, 12]} maxWidth={260}>
              <MarkerPopup marker={m} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {!popupOpen && children}

      {!interactive && !popupOpen && (
        <button type="button" className="relief-map__expand" onClick={onExpand}>
          ⤢ {t.tapMap}
        </button>
      )}
    </div>
  );
}
