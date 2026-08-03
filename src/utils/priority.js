export const PRIORITY_META = {
  critical: {
    color: '#B23A3A',
    bg: '#F9EFEF',
    shape: '',
    desc: [
      'Life at risk right now: trapped, rising water, medical emergency.',
      'এতিয়াই জীৱনৰ বিপদ: আৱদ্ধ, পানী বাঢ়িছে, চিকিৎসা জৰুৰী।',
    ],
  },
  urgent: {
    color: '#C0632A',
    bg: '#FAF3EC',
    shape: '',
    desc: [
      'Serious need within hours: no food or water, medicines running out.',
      'কেইঘণ্টামানৰ ভিতৰত লাগে: খাদ্য/পানী নাই, ঔষধ শেষ।',
    ],
  },
  needed: {
    color: '#94742A',
    bg: '#F8F3E4',
    shape: '',
    desc: [
      'Important but can wait a day: clothes, sanitation, supplies.',
      'গুৰুত্বপূৰ্ণ কিন্তু এদিন ৰ’ব পাৰে: কাপোৰ, পৰিষ্কাৰ সামগ্ৰী।',
    ],
  },
};

export const PRIORITY_ORDER = ['critical', 'urgent', 'needed'];

export const RESCUER_MARK = { color: 'var(--green)', shape: '✔' };

// How many of a request's needs this rescuer ticked they can bring. "other" is
// free text on both sides, so it can't be cross-referenced and doesn't count.
export function matchCount(supplies, request) {
  return supplies.filter((s) => s !== 'other' && request.needs?.includes(s)).length;
}

// Oldest first by default. Someone who has been waiting since yesterday morning
// is served before someone who posted five minutes ago - the API returns
// newest-first, which is right for a news feed and wrong for a queue.
export function byAge(rows, order = 'oldest') {
  const oldestFirst = [...rows].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  return order === 'newest' ? oldestFirst.reverse() : oldestFirst;
}

// Best-matched first, priority breaking ties. Array.sort is stable, so equal
// rows keep the newest-first order the API returned.
// ponytail: match count only. Distance helper→needy is the obvious next factor
// - add it here once helpers store a real pin rather than a district jitter.
export function sortByMatch(requests, supplies) {
  if (!supplies.some((s) => s !== 'other')) return requests;
  return [...requests].sort((a, b) =>
    matchCount(supplies, b) - matchCount(supplies, a)
    || PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}
