import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { phoneList } from '../utils/phone';
import { toTel } from '../utils/time';

// One number on the card, the rest behind a "+2" chip that opens them on the
// next line. Five call buttons stacked on a request card pushed everything
// else - needs, notes, the map link - off the first screen.
export default function PhoneButtons({ row, variant = 'pill', label }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const numbers = phoneList(row);
  if (!numbers.length) return null;

  const [first, ...rest] = numbers;
  const cls = variant === 'block' ? 'helper-card__call' : 'call-btn';

  const callLink = (num) => (
    <a key={num} className={cls} href={toTel(num)} aria-label={`${t.callNow} ${label || ''} ${num}`.trim()}>
      {variant === 'block'
        ? `${t.callWord} ${num}`
        : <><span className="call-btn__icon" aria-hidden="true">📞</span>{num}</>}
    </a>
  );

  return (
    <>
      {callLink(first)}
      {!!rest.length && (
        <button
          type="button"
          className="more-numbers"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '−' : '+'}{rest.length}
        </button>
      )}
      {open && <div className="more-numbers__row">{rest.map(callLink)}</div>}
    </>
  );
}
