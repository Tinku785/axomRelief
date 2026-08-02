// Run with: node src/utils/selfcheck.js
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone, phoneList, cleanContacts, contactsError } from './phone.js';
import { jitterAroundDistrict, DISTRICT_CENTERS, requestsToMarkers } from './mapGeo.js';
import { matchesWhen } from './time.js';
import { statusOf, isResolved } from './status.js';
import { matchCount, sortByMatch, byAge } from './priority.js';
import { requestShareText, helperShareText } from './share.js';
import { csvCell, toCsv } from './csv.js';
import { matchesQuery } from './search.js';
import { emptyFilters, filterRequests, filterHelpers, isFiltered } from './listFilter.js';
import { pageWindow } from './paging.js';
import { t as tStrings } from '../i18n/strings.js';

// ── Phone: Indian 10-digit mobiles only ──────────────────────────────────
assert.equal(normalizePhone('98640 12345'), '9864012345', 'strips spaces');
assert.equal(normalizePhone('+91 98640-12345'), '9864012345', 'strips +91 and dashes');
assert.equal(normalizePhone('098640 12345'), '9864012345', 'strips leading 0');

assert.ok(isValidPhone('9864012345'), 'plain 10-digit passes');
assert.ok(isValidPhone('+91 78640 12345'), 'formatted number passes');

assert.ok(!isValidPhone('1234567890'), 'must not start with 1');
assert.ok(!isValidPhone('5864012345'), 'must not start with 5');
assert.ok(!isValidPhone('986401234'), 'nine digits rejected');
assert.ok(!isValidPhone('98640123456'), 'eleven digits rejected');
assert.ok(!isValidPhone(''), 'empty rejected');
assert.ok(!isValidPhone('98640abcde'), 'letters rejected');

// ── Map: a jittered pin stays near its own district centre ───────────────
for (const [name, centre] of Object.entries(DISTRICT_CENTERS)) {
  for (let i = 0; i < 200; i++) {
    const p = jitterAroundDistrict(name);
    assert.ok(Math.abs(p.lat - centre.lat) <= 0.045, `${name} lat stays in range`);
    assert.ok(Math.abs(p.lng - centre.lng) <= 0.045, `${name} lng stays in range`);
  }
}
assert.deepEqual(
  Object.keys(jitterAroundDistrict('Nowhere')).sort(),
  ['lat', 'lng'],
  'unknown district still returns a usable point'
);

// ── Helper district filter: empty coverage means "everywhere" ────────────
const matches = (helper, district) =>
  !helper.districts_covered?.length || helper.districts_covered.includes(district);

assert.ok(matches({ districts_covered: ['Jorhat'] }, 'Jorhat'));
assert.ok(!matches({ districts_covered: ['Jorhat'] }, 'Sivasagar'));
assert.ok(matches({ districts_covered: ['Jorhat', 'Sivasagar'] }, 'Sivasagar'), 'multi-district');
assert.ok(matches({ districts_covered: [] }, 'Charaideo'), 'legacy row with no districts shows everywhere');
assert.ok(matches({}, 'Charaideo'), 'missing column shows everywhere');

// ── Contact numbers: a primary plus up to four extras ────────────────────
assert.deepEqual(phoneList({ contact_number: '9864012345' }), ['9864012345'], 'legacy row with no array');
assert.deepEqual(
  phoneList({ contact_number: '9864012345', contact_numbers: ['7864012345', '6864012345'] }),
  ['9864012345', '7864012345', '6864012345'],
  'primary first, then extras in order'
);
assert.deepEqual(
  phoneList({ contact_number: '9864012345', contact_numbers: ['9864012345'] }),
  ['9864012345'],
  'a repeat is one button, not two'
);

assert.deepEqual(cleanContacts(['+91 98640 12345', '', '  ']), ['9864012345'], 'blank rows dropped, prefix stripped');
assert.deepEqual(cleanContacts(['9864012345', '9864012345']), ['9864012345'], 'duplicates collapse');

