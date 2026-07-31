// .js extension so `node src/utils/selfcheck.js` resolves this too.
import { phoneList } from './phone.js';

// Real coordinates for the three districts the helpline covers.
export const DISTRICT_CENTERS = {
  Sivasagar: { lat: 26.9855, lng: 94.6376 },
  Charaideo: { lat: 27.0333, lng: 95.0167 },
  Jorhat: { lat: 26.7509, lng: 94.2037 },
};

// Centre + zoom that frames all three districts at once.
export const REGION_CENTER = { lat: 26.92, lng: 94.62 };
export const REGION_ZOOM = 9;

// ~0.045 deg either side is roughly 5 km — enough to keep pins from stacking,
// small enough that a pin stays inside its own district.
const SPREAD = 0.09;

export function jitterAroundDistrict(district) {
  const c = DISTRICT_CENTERS[district] || DISTRICT_CENTERS.Sivasagar;
  return {
    lat: c.lat + (Math.random() - 0.5) * SPREAD,
    lng: c.lng + (Math.random() - 0.5) * SPREAD,
  };
}

function hasCoords(row) {
  return typeof row.lat === 'number' && typeof row.lng === 'number';
}

// Resolved requests stay in the list (greyed) but leave the map: a pin means
// "someone here still needs reaching", and a map full of finished jobs is what
// makes rescuers stop trusting it.
export function requestsToMarkers(requests, priorityMeta) {
  return requests.filter((r) => hasCoords(r) && r.status !== 'resolved').map((r) => ({
    id: r.id,
    position: { lat: r.lat, lng: r.lng },
    title: r.name,
    subtitle: `${r.location} · ${r.district} · ${r.num_people} people`,
    phones: phoneList(r),
    color: priorityMeta?.[r.priority]?.color,
    kind: 'request',
  }));
}

export function helpersToMarkers(helpers) {
  return helpers.filter(hasCoords).map((h) => ({
    id: h.id,
    position: { lat: h.lat, lng: h.lng },
    title: h.name,
    subtitle: (h.districts_covered?.length ? h.districts_covered.join(', ') : h.areas_text) || '',
    phones: phoneList(h),
    kind: 'helper',
  }));
}
