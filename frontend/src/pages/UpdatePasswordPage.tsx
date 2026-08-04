import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLoadingState } from '../hooks/useLoadingState';

const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL ||
  'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech/neondb/auth';

const IntelliApplyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor"/>
  </svg>
);

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) setResetToken(token);
    else setError('Invalid or expired password reset link. Please request a new one.');
    return () => resetLoading();
  }, [resetLoading]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
      { label: 'Very Weak', color: '#A43D2F' },
      { label: 'Weak', color: '#B5623D' },
      { label: 'Fair', color: '#A86B18' },
      { label: 'Good', color: '#2E8B5F' },
      { label: 'Strong', color: '#1B5E42' },
    ];
    const level = levels[Math.min(score, levels.length) - 1] || levels[0];
    return { score, label: level.label, color: level.color };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }

    setLoading(true);
    try {
      const response = await fetch(`${NEON_AUTH_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, newPassword: password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to update password. The link may have expired.');
      }
      setMessage('Password updated successfully. Redirecting to login…');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please request a new link.');
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
          <div className="eyebrow-rule" style={{ marginBottom: 'var(--space-6)' }}>№ AUTH / 004</div>
          <h2 className="auth-brand-headline">
            Set your new<br />
            <em>password.</em>
          </h2>
          <p className="auth-brand-sub">
            Choose a strong, unique password to keep your account secure.
          </p>
        </div>

        <div className="auth-testimonial">
          <p className="auth-testimonial-text">
            "Quick password reset and back to my job matches in no time."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">JL</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Jessica L.</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>Data Analyst</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">Update your password</h2>
          <p className="auth-form-subtitle">Choose a strong new password for your account.</p>

          {error && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 18 }}>
              {error}
              {error.includes('Invalid or expired') && (
                <p style={{ marginTop: 8, fontSize: 13 }}>
                  <Link to="/forgot-password" style={{ color: 'var(--alert-error-text)', fontWeight: 500 }}>
                    Request a new reset link
                  </Link>
                  <span style={{ margin: '0 4px' }}>or</span>
                  <Link to="/login" style={{ color: 'var(--alert-error-text)', fontWeight: 500 }}>
                    try logging in
                  </Link>.
                </p>
              )}
            </div>
          )}

          {message && <div className="alert alert-success" role="alert" style={{ marginBottom: 18 }}>{message}</div>}

          {resetToken && !message && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="new-password" className="input-label">New Password</label>
                <input
                  id="new-password" name="new-password" type="password" required
                  className="input-field"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                />
                {password && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} style={{
                          flex: 1, height: 2,
                          background: i <= passwordStrength.score ? passwordStrength.color : 'var(--bg-subtle)',
                          transition: 'background-color 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: passwordStrength.color, fontWeight: 500, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em' }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="confirm-new-password" className="input-label">Confirm New Password</label>
                <input
                  id="confirm-new-password" name="confirm-new-password" type="password" required
                  className="input-field"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                    Updating…
                  </>
                ) : 'Update password'}
              </button>
            </form>
          )}

          {!resetToken && !message && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
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

export default UpdatePasswordPage;
