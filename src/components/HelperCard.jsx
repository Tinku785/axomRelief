import { useLang } from '../context/LangContext';
import { toTel } from '../utils/time';
import { phoneList } from '../utils/phone';
import { helperShareText } from '../utils/share';
import ShareButton from './ShareButton';

// variant "full" — used on Home (bold name, stacked meta lines, filled call button)
// variant "compact" — used at the bottom of the Request form (smaller name, one meta line, outline call button)
export default function HelperCard({ helper, variant = 'full' }) {
  const { lang, t } = useLang();
  const boatLabel = helper.boat_available ? (lang ? 'নাও আছে' : 'Boat') : (lang ? 'পদপথ' : 'On foot');

  return (
    <div className="helper-card">
      <div className="helper-card__row">
        <div style={{ minWidth: 0 }}>
          <div className="helper-card__name" style={variant === 'compact' ? { font: '700 14px system-ui' } : undefined}>
            {helper.name}
          </div>
          {variant === 'compact' ? (
            <div className="helper-card__meta">{helper.areas_covered} · {helper.what_given}</div>
          ) : (
            <>
              <div className="helper-card__meta">{helper.areas_covered}</div>
              <div className="helper-card__meta">{helper.what_given}</div>
            </>
          )}
        </div>
        <span className={`badge ${helper.boat_available ? 'badge-boat-yes' : 'badge-boat-no'}`}>{boatLabel}</span>
      </div>
      {helper.notes && <div className="request-card__notes">{helper.notes}</div>}
      <ShareButton
        title={helper.name}
        build={() => helperShareText(helper, t, lang)}
      />
      {phoneList(helper).map((p) => (
        <a
          key={p}
          className={`helper-card__call ${variant === 'compact' ? 'helper-card__call--outline' : ''}`}
          href={toTel(p)}
        >
          {t.callWord} {p}
        </a>
      ))}
    </div>
  );
}
