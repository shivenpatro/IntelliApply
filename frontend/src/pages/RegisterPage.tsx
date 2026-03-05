import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoadingState } from '../hooks/useLoadingState';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, error: authContextError, clearError } = useAuth();
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

      // Registration successful — navigate to dashboard
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-theme-surface p-8 sm:p-10 rounded-xl shadow-2xl max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-display font-extrabold text-theme-text-primary">
            Create Your IntelliApply Account
          </h2>
          <p className="mt-2 text-center text-sm text-theme-text-secondary">
            Or{' '}
            <Link to="/login" className="font-medium text-theme-accent-cyan hover:text-theme-accent-cyan-darker">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {(registerError || authContextError) && !registrationSuccess && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline">{registerError || authContextError}</span>
          </div>
        )}

        {registrationSuccess && (
          <div className="bg-theme-accent-cyan/10 border border-theme-accent-cyan/30 text-theme-accent-cyan px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline font-medium">Registration successful!</span>
            <p className="mt-2 text-sm">Redirecting to your dashboard...</p>
          </div>
        )}

        {!registrationSuccess && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-theme-text-secondary mb-1">Email address</label>
              <input
                id="email-address" name="email" type="email" autoComplete="email" required
                className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
                placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); handleClearErrors(); }}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-theme-text-secondary mb-1">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="new-password" required
                className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
                placeholder="Password (min. 8 characters)" value={password} onChange={(e) => { setPassword(e.target.value); handleClearErrors(); }}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-theme-text-secondary mb-1">Confirm Password</label>
              <input
                id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required
                className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
                placeholder="Confirm Password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); handleClearErrors(); }}
              />
            </div>
            <div>
              <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-70 transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