assert.equal(contactsError(['9864012345', '7864012345'], 0), '', 'two good numbers pass');
assert.equal(contactsError([''], 0), 'Please enter a phone number.', 'primary is required');
assert.ok(contactsError(['9864012345', '12345'], 0), 'a bad extra is rejected');
assert.equal(contactsError(['9864012345', ''], 0), '', 'an empty extra is just skipped');
assert.ok(contactsError(['9864012345', '9864012345'], 0), 'the same number twice is rejected');
assert.equal(contactsError(['9864012345', '7864012345', '6864012345', '9954649124', '9435044556'], 0), '', 'five numbers pass');

// ── Match scoring: rank by how much of a request a rescuer can actually cover ──
const req = (id, needs, priority = 'needed') => ({ id, needs, priority });

assert.equal(matchCount(['water', 'food'], req('a', ['water', 'food', 'medical'])), 2);
assert.equal(matchCount(['water'], req('a', ['medical'])), 0, 'no overlap scores zero');
assert.equal(matchCount(['other'], req('a', ['other'])), 0, 'free-text "other" is not cross-referenceable');
assert.equal(matchCount(['water'], { id: 'a' }), 0, 'request with no needs column');

const pool = [req('none', ['medical']), req('one', ['water']), req('two', ['water', 'food'])];
assert.deepEqual(sortByMatch(pool, ['water', 'food']).map((r) => r.id), ['two', 'one', 'none']);
assert.deepEqual(sortByMatch(pool, []).map((r) => r.id), ['none', 'one', 'two'], 'no supplies picked: order untouched');
assert.deepEqual(sortByMatch(pool, ['other']).map((r) => r.id), ['none', 'one', 'two'], '"other" alone does not reorder');
assert.deepEqual(
  sortByMatch([req('low', ['water'], 'needed'), req('high', ['water'], 'critical')], ['water']).map((r) => r.id),
  ['high', 'low'],
  'equal match: priority breaks the tie'
);

// ── "When" filter: calendar days, not rolling 24h windows ────────────────
// 2 Aug, 1am - the awkward hour, where "3 hours ago" was yesterday.
const NOW = new Date(2026, 7, 2, 1, 0, 0);
const at = (...a) => new Date(...a).toISOString();

const todayLate = at(2026, 7, 2, 0, 30);      // 30 min ago, same calendar day
const lastNight = at(2026, 7, 1, 22, 0);      // 3 hr ago, but *yesterday*
const twoDaysAgo = at(2026, 6, 31, 12, 0);
const ancient = at(2026, 6, 20, 12, 0);

assert.ok(matchesWhen(todayLate, 'today', NOW), 'this morning counts as today');
assert.ok(!matchesWhen(lastNight, 'today', NOW), '10pm yesterday is not today, 3 hours or not');
assert.ok(matchesWhen(lastNight, 'recent', NOW), 'yesterday is inside last 2 days');
assert.ok(matchesWhen(todayLate, 'recent', NOW), 'today is inside last 2 days too');
assert.ok(!matchesWhen(twoDaysAgo, 'recent', NOW), '31 Jul is outside last 2 days at 2 Aug');
assert.ok(matchesWhen(twoDaysAgo, 'older', NOW), 'and therefore counts as older');
assert.ok(matchesWhen(ancient, 'older', NOW));
assert.ok(!matchesWhen(todayLate, 'older', NOW));

// Every row must land in exactly one of today/recent-but-not-today/older.
for (const d of [todayLate, lastNight, twoDaysAgo, ancient]) {
  assert.ok(matchesWhen(d, 'all', NOW), '"any time" keeps everything');
  const buckets = ['today', 'recent', 'older'].filter((w) => matchesWhen(d, w, NOW));
  assert.ok(buckets.includes('older') !== buckets.includes('recent'), `${d}: older and recent are exclusive`);
}
assert.ok(!matchesWhen('not a date', 'today', NOW), 'garbage date is filtered out, not thrown on');

// ── Status: unknown/missing values must not crash a card ─────────────────
assert.equal(statusOf({ status: 'in_progress' }), 'in_progress');
assert.equal(statusOf({}), 'looking', 'row written before the status column');
assert.equal(statusOf({ status: 'nonsense' }), 'looking', 'unknown value falls back');
assert.ok(isResolved({ status: 'resolved' }));
assert.ok(!isResolved({}));

