import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoadingState } from '../hooks/useLoadingState';
import { resendConfirmationEmail } from '../lib/supabase';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { login, error, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const navigate = useNavigate();

  // Reset loading state when component unmounts
  useEffect(() => {
    return () => resetLoading();
  }, [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setConfirmationSent(false);
    setLoading(true);

    try {
      console.log('Login form submitted for:', email);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Login request timed out'));
        }, 10000);
      });

      // Race between login and timeout
      await Promise.race([
        login(email, password),
        timeoutPromise
      ]);

      // If we got here, login was successful - navigate to dashboard
      console.log('Login successful, navigating to dashboard');
      navigate('/dashboard');
    } catch (err: any) {
      // Error is handled by AuthContext and available in the error state
      console.error('Login error in component:', err);

      // Check if it's an email confirmation error
      if (error && error.includes('Email not confirmed')) {
        setLoginError('Your email has not been confirmed. Please check your inbox for a confirmation email.');
      } else if (err.message?.includes('timed out')) {
        setLoginError('Login request timed out. Please try again later.');
      } else if (err.message?.includes('Too many requests')) {
        setLoginError('Too many login attempts. Please wait a moment and try again.');
      } else {
        setLoginError('Failed to log in. Please check your credentials and try again.');
      }
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setLoginError('Please enter your email address to resend the confirmation email.');
      return;
    }

    try {
      setLoading(true); // Show loading state
      console.log(`Requesting confirmation email resend for: ${email}`);

      const { error } = await resendConfirmationEmail(email);

      if (error) {
        console.error('Error from resendConfirmationEmail:', error);
        setLoginError(`Failed to resend confirmation email: ${error.message}`);
      } else {
        // Even if the API call succeeds, the email might not be delivered
        // So we inform the user about both possibilities
        setConfirmationSent(true);
        setLoginError(null);
      }
    } catch (err) {
      console.error('Exception in handleResendConfirmation:', err);
      setLoginError('Failed to resend confirmation email. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Clear any auth context errors when unmounting or when form fields change
  const clearErrors = () => {
    setLoginError(null);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>

        {/* Show error message if login failed */}
        {(loginError || error) && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{loginError || error}</span>
            {(loginError?.includes('not been confirmed') || error?.includes('not confirmed')) && (
              <button
                onClick={handleResendConfirmation}
                className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                type="button"
              >
                Resend confirmation email
              </button>
            )}
          </div>
        )}

        {/* Show success message when confirmation email is sent */}
        {confirmationSent && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline font-medium">Confirmation email request sent!</span>
            <p className="mt-2">Please check your inbox (and spam folder) for the confirmation email.</p>
            <p className="mt-1 text-sm">
              <strong>Note:</strong> If you don't receive an email, please contact support or try registering with a different email address.
            </p>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearErrors();
                }}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearErrors();
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
