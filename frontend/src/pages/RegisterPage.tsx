import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoadingState } from '../hooks/useLoadingState';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, loginWithGoogle, error: authContextError, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const navigate = useNavigate();

  useEffect(() => {
    return () => resetLoading();
  }, [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegistrationSuccess(false);

    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setRegisterError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Registration timed out')), 10000));
      await Promise.race([register(email, password), timeoutPromise]);

      setRegistrationSuccess(true);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message?.includes('timed out')) {
        setRegisterError('Registration timed out. Please try again later.');
      } else if (err.message?.includes('already registered') || err.message?.includes('already exists')) {
        setRegisterError('This email is already registered. Please try logging in.');
      } else {
        setRegisterError(err.message || authContextError || 'Failed to register. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = () => {
    setRegisterError(null);
    clearError();
  };

  const handleGoogleRegister = async () => {
    setRegisterError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to register with Google');
    }
  };

  /* Password strength calculation */
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'transparent' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { label: 'Very Weak', color: '#DC2626' },
      { label: 'Weak', color: '#F59E0B' },
      { label: 'Fair', color: '#D97706' },
      { label: 'Good', color: '#059669' },
      { label: 'Strong', color: '#059669' },
    ];
    const level = levels[Math.min(score, levels.length) - 1] || levels[0];
    return { score, label: level.label, color: level.color };
  }, [password]);

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
          <h2 className="auth-brand-headline">Start your<br />smarter job search.</h2>
          <p className="auth-brand-sub">
            Join thousands of candidates who use AI-powered matching to find roles that truly fit their skills and career goals.
          </p>
        </div>

        <div className="auth-testimonial">
          <p className="auth-testimonial-text">
            "The match scoring is uncanny — it found roles I would have never discovered on my own. Saved me weeks of searching."
          </p>
          <div className="auth-testimonial-author">
            <div className="auth-testimonial-avatar">SP</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>Sarah P.</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Product Designer, now at Figma</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          <h2 className="auth-form-title">Create your account</h2>
          <p className="auth-form-subtitle">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>

          {(registerError || authContextError) && !registrationSuccess && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '18px' }}>
              {registerError || authContextError}
            </div>
          )}

          {registrationSuccess && (
            <div className="alert alert-success" role="alert" style={{ marginBottom: '18px' }}>
              <strong>Registration successful!</strong>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>Redirecting to your dashboard...</p>
            </div>
          )}

          {!registrationSuccess && (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email-address" className="input-label">Email address</label>
                <input
                  id="email-address" name="email" type="email" autoComplete="email" required
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); handleClearErrors(); }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="input-label">Password</label>
                <input
                  id="password" name="password" type="password" autoComplete="new-password" required
                  className="input-field"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); handleClearErrors(); }}
                />
                {/* Password strength meter */}
                {password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i <= passwordStrength.score ? passwordStrength.color : 'var(--bg-subtle)',
                          transition: 'background-color 0.3s ease',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '11px', color: passwordStrength.color, fontWeight: 500, transition: 'color 0.3s ease' }}>
                      {passwordStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password" className="input-label">Confirm Password</label>
                <input
                  id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required
                  className="input-field"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); handleClearErrors(); }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {loading ? (
                  <>
                    <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                    Creating Account...
                  </>
                ) : 'Create Account'}
              </button>

              <div className="form-divider">or continue with</div>

              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={loading}
                className="btn btn-google"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
