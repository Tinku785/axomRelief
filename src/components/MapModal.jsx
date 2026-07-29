import { useEffect } from 'react';
import { useLang } from '../context/LangContext';
import ReliefMap from './ReliefMap';

export default function MapModal({ markers, onClose }) {
  const { t } = useLang();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="map-modal">
      <div className="map-modal__bar">
        <span className="map-modal__title">{t.mapTitle}</span>
        <div className="map-legend">
          <span className="map-legend__item"><i className="relief-pin relief-pin--dot" style={{ background: '#2E7D4A' }} /> {t.peopleNeedHelp}</span>
          <span className="map-legend__item"><i className="relief-pin relief-pin--dot" style={{ background: '#C0632A' }} /> {t.activeRescuers}</span>
        </div>
        <button className="sheet__close" onClick={onClose} aria-label={t.close}>✕</button>
      </div>
      <div className="map-modal__body">
        <ReliefMap markers={markers} interactive />
      </div>
    </div>
  );
}
