# Setting Up Supabase Authentication

This guide explains how to set up Supabase authentication for IntelliApply.

## Overview

IntelliApply now uses Supabase for authentication instead of the custom FastAPI auth routes. The frontend handles sign-up and login via Supabase, while the backend verifies the Supabase token on each request.

## Prerequisites

1. A Supabase account and project
2. Environment variables set up for both frontend and backend

## Backend Setup

1. Run the database migration to add the `supabase_id` column to the users table:

```bash
python -m backend.migrations.add_supabase_id
```

2. Set the following environment variables in your `.env` file:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

The service key can be found in your Supabase project settings under API > Project API keys > service_role key.

## Frontend Setup

1. Set the following environment variables in your `.env` file:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

The anon key can be found in your Supabase project settings under API > Project API keys > anon/public key.

## How It Works

1. Users sign up and log in using Supabase Auth in the frontend
2. Supabase provides a JWT token that is stored in localStorage
3. The frontend includes this token in API requests to the backend
4. The backend verifies the token with Supabase and maps the Supabase user to a local user record
5. If a user doesn't exist in the local database, one is created automatically

## Testing Authentication

To test that authentication is working correctly:

1. Sign up a new user in the frontend
2. Verify that you can access protected routes like the profile page
3. Check the backend logs to ensure the token is being verified correctly

## Troubleshooting

- If you encounter 401 Unauthorized errors, check that the token is being included in requests correctly
- If users aren't being created in the local database, check the Supabase service key permissions
- For CORS issues, ensure your Supabase project has the correct origins configured
