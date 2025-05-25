import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { jobsAPI } from '../services/api';
import JobDetailsModal from '../components/jobs/JobDetailsModal';
import JobCard from '../components/jobs/JobCard'; // Import the new JobCard
import { Link, useLocation, useNavigate } from 'react-router-dom';

// --- Icon Placeholders ---
interface IconProps { className?: string; }
const BriefcaseIcon: React.FC<IconProps> = ({ className = "w-7 h-7" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M7.5 5.25A2.25 2.25 0 019.75 3h4.5a2.25 2.25 0 012.25 2.25v.75a.75.75 0 01-1.5 0v-.75a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75v.75a.75.75 0 01-1.5 0v-.75zm1.5 4.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM8.25 15a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75zM3.75 21a.75.75 0 00.75-.75V6.75a.75.75 0 00-1.5 0v13.5a.75.75 0 00.75.75zM20.25 21a.75.75 0 00.75-.75V6.75a.75.75 0 00-1.5 0v13.5a.75.75 0 00.75.75zM15 21a.75.75 0 01-.75-.75V6.75a.75.75 0 011.5 0v13.5a.75.75 0 01-.75.75zm-6 0a.75.75 0 01-.75-.75V6.75a.75.75 0 011.5 0v13.5A.75.75 0 019 21z" clipRule="evenodd" /></svg>;
const BookmarkSquareIcon: React.FC<IconProps> = ({ className = "w-7 h-7" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M6.32 2.577a49.255 49.255 0 0111.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 01-1.085.67L12 18.089l-7.165 3.583A.75.75 0 013.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93z" clipRule="evenodd" /></svg>;
const CheckBadgeIcon: React.FC<IconProps> = ({ className = "w-7 h-7" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.493 4.493 0 01-3.497-1.307A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497A4.49 4.49 0 018.603 3.8zM11.25 12.75a.75.75 0 001.5 0v-2.25a.75.75 0 00-1.5 0v2.25z" clipRule="evenodd" /><path d="M12.75 15a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-.008a.75.75 0 01-.75-.75v-.008z" /></svg>;
const NoSymbolIcon: React.FC<IconProps> = ({ className = "w-7 h-7" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" /></svg>;
const UserCircleIcon: React.FC<IconProps> = ({ className = "w-12 h-12 text-slate-500" }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" /></svg>;
const RefreshIcon: React.FC<IconProps> = ({ className = "w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-300" }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
// --- End Icons ---

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
  const [refreshStatusMessage, setRefreshStatusMessage] = useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const clearPolling = () => { if (pollingIntervalRef.current) { clearInterval(pollingIntervalRef.current); pollingIntervalRef.current = null; } };

  const fetchJobsAndCounts = async (isAfterRefresh = false) => {
    if (!isAfterRefresh) setLoadingData(true);
    setError(null);
    try {
      const [jobsData, countsData] = await Promise.all([jobsAPI.getMatchedJobs(), jobsAPI.getJobCounts()]);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setJobCounts(countsData && typeof countsData === 'object' ? countsData : { total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
      if (!Array.isArray(jobsData) || !countsData || typeof countsData !== 'object') {
        setError('Failed to load some data. Displaying what was available.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
      setJobs([]); setJobCounts({ total: 0, by_status: { pending: 0, interested: 0, applied: 0, ignored: 0 } });
    } finally {
      setLoadingData(false);
    }
  };

  const pollTaskStatus = async (taskId: string) => { /* ... (logic unchanged, but ensure setRefreshStatusMessage updates are user-friendly) ... */ };
  const refreshJobs = async () => { /* ... (logic unchanged, but ensure setRefreshStatusMessage updates are user-friendly) ... */ };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const shouldRefresh = queryParams.get('refresh') === 'true';
    if (!authLoading && isAuthenticated) {
      if (shouldRefresh) { refreshJobs(); navigate('/dashboard', { replace: true }); } 
      else { fetchJobsAndCounts(); }
    } else if (!authLoading && !isAuthenticated) { setLoadingData(false); }
    return () => clearPolling();
  }, [isAuthenticated, authLoading, location.search, navigate]);

  const handleStatusChange = async (jobId: number, newStatus: string) => { /* ... (logic unchanged, but re-fetch counts after update) ... */ };

  if (authLoading) { 
    return ( <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg text-theme-text-primary p-4"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-theme-accent-cyan"></div><p className="mt-4 text-xl font-display">Authenticating...</p></div>);
  }
  
  const DataLoadingIndicator = () => ( <div className="min-h-[calc(100vh-16rem)] flex flex-col items-center justify-center text-theme-text-primary"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-theme-accent-cyan"></div><p className="mt-4 text-xl font-display">Loading your personalized job matches...</p>{isRefreshing && refreshStatusMessage && <p className="mt-2 text-sm text-theme-accent-cyan">{refreshStatusMessage}</p>}</div>);

  if (loadingData && !isRefreshing && jobs.length === 0) { return <DataLoadingIndicator />; }
  
  const openJobDetails = (job: Job) => setSelectedJob(job);
  const closeJobDetails = () => setSelectedJob(null);

  const countCardData = [
    { title: "Total Matches", count: jobCounts.total, Icon: BriefcaseIcon, color: "text-theme-accent-cyan" },
    { title: "Interested", count: jobCounts.by_status.interested, Icon: BookmarkSquareIcon, color: "text-theme-accent-amber" },
    { title: "Applied", count: jobCounts.by_status.applied, Icon: CheckBadgeIcon, color: "text-green-400" }, // Using a distinct green for applied
    { title: "Ignored", count: jobCounts.by_status.ignored, Icon: NoSymbolIcon, color: "text-red-400" } // Using a distinct red for ignored
  ];

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text-primary">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-4xl font-display font-bold">Your Job Matches</h1>
            <p className="mt-1 text-sm text-theme-text-secondary">Personalized recommendations based on your profile.</p>
          </div>
          <button
            onClick={refreshJobs}
            disabled={isRefreshing} 
            className="group mt-4 md:mt-0 w-full md:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg shadow-md text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-bg focus:ring-theme-accent-cyan disabled:opacity-60 transition-all duration-200"
          >
            {isRefreshing ? ( <><svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Refreshing...</> ) : ( <><RefreshIcon />Refresh Jobs</> )}
          </button>
        </div>

        {isRefreshing && refreshStatusMessage && (
          <div className="mb-6 p-3 text-sm text-center text-theme-accent-cyan bg-theme-accent-cyan/10 rounded-lg">
            {refreshStatusMessage}
          </div>
        )}
        {error && ( 
             <div className="mb-6 p-4 text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg" role="alert">
                <strong>Error:</strong> {error}
             </div>
        )}

        {/* Job Counts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {countCardData.map(item => (
            <div key={item.title} className="bg-theme-surface shadow-xl rounded-lg p-5 transform hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${item.color}`}>{item.count}</p>
                <div className={`p-2 rounded-full bg-opacity-20 ${item.color === "text-theme-accent-cyan" ? "bg-theme-accent-cyan/10" : item.color === "text-theme-accent-amber" ? "bg-theme-accent-amber/10" : item.color === "text-green-400" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                   <item.Icon className={`${item.color}`} />
                </div>
              </div>
              <h3 className="text-sm font-medium text-theme-text-secondary mt-1">{item.title}</h3>
            </div>
          ))}
        </div>

        {/* Job List */}
        {(loadingData && jobs.length === 0 && !isRefreshing) ? ( 
            <DataLoadingIndicator />
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-theme-surface shadow-xl rounded-lg">
            <UserCircleIcon />
            <h3 className="mt-4 text-xl font-display font-semibold text-theme-text-primary">No Job Matches Found Yet</h3>
            <p className="mt-2 text-theme-text-secondary max-w-md mx-auto">Ensure your profile is complete with skills, experiences, and an uploaded resume for the best results.</p>
            <div className="mt-6">
              <Link to="/profile" className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-lg shadow-md text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan transition-all duration-200">
                Complete Your Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
