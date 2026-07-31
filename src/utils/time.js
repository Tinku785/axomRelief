export function timeAgo(dateInput, lang) {
  const then = new Date(dateInput).getTime();
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 60) return minutes + (lang ? ' মিনিট আগত' : ' min ago');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + (lang ? ' ঘণ্টা আগত' : ' hr ago');
  return Math.round(hours / 24) + (lang ? ' দিন আগত' : ' d ago');
}

// "29 Jul 2026, 5:11 pm" — the news band needs a real date, not just "3 hr ago",
// so a reader can tell whether an update is from this flood or the last one.
export function formatDateTime(dateInput, lang) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(lang ? 'as-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// "29 Jul 2026" — the date a request was posted, shown on the card next to the
// relative time. A rescuer scanning a list needs both: "2 d ago" for urgency,
// the date for the notes they write down.
export function formatDate(dateInput, lang) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang ? 'as-IN' : 'en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export const WHEN_OPTIONS = ['all', 'today', 'recent', 'older'];

// Calendar days, not rolling 24h windows: at 1am, something posted at 11pm last
// night is "yesterday" to a reader, however few hours have passed.
export function matchesWhen(dateInput, when, now = new Date()) {
  if (when === 'all') return true;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86400000;
  if (when === 'today') return d.getTime() >= startOfToday;
  if (when === 'recent') return d.getTime() >= startOfToday - DAY; // today + yesterday
  return d.getTime() < startOfToday - DAY;
}

export function toTel(phone) {
  return 'tel:' + String(phone || '').replace(/[^0-9]/g, '');
}
