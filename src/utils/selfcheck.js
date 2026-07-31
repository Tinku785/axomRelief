// Run with: node src/utils/selfcheck.js
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone, phoneList, cleanContacts, contactsError } from './phone.js';
import { jitterAroundDistrict, DISTRICT_CENTERS, requestsToMarkers } from './mapGeo.js';
import { matchesWhen } from './time.js';
import { statusOf, isResolved } from './status.js';
import { matchCount, sortByMatch } from './priority.js';
import { requestShareText, helperShareText } from './share.js';
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
// 2 Aug, 1am — the awkward hour, where "3 hours ago" was yesterday.
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

  // A district-centre placeholder must say so — a rescuer acting on it as if it
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

console.log('selfcheck: all assertions passed');
