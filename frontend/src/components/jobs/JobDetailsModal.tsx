import { useState, useEffect } from 'react';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source?: string;
  posted_date?: string;
  scraped_at?: string;
  relevance_score?: number;
  status?: 'pending' | 'interested' | 'applied' | 'ignored';
}

interface JobDetailsModalProps {
  job: Job;
  onClose: () => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}

const JobDetailsModal = ({ job, onClose, onStatusChange }: JobDetailsModalProps) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState(job.status || 'pending');
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Animation timing
    setTimeout(() => {
      setIsVisible(true);
    }, 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300); // Match the duration of the transition
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 1) return 'Today';
      if (diffDays <= 2) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      setStatus(newStatus as any);
      await onStatusChange(job.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  // Apply to external job link
  const handleApply = () => {
    if (job.url) {
      window.open(job.url, '_blank');
      
      // Optionally change status to 'applied' when user clicks to apply
      if (status !== 'applied') {
        handleStatusChange('applied');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-green-100 text-green-800';
      case 'interested':
        return 'bg-yellow-100 text-yellow-800';
      case 'ignored':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'interested':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        );
      case 'ignored':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto" 
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay with animation */}
        <div 
          className={`fixed inset-0 bg-gray-500 transition-opacity duration-300 ease-in-out ${isVisible ? 'bg-opacity-75' : 'bg-opacity-0'}`} 
          aria-hidden="true" 
          onClick={handleClose}
        ></div>

        {/* Modal panel with animation */}
        <div 
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all duration-300 ease-in-out sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                {/* Job title and close button */}
                <div className="flex justify-between items-start">
                  <h3 className="text-xl leading-6 font-bold text-gray-900" id="modal-title">
                    {job.title}
                  </h3>
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 transition-colors duration-200 focus:outline-none"
                    onClick={handleClose}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Company and location */}
                <div className="flex items-center mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">{job.company}</span>
                  <span className="mx-2 text-gray-400">•</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm text-gray-700">{job.location}</span>
                </div>
                
                {/* Status badge */}
                <div className="mt-3 flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                    {status === 'pending' ? 'New' : 
                     status === 'interested' ? 'Interested' : 
                     status === 'applied' ? 'Applied' : 
                     status === 'ignored' ? 'Ignored' : 'New'}
                  </span>
                </div>
                
                {/* Match score */}
                {job.relevance_score !== undefined && (
                  <div className="mt-3">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 mr-2">Match Score:</span>
                      <div className="flex-grow h-2.5 bg-gray-200 rounded-full max-w-[200px]">
                        <div 
                          className="h-2.5 rounded-full" 
                          style={{
                            width: `${(job.relevance_score * 100).toFixed(0)}%`,
                            backgroundColor: job.relevance_score > 0.8 ? 'rgb(16, 185, 129)' : 
                              job.relevance_score > 0.6 ? 'rgb(245, 158, 11)' : 
                              'rgb(239, 68, 68)'
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm font-medium text-gray-700">{(job.relevance_score * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                )}
                
                {/* Other details */}
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="font-medium text-gray-700">Source:</span>{' '}
                      <span className="ml-1 text-gray-600">{job.source || 'Not available'}</span>
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-gray-700">Posted:</span>{' '}
                      <span className="ml-1 text-gray-600">{formatDate(job.posted_date)}</span>
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-gray-700">Found:</span>{' '}
                      <span className="ml-1 text-gray-600">{formatDate(job.scraped_at)}</span>
                    </div>
                    {job.url && (
                      <div className="flex items-center col-span-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        <span className="font-medium text-gray-700">URL:</span>{' '}
                        <a 
                          href={job.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="ml-1 text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px] inline-block"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Description */}
                <div className="mt-5">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Job Description
                  </h4>
                  <div className="mt-3 text-sm text-gray-600 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md p-4 shadow-inner">
                    <p className="whitespace-pre-line">{job.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-gray-50 px-4 py-4 sm:px-6 sm:flex sm:flex-row">
            <div className="sm:flex-1 flex items-center">
              <label htmlFor="status-select" className="sr-only">Change status</label>
              <div className="relative rounded-md shadow-sm w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {getStatusIcon(status)}
                </div>
                <select
                  id="status-select"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md transition-colors duration-200"
                >
                  <option value="pending">Mark as New</option>
                  <option value="interested">Mark as Interested</option>
                  <option value="applied">Mark as Applied</option>
                  <option value="ignored">Ignore</option>
                </select>
                {isUpdating && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3 sm:mt-0 sm:ml-3 flex flex-col-reverse sm:flex-row">
              <button
                type="button"
                className="mb-2 sm:mb-0 sm:mr-2 inline-flex justify-center items-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                onClick={handleClose}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
              <button
                type="button"
                className="inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-base font-medium text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-all duration-200"
                onClick={handleApply}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Apply Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
