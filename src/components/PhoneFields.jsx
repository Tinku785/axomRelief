import { useLang } from '../context/LangContext';
import { normalizePhone, MAX_NUMBERS } from '../utils/phone';

// The requester form and the rescuer form ask for the same thing, so they ask
// for it the same way. `numbers` is always at least ['']: index 0 is the
// primary, the rest are optional alternates.
export default function PhoneFields({ numbers, onChange, labelFirst }) {
  const { t } = useLang();

  const setAt = (i, value) => onChange(numbers.map((n, j) => (j === i ? normalizePhone(value) : n)));
  const removeAt = (i) => onChange(numbers.filter((_, j) => j !== i));

  return (
    <>
      {numbers.map((num, i) => (
        // Index keys: rows have no id, and removing one is meant to shift the
        // values up with it.
        <div className="field" key={i}>
          {i === 0 && labelFirst && <div className="field__label">{t.phone}</div>}
          <div className="alt-number">
            <input
              className="input"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={num}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={i === 0 ? t.phPhone : t.phPhone2}
              required={i === 0}
            />
            {i > 0 && (
              <button type="button" className="link-btn" onClick={() => removeAt(i)}>
                {t.removeNumber}
              </button>
            )}
          </div>
        </div>
      ))}
      {numbers.length < MAX_NUMBERS && (
        // .field only for its bottom margin: without it the next label sits
        // flush against this link.
        <div className="field">
          <button type="button" className="link-btn" onClick={() => onChange([...numbers, ''])}>
            {t.addNumber}
          </button>
        </div>
      )}
    </>
  );
}
