import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom'; // Using NavLink for active styling
import { useAuth } from '../../context/AuthContext';

// Heroicons (example, you might install @heroicons/react)
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

// A simple, abstract logo SVG - replace with your actual logo component if you have one
const IntelliApplyLogo = () => (
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2 text-theme-accent-cyan">
        <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor"/>
        <path d="M20 10L22.6601 17.3399L30 20L22.6601 22.6601L20 30L17.3399 22.6601L10 20L17.3399 17.3399L20 10Z" fill="#0A192F"/>
    </svg>
);


const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout(); // AuthContext logout should handle navigation or state update
    navigate('/'); // Navigate to home after logout
  };

  const navLinkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
  const activeNavLinkClasses = "text-theme-accent-cyan";
  const inactiveNavLinkClasses = "text-theme-text-secondary hover:text-theme-text-primary";
  
  const mobileNavLinkClasses = "block px-3 py-2 rounded-md text-base font-medium transition-colors duration-150";
  const activeMobileNavLinkClasses = "bg-theme-surface text-theme-accent-cyan";
  const inactiveMobileNavLinkClasses = "text-theme-text-secondary hover:bg-theme-surface hover:text-theme-text-primary";


  return (
    <nav className="sticky top-0 z-50 bg-theme-bg/80 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand Name */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <IntelliApplyLogo />
              <span className="font-display text-2xl font-bold text-theme-text-primary">IntelliApply</span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {isAuthenticated && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : inactiveNavLinkClasses}`}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : inactiveNavLinkClasses}`}
                >
                  Profile
                </NavLink>
              </>
            )}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 border border-theme-text-secondary text-sm font-medium rounded-md text-theme-text-secondary hover:text-theme-accent-amber hover:border-theme-accent-amber transition-colors duration-150"
              >
                <LogoutIcon />
                Logout
              </button>
            ) : (
              <div className="space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 border border-theme-accent-cyan text-sm font-medium rounded-md text-theme-accent-cyan hover:bg-theme-accent-cyan/10 transition-colors duration-150"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker transition-colors duration-150 shadow-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-theme-text-primary hover:text-theme-accent-cyan hover:bg-theme-surface focus:outline-none focus:ring-2 focus:ring-inset focus:ring-theme-accent-cyan"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-theme-bg border-t border-theme-surface" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `${mobileNavLinkClasses} ${isActive ? activeMobileNavLinkClasses : inactiveMobileNavLinkClasses}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => `${mobileNavLinkClasses} ${isActive ? activeMobileNavLinkClasses : inactiveMobileNavLinkClasses}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Profile
                </NavLink>
                <button
                  onClick={handleLogout}
                  className={`${mobileNavLinkClasses} ${inactiveMobileNavLinkClasses} w-full text-left`}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) => `${mobileNavLinkClasses} ${isActive ? activeMobileNavLinkClasses : inactiveMobileNavLinkClasses}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) => `${mobileNavLinkClasses} ${isActive ? activeMobileNavLinkClasses : inactiveMobileNavLinkClasses}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
