import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth';
import TextReveal from '../components/motion/TextReveal';
import MagneticButton from '../components/motion/MagneticButton';
import ParallaxImage from '../components/motion/ParallaxImage';

import DecorativeOrb from '../components/common/DecorativeOrb';

/* ── Inline SVG icons ── */
const ArrowRightIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813L20 12l-6.088 3.187L12 21l-1.912-5.813L4 12l6.088-3.187L12 3z" />
  </svg>
);

/* ── Animated count-up with shared observer ── */
const useCountUp = (target: string, duration = 1600) => {
  const [count, setCount] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting || started.current) return;
        started.current = true;

        const numeric = parseFloat(target.replace(/[^0-9.]/g, ''));
        const suffix = target.replace(/[0-9.]/g, '');
        const dec = target.includes('.');
        const t0 = performance.now();

        const tick = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const v = numeric * eased;
          setCount(dec ? v.toFixed(1) + suffix : Math.floor(v).toLocaleString() + suffix);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
};

/* ── Process rows data ── */
const PROCESS_ROWS = [
  {
    index: '01',
    titleLine1: 'Your skills,',
    titleLine2: 'extracted.',
    eyebrow: 'Resume Intelligence',
    body: 'Upload a PDF or DOCX to extract your skills and work experience. Review the results and edit your profile before searching.',
    link: { to: '/register', label: 'Learn more' },
  },
  {
    index: '02',
    titleLine1: 'Jobs found,',
    titleLine2: 'in one place.',
    eyebrow: 'Job Discovery',
    body: 'Refresh listings from Hacker News. WeWorkRemotely is also supported when enabled. Duplicate links are combined before ranking.',
    link: { to: '/register', label: 'Learn more' },
  },
  {
    index: '03',
    titleLine1: 'Your profile,',
    titleLine2: 'your shortlist.',
    eyebrow: 'Profile Matching',
    body: 'Listings are ranked by text similarity to your skills, work experience and preferences. Scores help you compare roles; they do not predict hiring outcomes.',
    link: { to: '/register', label: 'Learn more' },
  },
];

/* ── Editorial visuals per process row ── */
const ResumeVisual = () => (
  <div className="feature-visual-resume card-hover">
    <div className="field-row">
      <span className="field-label">Name</span>
      <span className="field-value">Alex Chen</span>
    </div>
    <div className="field-row">
      <span className="field-label">Skills</span>
      <span className="field-highlight">React</span>
      <span className="field-highlight">TypeScript</span>
      <span className="field-highlight">Python</span>
    </div>
    <div className="field-row">
      <span className="field-label">Level</span>
      <span className="field-value">Senior · 5+ yrs</span>
    </div>
    <div className="field-row">
      <span className="field-label">Focus</span>
      <span className="field-value">Full-Stack Engineering</span>
    </div>
  </div>
);

const FeedVisual = () => (
  <div className="feature-visual-feed card-hover">
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '10px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      padding: '0 var(--space-3) var(--space-3)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'messageFadeInOut 2s infinite' }} />
      Example job feed
    </div>
    {[
      { dot: '', title: 'Senior Frontend Engineer', company: 'Stripe · Remote', time: '2m' },
      { dot: 'green', title: 'Full-Stack Developer', company: 'Vercel · NYC', time: '8m' },
      { dot: 'amber', title: 'React Developer', company: 'Linear · Remote', time: '15m' },
      { dot: '', title: 'Software Engineer II', company: 'Mercury · SF', time: '22m' },
      { dot: 'green', title: 'Backend Engineer', company: 'Notion · Remote', time: '31m' },
    ].map((item, i) => (
      <div key={i} className="feed-item">
        <div className={`feed-dot ${item.dot}`} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.company}</div>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>{item.time}</span>
      </div>
    ))}
  </div>
);

