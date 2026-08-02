import { useLang } from '../context/LangContext';

// Opens in a new tab on purpose: a half-filled relief form must survive
// someone reading the terms. Navigating away and back would lose it.
export default function TermsCheckbox({ checked, onChange }) {
  const { t } = useLang();

  return (
    <label className="terms-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {t.termsAgree}{' '}
        {/* Opened through window.open, not by the browser following the link:
            a tab the browser opened cannot be closed by script, and the terms
            page needs a working "go back" button. The href stays real so
            middle-click, right-click and keyboard still behave. */}
        <a
          href="/terms"
          target="_blank"
          rel="opener"
          onClick={(e) => { e.preventDefault(); window.open('/terms', '_blank'); }}
        >
          {t.termsLink}
        </a>
        <span className="req-star" aria-hidden="true"> *</span>
      </span>
    </label>
  );
}
