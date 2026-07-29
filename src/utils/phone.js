// Indian mobile numbers: 10 digits, first digit 6-9.
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

// Strips spaces and dashes, and removes a recognised country/trunk prefix so
// pasted numbers still pass. Anything else over-length is left intact so it
// fails validation rather than being silently truncated into a real but
// wrong number — a rescuer calling the wrong person is worse than a retype.
export function normalizePhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
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
