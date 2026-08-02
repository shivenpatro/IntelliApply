import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const IntelliApplyLogo = () => (
  <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--accent)' }}>
    <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor"/>
    <path d="M20 10L22.6601 17.3399L30 20L22.6601 22.6601L20 30L17.3399 22.6601L10 20L17.3399 17.3399L20 10Z" fill="var(--bg-surface)"/>
  </svg>
);

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
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
);

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      {/* Logo */}
      <div className="flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <IntelliApplyLogo />
          <span className="text-accent-gradient" style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: '18px', WebkitTextFillColor: 'unset', background: 'linear-gradient(135deg, var(--text-primary), var(--accent))', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            IntelliApply
          </span>
        </Link>
      </div>

      {/* Center nav links (desktop) */}
      <div className="hidden sm:flex items-center gap-1">
        {isAuthenticated ? (
          <>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `nav-link btn-ghost ${isActive ? 'active font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
              })}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `nav-link btn-ghost ${isActive ? 'active font-semibold' : ''}`
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                fontWeight: isActive ? 600 : 500,
              })}
            >
              Profile
            </NavLink>
          </>
        ) : (
          <>
            <a href="#features" className="nav-link btn-ghost" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Features</a>
            <a href="#how-it-works" className="nav-link btn-ghost" style={{ fontFamily: "'Inter', sans-serif", fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>How It Works</a>
          </>
        )}
      </div>

      {/* Right CTAs (desktop) */}
      <div className="hidden sm:flex items-center gap-3">
        {isAuthenticated ? (
          <button onClick={handleLogout} className="btn btn-ghost" style={{ gap: '6px' }}>
            <LogoutIcon />
            Logout
          </button>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Login</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="flex items-center sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <span className="sr-only">Open main menu</span>
          {mobileMenuOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu"
          style={{
            position: 'absolute',
            top: '60px',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: 'var(--space-4)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-ghost"
                  style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-ghost"
                  style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}
                >
                  Profile
                </NavLink>
                <button
                  onClick={handleLogout}
                  className="btn-ghost"
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: '10px 14px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', textDecoration: 'none', fontFamily: "'Inter', sans-serif", fontSize: '15px' }}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary"
                  style={{ display: 'block', textAlign: 'center', marginTop: 'var(--space-2)' }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
