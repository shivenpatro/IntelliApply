import { Link } from 'react-router-dom';

const IntelliApplyLogo = () => (
  <svg width="16" height="16" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--accent)' }}><IntelliApplyLogo /></span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>
            IntelliApply
          </span>
        </div>
        <p className="footer-copy" style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic' }}>
          Apply smarter, not harder.
        </p>
        <p className="footer-copy">
          © {new Date().getFullYear()} IntelliApply · All matches reserved.
        </p>
        <div style={{ display: 'flex', gap: '14px' }}>
          <Link to="/" className="nav-link" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Home</Link>
          <Link to="/login" className="nav-link" style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sign in</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
