export const PRIORITY_META = {
  critical: {
    color: '#B23A3A',
    bg: '#F9EFEF',
    shape: '●',
    desc: [
      'Life at risk right now: trapped, rising water, medical emergency.',
      'এতিয়াই জীৱনৰ বিপদ: আৱদ্ধ, পানী বাঢ়িছে, চিকিৎসা জৰুৰী।',
    ],
  },
  urgent: {
    color: '#C0632A',
    bg: '#FAF3EC',
    shape: '▲',
    desc: [
      'Serious need within hours: no food or water, medicines running out.',
      'কেইঘণ্টামানৰ ভিতৰত লাগে: খাদ্য/পানী নাই, ঔষধ শেষ।',
    ],
  },
  needed: {
    color: '#94742A',
    bg: '#F8F3E4',
    shape: '■',
    desc: [
      'Important but can wait a day: clothes, sanitation, supplies.',
      'গুৰুত্বপূৰ্ণ কিন্তু এদিন ৰ’ব পাৰে: কাপোৰ, পৰিষ্কাৰ সামগ্ৰী।',
    ],
  },
};

export const PRIORITY_ORDER = ['critical', 'urgent', 'needed'];

export const RESCUER_MARK = { color: '#2E7D4A', shape: '✔' };
