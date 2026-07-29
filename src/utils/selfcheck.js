// Run with: node src/utils/selfcheck.js
import assert from 'node:assert/strict';
import { normalizePhone, isValidPhone } from './phone.js';
import { jitterAroundDistrict, DISTRICT_CENTERS } from './mapGeo.js';

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

console.log('selfcheck: all assertions passed');
