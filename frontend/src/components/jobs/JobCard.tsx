import React from 'react';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: string;
  posted_date: string;
  scraped_at: string;
  created_at: string;
  relevance_score?: number;
  status: 'pending' | 'interested' | 'applied' | 'ignored';
}

interface JobCardProps {
  job: Job;
  onOpenDetails: (job: Job) => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onOpenDetails, onStatusChange }) => {
  const statusStyles: Record<string, { borderColor: string; textColor: string; bgColor: string }> = {
    pending:    { borderColor: 'var(--border-default)', textColor: 'var(--status-pending-text)', bgColor: 'var(--status-pending-bg)' },
    interested: { borderColor: 'var(--status-interested-border)', textColor: 'var(--status-interested-text)', bgColor: 'var(--status-interested-bg)' },
    applied:    { borderColor: 'var(--status-applied-border)', textColor: 'var(--status-applied-text)', bgColor: 'var(--status-applied-bg)' },
    ignored:    { borderColor: 'var(--status-ignored-border)', textColor: 'var(--status-ignored-text)', bgColor: 'var(--status-ignored-bg)' },
  };

  const currentStatus = statusStyles[job.status] || statusStyles.pending;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div
      className="card card-hover gradient-border"
      style={{
        borderLeft: `3px solid ${currentStatus.borderColor}`,
        padding: 'var(--space-5)',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 600,
              fontFamily: "'Sora', sans-serif",
              color: 'var(--text-primary)',
              cursor: 'pointer',
              lineHeight: 1.3,
            }}
            onClick={() => onOpenDetails(job)}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          >
            {job.title}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>{job.company}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{job.location}</p>
        </div>

        {/* Score & Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          {job.relevance_score !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                fontWeight: 600,
                color: job.relevance_score > 0.75 ? 'var(--accent)' : job.relevance_score > 0.5 ? 'var(--status-interested-text)' : 'var(--text-muted)',
              }}>
                {(job.relevance_score * 100).toFixed(0)}%
              </span>
              <span>Match</span>
            </div>
          )}
          <span>Posted: {formatDate(job.posted_date)}</span>
        </div>
        
        {/* Description */}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
          overflow: 'hidden',
          marginBottom: 'var(--space-4)',
          flex: 1,
        }}>
          {job.description}
        </p>

        {/* Footer */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
        }}>
          <select
            value={job.status}
            onChange={(e) => onStatusChange(job.id, e.target.value)}
            className="input-field"
            style={{
              width: 'auto',
              fontSize: '12px',
              fontWeight: 500,
              padding: '6px 28px 6px 10px',
              color: currentStatus.textColor,
              background: currentStatus.bgColor,
              borderColor: currentStatus.borderColor,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <option value="pending">Pending</option>
            <option value="interested">Interested</option>
            <option value="applied">Applied</option>
            <option value="ignored">Ignored</option>
          </select>
          <button
            onClick={() => onOpenDetails(job)}
            className="btn btn-primary btn-sm"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
