import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Helper to determine if a link is active
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-white flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                IntelliApply
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Navigation links */}
              {isAuthenticated && (
                <>
                  <Link
                    to="/dashboard"
                    className={`${isActive('/dashboard')
                      ? 'border-white text-white'
                      : 'border-transparent text-blue-100 hover:border-blue-200 hover:text-white'}
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/profile"
                    className={`${isActive('/profile')
                      ? 'border-white text-white'
                      : 'border-transparent text-blue-100 hover:border-blue-200 hover:text-white'}
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                  >
                    Profile
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Auth buttons */}
            {isAuthenticated ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Logout button clicked');
                  // Clear local storage immediately
                  const storageKeys = Object.keys(localStorage);
                  storageKeys.forEach(key => {
                    if (key.includes('supabase') || key.includes('sb-')) {
                      localStorage.removeItem(key);
                    }
                  });
                  // Call logout and force redirect
                  logout();
                  // Force redirect regardless of logout success
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 100);
                }}
                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="ml-4 inline-flex items-center px-4 py-2 border border-white text-sm font-medium rounded-md shadow-sm text-blue-600 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors duration-200"
                >
                  Register
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {/* Icon when menu is closed */}
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {/* Icon when menu is open */}
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1 bg-blue-800">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className={`${isActive('/dashboard')
                  ? 'bg-indigo-800 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'}
                  block pl-3 pr-4 py-2 text-base font-medium`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/profile"
                className={`${isActive('/profile')
                  ? 'bg-indigo-800 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'}
                  block pl-3 pr-4 py-2 text-base font-medium`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  console.log('Mobile logout button clicked');
                  setMobileMenuOpen(false);
                  // Clear local storage immediately
                  const storageKeys = Object.keys(localStorage);
                  storageKeys.forEach(key => {
                    if (key.includes('supabase') || key.includes('sb-')) {
                      localStorage.removeItem(key);
                    }
                  });
                  // Call logout and force redirect
                  logout();
                  // Force redirect regardless of logout success
                  setTimeout(() => {
                    window.location.href = '/';
                  }, 100);
                }}
                className="block w-full text-left pl-3 pr-4 py-2 text-base font-medium text-blue-100 hover:bg-blue-700 hover:text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`${isActive('/login')
                  ? 'bg-indigo-800 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'}
                  block pl-3 pr-4 py-2 text-base font-medium`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`${isActive('/register')
                  ? 'bg-indigo-800 text-white'
                  : 'text-blue-100 hover:bg-blue-700 hover:text-white'}
                  block pl-3 pr-4 py-2 text-base font-medium`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
