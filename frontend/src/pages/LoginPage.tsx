import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoadingState } from '../hooks/useLoadingState';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const { login, loginWithGoogle, error: authContextError, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const navigate = useNavigate();

  useEffect(() => {
    return () => resetLoading();
  }, [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Login request timed out')), 10000));
      await Promise.race([login(email, password), timeoutPromise]);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message?.includes('timed out')) {
        setLoginError('Login request timed out. Please try again later.');
      } else if (err.message?.includes('Too many requests')) {
        setLoginError('Too many login attempts. Please wait a moment and try again.');
      } else {
        setLoginError(err.message || 'Failed to log in. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearErrors = () => {
    setLoginError(null);
    clearError();
  };

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setLoginError(err.message || 'Failed to login with Google');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-theme-surface p-8 sm:p-10 rounded-xl shadow-2xl max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-display font-extrabold text-theme-text-primary">
            Sign in to IntelliApply
          </h2>
          <p className="mt-2 text-center text-sm text-theme-text-secondary">
            Or{' '}
            <Link to="/register" className="font-medium text-theme-accent-cyan hover:text-theme-accent-cyan-darker">
              create a new account
            </Link>
          </p>
        </div>

        {(loginError || authContextError) && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline">{loginError || authContextError}</span>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-theme-text-secondary mb-1">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); handleClearErrors(); }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-theme-text-secondary mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); handleClearErrors(); }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-theme-accent-cyan bg-theme-bg border-slate-600 focus:ring-theme-accent-cyan rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-theme-text-secondary">
                Remember me
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-70 transition-colors mb-4"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-theme-surface text-theme-text-secondary">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-slate-700 rounded-md shadow-sm text-sm font-semibold text-theme-text-primary bg-theme-bg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-70 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
