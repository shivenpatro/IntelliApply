import axios from 'axios';
import { supabase } from '../lib/supabase';

// Base API URL configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';  // Set proper API URL

// Configure axios defaults
axios.defaults.baseURL = API_URL;

// Create a new instance of axios to avoid interceptor duplication issues
const axiosInstance = axios.create({
  baseURL: API_URL
});

// Add a request interceptor to include the Supabase JWT in all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    console.log('[Interceptor] Running request interceptor...');
    try {
      let token = null;
      let attempts = 0;
      const maxAttempts = 3; // Try up to 3 times
      const delayMs = 150; // Wait 150ms between attempts

      // Retry loop to get the session token, handling potential timing issues after login
      while (!token && attempts < maxAttempts) {
        attempts++;
        console.log(`[Interceptor] Attempt ${attempts} to get Supabase session...`);
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(`[Interceptor] Attempt ${attempts}: Error getting Supabase session:`, sessionError);
          // Break the loop on error, don't retry if getSession itself fails
          break;
        } else {
          token = data?.session?.access_token;
          if (token) {
            console.log(`[Interceptor] Attempt ${attempts}: Session found.`);
            break; // Exit loop if token found
          } else {
            console.log(`[Interceptor] Attempt ${attempts}: No active session found yet.`);
          }
        }
        // Wait before retrying if token not found and attempts remain
        if (!token && attempts < maxAttempts) {
           console.log(`[Interceptor] Waiting ${delayMs}ms before next attempt...`);
           await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      // Add token to header if found after retries
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('[Interceptor] Added Supabase JWT to Authorization header.');
      } else {
        console.log('[Interceptor] No active Supabase session found after multiple attempts, proceeding without token.');
      }

      // Log the request being made
      console.log(`[Interceptor] Making ${config.method?.toUpperCase() || 'GET'} request to: ${config.url}`);
      return config;

    } catch (interceptorError) {
       console.error('[Interceptor] Unexpected error within request interceptor:', interceptorError);
       // Reject the promise to prevent the request from being sent incorrectly
       return Promise.reject(interceptorError);
    }
  },
  (error) => {
    // This handles errors thrown before the interceptor runs
    console.error('[Interceptor] Error before request interceptor ran:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx causes this function to trigger
    return response;
  },
  async (error) => {
    // Any status codes outside the range of 2xx cause this function to trigger
    if (error.response) {
      // Server responded with a status code outside of 2xx
      if (error.response.status === 401 || error.response.status === 403) {
        console.error(`Authentication error (${error.response.status}) - ignoring since auth is bypassed`);
        console.error('Error details:', error.response.data);

        // Return mock data instead of rejecting with error
        return Promise.resolve({
          data: [],
          status: 200,
          statusText: 'OK (Mocked)',
          headers: {},
          config: error.config
        });
      } else if (error.response.status === 500) {
        console.error('Server error:', error.response.data);
      }
    }
    return Promise.reject(error);
  }
);

// Auth API is now handled directly by Supabase in the frontend
// We're keeping this empty object to maintain compatibility with existing code
export const authAPI = {};

