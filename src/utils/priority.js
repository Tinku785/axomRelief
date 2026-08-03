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

// Score bands for the admin badge. Absolute cutoffs, not percentiles of the
// current list: a badge that changes colour because other rows were resolved
// would be unreadable, and "red" has to mean the same thing on Tuesday as it
// did on Monday.
//
// Where the numbers come from - the priority term dominates the formula
// (critical 150 / urgent 100 / needed 50), and the rest can add at most ~80
// before ageing:
//   >= 200  only reachable by critical, or urgent carrying heavy needs
//   120-199 the broad middle
//   < 120   low priority, light needs, not waiting long
// Against the 113 open requests this splits 17 / 66 / 30, and nothing below
// 'urgent' ever reaches red.
export const SCORE_HIGH = 200;
export const SCORE_MEDIUM = 120;

export function scoreBand(score) {
  if (score == null) return null;
  if (score >= SCORE_HIGH) return 'high';
  if (score >= SCORE_MEDIUM) return 'medium';
  return 'low';
}

// Admin-only, so English alongside the rest of the dashboard rather than in
// the bilingual string table.
export const SCORE_BAND_LABEL = {
  high: 'High score',
  medium: 'Medium score',
  low: 'Low score',
};

// Every sort the lists offer, in one place. 'score' is admin-only: the value
// comes from the database (migration 0013 computes it per query), so a row
// fetched without it sorts as 0 rather than NaN-ing the whole comparator.
export function sortRequests(rows, sort) {
  if (sort === 'score') {
    return [...rows].sort((a, b) => (b.priority_score ?? 0) - (a.priority_score ?? 0));
  }
  if (sort === 'district') {
    // Ties inside a district fall back to oldest-first, which is the order an
    // operator working through one district actually wants.
    return byAge(rows).sort((a, b) => String(a.district).localeCompare(String(b.district)));
  }
  if (sort === 'priority') {
    return byAge(rows).sort((a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
  }
  return byAge(rows, sort);
}

// Newest resolution first. The 44 rows resolved before 0013 added resolved_at
// have none, so they fall back to created_at instead of sorting as epoch zero.
export const resolvedAt = (r) => r.resolved_at || r.created_at;

export function byResolvedAt(rows) {
  return [...rows].sort((a, b) => new Date(resolvedAt(b)) - new Date(resolvedAt(a)));
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
