import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
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

interface Job { id: number; title: string; company: string; location: string; description: string; url: string; source: string; posted_date: string; scraped_at: string; created_at: string; relevance_score?: number; status: 'pending' | 'interested' | 'applied' | 'ignored'; }
interface JobCounts { total: number; by_status: { pending: number; interested: number; applied: number; ignored: number; }; }

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
  const [displayedFakeMessage, setDisplayedFakeMessage] = useState<string>("");
  const fakeLoadingMessages = [
    "Initializing job aggregators...",
    "Connecting to Hacker News job feed...",
    "Scraping WeWorkRemotely listings...",
    "Compiling raw job data...",
    "Filtering and de-duplicating entries...",
    "Analyzing job descriptions with AI...",
    "Matching jobs to your unique profile...",
    "Finalizing your personalized job list..."
  ];
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fakeMessageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearPolling = useCallback(() => { 
    if (pollingIntervalRef.current) { 
      console.log('[clearPolling] Attempting to clear interval with ID:', pollingIntervalRef.current);
      clearInterval(pollingIntervalRef.current); 
      pollingIntervalRef.current = null; 
      console.log("Polling cleared. pollingIntervalRef.current is now null.");
    } else {
      console.log("[clearPolling] No interval to clear (pollingIntervalRef.current is null).");
    }
  }, []);

  const fetchJobsAndCounts = useCallback(async (isAfterRefresh = false) => {
    if (!isAfterRefresh) setLoadingData(true);
    setError(null);
    console.log(isAfterRefresh ? "Fetching jobs and counts after refresh..." : "Fetching initial jobs and counts...");
    try {
      const [jobsData, countsData] = await Promise.all([
        jobsAPI.getMatchedJobs(), 
        jobsAPI.getJobCounts()
      ]);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setJobCounts(countsData && typeof countsData === 'object' ? countsData : { total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
      if (!Array.isArray(jobsData) || !countsData || typeof countsData !== 'object') {
        console.warn('Problem with data structure from API for jobs/counts.');
        setError('Failed to load some data correctly. Displaying what was available.');
      }
    } catch (err: any) {
      console.error('Error fetching jobs/counts:', err);
      setError(err.message || 'Failed to fetch data.');
      setJobs([]); 
      setJobCounts({ total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
    } finally {
      setLoadingData(false);
      console.log("Finished fetching jobs and counts.");
    }
  }, []);

  const pollTaskStatus = useCallback(async (taskId: string) => {
    console.log(`Polling status for task ID: ${taskId}`);
    try {
      const statusData = await jobsAPI.getRefreshStatus(taskId);
      console.log('[pollTaskStatus] Received statusData from API:', statusData); 
      const newMessage = statusData.message || `Status: ${statusData.status}`;
      if(newMessage) {
        setRefreshStatusMessages(prevMessages => {
          if (prevMessages.length === 0 || prevMessages[prevMessages.length - 1] !== newMessage) {
            return [...prevMessages, newMessage];
          }
          return prevMessages;
        });
      }

      if (statusData.status === 'completed') {
        console.log('[pollTaskStatus] Condition (statusData.status === "completed") is TRUE. About to call setIsRefreshing(false).');
        clearPolling();
        setIsRefreshing(false);
        setCurrentTaskId(null);
        setRefreshStatusMessages(prev => [...prev, 'Job refresh completed! Fetching updated jobs...']);
        await fetchJobsAndCounts(true); 
        setRefreshStatusMessages(prev => [...prev, 'Updated jobs loaded.']);
        setTimeout(() => setRefreshStatusMessages([]), 5000);
      } else if (statusData.status === 'failed') {
        clearPolling();
        setIsRefreshing(false);
        setCurrentTaskId(null);
        setError(statusData.message || 'Job refresh failed.');
        setRefreshStatusMessages([]);
      }
    } catch (err: any) {
      console.error('Error polling task status:', err);
      clearPolling();
      setIsRefreshing(false);
      setCurrentTaskId(null);
      setError(err.message || 'Error checking refresh status.');
      setRefreshStatusMessages([]);
      console.log('[pollTaskStatus] CAUGHT ERROR. isRefreshing set to false in catch block.');
    }
  }, [clearPolling, fetchJobsAndCounts]);

  const refreshJobs = useCallback(async () => {
    if (isRefreshing) return;
    console.log("Starting job refresh process...");
    setIsRefreshing(true);
    setError(null);
    setRefreshStatusMessages(['Initiating job refresh... Please wait.']);
    clearPolling(); 
    try {
      const response = await jobsAPI.refreshJobs();
      const taskIdForPolling = response.task_id; 
      setCurrentTaskId(taskIdForPolling);
      setRefreshStatusMessages(prev => [...prev, response.message || `Job refresh started for ${taskIdForPolling}, polling for status...`]);
      
      const newIntervalId = setInterval(() => {
        console.log(`[setInterval] Firing for task ID: ${taskIdForPolling}. Is pollTaskStatus a function?`, typeof pollTaskStatus === 'function');
        if (typeof pollTaskStatus === 'function') {
          pollTaskStatus(taskIdForPolling);
        } else {
          console.error('[setInterval] pollTaskStatus is not a function! Clearing this interval:', newIntervalId);
          clearInterval(newIntervalId); 
          if (pollingIntervalRef.current === newIntervalId) {
             pollingIntervalRef.current = null;
          }
          setIsRefreshing(false); 
        }
      }, 3000);
      pollingIntervalRef.current = newIntervalId;
      console.log(`[refreshJobs] Interval set with ID: ${newIntervalId}. pollingIntervalRef.current is now: ${pollingIntervalRef.current}. Task ID: ${taskIdForPolling}`);
    } catch (err: any) {
      console.error('Error initiating job refresh:', err);
      setIsRefreshing(false);
      setError(err.message || 'Failed to start job refresh.');
      setRefreshStatusMessages([]);
    }
  }, [isRefreshing, clearPolling, pollTaskStatus]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !currentTaskId && jobs.length === 0 && !isRefreshing) {
      console.log("useEffect (initial load): Fetching initial jobs and counts.");
      fetchJobsAndCounts();
    }
  }, [isAuthenticated, authLoading, currentTaskId, jobs.length, isRefreshing, fetchJobsAndCounts]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const shouldRefresh = queryParams.get('refresh') === 'true';

    if (shouldRefresh && !authLoading && isAuthenticated && !isRefreshing) {
      console.log("useEffect (URL trigger): refresh=true detected. Calling refreshJobs.");
      refreshJobs();
      navigate('/dashboard', { replace: true }); 
    }
  }, [location.search, authLoading, isAuthenticated, isRefreshing, refreshJobs, navigate]);

  useEffect(() => {
    return () => {
      console.log("useEffect (unmount cleanup): DashboardPage unmounting. Clearing polling.");
      clearPolling();
      if (fakeMessageIntervalRef.current) {
        clearInterval(fakeMessageIntervalRef.current);
      }
    };
  }, [clearPolling]); 

  const messageIndexRef = useRef(0);

  useEffect(() => {
    if (fakeMessageIntervalRef.current) {
      clearInterval(fakeMessageIntervalRef.current);
      fakeMessageIntervalRef.current = null;
    }

    if (isRefreshing && currentTaskId) {
      messageIndexRef.current = 0;
      setDisplayedFakeMessage(fakeLoadingMessages[0]);

      fakeMessageIntervalRef.current = setInterval(() => {
        messageIndexRef.current = (messageIndexRef.current + 1);
        const nextMessageIndex = messageIndexRef.current % fakeLoadingMessages.length;
        const nextMessage = fakeLoadingMessages[nextMessageIndex];
        console.log(`[FakeMessageInterval] Index: ${messageIndexRef.current}, NextIndex: ${nextMessageIndex}, NextMsg: "${nextMessage}"`);
        setDisplayedFakeMessage(nextMessage);
      }, 2000);
    } else {
      setDisplayedFakeMessage(""); 
    }

    return () => {
      if (fakeMessageIntervalRef.current) {
        clearInterval(fakeMessageIntervalRef.current);
        fakeMessageIntervalRef.current = null;
      }
    };
  }, [isRefreshing, currentTaskId]);


  const handleStatusChange = useCallback(async (jobId: number, newStatus: string) => {
    console.log(`Changing status for job ${jobId} to ${newStatus}`);
    try {
      await jobsAPI.updateJobStatus(jobId, newStatus);
      setJobs(prevJobs => prevJobs.map(job => job.id === jobId ? { ...job, status: newStatus as Job['status'] } : job));
      const countsData = await jobsAPI.getJobCounts();
      setJobCounts(countsData && typeof countsData === 'object' ? countsData : { total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
    } catch (err: any) {
      console.error('Error updating job status:', err);
      setError(err.message || 'Failed to update job status.');
    }
  }, []);

  if (authLoading) { 
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" />
        <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Sora', sans-serif", fontWeight: 500, color: 'var(--text-primary)' }}>Authenticating...</p>
      </div>
    );
  }

  if (isRefreshing && currentTaskId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: '16px' }}>
        <div className="spinner" style={{ marginBottom: '16px' }} />
        <p style={{ fontSize: '20px', fontFamily: "'Sora', sans-serif", fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Refreshing Jobs...</p>
        <div style={{ height: '24px', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
          {displayedFakeMessage && (
            <p key={displayedFakeMessage} className="animate-messageFadeInOut" style={{ fontSize: '14px', color: 'var(--accent)' }}>
              {displayedFakeMessage}
            </p>
          )}
        </div>
      </div>
    );
  }
  
  const DataLoadingIndicator = () => (
    <div style={{ minHeight: 'calc(100vh - 16rem)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
      <p style={{ marginTop: '16px', fontSize: '18px', fontFamily: "'Sora', sans-serif", fontWeight: 500, color: 'var(--text-primary)' }}>Loading your personalized job matches...</p>
    </div>
  );

  if (loadingData && jobs.length === 0 && !currentTaskId && !isRefreshing) { 
    return <DataLoadingIndicator />; 
  }
  
  const openJobDetails = (job: Job) => setSelectedJob(job);
  const closeJobDetails = () => setSelectedJob(null);

  const countCardData = [
    { title: "Total Matches", count: jobCounts.total, Icon: BriefcaseIcon, color: 'var(--accent)', bgColor: 'var(--accent-soft)' },
    { title: "Interested", count: jobCounts.by_status.interested, Icon: BookmarkSquareIcon, color: 'var(--status-interested-text)', bgColor: 'var(--status-interested-bg)' },
    { title: "Applied", count: jobCounts.by_status.applied, Icon: CheckBadgeIcon, color: 'var(--status-applied-text)', bgColor: 'var(--status-applied-bg)' },
    { title: "Ignored", count: jobCounts.by_status.ignored, Icon: NoSymbolIcon, color: 'var(--status-ignored-text)', bgColor: 'var(--status-ignored-bg)' }
  ];

  console.log('[DashboardPage Render] isRefreshing:', isRefreshing, 'currentTaskId:', currentTaskId, 'loadingData:', loadingData, 'authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingTop: '60px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--space-7) var(--space-5)' }}>
        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="text-h1">Your Job <span className="text-accent-gradient">Matches</span></h1>
            <p className="text-body" style={{ marginTop: '4px' }}>Personalized recommendations based on your profile.</p>
          </div>
          <button
            onClick={refreshJobs}
            disabled={isRefreshing || authLoading || (!isAuthenticated && !authLoading)} 
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
                <p className="counter-animate" style={{ fontSize: '32px', fontWeight: 700, color: item.color, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.02em' }}>{item.count}</p>
                <div style={{ 
                  padding: '10px', borderRadius: 'var(--radius-md)', 
                  background: `linear-gradient(135deg, ${item.bgColor}, transparent)`, 
                  color: item.color,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
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
              background: 'linear-gradient(135deg, var(--accent-soft), rgba(129, 140, 248, 0.12))', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto var(--space-4)', color: 'var(--accent)',
              boxShadow: '0 8px 24px rgba(91, 78, 255, 0.1)',
            }}>
              <BriefcaseIcon className="w-7 h-7" />
            </div>
            <h3 className="text-h2" style={{ marginBottom: 'var(--space-3)' }}>No Job <span className="text-accent-gradient">Matches</span> Found Yet</h3>
            <p className="text-body" style={{ maxWidth: '480px', margin: '0 auto var(--space-5)' }}>
              Ensure your profile is complete with skills, experiences, and an uploaded resume for the best results. Or try refreshing jobs.
            </p>
            <Link to="/profile" className="btn btn-primary">
              Complete Your Profile
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
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
