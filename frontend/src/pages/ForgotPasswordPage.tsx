import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLoadingState } from '../hooks/useLoadingState';

const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);

  useEffect(() => {
    return () => resetLoading();
  }, [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const response = await fetch(`${NEON_AUTH_URL}/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/update-password`,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send reset email. Please try again.');
      }

      setMessage('If an account exists for this email, a password reset link has been sent. Please check your inbox (and spam folder).');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left: Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-logo">
          <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
            <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="white"/>
          </svg>
          IntelliApply
        </div>

        <div>
          <h2 className="auth-brand-headline">We've got<br />your back.</h2>
          <p className="auth-brand-sub">
            Password resets happen. We'll send you a secure link to get back into your account in seconds.
          </p>
        </div>

        <div className="auth-testimonial">
          <p className="auth-testimonial-text">
            "The security flow was seamless. Got my reset link instantly and was back in action within a minute."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">MR</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>Mark R.</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Engineering Manager</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">Forgot your password?</h2>
          <p className="auth-form-subtitle">
            Enter your email address and we'll send you a link to reset it.{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              Back to login
            </Link>
          </p>

          {error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '18px' }}>
              {error}
            </div>
          )}

          {message && (
            <div className="alert alert-success" role="alert" style={{ marginBottom: '18px' }}>
              {message}
            </div>
          )}

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
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                    Sending...
                  </>
                ) : 'Send Reset Link'}
              </button>
            </form>
          )}

          {message && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link to="/login" style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
