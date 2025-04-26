-- Supabase schema setup for IntelliApply

-- Enable Row Level Security for Supabase Auth users
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY; -- Might already be enabled by default

-- Create tables for application data

-- Create users table (local cache/extension of auth.users)
-- This table is expected by the SQLAlchemy models and auth logic
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY, -- Local auto-incrementing ID
    supabase_id UUID UNIQUE, -- Link to auth.users.id
    email TEXT UNIQUE NOT NULL,
    hashed_password TEXT, -- Should be nullable as auth is handled by Supabase
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Ensure hashed_password column is nullable (might have been created as NOT NULL previously)
ALTER TABLE public.users ALTER COLUMN hashed_password DROP NOT NULL;

-- Add index on supabase_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_supabase_id ON public.users(supabase_id);

-- Create jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    posted_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    resume_path TEXT,
    desired_roles TEXT,
    desired_locations TEXT,
    min_salary INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
    -- user_id column should not exist here, profile ID (UUID) is the foreign key to auth.users
);

-- Drop the potentially existing user_id column if it exists from previous schema versions
DO $$
BEGIN
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='user_id') THEN
      ALTER TABLE public.profiles DROP COLUMN user_id;
      RAISE NOTICE 'Dropped profiles.user_id column';
   END IF;
END $$;

-- RLS policies reference auth.uid() which implicitly links via profiles.id == auth.uid()

-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (profile_id, name)
);

-- Create experiences table
CREATE TABLE IF NOT EXISTS experiences (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    description TEXT,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_job_matches table
CREATE TABLE IF NOT EXISTS user_job_matches (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    relevance_score REAL NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'applied', 'ignored')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, job_id)
);

-- Row Level Security Policies

-- RLS for profiles (users can only read/modify their own profile)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id); -- Check against the profile's ID (which is the user's UUID)

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id); -- Check against the profile's ID

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id); -- Check against the profile's ID

-- RLS for skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own skills" ON public.skills;
CREATE POLICY "Users can read their own skills"
    ON public.skills FOR SELECT
    USING (profile_id = auth.uid()); -- Simpler check: skill's profile_id must match logged-in user's UUID

DROP POLICY IF EXISTS "Users can insert their own skills" ON public.skills;
CREATE POLICY "Users can insert their own skills"
    ON public.skills FOR INSERT
    WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own skills" ON public.skills;
CREATE POLICY "Users can update their own skills"
    ON public.skills FOR UPDATE
    USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own skills" ON public.skills;
CREATE POLICY "Users can delete their own skills"
    ON public.skills FOR DELETE
    USING (profile_id = auth.uid());

-- RLS for experiences
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own experiences" ON public.experiences;
CREATE POLICY "Users can read their own experiences"
    ON public.experiences FOR SELECT
    USING (profile_id = auth.uid()); -- Simpler check

DROP POLICY IF EXISTS "Users can insert their own experiences" ON public.experiences;
CREATE POLICY "Users can insert their own experiences"
    ON public.experiences FOR INSERT
    WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own experiences" ON public.experiences;
CREATE POLICY "Users can update their own experiences"
    ON public.experiences FOR UPDATE
    USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own experiences" ON public.experiences;
CREATE POLICY "Users can delete their own experiences"
    ON public.experiences FOR DELETE
    USING (profile_id = auth.uid());

-- RLS for jobs (all authenticated users can read jobs)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read jobs" ON public.jobs;
CREATE POLICY "Authenticated users can read jobs"
    ON public.jobs FOR SELECT
    TO authenticated
    USING (true);

-- RLS for user_job_matches
ALTER TABLE public.user_job_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own job matches" ON public.user_job_matches;
CREATE POLICY "Users can read their own job matches"
    ON public.user_job_matches FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own job matches" ON public.user_job_matches;
CREATE POLICY "Users can insert their own job matches"
    ON public.user_job_matches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own job matches" ON public.user_job_matches;
CREATE POLICY "Users can update their own job matches"
    ON public.user_job_matches FOR UPDATE
    USING (auth.uid() = user_id);

-- Create function to auto-create ONLY a profile when a new user signs up
-- The local user cache entry in public.users will be created by the backend auth logic on first authenticated request
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table, linking profile ID to the auth user ID
  INSERT INTO public.profiles (id) -- Only need to insert the ID, which is the user's UUID
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function for matching jobs for a user
CREATE OR REPLACE FUNCTION match_jobs_for_user(user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_profile_id UUID;
    user_text_vector TSVECTOR;
    job_record RECORD;
    relevance_score REAL;
BEGIN
    -- Get the user's profile ID (which is the same as their Supabase user UUID)
    user_profile_id := match_jobs_for_user.user_id; -- Directly use the input user_id (UUID)
    
    -- Build the user's text representation
    SELECT 
        setweight(to_tsvector('english', COALESCE(p.desired_roles, '')), 'A') || 
        setweight(to_tsvector('english', COALESCE(p.desired_locations, '')), 'A') ||
        setweight(to_tsvector('english', string_agg(COALESCE(s.name, ''), ' ')), 'B') ||
        setweight(to_tsvector('english', string_agg(COALESCE(e.title || ' ' || e.company || ' ' || COALESCE(e.description, ''), ''), ' ')), 'C')
    INTO user_text_vector
    FROM public.profiles p
    LEFT JOIN public.skills s ON s.profile_id = p.id
    LEFT JOIN public.experiences e ON e.profile_id = p.id
    WHERE p.id = user_profile_id
    GROUP BY p.id;
    
    -- For each job, calculate relevance and insert/update match
    FOR job_record IN SELECT * FROM public.jobs LOOP
        -- Calculate relevance score using weighted text search
        SELECT
            ts_rank(
                user_text_vector,
                setweight(to_tsvector('english', job_record.title), 'A') ||
                setweight(to_tsvector('english', job_record.company), 'B') ||
                setweight(to_tsvector('english', job_record.location), 'B') ||
                setweight(to_tsvector('english', job_record.description), 'C')
            ) INTO relevance_score;
            
        -- Normalize the score to 0-1 range
        relevance_score := GREATEST(0, LEAST(1, relevance_score));

        -- Insert or update the match
        INSERT INTO public.user_job_matches (user_id, job_id, relevance_score, status)
        VALUES (match_jobs_for_user.user_id, job_record.id, relevance_score, 'pending')
        ON CONFLICT (user_id, job_id) DO UPDATE
        SET relevance_score = EXCLUDED.relevance_score,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
