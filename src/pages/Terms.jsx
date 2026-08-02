import { useLang } from '../context/LangContext';
import logoMark from '../assets/logo-mark.png';

// Verbatim from AxomRelief_Terms_and_Conditions_v2.pdf. Kept in English exactly
// as supplied: this is the legal text people tick a box against, and inventing
// an Assamese translation of it is not a call to make in a UI patch.
const CLAUSES = [
  ['Consent to Share Information',
    'You voluntarily provide your name, phone number, address, GPS location and other information required for relief coordination. You consent to this information being shared with authorized volunteers, NGOs, government agencies and relief coordinators solely to facilitate assistance.'],
  ['Accuracy of Information',
    'You confirm all information provided is true, accurate and up to date.'],
  ['Location Permission',
    'If you share your device location, you consent to its use for locating you or identifying nearby assistance.'],
  ['Use of Personal Information',
    'Your information will only be used for disaster relief coordination, communication and verification. It will not be sold or used for unrelated commercial purposes.'],
  ['Volunteer Contact',
    'Registered volunteers or relief organizations may contact you.'],
  ['Platform Role',
    'AxomRelief acts only as a coordination platform connecting people in need with volunteers and organizations.'],
  ['User Responsibility',
    "Do not submit duplicate, fake or malicious requests or misuse another user's information."],
  ['Limitation of Platform',
    'Assistance is not guaranteed and depends on volunteer availability.'],
  ['Privacy & Security',
    'We take reasonable measures to protect your information but cannot guarantee absolute security.'],
  ['Changes',
    'These Terms may be updated. Continued use constitutes acceptance.'],
  ['Volunteer-Based Platform',
    'AxomRelief is not a government agency or official rescue authority.'],
  ['No Guarantee of Assistance',
    'Registration does not guarantee help or volunteer participation.'],
  ['Independent Participants',
    'Helpers, NGOs, donors and requesters participate independently. Identities and intentions are not guaranteed.'],
  ['Fraud & Misrepresentation',
    'We are not responsible for fake requesters, fake rescuers, impersonators, scams or misuse by third parties.'],
  ['User Responsibility for Interactions',
    'Verify identities before donating, meeting or sharing sensitive information.'],
  ['Limitation of Liability',
    'AxomRelief, its creators, contributors, administrators and volunteers are not liable for losses, fraud, delays, disputes or damages arising from platform use.'],
  ['Right to Remove Content',
    'We may remove any fraudulent, abusive or misleading content or accounts without notice.'],
];

const DECLARATION = 'I understand that AxomRelief is a volunteer-based coordination platform and not an emergency response agency. I consent to the collection, use and sharing of my information for flood relief coordination and agree to these Terms & Conditions and Privacy Policy.';

// Normally this page is a tab opened from the form's checkbox, so closing it
// puts the reader back on their half-filled form. But it is also a real URL -
// someone can land here from a bookmark or a search result, and window.close()
// does nothing on a tab the browser opened itself. Fall back to going back, or
// home if there is no history to go back to, so the button is never inert.
function closeTab() {
  window.close();
  setTimeout(() => {
    if (window.closed) return;
    // history.back() looks right but can land on another /terms entry and
    // strand the reader here. The referrer is where they actually came from.
    let target = '/';
    try {
      const from = new URL(document.referrer);
      if (from.origin === window.location.origin && from.pathname !== '/terms') {
        target = from.pathname + from.search + from.hash;
      }
    } catch {
      // No referrer (bookmark, search result, pasted link) - home it is.
    }
    // replace, not assign: the terms page should not sit in the back stack.
    window.location.replace(target);
  }, 120);
}

export default function Terms() {
  const { t } = useLang();

  return (
    <div className="screen terms">
      <div className="terms__head">
        <img src={logoMark} alt="" width="40" height="40" />
        <div>
          <h1 className="terms__title">AxomRelief - Terms &amp; Conditions</h1>
          <div className="terms__sub">{t.termsSub}</div>
        </div>
      </div>

      <ol className="terms__list">
        {CLAUSES.map(([heading, body]) => (
          <li key={heading}>
            <strong>{heading}:</strong> {body}
          </li>
        ))}
      </ol>

      <div className="terms__declaration">
        <strong>Declaration:</strong> {DECLARATION}
      </div>

      <div className="terms__actions">
        <button type="button" className="btn btn-green" onClick={closeTab}>
          {t.understand}
        </button>
        <button type="button" className="btn btn-outline-green" onClick={closeTab}>
          ‹ {t.goBack}
        </button>
      </div>
    </div>
  );
}
