import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { getSession, notifyAuthChange } from '../lib/neon';

/**
 * AuthCallbackPage
 *
 * Neon Auth redirects here after Google OAuth.
 * Since we now use the official @neondatabase/auth SDK, calling getSession() 
 * automatically processes the `neon_auth_session_verifier` in the URL!
 */
const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const recover = async () => {
      const { data } = await getSession({ force: true });
      if (cancelled) return;
      if (data.session) {
        notifyAuthChange('SIGNED_IN', data.session);
        navigate('/dashboard', { replace: true });
      } else if (++attempts < 4) timer = setTimeout(() => void recover(), 1000);
      else navigate('/login', { replace: true });
    };
    if (isAuthenticated) navigate('/dashboard', { replace: true });
    else void recover();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [isAuthenticated, navigate]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
        fontFamily: "'Inter', sans-serif",
        color: 'var(--text-secondary)',
        background: 'var(--bg-base)',
      }}
    >
      <div className="spinner" />
      <p style={{ fontSize: 16, margin: 0, fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)' }}>
        Completing sign-in…
      </p>
    </div>
  );
};

export default AuthCallbackPage;
