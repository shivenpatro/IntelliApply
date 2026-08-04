import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const IntelliApplyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor" />
  </svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/');
  };

  const linkStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "'Inter', sans-serif",
    fontSize: 13,
    fontWeight: active ? 600 : 500,
    letterSpacing: '0.02em',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    textDecoration: 'none',
  });

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent)' }}><IntelliApplyLogo /></span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 15, letterSpacing: '0.01em' }}>
            IntelliApply
          </span>
        </Link>
      </div>

      {/* Center nav (desktop) */}
      <div className="hidden sm:flex items-center gap-1">
        {isAuthenticated ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link btn-ghost ${isActive ? 'active' : ''}`} style={({ isActive }) => linkStyle(!!isActive)}>
              Dashboard
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-link btn-ghost ${isActive ? 'active' : ''}`} style={({ isActive }) => linkStyle(!!isActive)}>
              Profile
            </NavLink>
          </>
        ) : (
          <>
            <a href="#process" className="nav-link btn-ghost" style={linkStyle(false)}>Process</a>
            <a href="#features" className="nav-link btn-ghost" style={linkStyle(false)}>Method</a>
          </>
        )}
      </div>

      {/* Right CTAs (desktop) */}
      <div className="hidden sm:flex items-center gap-2">
        {isAuthenticated ? (
          <button onClick={handleLogout} className="btn btn-ghost">
            Sign out
          </button>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost">Sign in</Link>
            <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: '9px 18px' }}>Begin</Link>
          </>
        )}
      </div>

      {/* Mobile menu button */}
      <div className="flex items-center sm:hidden">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
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
            top: 64,
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            padding: 'var(--space-5) var(--space-4)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 15, fontFamily: "'Playfair Display', serif" }}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ display: 'block', padding: '12px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: 15, fontFamily: "'Playfair Display', serif" }}
                >
                  Profile
                </NavLink>
                <button
                  onClick={handleLogout}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: "'Playfair Display', serif", fontSize: 15 }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} style={{ display: 'block', padding: '12px 14px', color: 'var(--text-primary)', textDecoration: 'none', fontFamily: "'Playfair Display', serif", fontSize: 15 }}>
                  Sign in
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="btn btn-primary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
                  Begin
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
