import { useLang } from '../context/LangContext';
import { helperShareText } from '../utils/share';
import ShareButton from './ShareButton';
import PhoneButtons from './PhoneButtons';
import ClampText from './ClampText';

// variant "full" - used on Home (bold name, stacked meta lines, filled call button)
// variant "compact" - used at the bottom of the Request form (smaller name, one meta line, outline call button)
export default function HelperCard({ helper, variant = 'full' }) {
  const { lang, t } = useLang();
  // "On foot" implied someone wading in - most rescuers without a boat are
  // driving supplies along whatever roads are still open.
  const boatLabel = helper.boat_available ? (lang ? 'নাও আছে' : 'Boat') : t.byRoad;
  // Districts are the one field the registration form makes mandatory, so they
  // are the one line that is always there to lead with. Areas are free text and
  // often empty; supplies read as a list after the place.
  const districts = helper.districts_covered?.length ? helper.districts_covered.join(', ') : null;
  const areas = helper.areas_text || helper.areas_covered;

  return (
    <div className="helper-card">
      <div className="helper-card__row">
        <div style={{ minWidth: 0 }}>
          <div className="helper-card__name" style={variant === 'compact' ? { font: '700 14px system-ui' } : undefined}>
            {helper.name}
          </div>
          {districts && (
            <div className="helper-card__districts">
              <span className="helper-card__label">{t.districtsCovered}</span> {districts}
            </div>
          )}
          {variant === 'compact' ? (
            <div className="helper-card__meta">{[areas, helper.what_given].filter(Boolean).join(' · ')}</div>
          ) : (
            <>
              {areas && <div className="helper-card__meta">{areas}</div>}
              {helper.what_given && <div className="helper-card__meta">{helper.what_given}</div>}
            </>
          )}
        </div>
        <span className={`badge ${helper.boat_available ? 'badge-boat-yes' : 'badge-boat-no'}`}>{boatLabel}</span>
      </div>
      <ClampText text={helper.notes} className="request-card__notes" />
      <ShareButton
        title={helper.name}
        build={() => helperShareText(helper, t, lang)}
      />
      <PhoneButtons row={helper} variant="block" label={helper.name} />
    </div>
  );
}
