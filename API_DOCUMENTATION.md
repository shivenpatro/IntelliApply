# IntelliApply API Documentation

## Table of Contents

1. [Backend API Endpoints](#backend-api-endpoints)
2. [Frontend API Services](#frontend-api-services)
3. [React Components](#react-components)
4. [Context Providers](#context-providers)
5. [Custom Hooks](#custom-hooks)
6. [Backend Services](#backend-services)
7. [Usage Examples](#usage-examples)

---

## Backend API Endpoints

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: Set via `VITE_API_BASE_URL` environment variable

### Authentication Required
All endpoints except `/`, `/health`, and auth endpoints require a valid Supabase JWT token in the Authorization header:
```
Authorization: Bearer <your-supabase-jwt-token>
```

---

## Authentication API (`/api/auth`)

### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "supabase_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Password too weak or invalid data
- `409 Conflict`: User already exists
- `500 Internal Server Error`: Registration failed

---

### POST `/api/auth/token`
Authenticate user and get access token.

**Request Body (Form Data):**
```
username: user@example.com  # Email address
password: password123
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials

---

### GET `/api/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": 1,
  "supabase_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

## Profile API (`/api/profile`)

### GET `/api/profile`
Get user profile information including skills and experiences.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "desired_roles": "Software Engineer, Full Stack Developer",
  "desired_locations": "San Francisco, Remote",
  "min_salary": 100000,
  "resume_text": "Extracted resume content...",
  "skills": [
    {
      "id": 1,
      "name": "Python",
      "level": "Advanced"
    }
  ],
  "experiences": [
    {
      "id": 1,
      "title": "Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco",
      "start_date": "2022-01-01",
      "end_date": "2023-12-31",
      "description": "Developed web applications..."
    }
  ]
}
```

---

### PUT `/api/profile/preferences`
Update user preferences.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "desired_roles": "Software Engineer, DevOps Engineer",
  "desired_locations": "New York, Remote",
  "min_salary": 120000,
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

### POST `/api/profile/resume`
Upload and parse a resume file.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body (Form Data):**
```
file: <resume.pdf or resume.docx>
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Resume uploaded and parsed successfully",
  "resume_text": "Extracted text from resume..."
}
```

**Supported Formats:** PDF, DOCX

---

### POST `/api/profile/skills`
Add skills to user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
[
  {
    "name": "JavaScript",
    "level": "Intermediate"
  },
  {
    "name": "React",
    "level": "Advanced"
  }
]
```

**Response:** `200 OK`
```json
{
  "success": true,
  "skills_added": 2
}
```

---

### DELETE `/api/profile/skills/{skill_id}`
Delete a specific skill.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

---

### DELETE `/api/profile/skills/all`
Delete all user skills.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

---

### POST `/api/profile/experiences`
Add work experiences to user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
[
  {
    "title": "Senior Developer",
    "company": "Tech Startup",
    "location": "Remote",
    "start_date": "2023-01-01",
    "end_date": "2024-01-01",
    "description": "Led development of microservices architecture..."
  }
]
```

**Response:** `200 OK`
```json
{
  "success": true,
  "experiences_added": 1
}
```

---

### DELETE `/api/profile/experiences/{experience_id}`
Delete a specific experience.

**Headers:** `Authorization: Bearer <token>`

**Response:** `204 No Content`

---

## Jobs API (`/api/jobs`)

### GET `/api/jobs/matched`
Get jobs matched to the current user with relevance scores.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "title": "Software Engineer",
    "company": "Tech Corp",
    "location": "San Francisco, CA",
    "description": "We are looking for a skilled software engineer...",
    "url": "https://company.com/jobs/123",
    "source": "company_website",
    "posted_date": "2024-01-01",
    "scraped_at": "2024-01-02T10:00:00Z",
    "created_at": "2024-01-02T10:00:00Z",
    "relevance_score": 0.85,
    "status": "pending"
  }
]
```

**Job Status Values:**
- `pending`: Not yet reviewed
- `interested`: Marked as interesting
- `applied`: Application submitted
- `ignored`: Not interested

---

### PUT `/api/jobs/{job_id}/status`
Update the status of a job for the current user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "status": "interested"
}
```

**Response:** `200 OK`
```json
{
  "success": true
}
```

---

### POST `/api/jobs/refresh`
Trigger background job scraping and matching.

**Headers:** `Authorization: Bearer <token>`

**Response:** `202 Accepted`
```json
{
  "task_id": "abc123def456",
  "message": "Job refresh process started. Poll status endpoint for updates."
}
```

---

### GET `/api/jobs/refresh/status/{task_id}`
Check the status of a background job refresh task.

**Response:** `200 OK`
```json
{
  "task_id": "abc123def456",
  "status": "completed",
  "message": "Job refresh completed successfully"
}
```

**Status Values:**
- `pending`: Task is queued
- `running`: Task is in progress
- `completed`: Task finished successfully
- `failed`: Task encountered an error

---

### GET `/api/jobs/counts`
Get job count statistics for the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "total": 25,
  "by_status": {
    "pending": 15,
    "interested": 5,
    "applied": 3,
    "ignored": 2
  }
}
```

---

## Frontend API Services

### `authAPI`
Currently empty - authentication is handled through Supabase directly.

### `profileAPI`

#### `getProfile()`
Fetch user profile data.

```typescript
import { profileAPI } from '../services/api';

try {
  const profile = await profileAPI.getProfile();
  console.log(profile);
} catch (error) {
  console.error('Failed to fetch profile:', error);
}
```

#### `updatePreferences(preferences)`
Update user preferences.

```typescript
const preferences = {
  desired_roles: "Full Stack Developer",
  desired_locations: "Remote",
  min_salary: 90000,
  first_name: "Jane",
  last_name: "Smith"
};

try {
  await profileAPI.updatePreferences(preferences);
} catch (error) {
  console.error('Failed to update preferences:', error);
}
```

#### `uploadResume(file)`
Upload and parse a resume file.

```typescript
const fileInput = document.getElementById('resume-upload');
const file = fileInput.files[0];

try {
  const result = await profileAPI.uploadResume(file);
  console.log('Resume uploaded:', result);
} catch (error) {
  console.error('Failed to upload resume:', error);
}
```

#### `addSkills(skills)`
Add skills to user profile.

```typescript
const skills = [
  { name: "TypeScript", level: "Advanced" },
  { name: "Node.js", level: "Intermediate" }
];

try {
  await profileAPI.addSkills(skills);
} catch (error) {
  console.error('Failed to add skills:', error);
}
```

#### `deleteSkill(skillId)`
Delete a specific skill.

```typescript
try {
  await profileAPI.deleteSkill(123);
} catch (error) {
  console.error('Failed to delete skill:', error);
}
```

#### `addExperiences(experiences)`
Add work experiences.

```typescript
const experiences = [{
  title: "Frontend Developer",
  company: "Startup Inc",
  location: "New York",
  start_date: "2022-06-01",
  end_date: "2023-12-31",
  description: "Built responsive web applications..."
}];

try {
  await profileAPI.addExperiences(experiences);
} catch (error) {
  console.error('Failed to add experiences:', error);
}
```

### `jobsAPI`

#### `getMatchedJobs()`
Fetch jobs matched to the current user.

```typescript
import { jobsAPI } from '../services/api';

try {
  const jobs = await jobsAPI.getMatchedJobs();
  console.log(`Found ${jobs.length} matched jobs`);
} catch (error) {
  console.error('Failed to fetch jobs:', error);
}
```

#### `updateJobStatus(jobId, status)`
Update job status.

```typescript
try {
  await jobsAPI.updateJobStatus(123, 'interested');
} catch (error) {
  console.error('Failed to update job status:', error);
}
```

#### `refreshJobs()`
Trigger job refresh process.

```typescript
try {
  const response = await jobsAPI.refreshJobs();
  console.log('Refresh started:', response.task_id);
  
  // Poll for status
  const checkStatus = async () => {
    const status = await jobsAPI.getRefreshStatus(response.task_id);
    if (status.status === 'completed') {
      console.log('Refresh completed!');
    } else if (status.status === 'failed') {
      console.error('Refresh failed:', status.message);
    } else {
      setTimeout(checkStatus, 2000); // Check again in 2 seconds
    }
  };
  
  checkStatus();
} catch (error) {
  console.error('Failed to start refresh:', error);
}
```

#### `getJobCounts()`
Get job count statistics.

```typescript
try {
  const counts = await jobsAPI.getJobCounts();
  console.log(`Total jobs: ${counts.total}`);
  console.log('By status:', counts.by_status);
} catch (error) {
  console.error('Failed to fetch job counts:', error);
}
```

---

## React Components

### Page Components

#### `HomePage`
Landing page with hero section and features.

**Location:** `frontend/src/pages/HomePage.tsx`

**Usage:**
```jsx
import HomePage from './pages/HomePage';

function App() {
  return <HomePage />;
}
```

**Features:**
- Hero section with 3D animation
- Feature highlights
- Responsive design

---

#### `LoginPage`
User authentication page.

**Location:** `frontend/src/pages/LoginPage.tsx`

**Usage:**
```jsx
import LoginPage from './pages/LoginPage';

function App() {
  return <LoginPage />;
}
```

**Features:**
- Email/password login form
- Form validation
- Error handling
- Redirect to dashboard on success

---

#### `RegisterPage`
User registration page.

**Location:** `frontend/src/pages/RegisterPage.tsx`

**Usage:**
```jsx
import RegisterPage from './pages/RegisterPage';

function App() {
  return <RegisterPage />;
}
```

**Features:**
- Email/password registration form
- Password confirmation
- Form validation
- Automatic profile creation

---

#### `DashboardPage`
Main application dashboard showing matched jobs.

**Location:** `frontend/src/pages/DashboardPage.tsx`

**Usage:**
```jsx
import DashboardPage from './pages/DashboardPage';

function App() {
  return <DashboardPage />;
}
```

**Features:**
- Job cards grid layout
- Status filtering
- Job details modal
- Refresh functionality
- Job statistics

---

#### `ProfilePage`
User profile management page.

**Location:** `frontend/src/pages/ProfilePage.tsx`

**Usage:**
```jsx
import ProfilePage from './pages/ProfilePage';

function App() {
  return <ProfilePage />;
}
```

**Features:**
- Profile information editing
- Resume upload
- Skills management
- Experience management
- Preferences configuration

---

### Component Library

#### `JobCard`
Individual job listing card component.

**Location:** `frontend/src/components/jobs/JobCard.tsx`

**Props:**
```typescript
interface JobCardProps {
  job: Job;
  onOpenDetails: (job: Job) => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}
```

**Usage:**
```jsx
import JobCard from './components/jobs/JobCard';

function JobList({ jobs }) {
  const handleOpenDetails = (job) => {
    console.log('Opening details for:', job.title);
  };

  const handleStatusChange = (jobId, newStatus) => {
    console.log(`Changing job ${jobId} status to ${newStatus}`);
  };

  return (
    <div className="grid gap-4">
      {jobs.map(job => (
        <JobCard
          key={job.id}
          job={job}
          onOpenDetails={handleOpenDetails}
          onStatusChange={handleStatusChange}
        />
      ))}
    </div>
  );
}
```

**Features:**
- Status color coding
- Relevance score display
- Status dropdown
- Responsive design
- Hover animations

---

#### `JobDetailsModal`
Modal for displaying detailed job information.

**Location:** `frontend/src/components/jobs/JobDetailsModal.tsx`

**Props:**
```typescript
interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (jobId: number, newStatus: string) => void;
}
```

**Usage:**
```jsx
import JobDetailsModal from './components/jobs/JobDetailsModal';

function JobManagement() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button onClick={() => {
        setSelectedJob(job);
        setIsModalOpen(true);
      }}>
        View Details
      </button>
      
      <JobDetailsModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}
```

**Features:**
- Full job description display
- External link to job posting
- Status management
- Responsive modal design
- Keyboard navigation support

---

#### `Navbar`
Main navigation component.

**Location:** `frontend/src/components/common/Navbar.tsx`

**Usage:**
```jsx
import Navbar from './components/common/Navbar';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}
```

**Features:**
- Responsive navigation
- User authentication status
- Profile dropdown
- Mobile menu
- Theme-aware styling

---

#### `Footer`
Application footer component.

**Location:** `frontend/src/components/common/Footer.tsx`

**Usage:**
```jsx
import Footer from './components/common/Footer';

function Layout({ children }) {
  return (
    <>
      <main>{children}</main>
      <Footer />
    </>
  );
}
```

---

#### `ProtectedRoute`
Route protection component for authenticated pages.

**Location:** `frontend/src/components/auth/ProtectedRoute.tsx`

**Props:**
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

**Usage:**
```jsx
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
```

**Features:**
- Authentication check
- Automatic redirect to login
- Loading state handling

---

#### `SplineScene`
3D animation component for the homepage.

**Location:** `frontend/src/components/common/SplineScene.tsx`

**Usage:**
```jsx
import SplineScene from './components/common/SplineScene';

function HeroSection() {
  return (
    <div className="hero">
      <SplineScene />
      <div className="hero-content">
        <h1>Welcome to IntelliApply</h1>
      </div>
    </div>
  );
}
```

---

#### `Spotlight`
Background spotlight effect component.

**Location:** `frontend/src/components/common/Spotlight.tsx`

**Usage:**
```jsx
import Spotlight from './components/common/Spotlight';

function Page() {
  return (
    <div className="relative">
      <Spotlight />
      <div className="content">
        {/* Page content */}
      </div>
    </div>
  );
}
```

---

## Context Providers

### `AuthContext`
Provides authentication state and methods throughout the application.

**Location:** `frontend/src/context/AuthContext.tsx`

**Context Type:**
```typescript
interface AuthContextType {
  user: User | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}
```

**Usage:**
```jsx
import { AuthProvider, useAuth } from './context/AuthContext';

// App setup
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Component usage
function LoginForm() {
  const { login, loading, error } = useAuth();

  const handleSubmit = async (email, password) => {
    try {
      await login(email, password);
      // Redirect to dashboard
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
      <button disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

**Features:**
- Automatic session management
- Supabase integration
- Error handling
- Loading states
- Persistent authentication

---

## Custom Hooks

### `useLoadingState`
Hook for managing loading states with automatic timeout.

**Location:** `frontend/src/hooks/useLoadingState.ts`

**Usage:**
```typescript
import { useLoadingState } from '../hooks/useLoadingState';

function DataComponent() {
  const { isLoading, startLoading, stopLoading } = useLoadingState();

  const fetchData = async () => {
    startLoading();
    try {
      const data = await api.getData();
      // Process data
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      stopLoading();
    }
  };

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <button onClick={fetchData}>Fetch Data</button>
      )}
    </div>
  );
}
```

**Features:**
- Automatic loading state management
- Timeout protection
- Memory leak prevention

---

## Backend Services

### Job Scraper Service
Scrapes job postings from various sources.

**Location:** `backend/app/services/job_scraper.py`

**Key Functions:**
- `trigger_job_scraping(task_id=None, task_statuses_ref=None)`: Main scraping orchestrator
- Background processing with task status tracking
- Support for multiple job sources

---

### Job Matcher Service
Matches jobs to user profiles using AI/ML.

**Location:** `backend/app/services/job_matcher.py`

**Key Functions:**
- `match_jobs_for_user(user_id, task_id=None, task_statuses_ref=None)`: Match jobs for specific user
- `match_jobs_for_all_users()`: Batch matching for all users
- TF-IDF vectorization and cosine similarity scoring

---

### Resume Parser Service
Extracts information from uploaded resumes.

**Location:** `backend/app/services/resume_parser.py`

**Supported Formats:**
- PDF files (using PyPDF2)
- DOCX files (using python-docx)

**Features:**
- Text extraction
- Skill identification
- Experience parsing

---

### Vectorizer Service
Manages TF-IDF vectorization for job matching.

**Location:** `backend/app/services/vectorizer.py`

**Key Functions:**
- `fit_vectorizer_globally(corpus)`: Train vectorizer on job corpus
- `load_global_vectorizer()`: Load pre-trained vectorizer
- Persistent vectorizer storage

---

## Usage Examples

### Complete User Registration Flow
```typescript
// 1. Register user
const { register } = useAuth();
await register('user@example.com', 'password123');

// 2. Upload resume
const file = document.getElementById('resume').files[0];
await profileAPI.uploadResume(file);

// 3. Add skills
await profileAPI.addSkills([
  { name: 'JavaScript', level: 'Advanced' },
  { name: 'React', level: 'Intermediate' }
]);

// 4. Set preferences
await profileAPI.updatePreferences({
  desired_roles: 'Frontend Developer',
  desired_locations: 'Remote',
  min_salary: 80000
});
```

### Job Management Workflow
```typescript
// 1. Fetch matched jobs
const jobs = await jobsAPI.getMatchedJobs();

// 2. Update job status
await jobsAPI.updateJobStatus(123, 'interested');

// 3. Refresh jobs
const refreshResponse = await jobsAPI.refreshJobs();

// 4. Poll for completion
const pollStatus = async (taskId) => {
  const status = await jobsAPI.getRefreshStatus(taskId);
  if (status.status === 'completed') {
    // Refresh job list
    const newJobs = await jobsAPI.getMatchedJobs();
  }
};
```

### Error Handling Pattern
```typescript
try {
  const result = await profileAPI.updatePreferences(preferences);
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 400) {
    // Show validation errors
    setErrors(error.response.data.detail);
  } else {
    // Show generic error
    setError('Something went wrong. Please try again.');
  }
}
```

---

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://user:pass@localhost/intelliapply
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SCRAPER_SCHEDULE_HOURS=4
MATCHER_SCHEDULE_HOURS=6
```

### Frontend
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## Rate Limits and Best Practices

### API Rate Limits
- No explicit rate limits currently implemented
- Consider implementing rate limiting for production use

### Best Practices
1. **Authentication**: Always check authentication state before making API calls
2. **Error Handling**: Implement comprehensive error handling for all API calls
3. **Loading States**: Show loading indicators for better UX
4. **Caching**: Consider implementing client-side caching for frequently accessed data
5. **Validation**: Validate data on both client and server sides
6. **Security**: Never expose sensitive credentials in frontend code

---

## Development Setup

### Prerequisites
- Python 3.8+
- Node.js 14+
- PostgreSQL
- Supabase account

### Quick Start
```bash
# Clone repository
git clone <repository-url>
cd intelliapply

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install

# Start development servers
npm start  # Starts both backend and frontend
```

For detailed setup instructions, see the main [README.md](README.md) file.