import { needLabel } from '../i18n/strings.js';
import { phoneList } from './phone.js';
import { formatDate } from './time.js';

// Plain text, not a link: this gets forwarded into WhatsApp groups where the
// person reading it may never open the site. Everything needed to act - who,
// where, what, which number to ring - has to survive the paste on its own.

function mapsLink(row) {
  if (row.lat == null || row.lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${row.lat},${row.lng}`;
}

function joinLines(lines) {
  return lines.filter(Boolean).join('\n');
}

export function requestShareText(r, t, lang) {
  const needs = [...(r.needs || []).map((k) => needLabel(k, lang)), r.needs_other].filter(Boolean);
  const phones = phoneList(r);
  const link = mapsLink(r);
  return joinLines([
    `🆘 ${t.roleNeedsHelp}: ${r.name}`,
    `${t.priority}: ${t[r.priority] || r.priority}`,
    `${t.address}: ${r.location}, ${r.district}`,
    r.num_people ? `${t.numPeople}: ${r.num_people}` : null,
    needs.length ? `${t.suppliesShort}: ${needs.join(', ')}` : null,
    r.boat_required ? `${t.boatShort}: ${t.boatRequired}` : null,
    phones.length ? `${t.phone}: ${phones.join(', ')}` : null,
    r.notes ? `${t.notesLabel}: ${r.notes}` : null,
    // Say which kind of pin it is. A district-centre placeholder sent as if it
    // were a GPS fix is how a boat ends up in the wrong village.
    link ? `${t.coordsLabel}: ${link}${r.has_live_location ? '' : ` (${t.approxPin})`}` : null,
    r.created_at ? `${t.postedOn}: ${formatDate(r.created_at, lang)}` : null,
    '',
    t.sharedVia,
  ]);
}

export function helperShareText(h, t, lang) {
  const phones = phoneList(h);
  const link = mapsLink(h);
  return joinLines([
    `🛟 ${t.roleHelping}: ${h.name}`,
    h.districts_covered?.length ? `${t.district}: ${h.districts_covered.join(', ')}` : null,
    h.areas_text || h.areas_covered ? `${t.areasShort}: ${h.areas_text || h.areas_covered}` : null,
    h.what_given ? `${t.suppliesShort}: ${h.what_given}` : null,
    h.boat_available ? `${t.boatShort}: ${t.boatAvail}` : null,
    phones.length ? `${t.phone}: ${phones.join(', ')}` : null,
    h.notes ? `${t.notesLabel}: ${h.notes}` : null,
    link ? `${t.coordsLabel}: ${link}` : null,
    '',
    t.sharedVia,
  ]);
}

// Native share sheet where there is one (every phone), clipboard everywhere
// else. Returns 'shared' | 'copied' | 'failed' so the caller can say what
// happened rather than silently doing nothing.
export async function shareText(text, title) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (err) {
      // The user backing out of the sheet is not an error worth reporting.
      if (err?.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
