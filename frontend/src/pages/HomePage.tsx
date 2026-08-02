import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useRef, useState } from 'react';

/* ── Inline SVG Icons ── */
const ArrowRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
);

const DocumentIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813L20 12l-6.088 3.187L12 21l-1.912-5.813L4 12l6.088-3.187L12 3z" />
  </svg>
);

/* ── Animated Counter Hook ── */
const useCountUp = (target: string, duration = 1500) => {
  const [count, setCount] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const numericPart = parseFloat(target.replace(/[^0-9.]/g, ''));
          const suffix = target.replace(/[0-9.]/g, '');
          const isDecimal = target.includes('.');
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const current = numericPart * eased;

            if (isDecimal) {
              setCount(current.toFixed(1) + suffix);
            } else {
              setCount(Math.floor(current).toLocaleString() + suffix);
            }

            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
};

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* Animated counters */
  const counter1 = useCountUp('12K+');
  const counter2 = useCountUp('2.4M');
  const counter3 = useCountUp('94%');
  const counter4 = useCountUp('3.2×');

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observerRef.current?.unobserve(e.target);
        }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--bg-base)', paddingTop: '60px' }}>

      {/* ════════════════ HERO ════════════════ */}
      <section className="bg-grid" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Aurora blobs */}
        <div className="aurora-container">
          <div className="aurora-blob aurora-blob-1" />
          <div className="aurora-blob aurora-blob-2" />
          <div className="aurora-blob aurora-blob-3" />
        </div>

        {/* Floating decorative shapes */}
        <div className="floating-shape floating-shape-1" />
        <div className="floating-shape floating-shape-2" />
        <div className="floating-shape floating-shape-3" />

        <div className="hero">
          {/* Left column — text */}
          <div className="reveal" style={{ zIndex: 1 }}>
            <div className="badge badge-pulse" style={{ marginBottom: 'var(--space-5)' }}>
              <span style={{ position: 'relative', zIndex: 1 }}>✦ AI-Powered Job Matching</span>
            </div>

            <h1 className="text-display" style={{ marginBottom: 'var(--space-5)' }}>
              Find Your Next<br />Role, <span className="text-accent-gradient">Intelligently.</span>
            </h1>

            <p className="text-body-lg" style={{ maxWidth: '480px', marginBottom: 'var(--space-6)' }}>
              Stop wasting hours on job boards. Our AI co-pilot matches you to the roles that actually fit — based on your real skills and experience.
            </p>

            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              {isAuthenticated ? (
                <Link to="/dashboard" className="btn btn-primary btn-lg">
                  Go to Dashboard <ArrowRightIcon />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary btn-lg">
                    Get Started Free <ArrowRightIcon />
                  </Link>
                  <a href="#how-it-works" className="btn btn-secondary btn-lg">
                    See how it works
                  </a>
                </>
              )}
            </div>

            {/* Social proof mini-row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'var(--space-6)' }}>
              <div style={{ display: 'flex' }}>
                {['#5B4EFF', '#818CF8', '#3B82F6', '#6366F1'].map((c, i) => (
                  <div key={i} style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: c, border: '2px solid var(--bg-base)',
                    marginLeft: i > 0 ? '-8px' : 0, zIndex: 4 - i,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 700, color: 'white',
                  }}>
                    {['AK', 'SP', 'JR', 'ML'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  12,000+ seekers
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Finding jobs smarter
                </div>
              </div>
            </div>
          </div>

          {/* Right column — 3D Product Preview Card */}
          <div className="hero-visual" style={{ position: 'relative', zIndex: 1 }}>
            <div className="card-3d-wrapper">
              <div className="hero-preview card card-3d gradient-border" style={{ padding: 'var(--space-6)', borderRadius: 'var(--radius-xl)' }}>
                {/* Score header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className="text-eyebrow">Match Score</span>
                  <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                    <span className="text-accent-gradient">94%</span>
                  </span>
                </div>

                {/* Company info */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--accent-soft), rgba(129, 140, 248, 0.12))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <rect x="3" y="7" width="18" height="13" rx="2"/>
                      <path d="M16 7V5a4 4 0 00-8 0v2"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>Software Engineer II</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Acme Corp · Remote · Full-time</div>
                  </div>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {['React', 'TypeScript', 'Node.js', 'AWS'].map(tag => (
                    <span key={tag} className="badge">{tag}</span>
                  ))}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>Profile match</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>94%</span>
                </div>
                <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-pill)', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: '94%', height: '100%', background: 'linear-gradient(90deg, var(--accent), #818cf8, #3b82f6)', borderRadius: 'var(--radius-pill)', animation: 'progress-fill 2s var(--ease-out) forwards' }} />
                </div>

                {/* Breakdown mini-stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  {[
                    { label: 'Skills', score: '97%', color: 'var(--accent)' },
                    { label: 'Experience', score: '91%', color: '#818cf8' },
                    { label: 'Culture', score: '88%', color: '#3b82f6' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: s.color, fontFamily: "'Sora', sans-serif" }}>{s.score}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating stat chips */}
            <div className="stat-chip" style={{ position: 'absolute', top: '-16px', right: '-20px' }}>
              <span style={{ fontSize: '14px' }}>🔍</span> 1,240 jobs scanned
            </div>
            <div className="stat-chip" style={{ position: 'absolute', bottom: '20px', left: '-36px', animationDelay: '-2s' }}>
              <span style={{ fontSize: '14px' }}>⚡</span> Updated 2 min ago
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position: 'absolute', bottom: '32px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.35, animation: 'bounce-subtle 2s ease-in-out infinite' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", color: 'var(--text-muted)', fontWeight: 500 }}>Scroll</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M4 9l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </section>


      {/* ════════════════ STATS STRIP ════════════════ */}
      <div className="stats-strip reveal">
        {[
          { counter: counter1, label: 'Active Job Seekers' },
          { counter: counter2, label: 'Jobs Scanned Weekly' },
          { counter: counter3, label: 'Match Accuracy' },
          { counter: counter4, label: 'Faster Than Manual' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'contents' }}>
            {i > 0 && <div className="stat-divider" />}
            <div className="stat-item" ref={item.counter.ref}>
              <div className="stat-number counter-animate">{item.counter.count}</div>
              <div className="stat-label">{item.label}</div>
            </div>
          </div>
        ))}
      </div>


      {/* ════════════════ FEATURES ════════════════ */}
      <section id="features" style={{ padding: 'var(--space-10) 0', background: 'var(--bg-base)', position: 'relative' }}>
        <div className="features-section">
          {/* Section header */}
          <div className="reveal" style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="text-eyebrow" style={{ marginBottom: '12px' }}>Features</div>
            <h2 className="text-h1">A Better Way to Find<br />Your Next Role</h2>
            <p className="text-body-lg" style={{ maxWidth: '520px', margin: '16px auto 0' }}>
              Stop manually hunting. IntelliApply works while you sleep.
            </p>
          </div>

          {/* Feature 1: Resume Parsing */}
          <div className="feature-row reveal">
            <div>
              <div className="text-eyebrow" style={{ marginBottom: '10px' }}>01 — Resume Intelligence</div>
              <h3 className="text-h2" style={{ marginBottom: '14px' }}>Your skills, extracted.<br />Your value, understood.</h3>
              <p className="text-body" style={{ marginBottom: '24px' }}>
                Upload your resume once. Our parser extracts skills, experience depth, and seniority level — building a living profile that matches you to the right roles, not just keyword matches.
              </p>
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Learn more <ArrowRightIcon />
              </Link>
            </div>
            <div className="feature-visual-resume card-hover gradient-border" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <div className="card-icon" style={{ marginBottom: 'var(--space-3)' }}>
                  <DocumentIcon />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>Resume Analysis</div>
              </div>
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
                <span className="field-value">Senior (5+ yrs)</span>
              </div>
              <div className="field-row">
                <span className="field-label">Focus</span>
                <span className="field-value">Full-Stack Engineering</span>
              </div>
            </div>
          </div>

          {/* Feature 2: Job Scraping */}
          <div className="feature-row reverse reveal">
            <div>
              <div className="text-eyebrow" style={{ marginBottom: '10px' }}>02 — Automated Discovery</div>
              <h3 className="text-h2" style={{ marginBottom: '14px' }}>Jobs found for you,<br />while you focus on prep.</h3>
              <p className="text-body" style={{ marginBottom: '24px' }}>
                Our scraping engine continuously monitors HackerNews, WeWorkRemotely, and more. New listings are discovered, de-duplicated, and added to your feed automatically.
              </p>
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Learn more <ArrowRightIcon />
              </Link>
            </div>
            <div className="feature-visual-feed card-hover gradient-border" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)', paddingLeft: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669', animation: 'cursor-blink 2s ease infinite' }} />
                Live Job Feed
              </div>
              {[
                { dot: '', title: 'Senior Frontend Engineer', company: 'Stripe · Remote', time: '2m ago' },
                { dot: 'green', title: 'Full-Stack Developer', company: 'Vercel · NYC', time: '8m ago' },
                { dot: 'amber', title: 'React Developer', company: 'Linear · Remote', time: '15m ago' },
                { dot: '', title: 'Software Engineer II', company: 'Mercury · SF', time: '22m ago' },
                { dot: 'green', title: 'Backend Engineer', company: 'Notion · Remote', time: '31m ago' },
              ].map((item, i) => (
                <div key={i} className="feed-item" style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={`feed-dot ${item.dot}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.company}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 3: AI Matching */}
          <div className="feature-row reveal">
            <div>
              <div className="text-eyebrow" style={{ marginBottom: '10px' }}>03 — AI Matching</div>
              <h3 className="text-h2" style={{ marginBottom: '14px' }}>Not just keywords.<br />Actual fit scoring.</h3>
              <p className="text-body" style={{ marginBottom: '24px' }}>
                Our TF-IDF vectorization and cosine similarity engine goes beyond keyword matching. It understands context, weighs experience depth, and delivers a true compatibility score.
              </p>
              <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 500, fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Learn more <ArrowRightIcon />
              </Link>
            </div>
            <div className="feature-visual-gauge card-hover gradient-border" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="gauge-ring">
                <div className="gauge-ring-inner">
                  <div className="gauge-score">94%</div>
                  <div className="gauge-label-text">Match Score</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                {[
                  { label: 'Skills', score: '97%', color: 'var(--accent)' },
                  { label: 'Experience', score: '91%', color: '#818cf8' },
                  { label: 'Culture', score: '88%', color: '#3b82f6' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: item.color, fontFamily: "'Sora', sans-serif" }}>{item.score}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section id="how-it-works" className="how-section">
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div className="text-eyebrow" style={{ marginBottom: '12px' }}>How It Works</div>
          <h2 className="text-h1">Three Simple Steps to<br />Your Next Role</h2>
        </div>

        <div className="steps-row reveal-stagger">
          {[
            { step: '1', icon: <DocumentIcon />, title: 'Upload Your Resume', desc: 'Drop your PDF or paste your text. We parse it in seconds and build your profile automatically.' },
            { step: '2', icon: <SearchIcon />, title: 'Set Your Preferences', desc: 'Choose roles, locations, salary range, and remote preferences. Tell us what you\'re looking for.' },
            { step: '3', icon: <SparklesIcon />, title: 'Get Matched Daily', desc: 'Wake up to a curated shortlist of jobs ranked by fit score. Apply with confidence.' },
          ].map((item) => (
            <div key={item.step} className="step-card reveal card-hover" style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', padding: 'var(--space-6)' }}>
              <div className="step-number">{item.step}</div>
              <div style={{ color: 'var(--accent)', marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <h3 className="text-h3" style={{ marginBottom: 'var(--space-3)' }}>{item.title}</h3>
              <p className="text-body">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ════════════════ CTA ════════════════ */}
      <section className="reveal" style={{ background: 'var(--bg-base)', padding: 'var(--space-10) var(--space-5)', position: 'relative', overflow: 'hidden' }}>
        {/* Background accent blob */}
        <div style={{ position: 'absolute', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(91, 78, 255, 0.08), transparent 70%)', top: '-50px', left: '50%', transform: 'translateX(-50%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="badge badge-pulse" style={{ marginBottom: 'var(--space-4)', display: 'inline-flex' }}>
            <span style={{ position: 'relative', zIndex: 1 }}>✦ Free to get started</span>
          </div>
          <h2 className="text-h1" style={{ marginBottom: 'var(--space-4)' }}>
            Ready to Streamline<br />Your Job Search?
          </h2>
          <p className="text-body-lg" style={{ marginBottom: 'var(--space-6)' }}>
            Join thousands of job seekers who have already found their perfect match with IntelliApply.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started for Free <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
