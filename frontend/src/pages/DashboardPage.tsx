import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/auth';
import { jobsAPI } from '../services/api';
import { waitForTask } from '../lib/tasks';
import { errorMessage, retryAfter } from '../lib/errors';
import JobDetailsModal from '../components/jobs/JobDetailsModal';
import JobCard from '../components/jobs/JobCard';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/* ── Icon Components ── */
interface IconProps { className?: string; }
const BriefcaseIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M7.5 5.25A2.25 2.25 0 019.75 3h4.5a2.25 2.25 0 012.25 2.25v.75a.75.75 0 01-1.5 0v-.75a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75v.75a.75.75 0 01-1.5 0v-.75zm1.5 4.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM8.25 15a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM3.75 21a.75.75 0 00.75-.75V6.75a.75.75 0 00-1.5 0v13.5a.75.75 0 00.75.75zM20.25 21a.75.75 0 00.75-.75V6.75a.75.75 0 00-1.5 0v13.5a.75.75 0 00.75.75zM15 21a.75.75 0 01-.75-.75V6.75a.75.75 0 011.5 0v13.5a.75.75 0 01-.75.75zm-6 0a.75.75 0 01-.75-.75V6.75a.75.75 0 011.5 0v13.5A.75.75 0 019 21z" clipRule="evenodd" /></svg>;
const BookmarkSquareIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>;
const CheckBadgeIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.493 4.493 0 01-3.497-1.307A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497A4.49 4.49 0 018.603 3.8zM11.25 12.75a.75.75 0 001.5 0v-2.25a.75.75 0 00-1.5 0v2.25z" clipRule="evenodd" /><path d="M12.75 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008z" /></svg>;
const NoSymbolIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
const RefreshIcon: React.FC<IconProps> = ({ className = "w-4 h-4" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;

interface Job { is_current?: boolean; id: number; title: string; company: string; location: string; description: string; url: string; source: string; posted_date: string; scraped_at: string; created_at: string; relevance_score?: number; status: 'pending' | 'interested' | 'applied' | 'ignored'; }
interface JobCounts { total: number; by_status: { pending: number; interested: number; applied: number; ignored: number; }; }

const DataLoadingIndicator = () => (
    <div style={{ minHeight: 'calc(100vh - 16rem)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
      <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)' }}>Loading your personalized job matches</p>
    </div>
  );


const DashboardPage = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobCounts, setJobCounts] = useState<JobCounts>({ total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [refreshStatusMessages, setRefreshStatusMessages] = useState<string[]>([]);
  const [progressMessage, setProgressMessage] = useState('');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const operation = useRef<AbortController | null>(null);
  const fetchJobsAndCounts = useCallback(async () => {
    try {
      const [items, counts] = await Promise.all([jobsAPI.getMatchedJobs(), jobsAPI.getJobCounts()]);
      setJobs(items); setJobCounts(counts);
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoadingData(false); }
  }, []);
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const timer = setTimeout(() => void fetchJobsAndCounts(), 0);
      return () => { clearTimeout(timer); operation.current?.abort(); };
    }
    return () => { operation.current?.abort(); };
  }, [authLoading, isAuthenticated, fetchJobsAndCounts]);
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [cooldownUntil]);
  const refreshJobs = useCallback(async () => {
    if (operation.current || Date.now() < cooldownUntil) return;
    const controller = new AbortController(); operation.current = controller;
    setIsRefreshing(true); setError(null); setProgressMessage('Requesting a job refresh…');
    try {
      const response = await jobsAPI.refreshJobs();
      if (controller.signal.aborted) return;
      setCurrentTaskId(response.task_id);
      const result = await waitForTask(signal => jobsAPI.getRefreshStatus(response.task_id, signal), controller.signal, setProgressMessage);
      if (result.status === 'partial_failure') setError(result.message);
      else setRefreshStatusMessages([result.message]);
      await fetchJobsAndCounts();
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(errorMessage(err));
        const seconds = retryAfter(err);
        if (seconds) { setClock(Date.now()); setCooldownUntil(Date.now() + seconds * 1000); }
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) { setIsRefreshing(false); setCurrentTaskId(null); }
    }
  }, [cooldownUntil, fetchJobsAndCounts]);
  useEffect(() => {
    if (location.search.includes('refresh=true') && !authLoading && isAuthenticated) {
      const timer = setTimeout(() => { navigate('/dashboard', { replace: true }); void refreshJobs(); }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.search, authLoading, isAuthenticated, navigate, refreshJobs]);
  const handleStatusChange = useCallback(async (jobId: number, status: string) => {
    try { await jobsAPI.updateJobStatus(jobId, status); await fetchJobsAndCounts(); }
    catch (err) { setError(errorMessage(err)); throw err; }
  }, [fetchJobsAndCounts]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)' }}>Authenticating...</p>
      </div>
    );
  }

  if (isRefreshing && currentTaskId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" style={{ marginBottom: '16px' }} />
        <p style={{ fontSize: '20px', fontFamily: "'Playfair Display', serif", fontWeight: 500, color: 'var(--text-primary)', marginBottom: '8px' }}>Refreshing jobs</p>
        <div style={{ height: '24px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          {progressMessage && (
            <p key={progressMessage} className="animate-messageFadeInOut" style={{ fontSize: '14px', color: 'var(--accent)' }}>
              {progressMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loadingData && jobs.length === 0 && !currentTaskId && !isRefreshing) {
    return <DataLoadingIndicator />;
  }

  const openJobDetails = (job: Job) => setSelectedJob(job);
  const closeJobDetails = () => setSelectedJob(null);

  const countCardData = [
    { title: "Recommendations & Tracked", count: jobCounts.total, Icon: BriefcaseIcon, color: 'var(--accent)', bgColor: 'var(--accent-soft)' },
    { title: "Interested", count: jobCounts.by_status.interested, Icon: BookmarkSquareIcon, color: 'var(--status-interested-text)', bgColor: 'var(--status-interested-bg)' },
    { title: "Applied", count: jobCounts.by_status.applied, Icon: CheckBadgeIcon, color: 'var(--status-applied-text)', bgColor: 'var(--status-applied-bg)' },
    { title: "Ignored", count: jobCounts.by_status.ignored, Icon: NoSymbolIcon, color: 'var(--status-ignored-text)', bgColor: 'var(--status-ignored-bg)' }
  ];


  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingTop: '60px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-7) var(--space-5)' }}>
        {clock < cooldownUntil && <p role="status">Retry available in {Math.ceil((cooldownUntil-clock)/1000)} seconds.</p>}
        {refreshStatusMessages.map(message => <p key={message} role="status">{message}</p>)}
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="text-h1">Your Job <span className="text-accent">Matches</span></h1>
            <p className="text-body" style={{ marginTop: '4px' }}>Current recommendations and your tracked application history.</p>
          </div>
          <button
            onClick={refreshJobs}
            disabled={clock < cooldownUntil || isRefreshing || authLoading || (!isAuthenticated && !authLoading)}
            className="btn btn-primary"
            style={{ gap: '8px' }}
          >
            {isRefreshing ? (
              <>
                <span className="spinner spinner-sm" style={{ borderTopColor: 'var(--text-on-accent)' }} />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshIcon />
                Refresh Jobs
              </>
            )}
          </button>
        </div>

        {error && !isRefreshing && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-5)' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {countCardData.map(item => (
            <div key={item.title} className="card card-hover card-feature" style={{ padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p className="counter-animate" style={{ fontSize: '36px', fontWeight: 500, color: item.color, fontFamily: "'Playfair Display', serif", letterSpacing: '-0.02em' }}>{item.count}</p>
                <div style={{
                   padding: '10px', borderRadius: 'var(--radius-sm)',
                   background: item.bgColor,
                   border: `1px solid ${item.color}22`,
                   color: item.color,
                   transition: 'transform 0.3s ease',
                 }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <item.Icon />
                </div>
              </div>
              <h3 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginTop: '6px', letterSpacing: '0.02em' }}>{item.title}</h3>
            </div>
          ))}
        </div>

        {/* Job Cards */}
        {(loadingData && jobs.length === 0 && !isRefreshing && !currentTaskId) ? (
            <DataLoadingIndicator />
        ) : jobs.length === 0 && !isRefreshing ? (
          <div className="card card-feature" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
      background: 'var(--accent-soft)',
      border: '1px solid var(--border-accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto var(--space-4)', color: 'var(--accent)',
    }}>
      <BriefcaseIcon className="w-7 h-7" />
    </div>
    <h3 className="text-h2" style={{ marginBottom: 'var(--space-3)' }}>No Job <span className="text-accent">Matches</span> Found Yet</h3>
            <p className="text-body" style={{ maxWidth: '480px', margin: '0 auto var(--space-5)' }}>
              Ensure your profile is complete with skills, experiences, and an uploaded resume for the best results. Or try refreshing jobs.
            </p>
            <Link to="/profile" className="btn btn-primary">
              Complete Your Profile
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: 'var(--space-4)' }}>
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onOpenDetails={openJobDetails} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={closeJobDetails}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default DashboardPage;
