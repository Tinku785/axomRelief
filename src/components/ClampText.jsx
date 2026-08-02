import { useEffect, useRef, useState } from 'react';
import { useLang } from '../context/LangContext';

// Notes run to whole paragraphs - one request pasted a numbered list of twelve
// items - and a list where each card is a wall of text cannot be scanned. One
// line by default, expandable; `lines` for anywhere a little more context
// earns its space, like the updates band.
export default function ClampText({ text, className = '', lines = 1 }) {
  const { t } = useLang();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Only offer "see more" when there is actually more. Measured rather than
  // guessed from length: it depends on the font, the width and the language.
  // One line clips horizontally with an ellipsis; several clip vertically, so
  // the overflow test has to change axis with them.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const check = () => setOverflows(lines === 1
      ? el.scrollWidth > el.clientWidth + 1
      : el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines]);

  if (!text) return null;

  return (
    <div className="clamp">
      <div
        ref={ref}
        className={`clamp__text ${lines > 1 ? 'clamp__text--multi' : ''} ${open ? 'clamp__text--open' : ''} ${className}`}
        style={lines > 1 ? { '--clamp-lines': lines } : undefined}
      >
        {text}
      </div>
      {(overflows || open) && (
        <button type="button" className="link-btn clamp__more" onClick={() => setOpen((v) => !v)}>
          {open ? t.seeLess : t.seeMore}
        </button>
      )}
    </div>
  );
}
