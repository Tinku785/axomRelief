import { useState } from 'react';
import { useLang } from '../context/LangContext';
import { shareText } from '../utils/share';

// One button for both card types. The result label replaces it briefly so a
// clipboard fallback does not look like a dead button.
export default function ShareButton({ build, title }) {
  const { t } = useLang();
  const [result, setResult] = useState('');

  const onClick = async () => {
    const outcome = await shareText(build(), title);
    if (outcome === 'shared') return;
    setResult(outcome === 'copied' ? t.shareCopied : t.shareFailed);
    setTimeout(() => setResult(''), 2500);
  };

  return (
    <button type="button" className="share-btn" onClick={onClick} title={result || undefined}>
      {result ? `✓ ${t.copied}` : `↗ ${t.share}`}
    </button>
  );
}