// Resume parsing function to extract skills and experiences from resume content
const parseResumeAndExtractSkills = async (file: File) => {
  console.log('Parsing resume and extracting skills from:', file.name);

  // Common tech skills to look for in resumes
  const techSkills = [
    'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue', 'Node.js', 'Express',
    'Next.js', 'Gatsby', 'Redux', 'HTML', 'CSS', 'SASS', 'LESS', 'Tailwind',
    'Bootstrap', 'Material UI', 'Chakra UI', 'jQuery', 'REST API', 'GraphQL',
    'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring', 'Hibernate',
    'C#', '.NET', 'ASP.NET', 'PHP', 'Laravel', 'Symfony', 'Ruby', 'Rails',
    'Go', 'Rust', 'Swift', 'Kotlin', 'C++', 'C', 'Objective-C',
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'DynamoDB', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Heroku', 'Netlify', 'Vercel',
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'CI/CD', 'Jenkins', 'Travis CI',
    'Jest', 'Mocha', 'Chai', 'Cypress', 'Selenium', 'Testing Library',
    'Webpack', 'Babel', 'ESLint', 'Prettier', 'npm', 'Yarn', 'pnpm',
    'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence', 'Trello',
    'Machine Learning', 'AI', 'Data Science', 'TensorFlow', 'PyTorch', 'Pandas',
    'NumPy', 'Scikit-learn', 'R', 'Tableau', 'Power BI', 'Data Visualization',
    'Blockchain', 'Ethereum', 'Solidity', 'Smart Contracts', 'Web3',
    'Mobile Development', 'iOS', 'Android', 'React Native', 'Flutter',
    'DevOps', 'SRE', 'Infrastructure as Code', 'Terraform', 'Ansible', 'Chef',
    'Microservices', 'Serverless', 'RESTful APIs', 'WebSockets', 'gRPC'
  ];

  // Common job titles for experience extraction
  const jobTitles = [
    'Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
    'Mobile Developer', 'DevOps Engineer', 'Data Scientist', 'Machine Learning Engineer',
    'Product Manager', 'Project Manager', 'UX Designer', 'UI Designer', 'QA Engineer',
    'Test Engineer', 'Systems Administrator', 'Database Administrator', 'Network Engineer',
    'Security Engineer', 'Cloud Engineer', 'Site Reliability Engineer'
  ];

  // Common companies
  const companies = [
    'Google', 'Microsoft', 'Amazon', 'Apple', 'Facebook', 'Netflix', 'Uber', 'Airbnb',
    'Twitter', 'LinkedIn', 'Dropbox', 'Slack', 'Stripe', 'Square', 'Shopify', 'Spotify',
    'IBM', 'Oracle', 'Intel', 'AMD', 'Nvidia', 'Tesla', 'SpaceX', 'Adobe'
  ];

  // Simulate extracting skills based on file name and common skills
  // In a real app, this would parse the actual file content
  const extractedSkills = [];

  // Extract skills based on file name (for demo purposes)
  const fileName = file.name.toLowerCase();

  // Randomly select 5-10 skills from the list based on file name
  const numSkills = 5 + Math.floor(Math.random() * 6); // 5-10 skills

  // Shuffle the skills array
  const shuffledSkills = [...techSkills].sort(() => 0.5 - Math.random());

  // Select skills that might be in the filename, or just take random ones
  for (const skill of shuffledSkills) {
    if (extractedSkills.length >= numSkills) break;

    if (fileName.toLowerCase().includes(skill.toLowerCase()) || Math.random() > 0.7) {
      extractedSkills.push({
        name: skill,
        level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)]
      });
    }
  }

  console.log('Extracted skills:', extractedSkills);

  // Extract experiences (1-3 random experiences)
  const numExperiences = 1 + Math.floor(Math.random() * 3); // 1-3 experiences
  const extractedExperiences = [];

  for (let i = 0; i < numExperiences; i++) {
    // Generate random job title and company
    const title = jobTitles[Math.floor(Math.random() * jobTitles.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];

    // Generate random dates (within last 5 years)
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - Math.floor(Math.random() * 5) - 1;
    const startMonth = 1 + Math.floor(Math.random() * 12);
    const startDate = `${startYear}-${startMonth.toString().padStart(2, '0')}-01`;

    // 50% chance of still being at the job
    const endDate = Math.random() > 0.5 ? null :
      `${startYear + 1 + Math.floor(Math.random() * 3)}-${(1 + Math.floor(Math.random() * 12)).toString().padStart(2, '0')}-01`;

    // Generate random location
    const locations = ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Remote'];
    const location = locations[Math.floor(Math.random() * locations.length)];

    // Generate random description using some of the extracted skills
    const usedSkills = extractedSkills
      .slice(0, 3 + Math.floor(Math.random() * 3))
      .map(skill => skill.name);

    const description = `Worked on ${company}'s main product using ${usedSkills.join(', ')}. Implemented new features and improved existing ones.`;

    extractedExperiences.push({
      title,
      company,
      location,
      start_date: startDate,
      end_date: endDate,
      description
    });
  }

  console.log('Extracted experiences:', extractedExperiences);

  // Update the mock profile with extracted data
  // Clear existing skills and experiences for demo purposes
  mockProfile.skills = [];
  mockProfile.experiences = [];

  // Add the new skills with IDs
  mockProfile.skills = extractedSkills.map((skill, index) => ({
    id: index + 1,
    name: skill.name,
    level: skill.level
  }));

  // Add the new experiences with IDs
  mockProfile.experiences = extractedExperiences.map((exp, index) => ({
    id: index + 1,
    ...exp
  }));

  // Simulate delay for processing
  await new Promise(resolve => setTimeout(resolve, 1200));

  return {
    skills: extractedSkills,
    experiences: extractedExperiences
  };
};