// ── Resolved requests leave the map but stay in the list ─────────────────
{
  const rows = [
    { id: 'a', lat: 26.9, lng: 94.6, name: 'A', location: 'x', district: 'Jorhat', num_people: 1, contact_number: '9864012345', status: 'looking' },
    { id: 'b', lat: 26.9, lng: 94.6, name: 'B', location: 'x', district: 'Jorhat', num_people: 1, contact_number: '9864012345', status: 'in_progress' },
    { id: 'c', lat: 26.9, lng: 94.6, name: 'C', location: 'x', district: 'Jorhat', num_people: 1, contact_number: '9864012345', status: 'resolved' },
  ];
  assert.deepEqual(requestsToMarkers(rows, null).map((m) => m.id), ['a', 'b'], 'resolved drops off the map');
}

// ── Share text: everything needed to act must survive the paste ──────────
{
  const t = tStrings(0);
  const full = requestShareText({
    name: 'Deep Phukan', priority: 'critical', location: 'Deoulia Khat', district: 'Sivasagar',
    num_people: 600, needs: ['water', 'food'], needs_other: 'stationery', boat_required: true,
    contact_number: '9864012345', contact_numbers: ['7864012345'], notes: 'Gate is locked',
    lat: 26.9966375, lng: 94.6348281, has_live_location: true, created_at: '2026-07-30T11:31:51Z',
  }, t, 0);

  for (const must of ['Deep Phukan', 'Critical', 'Deoulia Khat, Sivasagar', '600',
    'Water, Food, stationery', '9864012345, 7864012345', 'Gate is locked',
    'https://www.google.com/maps/search/?api=1&query=26.9966375,94.6348281']) {
    assert.ok(full.includes(must), `share text is missing ${must}`);
  }
  assert.ok(!full.includes('approximate area'), 'a real GPS pin is not labelled approximate');

  // A district-centre placeholder must say so - a rescuer acting on it as if it
  // were exact is how a boat goes to the wrong village.
  const approx = requestShareText({
    name: 'X', priority: 'needed', location: 'L', district: 'Jorhat', needs: [],
    contact_number: '9864012345', lat: 26.75, lng: 94.2, has_live_location: false,
  }, t, 0);
  assert.ok(approx.includes('approximate area'), 'placeholder pin is labelled');

  // Missing optional fields must drop out, not print "undefined"/"null".
  const sparse = requestShareText({
    name: 'Y', priority: 'needed', location: 'L', district: 'Jorhat', needs: [], contact_number: '9864012345',
  }, t, 0);
  assert.ok(!/undefined|null|NaN/.test(sparse), `sparse row leaked a placeholder:\n${sparse}`);
  assert.ok(!sparse.includes('Location:'), 'no coordinates line when there is no pin');

  const helper = helperShareText({
    name: 'Meghali', districts_covered: ['Sivasagar'], areas_text: 'Amguri',
    what_given: 'Water, Food', boat_available: true, contact_number: '6003547586',
    lat: 26.98, lng: 94.63,
  }, t, 0);
  assert.ok(helper.includes('Meghali') && helper.includes('6003547586') && helper.includes('Amguri'));
  assert.ok(!/undefined|null|NaN/.test(helper), 'helper share text is clean');
}

// ── FIFO: the longest wait is served first ───────────────────────────────
{
  const rows = [
    { id: 'newest', created_at: '2026-07-31T09:00:00Z' },
    { id: 'oldest', created_at: '2026-07-29T06:00:00Z' },
    { id: 'middle', created_at: '2026-07-30T18:00:00Z' },
  ];
  assert.deepEqual(byAge(rows).map((r) => r.id), ['oldest', 'middle', 'newest'], 'default is oldest first');
  assert.deepEqual(byAge(rows, 'newest').map((r) => r.id), ['newest', 'middle', 'oldest']);
  assert.deepEqual(rows.map((r) => r.id), ['newest', 'oldest', 'middle'], 'byAge does not mutate its input');

  // The "new requests" pill compares ISO timestamps as strings; that is only
  // safe because Postgres hands back a fixed-width UTC format.
  const seen = '2026-07-30T18:00:00Z';
  assert.deepEqual(rows.filter((r) => r.created_at > seen).map((r) => r.id), ['newest']);
}

