# Supabase Setup for IntelliApply

This guide explains how to set up Supabase for the IntelliApply project. Supabase provides a PostgreSQL database, authentication, storage, and more, all with minimal configuration.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign up or log in
2. Click "New Project" and fill in the details:
   - **Name**: IntelliApply
   - **Database Password**: Create a secure password
   - **Region**: Choose the closest to your location
   - **Pricing Plan**: Free tier is sufficient for a hackathon

## 2. Set up the Database

1. After project creation, go to the **SQL Editor** in the Supabase dashboard
2. Copy and paste the contents of `backend/supabase_schema.sql` into the SQL editor
3. Click "Run" to create all the necessary tables and functions

## 3. Configure Storage

1. Go to the **Storage** section in the Supabase dashboard
2. Create a new bucket named `resumes`
3. Configure bucket permissions (under "Policies"):
   - Enable RLS (Row Level Security)
   - Add a policy allowing authenticated users to upload files to their own folder

## 4. Get API Keys

1. Go to **Project Settings** → **API** in the Supabase dashboard
2. Copy the following values:
   - **URL**: Your project URL
   - **anon key**: For frontend client
   - **service_role key**: For backend services

## 5. Update Environment Variables

1. Update `backend/.env` with your Supabase credentials:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

2. Update `frontend/.env` with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## 6. Run the Application

1. Start the application with:
   ```
   node start-app.js
   ```

2. Register a new user to test the authentication system

## 7. How to Use Web Scraping

The application includes a Hacker News jobs scraper that will automatically fetch real job data from the Y Combinator jobs board. To trigger manual scraping:

1. Start the application
2. Register and log in
3. Access the dashboard

## Architecture Overview

- **Authentication**: Handled by Supabase Auth
- **Database**: PostgreSQL hosted by Supabase
- **Storage**: File storage for resumes in Supabase Storage
- **Backend**: FastAPI integrated with Supabase 
- **Frontend**: React using Supabase client libraries
- **Web Scraping**: Automated fetching of job listings

## Job Matching Logic

The job matching functionality uses PostgreSQL's full-text search capabilities to match user profiles with job listings:

1. User profile information (skills, experience, preferences) is converted to a weighted text vector
2. Job descriptions are also converted to weighted text vectors
3. Text similarity is calculated to determine job relevance scores
4. Jobs are ranked by relevance and presented to the user

This approach provides scalable and efficient job matching directly in the database.
