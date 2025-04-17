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
  const { register, error, clearError } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const navigate = useNavigate();

  // Reset loading state when component unmounts
  useEffect(() => {
    return () => resetLoading();
  }, [resetLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegistrationSuccess(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setRegisterError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setRegisterError('Password must be at least 8 characters long');
      return;
    }

    // Show a message to the user that registration is in progress
    setRegisterError('Registration in progress, please wait...');
    setLoading(true);

    try {
      console.log('Registration form submitted for:', email);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Registration timed out'));
        }, 10000); // 10 seconds timeout for the registration process
      });

      // Race between registration and timeout
      await Promise.race([
        register(email, password),
        timeoutPromise
      ]);

      // If we get here, registration was successful
      setRegisterError(null); // Clear any error messages
      setRegistrationSuccess(true); // Show success message

      // Clear form
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      console.log('Registration successful');
    } catch (err: any) {
      // Error is handled by AuthContext and available in the error state
      console.error('Registration error in component:', err);

      // Use the error from AuthContext or set a generic one
      if (err.message?.includes('timed out')) {
        setRegisterError('Registration timed out. Please try again later.');
      } else if (err.message?.includes('already registered')) {
        setRegisterError('This email is already registered. Please try logging in instead.');
      } else {
        setRegisterError(err.message || 'Failed to register. Please try again later.');
      }
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  // Clear any auth context errors when unmounting or when form fields change
  const clearErrors = () => {
    setRegisterError(null);
    clearError();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>

        {/* Show error message if registration failed */}
        {(registerError || error) && (
          <div className={`px-4 py-3 rounded relative ${registerError === 'Registration in progress, please wait...' ? 'bg-blue-100 border border-blue-400 text-blue-700' : 'bg-red-100 border border-red-400 text-red-700'}`} role="alert">
            <span className="block sm:inline">{registerError || error}</span>
            {registerError === 'Registration in progress, please wait...' && (
              <div className="mt-2 flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                <span>This may take a few moments...</span>
              </div>
            )}
          </div>
        )}

        {/* Show success message after registration */}
        {registrationSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline font-medium">Registration successful!</span>
            <p className="mt-2">Please check your email (including spam folder) to confirm your account before logging in.</p>
            <p className="mt-1 text-sm">
              <strong>Note for development:</strong> If email confirmation is disabled in Supabase, you can try logging in immediately.
            </p>
            <div className="mt-3">
              <Link to="/login" className="text-green-800 font-medium hover:text-green-900 underline">
                Go to login page
              </Link>
            </div>
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
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearErrors();
                }}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  clearErrors();
                }}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