// ── CSV export: separators and formulas must not escape the cell ─────────
assert.equal(csvCell('plain'), 'plain');
assert.equal(csvCell(['water', 'food']), 'water; food', 'arrays flatten readably');
assert.equal(csvCell(null), '', 'null is an empty cell, not the word null');
assert.equal(csvCell('Nazira, Sivasagar'), '"Nazira, Sivasagar"', 'commas force quoting');
assert.equal(csvCell('he said "go"'), '"he said ""go"""', 'inner quotes are doubled');
assert.ok(csvCell('line1\nline2').startsWith('"'), 'newlines stay inside the cell');

// The injection cases: a spreadsheet would otherwise execute these.
assert.equal(csvCell('=1+1'), "'=1+1");
assert.equal(csvCell('+91 9864012345'), "'+91 9864012345", 'a pasted phone number is not a formula');
assert.equal(csvCell('-5'), "'-5");
assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");

{
  const csv = toCsv(
    [{ name: 'A, B', needs: ['water'] }, { name: '=cmd|calc', needs: [] }],
    [['Name', (r) => r.name], ['Needs', (r) => r.needs]],
  );
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 3, 'header plus one line per row');
  assert.equal(lines[0], 'Name,Needs');
  assert.ok(csv.includes('"A, B"'), 'comma in a name is quoted');
  assert.ok(csv.includes("'=cmd|calc"), 'formula is neutralised');
}

// ── Search: one box over every field someone might recall ────────────────
{
  const row = {
    name: 'Sahil Ahmed', location: 'Santak bihubor Near santak post office',
    district: 'Sivasagar', needs: ['water', 'food'], notes: 'Gate is locked',
    contact_number: '9678527524', contact_numbers: ['9101303765'],
  };
  assert.ok(matchesQuery(row, ''), 'empty query keeps everything');
  assert.ok(matchesQuery(row, '   '), 'whitespace-only query keeps everything');
  assert.ok(matchesQuery(row, 'sahil'), 'name, case-insensitive');
  assert.ok(matchesQuery(row, 'SANTAK'), 'area');
  assert.ok(matchesQuery(row, 'sivasagar'), 'district');
  assert.ok(matchesQuery(row, 'Water'), 'need label, not just the raw key');
  assert.ok(matchesQuery(row, 'locked'), 'notes');
  assert.ok(matchesQuery(row, '9678527524'), 'primary number');
  assert.ok(matchesQuery(row, '9101303765'), 'alternate number');
  assert.ok(matchesQuery(row, '96785 27524'), 'number typed with a space');
  assert.ok(matchesQuery(row, '+91 96785-27524'), 'number typed with prefix and dash');
  assert.ok(!matchesQuery(row, 'jorhat'), 'a miss is a miss');
  assert.ok(!matchesQuery(row, '9999999999'), 'wrong number does not match');

  // A rescuer row uses different field names and must still be searchable.
  const helper = { name: 'Meghali', districts_covered: ['Jorhat'], areas_text: 'Amguri',
    what_given: 'Medical, Food', contact_number: '6003547586' };
  assert.ok(matchesQuery(helper, 'amguri'), 'rescuer area');
  assert.ok(matchesQuery(helper, 'jorhat'), 'rescuer district');
  assert.ok(matchesQuery(helper, 'medical'), 'rescuer supplies');
}

// ── Pager window: first, last and a window, gaps collapsed ───────────────
assert.deepEqual(pageWindow(0, 3), [0, 1, 2], 'no gaps when everything fits');
assert.deepEqual(pageWindow(0, 13), [0, 1, 'gap', 12], 'first page');
assert.deepEqual(pageWindow(6, 13), [0, 'gap', 5, 6, 7, 'gap', 12], 'middle page');
assert.deepEqual(pageWindow(12, 13), [0, 'gap', 11, 12], 'last page');
assert.deepEqual(pageWindow(1, 13), [0, 1, 2, 'gap', 12], 'no gap of one page');
assert.deepEqual(pageWindow(0, 1), [0], 'single page');
for (const pages of [1, 2, 5, 13, 40]) {
  for (let p = 0; p < pages; p++) {
    const w = pageWindow(p, pages);
    assert.ok(w.includes(p), `current page ${p} is always shown`);
    assert.ok(w.includes(0) && w.includes(pages - 1), 'first and last always reachable');
    const nums = w.filter((x) => x !== 'gap');
    assert.deepEqual(nums, [...nums].sort((a, b) => a - b), 'page numbers ascend');
    assert.equal(new Set(nums).size, nums.length, 'no page listed twice');
  }
}

