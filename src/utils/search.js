import { needLabel } from '../i18n/strings.js';
import { phoneList, normalizePhone } from './phone.js';

// One free-text box over every field someone might recall: a name, a village,
// a phone number, what they need. Separate "search by" dropdowns would be more
// precise and nobody would use them mid-flood.
function haystack(row, lang) {
  return [
    row.name,
    row.location,
    row.district,
    row.notes,
    row.needs_other,
    row.helper_name,
    row.areas_text,
    row.areas_covered,
    row.what_given,
    ...(row.needs || []).map((k) => needLabel(k, lang)),
    ...(row.districts_covered || []),
    ...phoneList(row),
  ].filter(Boolean).join(' ').toLowerCase();
}

export function matchesQuery(row, query, lang = 0) {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return true;

  const hay = haystack(row, lang);
  if (hay.includes(needle)) return true;

  // Numbers get typed with spaces, dashes and +91 prefixes that the stored
  // value does not have. normalizePhone strips the prefix exactly the way the
  // submitted number was stripped on the way in, so "+91 96785-27524" finds
  // the row saved as "9678527524".
  const needleDigits = normalizePhone(needle);
  if (needleDigits.length >= 3) {
    return hay.replace(/\D/g, '').includes(needleDigits);
  }
  return false;
}
