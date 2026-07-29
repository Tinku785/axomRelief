import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { supabaseConfigured } from '../supabaseClient';

// Supabase Auth identifies users by email, but admins sign in with a plain
// username. A bare username is expanded to its account address.
const ADMIN_EMAIL_DOMAIN = 'axomrelief.app';

export default function AdminLogin() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const doLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const id = username.trim().toLowerCase();
    const email = id.includes('@') ? id : `${id}@${ADMIN_EMAIL_DOMAIN}`;
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) {
      setError('Incorrect username or password.');
      return;
    }
    navigate('/admin', { replace: true });
  };

  return (
    <div className="screen screen--narrow" style={{ padding: '0 18px' }}>
      <button className="btn-back" style={{ padding: '14px 0 4px' }} onClick={() => navigate('/')}>‹ {t.back}</button>
      <div style={{ padding: '34px 0 22px', textAlign: 'center' }}>
        <div style={{ font: '800 19px system-ui', color: 'var(--text)' }}>{t.adminLogin}</div>
      </div>
      <form className="stack gap-10" onSubmit={doLogin}>
        <input
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          required
        />
        {!supabaseConfigured && <div className="form-error">Backend not configured — see .env.example.</div>}
        {error && <div className="form-error">{error}</div>}
        <button className="btn" style={{ background: 'var(--text)', color: '#fff' }} type="submit" disabled={busy || !supabaseConfigured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
