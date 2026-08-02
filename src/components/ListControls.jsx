import { useLang } from '../context/LangContext';
import { DISTRICTS } from '../i18n/strings';
import { STATUS_META, STATUS_ORDER } from '../utils/status';
import { WHEN_OPTIONS } from '../utils/time';

// One control block for every list in the app - public requests, public
// rescuers, and both admin tabs. They were drifting apart as copies; a search
// fix in one used to mean three more edits.
export default function ListControls({
  filters, onChange, withStatus = false, withWhen = false, children,
}) {
  const { t } = useLang();
  // Any change is a new list, so page 3 of the old one is meaningless - the
  // caller resets the page from here rather than remembering to do it per
  // control.
  const set = (key) => (value) => onChange({ ...filters, [key]: value });

  return (
    <div className="filter-panel">
      <div className="filter-panel__head">
        <div className="filter-panel__title">{t.filtersTitle}</div>
        {/* Search sits with the filters, top right: it is the fastest way to a
            known name and belongs with the other ways of narrowing the list. */}
        <div className="search-row">
          <input
            className="input"
            type="search"
            value={filters.query}
            onChange={(e) => set('query')(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
          {!!filters.query && (
            <button type="button" className="search-row__clear" onClick={() => set('query')('')}>
              {t.clearSearch}
            </button>
          )}
        </div>
      </div>

      <div className="filter-row">
        <label className="filter">
          <span className="filter__label">{t.sortLabel}</span>
          <select className="input" value={filters.sort} onChange={(e) => set('sort')(e.target.value)}>
            <option value="oldest">{t.sortOldest}</option>
            <option value="newest">{t.sortNewest}</option>
          </select>
        </label>

        <label className="filter">
          <span className="filter__label">{t.filterDistrict}</span>
          <select className="input" value={filters.district} onChange={(e) => set('district')(e.target.value)}>
            <option value="All">{t.allDistricts}</option>
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        {withStatus && (
          <label className="filter">
            <span className="filter__label">{t.filterStatus}</span>
            <select className="input" value={filters.status} onChange={(e) => set('status')(e.target.value)}>
              <option value="All">{t.allStatuses}</option>
              {STATUS_ORDER.map((k) => (
                <option key={k} value={k}>{t[STATUS_META[k].key]}</option>
              ))}
            </select>
          </label>
        )}

        {withWhen && (
          <label className="filter">
            <span className="filter__label">{t.filterWhen}</span>
            <select className="input" value={filters.when} onChange={(e) => set('when')(e.target.value)}>
              {WHEN_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {{ all: t.whenAll, today: t.whenToday, recent: t.whenRecent, older: t.whenOlder }[w]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {children}
    </div>
  );
}