// ── Shared list filter: one chain behind all four lists ──────────────────
{
  const rows = [
    { id: 'a', name: 'Rina', district: 'Jorhat', priority: 'critical', status: 'looking',
      needs: ['water'], contact_number: '9864012345', created_at: '2026-07-29T06:00:00Z' },
    { id: 'b', name: 'Bikash', district: 'Sivasagar', priority: 'needed', status: 'resolved',
      needs: ['food'], contact_number: '7864012345', created_at: '2026-07-31T06:00:00Z' },
    { id: 'c', name: 'Rina Das', district: 'Sivasagar', priority: 'critical', status: 'looking',
      needs: ['medical'], contact_number: '6864012345', created_at: '2026-07-30T06:00:00Z' },
  ];
  const f = (over) => ({ ...emptyFilters, ...over });

  assert.deepEqual(filterRequests(rows, f()).map((r) => r.id), ['a', 'c', 'b'], 'no filters: oldest first');
  assert.deepEqual(filterRequests(rows, f({ sort: 'newest' })).map((r) => r.id), ['b', 'c', 'a']);
  assert.deepEqual(filterRequests(rows, f({ district: 'Jorhat' })).map((r) => r.id), ['a']);
  assert.deepEqual(filterRequests(rows, f({ status: 'resolved' })).map((r) => r.id), ['b']);
  assert.deepEqual(filterRequests(rows, f({ priority: 'critical' })).map((r) => r.id), ['a', 'c']);
  assert.deepEqual(filterRequests(rows, f({ query: 'rina' })).map((r) => r.id), ['a', 'c']);
  // Filters compose rather than override each other.
  assert.deepEqual(
    filterRequests(rows, f({ query: 'rina', district: 'Sivasagar' })).map((r) => r.id),
    ['c'],
    'search AND district',
  );
  assert.deepEqual(filterRequests(rows, f({ query: 'nobody' })).map((r) => r.id), [], 'a miss returns nothing');

  // isFiltered decides whether the CSV export has to ask.
  assert.ok(!isFiltered(emptyFilters), 'untouched controls are not a filter');
  assert.ok(!isFiltered(f({ query: '   ' })), 'whitespace is not a filter');
  assert.ok(!isFiltered(f({ sort: 'newest' })), 'sorting is not filtering - it hides nothing');
  assert.ok(isFiltered(f({ query: 'rina' })));
  assert.ok(isFiltered(f({ district: 'Jorhat' })));
  assert.ok(isFiltered(f({ status: 'looking' })));
  assert.ok(isFiltered(f({ when: 'today' })));
  assert.ok(isFiltered(f({ priority: 'critical' })));

  const helpers = [
    { id: 'h1', name: 'Meghali', districts_covered: ['Jorhat'], created_at: '2026-07-29T06:00:00Z' },
    { id: 'h2', name: 'Bikash', districts_covered: [], created_at: '2026-07-30T06:00:00Z' },
    { id: 'h3', name: 'Jumi', districts_covered: ['Sivasagar'], created_at: '2026-07-31T06:00:00Z' },
  ];
  assert.deepEqual(filterHelpers(helpers, f()).map((h) => h.id), ['h1', 'h2', 'h3']);
  assert.deepEqual(
    filterHelpers(helpers, f({ district: 'Jorhat' })).map((h) => h.id),
    ['h1', 'h2'],
    'a rescuer with no districts covers everywhere and must not vanish',
  );
  assert.deepEqual(filterHelpers(helpers, f({ query: 'jumi' })).map((h) => h.id), ['h3']);
}

console.log('selfcheck: all assertions passed');
