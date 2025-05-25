import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoadingState } from '../hooks/useLoadingState';
import { signInWithGoogle } from '../lib/supabase';

// Placeholder for a themed Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10c2.296 0 4.42-.78 6.132-2.085l-2.34-2.34A5.965 5.965 0 0110 16c-3.309 0-6-2.691-6-6s2.691-6 6-6c1.595 0 3.036.621 4.121 1.633l1.838-1.838A9.953 9.953 0 0010 0zm8.293 11.707A5.974 5.974 0 0116 10c0-1.595-.621-3.036-1.633-4.121L12.53 4.04A7.965 7.965 0 0010 2c-4.411 0-8 3.589-8 8s3.589 8 8 8c2.046 0 3.903-.775 5.303-2.04l1.837 1.837A9.953 9.953 0 0020 10c0-.695-.118-1.365-.332-2H10v3.414h4.793a4.002 4.002 0 01-1.707 2.586l2.207 2.207A7.965 7.965 0 0018.293 11.707z" clipRule="evenodd" />
  </svg>
);

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { register, error: authContextError, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  // const navigate = useNavigate(); // Not used directly for navigation on success, success message shown instead

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

    setRegisterError('Registration in progress, please wait...'); // Use a neutral or theme-specific info style
    setLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Registration timed out')), 10000));
      await Promise.race([register(email, password), timeoutPromise]);
      
      setRegisterError(null);
      setRegistrationSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.message?.includes('timed out')) {
        setRegisterError('Registration timed out. Please try again later.');
      } else if (err.message?.includes('already registered') || authContextError?.includes('already registered')) {
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
    clearError(); // Clear error from AuthContext
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

        {registerError && !registrationSuccess && (
          <div className={`px-4 py-3 rounded-md relative ${registerError === 'Registration in progress, please wait...' ? 'bg-sky-500/10 border border-sky-500/30 text-sky-300' : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'}`} role="alert">
            <span className="block sm:inline">{registerError}</span>
            {registerError === 'Registration in progress, please wait...' && (
              <div className="mt-2 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-300 mr-2"></div>
                <span>This may take a few moments...</span>
              </div>
            )}
          </div>
        )}
        
        {authContextError && !registrationSuccess && !registerError && (
             <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-md relative" role="alert">
                <span className="block sm:inline">{authContextError || "An unexpected error occurred."}</span>
            </div>
        )}


        {registrationSuccess && (
          <div className="bg-theme-accent-cyan/10 border border-theme-accent-cyan/30 text-theme-accent-cyan px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline font-medium">Registration successful!</span>
            <p className="mt-2 text-sm">Please check your email (including spam folder) to confirm your account before logging in.</p>
            <div className="mt-3">
              <Link to="/login" className="font-medium text-theme-accent-cyan hover:text-theme-accent-cyan-darker underline">
                Go to login page
              </Link>
            </div>
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

        {!registrationSuccess && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-slate-700" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-theme-surface text-theme-text-secondary">Or sign up with</span></div>
            </div>
            <div className="mt-6">
              <button
                onClick={async () => { 
                  setLoading(true); handleClearErrors();
                  try { await signInWithGoogle(); } 
                  catch (err: any) { setRegisterError(err.message || 'Failed to sign up with Google.'); setLoading(false); }
                }}
                disabled={loading}
                className="w-full inline-flex justify-center py-3 px-4 border border-slate-600 rounded-md shadow-sm bg-theme-bg text-sm font-medium text-theme-text-primary hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-70 transition-colors"
              >
                <span className="sr-only">Sign up with Google</span>
                <GoogleIcon /> <span className="ml-2">Sign up with Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
