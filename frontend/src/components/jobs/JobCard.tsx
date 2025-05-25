import React from 'react';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  posted_date: string; // Assuming YYYY-MM-DD or similar
  scraped_at: string; // Added to match DashboardPage type
  created_at: string; // Added to match DashboardPage type
  relevance_score?: number;
  status: 'pending' | 'interested' | 'applied' | 'ignored';
}

interface JobCardProps {
  job: Job;
  onOpenDetails: (job: Job) => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}

// Placeholder Icons - consider using a library like Heroicons
const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" /><path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.18l.879-.879a1.651 1.651 0 012.336 0l.879.879a1.651 1.651 0 010 1.18l-.879.879a1.651 1.651 0 01-2.336 0l-.879-.879zm9.336 0a1.651 1.651 0 010-1.18l.879-.879a1.651 1.651 0 012.335 0l.879.879a1.651 1.651 0 010 1.18l-.879.879a1.651 1.651 0 01-2.335 0l-.879-.879z" clipRule="evenodd" /></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.39-3.423 3.338.95 4.876 4.225-2.287 4.225 2.287.95-4.876-3.423-3.338-4.753-.39L10.868 2.884z" clipRule="evenodd" /></svg>;
const XCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>;


const JobCard: React.FC<JobCardProps> = ({ job, onOpenDetails, onStatusChange }) => {
  const statusColors = {
    pending: 'border-slate-500',
    interested: 'border-amber-400', // theme-accent-amber
    applied: 'border-green-500', // A generic green, or use theme-accent-cyan
    ignored: 'border-red-500',
  };

  const statusTextColors = {
    pending: 'text-slate-400',
    interested: 'text-amber-400',
    applied: 'text-green-400',
    ignored: 'text-red-400',
  };
  
  const statusBgColors = {
    pending: 'bg-slate-700',
    interested: 'bg-amber-500/20',
    applied: 'bg-green-500/20',
    ignored: 'bg-red-500/20',
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  return (
    <div 
      className={`bg-theme-surface rounded-lg shadow-xl p-5 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-theme-accent-cyan/20 border-l-4 ${statusColors[job.status] || 'border-slate-500'}`}
    >
      <div className="flex flex-col h-full">
        {/* Header: Title, Company, Location */}
        <div className="mb-3">
          <h3 
            className="text-lg font-display font-semibold text-theme-text-primary hover:text-theme-accent-cyan cursor-pointer transition-colors"
            onClick={() => onOpenDetails(job)}
          >
            {job.title}
          </h3>
          <p className="text-sm text-theme-text-secondary mt-1">{job.company}</p>
          <p className="text-xs text-slate-500 mt-0.5">{job.location}</p>
        </div>

        {/* Relevance Score & Posted Date */}
        <div className="flex justify-between items-center text-xs text-theme-text-secondary mb-3">
          {job.relevance_score !== undefined && (
            <div className="flex items-center">
              <span className={`font-semibold mr-1 ${job.relevance_score > 0.75 ? 'text-theme-accent-cyan' : job.relevance_score > 0.5 ? 'text-amber-400' : 'text-slate-400'}`}>
                {(job.relevance_score * 100).toFixed(0)}%
              </span>
              <span>Match</span>
            </div>
          )}
          <span>Posted: {formatDate(job.posted_date)}</span>
        </div>
        
        {/* Description Snippet */}
        <p className="text-sm text-theme-text-secondary line-clamp-3 mb-4 flex-grow">
          {job.description}
        </p>

        {/* Footer: Status & Actions */}
        <div className="mt-auto pt-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="w-full sm:w-auto">
            <select
              value={job.status}
              onChange={(e) => onStatusChange(job.id, e.target.value)}
              className={`w-full sm:w-auto text-xs font-medium py-1.5 px-2.5 rounded-md border border-slate-600 focus:ring-1 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan transition-colors ${statusTextColors[job.status]} ${statusBgColors[job.status]} bg-theme-bg`}
            >
              <option value="pending">Pending</option>
              <option value="interested">Interested</option>
              <option value="applied">Applied</option>
              <option value="ignored">Ignored</option>
            </select>
          </div>
          <button
            onClick={() => onOpenDetails(job)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-semibold rounded-md text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan transition-colors"
          >
            <EyeIcon /> View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
