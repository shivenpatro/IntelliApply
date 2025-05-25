import React, { useState, useEffect } from 'react';

// --- Icons (Consider using a library like Heroicons) ---
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const BuildingOfficeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 opacity-70"><path fillRule="evenodd" d="M1.5 7.126c0-1.32.964-2.504 2.25-2.833.6-.15 1.177-.22 1.75-.22h9c.573 0 1.15.07 1.75.22A2.996 2.996 0 0118.5 7.126V15.5A2.5 2.5 0 0116 18H4a2.5 2.5 0 01-2.5-2.5V7.126zM10 12a.75.75 0 00-1.5 0v.002A.75.75 0 0010 12zm3 0a.75.75 0 00-1.5 0v.002a.75.75 0 001.5 0zm-6-2.25A.75.75 0 017.5 9h.008a.75.75 0 01.75.75v.002a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V9.75zm3 0A.75.75 0 0110.5 9h.008a.75.75 0 01.75.75v.002a.75.75 0 01-.75.75H10.5a.75.75 0 01-.75-.75V9.75zm3 0A.75.75 0 0113.5 9h.008a.75.75 0 01.75.75v.002a.75.75 0 01-.75.75H13.5a.75.75 0 01-.75-.75V9.75z" clipRule="evenodd" /></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 opacity-70"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145l.002-.001L10 18.41l.285.145.002.001.018.008.006.004c.092.042.2.077.28.11L10 19zM10 2C7.239 2 5 4.239 5 7c0 .353.044.692.128 1.014l.001.002.002.005.004.009a6.256 6.256 0 00.02.028l.003.003.002.002A6.212 6.212 0 0010 15.5c1.075 0 2.098-.276 2.97-.768A6.212 6.212 0 0010 15.5zM10 7a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const CalendarDaysIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 opacity-70"><path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" /></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 opacity-70"><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 005.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>;
// --- End Icons ---

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source?: string;
  posted_date?: string;
  scraped_at?: string; // Ensure this matches JobCard and DashboardPage
  created_at?: string; // Ensure this matches JobCard and DashboardPage
  relevance_score?: number;
  status?: 'pending' | 'interested' | 'applied' | 'ignored';
}

interface JobDetailsModalProps {
  job: Job;
  onClose: () => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}

const JobDetailsModal: React.FC<JobDetailsModalProps> = ({ job, onClose, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(job.status || 'pending');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true); // Trigger enter animation
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Match animation duration
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1 && date.getDate() === now.getDate()) return 'Today';
      // Simple check for yesterday, might need refinement for edge cases like month/year change
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (diffDays <= 2 && date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      
      if (diffDays <= 7) return `${diffDays} days ago`;
      
      return date.toLocaleDateString(undefined, { // Use user's locale
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.warn("Failed to parse date string for modal:", dateString, error);
      return dateString; // Fallback to original string if parsing fails
    }
  };

  const handleStatusChangeInternal = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      setStatus(newStatus as any);
      await onStatusChange(job.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApply = () => {
    if (job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
      if (status !== 'applied') {
        handleStatusChangeInternal('applied');
      }
    }
  };
  
  const statusTextColors = {
    pending: 'text-slate-400',
    interested: 'text-theme-accent-amber',
    applied: 'text-green-400',
    ignored: 'text-red-400',
  };
  const statusBgColors = {
    pending: 'bg-slate-700',
    interested: 'bg-amber-500/20',
    applied: 'bg-green-500/20',
    ignored: 'bg-red-500/20',
  };


  return (
    <div 
      className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      {/* Background overlay */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        aria-hidden="true" 
        onClick={handleClose}
      ></div>

      {/* Modal panel */}
      <div 
        className={`relative bg-theme-surface rounded-xl shadow-2xl text-theme-text-primary max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h3 className="text-2xl font-display font-semibold" id="modal-title">
            {job.title}
          </h3>
          <button
            type="button"
            className="p-1 rounded-full text-slate-400 hover:text-theme-accent-cyan hover:bg-slate-700 transition-colors"
            onClick={handleClose}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon />
          </button>
        </div>

        {/* Content Area (Two Columns) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-y-hidden">
          {/* Left Column (Sticky Info & Actions) */}
          <div className="w-full md:w-1/3 lg:w-2/5 p-6 border-b md:border-b-0 md:border-r border-slate-700 space-y-6 overflow-y-auto">
            <div>
              <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Company</h4>
              <p className="text-lg font-semibold text-theme-text-primary flex items-center"><BuildingOfficeIcon /> {job.company}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Location</h4>
              <p className="text-theme-text-primary flex items-center"><MapPinIcon /> {job.location}</p>
            </div>
            
            {job.relevance_score !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Match Score</h4>
                <div className="flex items-center">
                  <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${job.relevance_score > 0.75 ? 'bg-theme-accent-cyan' : job.relevance_score > 0.5 ? 'bg-theme-accent-amber' : 'bg-slate-500'}`}
                      style={{ width: `${(job.relevance_score * 100).toFixed(0)}%` }}
                    ></div>
                  </div>
                  <span className={`ml-3 font-semibold ${job.relevance_score > 0.75 ? 'text-theme-accent-cyan' : job.relevance_score > 0.5 ? 'text-theme-accent-amber' : 'text-slate-400'}`}>
                    {(job.relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Status</h4>
              <select
                value={status}
                onChange={(e) => handleStatusChangeInternal(e.target.value)}
                disabled={isUpdating}
                className={`w-full text-sm font-medium py-2 px-3 rounded-md border border-slate-600 focus:ring-1 focus:ring-theme-accent-cyan focus:border-theme-accent-cyan transition-colors ${statusTextColors[status]} ${statusBgColors[status]} bg-theme-bg`}
              >
                <option value="pending">Pending</option>
                <option value="interested">Interested</option>
                <option value="applied">Applied</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>

            {job.posted_date && (
              <div>
                <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Posted</h4>
                <p className="text-theme-text-primary flex items-center"><CalendarDaysIcon /> {formatDate(job.posted_date)}</p>
              </div>
            )}
            {job.source && (
              <div>
                <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Source</h4>
                <p className="text-theme-text-primary">{job.source}</p>
              </div>
            )}
             {job.url && (
                <div>
                    <h4 className="text-sm font-medium text-theme-text-secondary mb-1">Original Post</h4>
                    <a 
                        href={job.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center text-theme-accent-cyan hover:text-theme-accent-cyan-darker hover:underline break-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <LinkIcon /> View Original
                    </a>
                </div>
            )}

            <button
              type="button"
              className="w-full mt-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg shadow-md text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-theme-surface focus:ring-theme-accent-cyan transition-colors"
              onClick={handleApply}
            >
              Apply Now
            </button>
          </div>

          {/* Right Column (Scrollable Description) */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h4 className="font-display text-xl font-semibold text-theme-text-primary mb-3">Job Description</h4>
            <div className="prose prose-sm prose-invert max-w-none text-theme-text-secondary leading-relaxed whitespace-pre-line">
              {/* Using prose classes for nice typography if description is HTML/Markdown, or just use <p> */}
              {job.description || "No description available."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
