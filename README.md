# IntelliApply: Apply smarter, not harder.

Live Website Link:- https://intelli-apply.vercel.app/ (backend is down for now because of Render free tier 512mb is not enough for the docling packages)

## Project Overview
![image](https://github.com/user-attachments/assets/1760cac9-353c-460f-8ce9-ccc8d263eafd)
![image](https://github.com/user-attachments/assets/529232e7-bfbd-4d1c-b471-e9c437533792)


IntelliApply is a full-stack web application designed to automate and personalize the job search process. It takes a user's resume and preferences, scrapes job boards, uses AI to find and rank the most relevant job postings, and presents them to the user on a dashboard.

### Core Problem Addressed

Job seekers waste excessive time manually searching multiple job boards, filtering irrelevant postings, and performing repetitive tasks, hindering efficient connection with suitable opportunities.

### Core Solution

IntelliApply acts as an AI co-pilot. It parses user profiles/resumes, automatically discovers relevant jobs via web scraping, uses AI (NLP/ML) for accurate profile-to-job matching beyond simple keywords, and displays prioritized results, significantly reducing manual effort.

![image](https://github.com/user-attachments/assets/2927ca97-f01c-4d95-a64f-b81ed395e4b3)


### Key Features (MVP)

- User Authentication: Secure Sign-up and Login functionality via Supabase
- Profile Creation & Resume Upload: Upload resume (PDF/DOCX) and set preferences
- Resume Parsing: Extract key information from resumes
- Web Scraping Engine: Scrape job postings from pre-defined sources
- AI Matching Engine: Match user profile with job postings
- Job Dashboard: Display ranked job postings
- Basic Job Tracking: Mark jobs as 'Interested', 'Applied', or 'Ignore'

## Technology Stack

- **Frontend:** React.js with Vite, Tailwind CSS
- **Backend:** Python with FastAPI
- **Database:** PostgreSQL
- **Authentication:** Supabase Auth
- **Resume Parsing:** PyPDF2/python-docx, spaCy
- **Web Scraping:** BeautifulSoup4, requests
- **AI Matching:** scikit-learn for TF-IDF and Cosine Similarity

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 14+ and npm/yarn
- PostgreSQL

### Initial Setup

1. Set up the backend:
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   # OR
   source venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   ```

2. Set up the frontend:
   ```
   cd frontend
   npm install
   ```

3. Set up environment variables:
   - Create `.env` files in both backend and frontend directories
   - See [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) for required variables

4. Run the database migration:
   ```
   cd backend
   python -m migrations.add_supabase_id
   ```

### Running the Application

#### Option 1: Start both servers with a single command

From the project root directory:
```
npm start
```

This will start both the backend and frontend servers concurrently.

#### Option 2: Start servers individually

1. Start the backend server:
   ```
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start the frontend server:
   ```
   cd frontend
   npm run dev
   ```

## Authentication

This project uses Supabase for authentication. See [SUPABASE_AUTH_SETUP.md](SUPABASE_AUTH_SETUP.md) for detailed setup instructions.

## License

MIT License
