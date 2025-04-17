# Database Migrations

This directory contains database migration scripts for the IntelliApply application.

## Available Migrations

- `add_supabase_id.py` - Adds the `supabase_id` column to the users table and makes the `hashed_password` column nullable to support Supabase authentication.

## Running Migrations

To run a migration script, navigate to the project root directory and run:

```bash
python -m backend.migrations.add_supabase_id
```

Make sure to run migrations in the correct order if there are dependencies between them.

## Creating New Migrations

When creating a new migration script:

1. Create a new Python file with a descriptive name
2. Include a docstring explaining what the migration does
3. Implement error handling and rollback in case of failures
4. Test the migration on a development database before running it in production
