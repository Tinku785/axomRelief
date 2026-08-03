import { matchesQuery } from './search.js';
import { matchesWhen } from './time.js';
import { statusOf } from './status.js';
import { byAge, sortRequests } from './priority.js';

// The same four lists - public requests, public rescuers, admin requests,
// admin rescuers - were each growing their own filter chain. One place, so a
// fix to "district" or "search" lands everywhere at once.

export const emptyFilters = {
  query: '', sort: 'oldest', district: 'All', status: 'All', when: 'all', priority: 'All',
};

// True when the user has narrowed the list at all - what decides whether an
// export needs to ask "all or just these?".
export function isFiltered(f) {
  return Boolean(f.query?.trim())
    || f.district !== 'All'
    || f.status !== 'All'
    || f.when !== 'all'
    || f.priority !== 'All';
}

export function filterRequests(rows, f, lang = 0) {
  return sortRequests(rows.filter((r) => (
    (f.priority === 'All' || r.priority === f.priority)
    && (f.district === 'All' || r.district === f.district)
    && (f.status === 'All' || statusOf(r) === f.status)
    && matchesWhen(r.created_at, f.when)
    && matchesQuery(r, f.query, lang)
  )), f.sort);
}

export function filterHelpers(rows, f, lang = 0) {
  return byAge(rows.filter((h) => (
    // No districts recorded means "anywhere" - a legacy row must not vanish
    // the moment someone picks a district.
    (f.district === 'All' || !h.districts_covered?.length || h.districts_covered.includes(f.district))
    && matchesQuery(h, f.query, lang)
  )), f.sort);
}
