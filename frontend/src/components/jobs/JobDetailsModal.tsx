import React, { useState, useEffect } from 'react';

/* ── Icons ── */
const XMarkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const BuildingOfficeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px', opacity: 0.6 }}><path fillRule="evenodd" d="M1.5 7.126c0-1.32.964-2.504 2.25-2.833.6-.15 1.177-.22 1.75-.22h9c.573 0 1.15.07 1.75.22A2.996 2.996 0 0118.5 7.126V15.5A2.5 2.5 0 0116 18H4a2.5 2.5 0 01-2.5-2.5V7.126z" clipRule="evenodd" /></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px', opacity: 0.6 }}><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145l.002-.001L10 18.41l.285.145.002.001.018.008.006.004c.092.042.2.077.28.11L10 19zM10 2C7.239 2 5 4.239 5 7c0 .353.044.692.128 1.014l.001.002.002.005.004.009a6.256 6.256 0 00.02.028l.003.003.002.002A6.212 6.212 0 0010 15.5c1.075 0 2.098-.276 2.97-.768A6.212 6.212 0 0010 15.5zM10 7a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>;
const CalendarDaysIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px', opacity: 0.6 }}><path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2z" clipRule="evenodd" /></svg>;
const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px', marginRight: '6px', opacity: 0.6 }}><path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" /><path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 005.656 5.656l3-3a4 4 0 00-.225-5.865z" /></svg>;

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
  created_at?: string;
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
    setIsVisible(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 1 && date.getDate() === now.getDate()) return 'Today';
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (diffDays <= 2 && date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      if (diffDays <= 7) return `${diffDays} days ago`;
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (error) {
      console.warn("Failed to parse date string for modal:", dateString, error);
      return dateString;
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

  const statusSelectStyles: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    pending:    { color: 'var(--status-pending-text)', bgColor: 'var(--status-pending-bg)', borderColor: 'var(--status-pending-border)' },
    interested: { color: 'var(--status-interested-text)', bgColor: 'var(--status-interested-bg)', borderColor: 'var(--status-interested-border)' },
    applied:    { color: 'var(--status-applied-text)', bgColor: 'var(--status-applied-bg)', borderColor: 'var(--status-applied-border)' },
    ignored:    { color: 'var(--status-ignored-text)', bgColor: 'var(--status-ignored-bg)', borderColor: 'var(--status-ignored-border)' },
  };

  const currentSelectStyle = statusSelectStyles[status] || statusSelectStyles.pending;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        overflowY: 'auto', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '16px',
      }}
      aria-labelledby="modal-title" role="dialog" aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10, 11, 26, 0.35)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'opacity 300ms ease-in-out',
          opacity: isVisible ? 1 : 0,
        }}
        aria-hidden="true" 
        onClick={handleClose}
      />

      {/* Modal Panel */}
      <div 
        style={{
          position: 'relative',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 32px rgba(16, 18, 16, 0.12), 0 32px 64px rgba(27, 94, 66, 0.06)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-primary)',
          maxWidth: '900px', width: '100%',
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          transition: 'opacity 300ms var(--ease-out), transform 300ms var(--ease-out)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
        }}
      >
        {/* Editorial accent top line */}
        <div style={{ height: 2, background: 'var(--accent)' }} />
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{
            fontFamily: "'Playfair Display', serif", fontSize: '24px',
            fontWeight: 500, color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
          }} id="modal-title">
            {job.title}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '4px', borderRadius: '50%',
              color: 'var(--text-muted)', background: 'transparent',
              border: 'none', cursor: 'pointer',
              transition: 'color 200ms ease, background-color 200ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <span className="sr-only">Close</span>
            <XMarkIcon />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflowY: 'hidden' }}>
          {/* Left Sidebar */}
          <div style={{
            width: '280px', flexShrink: 0,
            padding: 'var(--space-6)',
            borderRight: '1px solid var(--border-subtle)',
            overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
          }}>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Company</span>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><BuildingOfficeIcon /> {job.company}</p>
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Location</span>
              <p style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><MapPinIcon /> {job.location}</p>
            </div>
            
            {job.relevance_score !== undefined && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Match Score</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    flex: 1, height: '6px', borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-subtle)', overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(job.relevance_score * 100).toFixed(0)}%`,
                      height: '100%',
                      borderRadius: 'var(--radius-pill)',
                      background: job.relevance_score > 0.75
                        ? 'var(--accent)'
                        : job.relevance_score > 0.5
                        ? 'var(--status-interested-text)'
                        : 'var(--text-muted)',
                    }} />
                  </div>
                  <span style={{
                    fontWeight: 600, fontSize: '15px', fontFamily: "'Playfair Display', serif",
                    color: job.relevance_score > 0.75 ? 'var(--accent)' : job.relevance_score > 0.5 ? 'var(--status-interested-text)' : 'var(--text-muted)',
                  }}>
                    {(job.relevance_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Status</span>
              <select
                value={status}
                onChange={(e) => handleStatusChangeInternal(e.target.value)}
                disabled={isUpdating}
                className="input-field"
                style={{
                  fontSize: '13px', fontWeight: 500, padding: '8px 28px 8px 12px',
                  color: currentSelectStyle.color,
                  background: currentSelectStyle.bgColor,
                  borderColor: currentSelectStyle.borderColor,
                }}
              >
                <option value="pending">Pending</option>
                <option value="interested">Interested</option>
                <option value="applied">Applied</option>
                <option value="ignored">Ignored</option>
              </select>
            </div>

            {job.posted_date && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Posted</span>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}><CalendarDaysIcon /> {formatDate(job.posted_date)}</p>
              </div>
            )}
            {job.source && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Source</span>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{job.source}</p>
              </div>
            )}
            {job.url && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Original Post</span>
                <a
                  href={job.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    color: 'var(--accent)', fontSize: '14px', fontWeight: 500,
                    textDecoration: 'none', wordBreak: 'break-all',
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                >
                  <LinkIcon /> View Original
                </a>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApply}
              style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
            >
              Apply Now
            </button>
          </div>

          {/* Right: Description */}
          <div style={{
            flex: 1, padding: 'var(--space-6)',
            overflowY: 'auto',
          }}>
            <h4 style={{
              fontFamily: "'Playfair Display', serif", fontSize: '18px',
              fontWeight: 500, color: 'var(--text-primary)',
              marginBottom: 'var(--space-4)',
            }}>
              Job Description
            </h4>
            <div style={{
              fontSize: '14px', lineHeight: 1.7,
              color: 'var(--text-secondary)', whiteSpace: 'pre-line',
            }}>
              {job.description || "No description available."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;
