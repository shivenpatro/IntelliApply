import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLoadingState } from '../hooks/useLoadingState';

const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth';

const IntelliApplyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor"/>
  </svg>
);

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);

  useEffect(() => () => resetLoading(), [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${NEON_AUTH_URL}/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo: `${window.location.origin}/update-password` }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send reset email. Please try again.');
      }
      setMessage('If an account exists for this email, a password reset link has been sent. Check your inbox (and spam folder).');
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left: Editorial brand panel */}
      <div className="auth-brand-panel">
        <Link to="/" className="auth-brand-logo" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
          <span style={{ color: 'var(--accent)' }}><IntelliApplyLogo /></span>
          <span>IntelliApply</span>
        </Link>

        <div>
          <div className="eyebrow-rule" style={{ marginBottom: 'var(--space-6)' }}>№ AUTH / 003</div>
          <h2 className="auth-brand-headline">
            We've got<br />
            <em>your back.</em>
          </h2>
          <p className="auth-brand-sub">
            Password resets happen. We'll send a secure link to get you back in seconds.
          </p>
        </div>

        <div className="auth-testimonial">
          <p className="auth-testimonial-text">
            "The security flow was seamless. Got my reset link instantly and was back in action within a minute."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">MR</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Mark R.</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>Engineering Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">Forgot your password?</h2>
          <p className="auth-form-subtitle">
            Enter your email and we'll send a reset link.{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              Back to login
            </Link>
          </p>

          {error && <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>{error}</div>}
          {message && <div className="alert alert-success" role="alert" style={{ marginBottom: 18 }}>{message}</div>}

          {!message && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email-address" className="input-label">Email address</label>
                <input
                  id="email-address" name="email" type="email" autoComplete="email" required
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                    Sending…
                  </>
                ) : 'Send reset link'}
              </button>
            </form>
          )}

          {message && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Link to="/login" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                ← Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
