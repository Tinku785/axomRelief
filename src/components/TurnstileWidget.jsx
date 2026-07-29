import { useEffect, useRef, useState } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
// Cloudflare's published "always passes" test key — used only when no real
// site key is configured, so the form still works in local development.
const DEV_FALLBACK_SITE_KEY = '1x00000000000000000000AA';

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
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || DEV_FALLBACK_SITE_KEY;

  // If Turnstile itself cannot load — bad hostname config, blocked script,
  // captive wifi — hand out a sentinel token rather than locking the form.
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

  return (
    <div className="turnstile-box">
      <div ref={containerRef} />
      {errorCode && (
        <div className="turnstile-box__error">
          Verification is unavailable right now ({errorCode}), so it has been skipped.
          You can still submit this form.
        </div>
      )}
    </div>
  );
}
