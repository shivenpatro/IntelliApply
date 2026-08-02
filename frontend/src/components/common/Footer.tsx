import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer" style={{ position: 'relative' }}>
      {/* Gradient top border */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, var(--accent), #818cf8, transparent)',
        opacity: 0.3,
      }} />
      <div className="footer-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: 'var(--accent)' }}>
            <path d="M20 0L25.3301 14.6699L40 20L25.3301 25.3301L20 40L14.6699 25.3301L0 20L14.6699 14.6699L20 0Z" fill="currentColor"/>
          </svg>
          <span className="footer-copy" style={{ fontWeight: 600, color: 'var(--text-secondary)', fontFamily: "'Sora', sans-serif" }}>IntelliApply</span>
        </div>
        <p className="footer-copy">
          &copy; {new Date().getFullYear()} IntelliApply. Apply smarter, not harder.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Link to="/" className="nav-link" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>Home</Link>
          <Link to="/login" className="nav-link" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>Login</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