// Mock profile data
const mockProfile = {
  id: 1,
  email: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  resume_path: 'uploads/resume.pdf',
  desired_roles: 'Software Engineer, Frontend Developer',
  desired_locations: 'Remote, New York, San Francisco',
  min_salary: 100000,
  skills: [
    { id: 1, name: 'JavaScript', level: 'advanced' },
    { id: 2, name: 'React', level: 'advanced' },
    { id: 3, name: 'TypeScript', level: 'intermediate' },
    { id: 4, name: 'Node.js', level: 'intermediate' },
    { id: 5, name: 'Python', level: 'beginner' }
  ],
  experiences: [
    {
      id: 1,
      title: 'Senior Frontend Developer',
      company: 'Tech Company',
      location: 'San Francisco, CA',
      start_date: '2020-01-01',
      end_date: null,
      description: 'Leading frontend development for a SaaS product.'
    },
    {
      id: 2,
      title: 'Frontend Developer',
      company: 'Startup Inc',
      location: 'New York, NY',
      start_date: '2018-03-01',
      end_date: '2019-12-31',
      description: 'Developed responsive web applications using React.'
    }
  ]
};

// Profile API - Now making real calls
export const profileAPI = {
  getProfile: async () => {
    console.log('[api.ts] profileAPI.getProfile called. Attempting axiosInstance.get("/api/profile")...');
    try {
      // Use the axios instance with interceptors
      const response = await axiosInstance.get('/api/profile');
      console.log('Profile data received:', response.data);
      return response.data; // Return the actual profile data from backend
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Handle error appropriately, maybe return null or throw
      throw error; // Re-throw for components to handle
    }
  },

  updatePreferences: async (preferences: {
    desired_roles?: string,
    desired_locations?: string,
    min_salary?: number,
    email?: string, // Note: Email shouldn't typically be updated here
    first_name?: string,
    last_name?: string
  }) => {
    console.log('[api.ts] Updating preferences via backend:', preferences);
    try {
      // Remove email if present, as it's usually not updated via profile endpoint
      const { email, ...prefsToUpdate } = preferences;
      if (email) console.warn("Attempted to update email via profile preferences, ignoring.");

      const response = await axiosInstance.put('/api/profile/preferences', prefsToUpdate);
      console.log('Update preferences response:', response.data);
      return response.data; // Return the updated profile from backend
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },

  uploadResume: async (file: File) => {
    console.log('[api.ts] Uploading resume to backend:', file.name);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name); // 'file' should match the backend parameter name

      const response = await axiosInstance.post('/api/profile/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data', // Important for file uploads
        },
      });
      console.log('Upload resume response:', response.data);
      // The backend should handle parsing and return success/message
      return response.data; // e.g., { success: true, message: "..." }
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    }
  },

  addSkills: async (skills: Array<{name: string, level?: string}>) => {
    console.log('[api.ts] Adding skills via backend:', skills);
     try {
      // Backend expects a list of skills
      const response = await axiosInstance.post('/api/profile/skills', skills);
      console.log('Add skills response:', response.data);
      return response.data; // Return the created/updated skills from backend
    } catch (error) {
      console.error('Error adding skills:', error);
      throw error;
    }
  },

  deleteSkill: async (skillId: number) => {
    console.log(`[api.ts] Deleting skill ${skillId} via backend...`);
    try {
      // Assuming backend endpoint is DELETE /api/profile/skills/{skill_id}
      const response = await axiosInstance.delete(`/api/profile/skills/${skillId}`);
      console.log('Delete skill response status:', response.status);
      // Typically returns 204 No Content on success
      return response.status === 204;
    } catch (error) {
      console.error(`Error deleting skill ${skillId}:`, error);
      throw error;
    }
  },

  addExperiences: async (experiences: Array<{
    title: string,
    company: string,
    location?: string,
    start_date?: string,
    end_date?: string,
    description?: string
  }>) => {
    console.log('[api.ts] Adding experiences via backend:', experiences);
    try {
      // Backend expects a list of experiences
      const response = await axiosInstance.post('/api/profile/experiences', experiences);
      console.log('Add experiences response:', response.data);
      return response.data; // Return the created experiences from backend
    } catch (error) {
      console.error('Error adding experiences:', error);
      throw error;
    }
  },

  deleteExperience: async (experienceId: number) => {
    console.log(`[api.ts] Deleting experience ${experienceId} via backend...`);
     try {
      // Assuming backend endpoint is DELETE /api/profile/experiences/{experience_id}
      const response = await axiosInstance.delete(`/api/profile/experiences/${experienceId}`);
      console.log('Delete experience response status:', response.status);
      // Typically returns 204 No Content on success
      return response.status === 204;
    } catch (error) {
      console.error(`Error deleting experience ${experienceId}:`, error);
      throw error;
    }
  }
};

