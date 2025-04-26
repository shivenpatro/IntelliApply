// Mock data to use as fallback when API calls fail
// This ensures the dashboard always shows something instead of getting stuck loading

export const mockJobs = [
  {
    id: 1,
    title: "Frontend Developer",
    company: "Tech Solutions Inc.",
    location: "Remote",
    description: "We're looking for a skilled Frontend Developer to join our team. Experience with React, TypeScript, and modern web technologies required.",
    url: "https://example.com/job/1",
    source: "Sample",
    posted_date: "2023-04-15",
    scraped_at: "2023-04-17T00:00:00Z",
    created_at: "2023-04-17T00:00:00Z",
    relevance_score: 0.92,
    status: "pending"
  },
  {
    id: 2,
    title: "Full Stack Engineer",
    company: "InnovateTech",
    location: "San Francisco, CA",
    description: "Join our team as a Full Stack Engineer working on cutting-edge web applications. Experience with React, Node.js, and cloud technologies desired.",
    url: "https://example.com/job/2",
    source: "Sample",
    posted_date: "2023-04-14",
    scraped_at: "2023-04-17T00:00:00Z",
    created_at: "2023-04-17T00:00:00Z",
    relevance_score: 0.85,
    status: "pending"
  },
  {
    id: 3,
    title: "Backend Developer",
    company: "DataSystems Corp",
    location: "New York, NY",
    description: "Looking for a Backend Developer with experience in Python, FastAPI, and database design to help build our data processing systems.",
    url: "https://example.com/job/3",
    source: "Sample",
    posted_date: "2023-04-13",
    scraped_at: "2023-04-17T00:00:00Z",
    created_at: "2023-04-17T00:00:00Z",
    relevance_score: 0.78,
    status: "pending"
  }
];

export const mockJobCounts = {
  total: 3,
  by_status: {
    pending: 3,
    interested: 0,
    applied: 0,
    ignored: 0
  }
};
