import { useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
// Cloudflare's published "always passes, invisible" test key. The visible
// "…AA" twin prints a "For testing only" banner into the form.
const DEV_FALLBACK_SITE_KEY = '1x00000000000000000000BB';

// Every Cloudflare test key starts 1x / 2x / 3x. A real one starts 0x.
const isTestKey = (key) => !key || /^[123]x0{20}/.test(key);

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

export default function TurnstileWidget({ onToken, onExpire }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [errorCode, setErrorCode] = useState('');
  // Error 110200 is Cloudflare rejecting the *hostname*, not the key. A real
  // key only works on the hostnames listed on the widget, and localhost is not
  // one of them unless you add it - so on localhost always use the test key.
  // Any 110200 left in production means the deployed domain is missing from
  // that list; add it in the Turnstile dashboard.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
  const configuredKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const siteKey = (!isLocal && configuredKey) || DEV_FALLBACK_SITE_KEY;

  // Disclosure finding 3: a deploy with VITE_TURNSTILE_SITE_KEY missing fell
  // back to the always-pass test key and looked protected while being wide
  // open. It still falls back - a broken widget must not stop a flood victim
  // submitting - but it now says so loudly instead of failing silently.
  //
  // Worth knowing: swapping in a real key alone does NOT stop scripted
  // submissions. The token is never sent anywhere, so nothing verifies it; a
  // bot posting straight to the API skips the widget entirely. The protection
  // that actually holds is the per-IP and per-phone insert limit enforced by a
  // database trigger. Real CAPTCHA enforcement needs the token checked
  // server-side against Cloudflare's siteverify endpoint before the insert.
  useEffect(() => {
    if (!isLocal && isTestKey(siteKey)) {
      // eslint-disable-next-line no-console
      console.error(
        '[AxomRelief] Turnstile is running on a TEST key in production - forms have no bot challenge. '
        + 'Set VITE_TURNSTILE_SITE_KEY to a real key for this domain.',
      );
    }
  }, [isLocal, siteKey]);

  // If Turnstile itself cannot load - bad hostname config, blocked script,
  // captive wifi - hand out a sentinel token rather than locking the form.
  // Abuse is stopped by the per-IP insert limit in the database, which a
  // browser cannot bypass, whereas a jammed widget stops a real flood victim
  // from asking for rescue. Availability wins on a relief helpline.
  const degrade = (code) => {
    setErrorCode(String(code ?? 'unknown'));
    onToken?.('turnstile-unavailable');
  };

  useEffect(() => {
    let cancelled = false;
    loadTurnstileScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        // Draw nothing unless Cloudflare actually needs the user to click
        // something. A relief form should not ask a flood victim to prove
        // they are human when the risk score already says so.
        appearance: 'interaction-only',
        callback: (token) => { setErrorCode(''); onToken?.(token); },
        'expired-callback': () => onExpire?.(),
        'error-callback': degrade,
      });
    }, () => degrade('script-blocked'));
    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  // No wrapper and no error text: the check is invisible, and a failure is
  // already handled by degrade() handing out a token. errorCode stays as a
  // console-visible signal only.
  return <div className="turnstile-box" ref={containerRef} data-error={errorCode || undefined} />;
}
