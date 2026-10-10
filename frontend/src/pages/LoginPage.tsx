import { errorMessage } from '../lib/errors';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth';
import { useLoadingState } from '../hooks/useLoadingState';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, loginWithGoogle, error: authContextError, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => () => resetLoading(), [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);
    try {
      await login(email, password);
      if (mounted.current) navigate(['/profile', '/dashboard'].includes(location.state?.from) ? location.state.from : '/dashboard');
    } catch (err: unknown) {
      if (errorMessage(err).includes('timed out')) setLoginError('Login request timed out. Please try again later.');
      else if (errorMessage(err).includes('Too many requests')) setLoginError('Too many login attempts. Please wait a moment and try again.');
      else setLoginError(errorMessage(err) || 'Failed to log in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = () => { setLoginError(null); clearError(); };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try { await loginWithGoogle(); } catch (err: unknown) { setLoginError(errorMessage(err) || 'Failed to login with Google'); }
  };

  return (
    <div className="auth-page">
      {/* Left: Editorial brand panel */}
      <div className="auth-brand-panel">
        <div>
          <div className="eyebrow-rule" style={{ marginBottom: 'var(--space-6)' }}>№ AUTH / 001</div>
          <h2 className="auth-brand-headline">
            Your next job<br />
            <em>finds you.</em>
          </h2>
          <p className="auth-brand-sub">
            AI-powered matching that surfaces the roles worth applying to — quietly, behind the noise.
          </p>
        </div>

        <div className="auth-testimonial">
          <p className="auth-testimonial-text">
            Keep your experience, skills and job preferences together, then track the opportunities you choose to pursue.
          </p>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">Welcome back</h2>
          <p className="auth-form-subtitle">
            Sign in to continue.{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              Create an account
            </Link>
          </p>

          {(loginError || authContextError) && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
              {loginError || authContextError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email-address" className="input-label">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); handleClearErrors(); }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="input-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleClearErrors(); }}
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
              {loading ? (
                <>
                  <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="form-divider">or continue with</div>

          <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn btn-google">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>
              Forgot your password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
