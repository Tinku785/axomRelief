// Indian mobile numbers: 10 digits, first digit 6-9.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

// Strips spaces and dashes, and removes a recognised country/trunk prefix so
// pasted numbers still pass. Anything else over-length is left intact so it
// fails validation rather than being silently truncated into a real but
// wrong number - a rescuer calling the wrong person is worse than a retype.
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// A primary plus four alternates. More than that is a phone book, not a
// household, and every extra row is another field to fill in a flood.
export const MAX_NUMBERS = 5;

// Every number a row can be reached on, in call order. One place so a card,
// the map popup and the admin panel never disagree about what exists.
// De-duplicated: a repeated number is a second button that dials the same
// dead phone, and React would key two list items the same.
export function phoneList(row) {
  return [...new Set([row.contact_number, ...(row.contact_numbers || [])].filter(Boolean))];
}

// The form holds one array: index 0 is the primary, the rest are optional
// extras the user added. Blank extras are simply dropped.
export function cleanContacts(list) {
  return [...new Set(list.map(normalizePhone).filter(Boolean))];
}

export function contactsError(list, lang) {
  const filled = list.map(normalizePhone);
  const primary = phoneError(filled[0], lang);
  if (primary) return primary;
  for (const n of filled.slice(1)) {
    const err = n && phoneError(n, lang);
    if (err) return err;
  }
  if (cleanContacts(list).length !== filled.filter(Boolean).length) {
    return lang ? 'একেটা নম্বৰ দুবাৰ দিয়া হৈছে।' : 'The same number has been added twice.';
  }
  return '';
}

export function isValidPhone(raw) {
  return INDIAN_MOBILE.test(normalizePhone(raw));
}

export function phoneError(raw, lang) {
  const digits = normalizePhone(raw);
  if (!digits) return lang ? 'ফোন নম্বৰ দিয়ক।' : 'Please enter a phone number.';
  if (digits.length !== 10) {
    return lang ? 'ফোন নম্বৰ ১০ টা সংখ্যাৰ হ’ব লাগে।' : 'Phone number must be exactly 10 digits.';
  }
  if (!INDIAN_MOBILE.test(digits)) {
    return lang ? 'ভাৰতীয় মোবাইল নম্বৰ ৬-৯ ৰে আৰম্ভ হয়।' : 'An Indian mobile number must start with 6, 7, 8 or 9.';
  }
  return '';
}