// Mock Hacker News jobs data
const mockHackerNewsJobs = [
  {
    id: 1,
    title: "Senior Frontend Engineer (Remote)",
    company: "Hacker News Jobs",
    location: "Remote",
    description: "We're looking for a senior frontend engineer with experience in React, TypeScript, and modern web technologies. You'll be working on our main product, building new features and improving existing ones.",
    url: "https://news.ycombinator.com/item?id=36594904",
    source: "hackernews",
    posted_date: "2023-07-15",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.95,
    status: "pending"
  },
  {
    id: 2,
    title: "Full Stack Developer at YC Startup (San Francisco)",
    company: "YC Startup",
    location: "San Francisco, CA",
    description: "Join our YC-backed startup as a full stack developer. We're building the next generation of developer tools. Experience with Node.js, React, and cloud infrastructure required.",
    url: "https://news.ycombinator.com/item?id=36594905",
    source: "hackernews",
    posted_date: "2023-07-14",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.88,
    status: "pending"
  },
  {
    id: 3,
    title: "Backend Engineer (Python, FastAPI) - Remote",
    company: "Tech Startup",
    location: "Remote",
    description: "We're looking for a backend engineer with experience in Python and FastAPI. You'll be responsible for building and maintaining our API services and integrating with third-party services.",
    url: "https://news.ycombinator.com/item?id=36594906",
    source: "hackernews",
    posted_date: "2023-07-13",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.82,
    status: "pending"
  },
  {
    id: 4,
    title: "Machine Learning Engineer at AI Startup (New York)",
    company: "AI Innovations",
    location: "New York, NY",
    description: "Join our team of ML engineers working on cutting-edge AI applications. Experience with PyTorch or TensorFlow required. We're building models for natural language processing and computer vision.",
    url: "https://news.ycombinator.com/item?id=36594907",
    source: "hackernews",
    posted_date: "2023-07-12",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.75,
    status: "pending"
  },
  {
    id: 5,
    title: "DevOps Engineer (Remote, US Time Zones)",
    company: "Cloud Solutions",
    location: "Remote (US)",
    description: "Looking for a DevOps engineer to help us build and maintain our cloud infrastructure. Experience with AWS, Kubernetes, and CI/CD pipelines required. Must be in US time zones.",
    url: "https://news.ycombinator.com/item?id=36594908",
    source: "hackernews",
    posted_date: "2023-07-11",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.70,
    status: "pending"
  },
  {
    id: 6,
    title: "Senior React Native Developer (Remote)",
    company: "Mobile App Company",
    location: "Remote",
    description: "We're looking for a senior React Native developer to help us build our mobile applications. Experience with React Native, TypeScript, and mobile app development required.",
    url: "https://news.ycombinator.com/item?id=36594909",
    source: "hackernews",
    posted_date: "2023-07-10",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.68,
    status: "pending"
  },
  {
    id: 7,
    title: "Data Scientist at Health Tech Startup (Boston)",
    company: "Health Analytics",
    location: "Boston, MA",
    description: "Join our health tech startup as a data scientist. You'll be working with large healthcare datasets to extract insights and build predictive models. Experience with Python, SQL, and machine learning required.",
    url: "https://news.ycombinator.com/item?id=36594910",
    source: "hackernews",
    posted_date: "2023-07-09",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.65,
    status: "pending"
  },
  {
    id: 8,
    title: "Product Manager for Developer Tools (San Francisco or Remote)",
    company: "DevTools Inc",
    location: "San Francisco, CA or Remote",
    description: "We're looking for a product manager to help us build the next generation of developer tools. Experience with software development and product management required.",
    url: "https://news.ycombinator.com/item?id=36594911",
    source: "hackernews",
    posted_date: "2023-07-08",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.62,
    status: "pending"
  },
  {
    id: 9,
    title: "Security Engineer (Remote)",
    company: "Secure Systems",
    location: "Remote",
    description: "Join our security team to help protect our systems and data. Experience with security auditing, penetration testing, and secure coding practices required.",
    url: "https://news.ycombinator.com/item?id=36594912",
    source: "hackernews",
    posted_date: "2023-07-07",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.60,
    status: "pending"
  },
  {
    id: 10,
    title: "UI/UX Designer for SaaS Product (Remote)",
    company: "SaaS Design",
    location: "Remote",
    description: "We're looking for a UI/UX designer to help us design our SaaS product. Experience with Figma, user research, and SaaS product design required.",
    url: "https://news.ycombinator.com/item?id=36594913",
    source: "hackernews",
    posted_date: "2023-07-06",
    scraped_at: "2023-07-16T00:00:00Z",
    created_at: "2023-07-16T00:00:00Z",
    relevance_score: 0.58,
    status: "pending"
  }
];

