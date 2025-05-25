import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useLoadingState } from '../hooks/useLoadingState';

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { session, loading: authLoading } = useAuth();
  const [loading, setLoading, resetLoading] = useLoadingState(false, 15000);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session && !message) { // Added !message to prevent error flash after success
      setError("Invalid or expired password reset link. Please request a new one or try logging in.");
    }
    return () => resetLoading();
  }, [session, authLoading, resetLoading, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: password });
      if (updateError) {
        throw updateError;
      }
      setMessage('Your password has been updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password. The link may have expired, or already been used. Please try requesting a new link.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearLocalError = () => {
    setError(null);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-accent-cyan mb-4"></div>
        <p className="text-xl">Verifying reset link...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-theme-surface p-8 sm:p-10 rounded-xl shadow-2xl max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-display font-extrabold text-theme-text-primary">
            Update Your Password
          </h2>
        </div>

        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline">{error}</span>
            {error.includes("Invalid or expired") && (
                 <p className="mt-2 text-sm">
                    <Link to="/forgot-password" className="font-medium text-amber-200 hover:text-amber-100 underline">
                        Request a new reset link
                    </Link>
                    <span className="mx-1">or</span>
                    <Link to="/login" className="font-medium text-amber-200 hover:text-amber-100 underline">
                        try logging in
                    </Link>.
                 </p>
            )}
          </div>
        )}

        {message && (
          <div className="bg-theme-accent-cyan/10 border border-theme-accent-cyan/30 text-theme-accent-cyan px-4 py-3 rounded-md relative" role="alert">
            <span className="block sm:inline">{message}</span>
          </div>
        )}

        {session && !message && ( // Only show form if session is valid and no success message
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-theme-text-secondary mb-1">
                New Password
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
                placeholder="Enter new password (min. 8 characters)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleClearLocalError();
                }}
              />
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-medium text-theme-text-secondary mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                name="confirm-new-password"
                type="password"
                required
                className="appearance-none block w-full px-3 py-2 bg-theme-bg border border-slate-700 rounded-md shadow-sm placeholder-slate-500 text-theme-text-primary focus:outline-none focus:ring-2 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan sm:text-sm"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  handleClearLocalError();
                }}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan disabled:opacity-70 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
         {!session && !message && !authLoading && ( // If no session, no message, and not auth loading, show link to login
            <div className="text-center">
                <Link to="/login" className="font-medium text-theme-accent-cyan hover:text-theme-accent-cyan-darker">
                    Back to Login
                </Link>
            </div>
        )}
      </div>
    </div>
  );
};

export default UpdatePasswordPage;
