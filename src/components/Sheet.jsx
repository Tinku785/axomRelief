import { useEffect } from 'react';
import { useLang } from '../context/LangContext';

// The app's one modal. Was a private helper inside SiteFooter until the admin
// export needed the same thing.
//
// `showClose` off when the children carry their own actions - a dialog that
// asks a question should not also offer a neutral "Close" that answers nothing.
export default function Sheet({ title, onClose, showClose = true, children }) {
  const { t } = useLang();

  // Escape closes it. A modal you can only dismiss with the mouse is a trap on
  // a keyboard, and the map modal already behaves this way.
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__head">
          <div className="sheet__title">{title}</div>
          <button className="sheet__close" onClick={onClose} aria-label={t.close}>✕</button>
        </div>
        {children}
        {showClose && <button className="btn btn-green" onClick={onClose}>{t.close}</button>}
      </div>
    </div>
  );
}
