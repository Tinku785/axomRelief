import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { phoneList } from '../utils/phone';
import { toTel } from '../utils/time';
import EyeIcon from './EyeIcon';

// Numbers are hidden until asked for. These are flood victims' personal phones
// on a public page - a scraper should have to work for them, and a rescuer
// only needs one on screen at the moment they decide to call.
//
// One number on the card, the rest behind a "+2" chip that opens them on the
// next line. Five call buttons stacked on a request card pushed everything
// else - needs, notes, the map link - off the first screen.
export default function PhoneButtons({ row, variant = 'pill', label }) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const numbers = phoneList(row);
  if (!numbers.length) return null;

  const [first, ...rest] = numbers;
  const cls = variant === 'block' ? 'helper-card__call' : 'call-btn';
  // Enough of the number to recognise, not enough to dial.
  const masked = (num) => `${num.slice(0, 2)}******`;

  if (!shown) {
    return (
      <button
        type="button"
        className={`${cls} ${cls}--masked`}
        onClick={() => setShown(true)}
        aria-label={`${t.showNumber} ${label || ''}`.trim()}
      >
        <EyeIcon />
        <span className="masked-hint">{masked(first)}</span>
      </button>
    );
  }

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
          {open ? '-' : '+'}{rest.length}
        </button>
      )}
      <button
        type="button"
        className="more-numbers"
        onClick={() => { setShown(false); setOpen(false); }}
        aria-label={t.hideNumber}
        title={t.hideNumber}
      >
        <EyeIcon off />
      </button>
      {open && <div className="more-numbers__row">{rest.map(callLink)}</div>}
    </>
  );
}
