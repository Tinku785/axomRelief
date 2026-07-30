// Run with: node src/utils/selfcheck.js
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone, phoneList, cleanContacts, contactsError } from './phone.js';
import { jitterAroundDistrict, DISTRICT_CENTERS } from './mapGeo.js';
import { matchCount, sortByMatch } from './priority.js';

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

console.log('selfcheck: all assertions passed');
