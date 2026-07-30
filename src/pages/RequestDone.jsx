import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';

export default function RequestDone() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div className="screen" style={{ padding: '52px 24px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green)', font: '34px/64px system-ui', margin: '0 auto 18px' }}>✓</div>
        <div style={{ font: '800 20px system-ui', color: 'var(--text)' }}>{t.doneTitle}</div>
        <div style={{ font: '14px/1.6 system-ui', color: 'var(--text-secondary)', margin: '8px 0 26px' }}>{t.doneBody}</div>
      </div>
      <button className="btn btn-primary" style={{ marginBottom: 10 }} onClick={() => navigate('/helping#helpers')}>
        {t.viewAll}
      </button>
      <button className="btn btn-outline-green" onClick={() => navigate('/')}>
        {t.backHome}
      </button>
    </div>
  );
}