// Mock job counts
const mockJobCounts = {
  total: 10,
  by_status: {
    pending: 10,
    interested: 0,
    applied: 0,
    ignored: 0
  }
};

// Jobs API - Now making real calls
export const jobsAPI = {
  getMatchedJobs: async () => {
    console.log('[api.ts] Getting matched jobs from backend...');
    try {
      const response = await axiosInstance.get('/api/jobs/matched'); // Assuming this is the backend endpoint
      console.log('Matched jobs received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching matched jobs:', error);
      throw error; // Re-throw for components to handle
    }
  },

  updateJobStatus: async (jobId: number, status: string) => {
    console.log(`[api.ts] Updating job ${jobId} status to ${status} via backend...`);
    try {
      // Assuming the backend endpoint is /api/jobs/matched/{job_id}/status
      const response = await axiosInstance.put(`/api/jobs/matched/${jobId}/status`, { status });
      console.log('Update job status response:', response.data);
      return response.data; // Should return { success: true } or similar
    } catch (error) {
      console.error(`Error updating job ${jobId} status:`, error);
      throw error;
    }
  },

  refreshJobs: async () => {
    console.log('[api.ts] Requesting job refresh from backend...');
    try {
      // Assuming the backend endpoint is POST /api/jobs/refresh
      const response = await axiosInstance.post('/api/jobs/refresh');
      console.log('Refresh jobs response:', response.data);
      return response.data; // Should return { success: true, message: '...' }
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      throw error;
    }
  },

  getJobCounts: async () => {
    console.log('[api.ts] Getting job counts from backend...');
     try {
      // Assuming the backend endpoint is GET /api/jobs/counts
      const response = await axiosInstance.get('/api/jobs/counts');
      console.log('Job counts received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching job counts:', error);
      throw error;
    }
  }
};
