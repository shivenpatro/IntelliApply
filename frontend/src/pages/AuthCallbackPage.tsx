import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSession } from '../lib/neon';

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
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const processOAuthCallback = async () => {
      console.log('[AuthCallback] Processing OAuth callback...');
      
      try {
        // The SDK automatically checks the URL for `neon_auth_session_verifier` 
        // and verifies the session with the backend.
        const { data } = await getSession();
        
        if (data?.session?.user) {
          console.log('[AuthCallback] ✅ Session successfully verified! Going to dashboard.');
          // A full page reload will ensure AuthContext is re-initialized with the new session
          window.location.href = '/dashboard';
        } else {
          // If the network is slow, it might take a few tries
          if (attemptsRef.current < 5) {
            attemptsRef.current += 1;
            console.log(`[AuthCallback] Session not ready yet. Retrying in 1s (Attempt ${attemptsRef.current})...`);
            setTimeout(processOAuthCallback, 1000);
          } else {
            console.warn('[AuthCallback] ❌ All attempts failed. Redirecting to login.');
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        console.error('[AuthCallback] Error processing session:', err);
        navigate('/login', { replace: true });
      }
    };

    processOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
        color: '#a0aec0',
        background: '#0f172a',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: '4px solid #334155',
          borderTop: '4px solid #63e6be',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ fontSize: '16px', margin: 0 }}>Completing sign-in…</p>
    </div>
  );
};

export default AuthCallbackPage;