const GaugeVisual = () => (
  <div className="feature-visual-gauge card-hover">
    <div className="gauge-ring">
      <div className="gauge-ring-inner">
        <div className="gauge-score">94%</div>
        <div className="gauge-label-text">example score</div>
      </div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-5)' }}>
      {[
        { label: 'Skills', score: 'Resume' },
        { label: 'Experience', score: 'Profile' },
        { label: 'Roles', score: 'Preferences' },
      ].map((item) => (
        <div key={item.label} style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: 'var(--accent)' }}>{item.score}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{item.label}</div>
        </div>
      ))}
    </div>
  </div>
);

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  const { count: count1, ref: countRef1 } = useCountUp('2');
  const { count: count2, ref: countRef2 } = useCountUp('4');
  const { count: count3, ref: countRef3 } = useCountUp('3');
  const { count: count4, ref: countRef4 } = useCountUp('5 MiB');

  /* visibility observer for .reveal / .reveal-stagger classes (fade-up fallback) */
  const ioRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    ioRef.current = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          ioRef.current?.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    const els = document.querySelectorAll('.reveal, .reveal-stagger');
    els.forEach((el) => ioRef.current?.observe(el));
    // The lazy page may mount after the browser's initial fragment lookup.
    const target = ['#process', '#features'].includes(window.location.hash)
      ? document.querySelector(window.location.hash) : null;
    target?.scrollIntoView();
    return () => ioRef.current?.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--bg-base)', paddingTop: 0 }}>

      {/* ════════════ HERO ════════════ */}
      <section className="hero bg-grid">
        <div className="hero-orb-stage" aria-hidden="true">
          <DecorativeOrb />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="eyebrow-rule reveal" style={{ marginBottom: 'var(--space-6)' }}>
            № 001 — Job Intelligence Monthly
          </div>

          <h1 className="text-display" style={{ marginBottom: 'var(--space-6)' }}>
            <TextReveal as="span" delay={0.1} style={{ display: 'block' }}>
              Find your next
            </TextReveal>
            <TextReveal as="span" delay={0.25} style={{ display: 'block' }}>
              role, <em className="text-accent">intelligently.</em>
            </TextReveal>
          </h1>

          <p className="text-body-lg reveal" style={{ maxWidth: 520, marginBottom: 'var(--space-7)' }}>
            Build your profile, discover listings and track your applications. IntelliApply ranks roles using your skills, work experience and preferences.
          </p>

          <div className="reveal" style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
            {isAuthenticated ? (
              <MagneticButton>
                <Link to="/dashboard" className="btn btn-primary btn-lg">Go to Dashboard <ArrowRightIcon /></Link>
              </MagneticButton>
            ) : (
              <>
                <MagneticButton>
                  <Link to="/register" className="btn btn-primary btn-lg">Begin the search <ArrowRightIcon /></Link>
                </MagneticButton>
                <a href="#process" className="btn btn-secondary btn-lg">See the method</a>
              </>
            )}
          </div>

          <div className="reveal" style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-7)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)', maxWidth: 520 }}>
            <div className="stat-chip">PDF &amp; DOCX</div>
            <div className="stat-chip" style={{ animationDelay: '-2s' }}>Application tracking</div>
            <div className="stat-chip" style={{ animationDelay: '-4s' }}>Profile matching</div>
          </div>
        </div>

        {/* Right column — editorial resume card */}
        <div className="hero-visual" style={{ position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ padding: 'var(--space-7)', maxWidth: 420, marginLeft: 'auto' }}>
            <div className="eyebrow-rule" style={{ marginBottom: 'var(--space-5)' }}>Example recommendation</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 72, lineHeight: 1, color: 'var(--accent)', marginBottom: 'var(--space-5)' }}>94</div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-soft)', border: '1px solid var(--border-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                  <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a4 4 0 00-8 0v2"/>
                </svg>
              </div>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--text-primary)' }}>Software Engineer II</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Acme Corp · Remote · Full-time</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
              {['React', 'TypeScript', 'Node.js', 'AWS'].map((t) => (
                <span key={t} className="badge">{t}</span>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              <span>Similarity score</span><span style={{ color: 'var(--accent)' }}>94%</span>
            </div>
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 0, height: 2, overflow: 'hidden' }}>
              <div style={{ width: '94%', height: '100%', background: 'var(--accent)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              {[
                { label: 'Skills', score: 'Resume' },
                { label: 'Experience', score: 'Profile' },
                { label: 'Roles', score: 'Preferences' },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: 'var(--text-primary)' }}>{s.score}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-chip" style={{ position: 'absolute', top: -14, right: 20 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/></svg>
            Preview your shortlist
          </div>
          <div className="stat-chip" style={{ position: 'absolute', bottom: 32, left: -20, animationDelay: '-3s' }}>
            Illustrative example
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Scroll</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ════════════ MANIFESTO / NUMBERS ════════════ */}
      <section>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: 'var(--space-10) max(5vw, 32px) var(--space-8)' }}>
          <div className="eyebrow-rule reveal" style={{ marginBottom: 'var(--space-7)' }}>№ 002 — By the numbers</div>
          <TextReveal as="h2" className="text-h1" style={{ maxWidth: 720, marginBottom: 'var(--space-7)' }}>
            The market moves quietly. <em className="text-accent">We make it loud.</em>
          </TextReveal>
        </div>

        <div className="stats-strip reveal-stagger">
          <div className="stat-item" ref={countRef1}>
            <div className="stat-number">{count1}</div>
            <div className="stat-label">Resume formats</div>
          </div>
          <div className="stat-item" ref={countRef2}>
            <div className="stat-number">{count2}</div>
            <div className="stat-label">Application states</div>
          </div>
          <div className="stat-item" ref={countRef3}>
            <div className="stat-number">{count3}</div>
            <div className="stat-label">Profile sections</div>
          </div>
          <div className="stat-item" ref={countRef4}>
            <div className="stat-number">{count4}</div>
            <div className="stat-label">Upload limit</div>
          </div>
        </div>
      </section>

      {/* ════════════ PROCESS ════════════ */}
      <section id="process" className="features-section">
        <div style={{ marginBottom: 'var(--space-9)' }}>
          <div className="eyebrow-rule reveal" style={{ marginBottom: 'var(--space-6)' }}>№ 003 — The Method</div>
          <TextReveal as="h2" className="text-h1">Three moves to your <em className="text-accent">next role.</em></TextReveal>
        </div>

        <div>
          {PROCESS_ROWS.map((row, i) => (
            <div key={row.index} className="feature-row reveal-stagger">
              <div className="feature-index">{row.index}</div>
              <div>
                <div className="text-eyebrow" style={{ marginBottom: 10 }}>{row.eyebrow}</div>
                <TextReveal as="h3" className="text-h2" style={{ marginBottom: 16 }} scrub>
                  {row.titleLine1}<br /><em>{row.titleLine2}</em>
                </TextReveal>
                <p className="text-body" style={{ maxWidth: 560, marginBottom: 20 }}>
                  {row.body}
                </p>
                <Link to={row.link.to} style={{
                  color: 'var(--accent)',
                  fontWeight: 500,
                  fontSize: 14,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderBottom: '1px solid var(--accent)',
                  paddingBottom: 2,
                }}>
                  {row.link.label} <ArrowRightIcon />
                </Link>
              </div>
              <ParallaxImage yPercent={6}>
                {i === 0 && <ResumeVisual />}
                {i === 1 && <FeedVisual />}
                {i === 2 && <GaugeVisual />}
              </ParallaxImage>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ HOW IT WORKS (number cards) ════════════ */}
      <section id="features" className="how-section">
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="eyebrow-rule reveal" style={{ marginBottom: 'var(--space-6)' }}>№ 004 — Three steps</div>
          <h2 className="text-h1 reveal" style={{ marginBottom: 'var(--space-8)' }}>From resume to <em className="text-accent">results.</em></h2>

          <div className="steps-row reveal-stagger">
            {[
              { n: '01', Icon: DocumentIcon, title: 'Upload Your Resume', desc: 'Choose a PDF or DOCX up to 5 MiB. Wait for processing to finish, then review the extracted profile.' },
              { n: '02', Icon: SearchIcon, title: 'Set Your Preferences', desc: 'Add desired roles and locations, then edit your skills and work experience. Location helps ranking rather than restricting results.' },
              { n: '03', Icon: SparklesIcon, title: 'Review Your Matches', desc: 'Refresh your shortlist, inspect the original listings and track roles as interested, applied or ignored.' },
            ].map((item) => (
              <div key={item.n} className="step-card">
                <div className="step-number">{item.n}</div>
                <div style={{ color: 'var(--accent)', marginBottom: 'var(--space-4)' }}>
                  <item.Icon />
                </div>
                <h3 className="text-h3" style={{ fontFamily: "'Playfair Display', serif", marginBottom: 'var(--space-3)' }}>{item.title}</h3>
                <p className="text-body">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ CTA FINALE ════════════ */}
      <section style={{ background: 'var(--bg-base)', padding: 'var(--space-11) max(5vw, 32px)', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto' }}>
          <div className="eyebrow-rule reveal" style={{ marginBottom: 'var(--space-7)' }}>№ 005 — Begin</div>
          <TextReveal as="h2" className="serif-display" style={{ maxWidth: 900, marginBottom: 'var(--space-7)', fontSize: 'clamp(48px, 7vw, 96px)', lineHeight: 1 }}>
            Let's find your <em className="text-accent">next role.</em>
          </TextReveal>
          <div className="reveal" style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-9)' }}>
            <MagneticButton>
                <Link to={isAuthenticated ? '/dashboard' : '/register'} className="btn btn-primary btn-lg" style={{ padding: '16px 36px', fontSize: 15 }}>
                {isAuthenticated ? 'Go to Dashboard' : 'Create your profile'} <ArrowRightIcon />
              </Link>
            </MagneticButton>
            {!isAuthenticated && (
              <Link to="/login" className="btn btn-secondary btn-lg" style={{ padding: '16px 36px', fontSize: 15 }}>
                Sign in
              </Link>
            )}
          </div>

          {/* Marquee strip */}
          <div className="marquee-row" aria-hidden="true">
            <div className="marquee-track">
              {Array.from({ length: 2 }).flatMap((_, dup) =>
                ['PDF & DOCX', 'PROFILE MATCHING', 'APPLICATION TRACKING', 'EDITABLE EXPERIENCE', 'ORIGINAL JOB LINKS', 'LOCATION PREFERENCES'].map((t) => (
                  <span key={`${dup}-${t}`} className="marquee-item">{t}</span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
