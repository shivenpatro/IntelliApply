# Supabase Setup Guide for IntelliApply

This guide will help you complete the setup of Supabase authentication for IntelliApply.

## Step 1: Get Your API Keys

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `zxggcmopdblupbhvgnme`
3. Navigate to Project Settings > API
4. You'll find two important keys:
   - **Project API keys** section: Copy the `anon` public key
   - **Service Role Key** section: Copy the service role key (this has admin privileges)

## Step 2: Update Environment Variables

### Backend

1. Open `backend/.env` and add your keys:
   ```
   SUPABASE_KEY=your-anon-public-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

### Frontend

1. Open `frontend/.env` and add your key:
   ```
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## Step 3: Configure Supabase Auth Settings

1. In the Supabase dashboard, go to Authentication > Providers
2. Make sure Email provider is enabled
3. Configure your site URL:
   - Go to Authentication > URL Configuration
   - Set Site URL to `http://localhost:5173` (or your production URL)
   - Add `localhost:5173` to your additional redirect URLs

## Step 4: Set Up Database Schema

1. Go to SQL Editor in your Supabase dashboard
2. Create a new query and paste the contents of `backend/supabase_schema.sql`
3. Run the query to set up the necessary tables and triggers

## Step 5: Test Authentication

1. Start your backend server:
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

2. Start your frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`
4. Try to register a new user and log in

## Step 6: Verify User Creation

1. After registering a user, check the Supabase Authentication > Users section to confirm the user was created
2. Also check your local database to ensure a corresponding user record was created with the Supabase ID

## Troubleshooting

### Authentication Issues

- Check browser console for any errors
- Verify that your API keys are correctly set in both `.env` files
- Make sure CORS is properly configured in Supabase

### Database Issues

- Run the migration script again to ensure the `supabase_id` column exists:
  ```bash
  cd backend
  python -m migrations.add_supabase_id
  ```

### API Connection Issues

- Check that your backend server is running
- Verify that the frontend can connect to the backend API
- Check that the Supabase client is properly initialized

## Next Steps

Once authentication is working:

1. Test the job scraping and matching with authenticated users
2. Set up regular job scraping using the `run_job_scraper.py` script
3. Customize the user profile to better match your target job types
