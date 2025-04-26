import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Supabase client setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

// Create and export the typed Supabase client with custom options
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Add fetch options to handle rate limiting
    fetch: (url, options) => {
      return fetch(url, {
        ...options,
        // Add cache control to avoid rate limiting
        headers: {
          ...options?.headers,
          'Cache-Control': 'no-store, max-age=0',
        },
        // Increase timeout for slow connections
        signal: options?.signal || (() => {
          const controller = new AbortController();
          // Set a very long timeout (30 seconds)
          setTimeout(() => controller.abort(), 60000);
          return controller.signal;
        })()
      });
    }
  }
});

// Auth helper functions
// Helper function to add retry logic with exponential backoff
const withRetry = async (fn: () => Promise<any>, maxRetries = 5, initialDelay = 2000) => {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} of ${maxRetries}...`);
      // Add a small delay before first retry to avoid immediate rate limiting
      if (attempt > 0) {
        const backoffDelay = initialDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Waiting ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }

      return await fn();
    } catch (error: any) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      lastError = error;

      // Always retry for timeout errors
      if (error.message?.includes('timeout') || error.message?.includes('abort')) {
        console.log('Timeout error detected, will retry...');
        continue;
      }

      // If it's a rate limit error, always retry with backoff
      if (error.message?.includes('Too many requests') || error.status === 429) {
        console.log('Rate limit error detected, will retry with backoff...');
        continue;
      }

      // For network errors, retry
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        console.log('Network error detected, will retry...');
        continue;
      }

      // For other errors, don't retry
      console.log('Non-retryable error detected, stopping retry attempts');
      break;
    }
  }

  console.log('All retry attempts failed');
  throw lastError;
};

export const signUp = async (email: string, password: string) => {
  try {
    console.log(`Attempting to sign up user: ${email}`);

    // Create a simple fetch request directly to Supabase API
    // This bypasses the Supabase JS client which might be causing issues
    const directResponse = await fetch(`${supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email,
        password,
        data: {
          confirmed_at: new Date().toISOString() // Attempt to pre-confirm the user
        },
      }),
    });

    if (!directResponse.ok) {
      // If the direct API call fails, fall back to the Supabase client
      console.log('Direct API call failed, falling back to Supabase client');
      const clientResponse = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            confirmed_at: new Date().toISOString()
          },
        }
      });

      console.log('Supabase client signup response:', clientResponse);
      return clientResponse;
    }

    // Parse the direct API response
    const responseData = await directResponse.json();
    console.log('Direct API signup response:', responseData);

    // Format the response to match Supabase client format
    return {
      data: {
        user: responseData.user || null,
        session: responseData.session || null,
      },
      error: responseData.error || null,
    };
  } catch (error) {
    console.error('Error in signUp:', error);
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log(`Attempting to sign in user: ${email} using Supabase client...`);
    // Use ONLY the Supabase client method for consistency and session management
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Log the full response object for debugging
    console.log('signInWithPassword response:', response);

    // If there's an error about email not being confirmed, try to resend confirmation
    if (response.error && response.error.message?.includes('Email not confirmed')) {
      console.log('Email not confirmed. Sending confirmation email...');
      await resendConfirmationEmail(email);
    }

    if (response.data?.user) {
      console.log('Sign in successful for user:', response.data.user.email);
    }

    return response;
  } catch (error) {
    console.error('Error in signIn:', error);
    return { data: { user: null, session: null }, error: error as Error };
  }
};

export const resendConfirmationEmail = async (email: string) => {
  try {
    console.log(`Attempting to resend confirmation email to: ${email}`);

    // Use retry logic for resending confirmation email
    const response = await withRetry(() => supabase.auth.resend({
      type: 'signup',
      email,
    }));

    if (response.error) {
      console.error('Error resending confirmation email:', response.error);
    } else {
      console.log('Confirmation email resend request successful');
    }

    return response;
  } catch (error) {
    console.error('Exception when resending confirmation email:', error);
    return { data: {}, error: error as Error };
  }
};

export const signOut = async () => {
  try {
    console.log('Executing signOut in supabase.ts');

    // Clear any local storage items related to auth first
    const storageKeys = Object.keys(localStorage);
    storageKeys.forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        console.log('Removing localStorage item:', key);
        localStorage.removeItem(key);
      }
    });

    // Get the current session to extract the access token
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    // Try the Supabase client method first
    try {
      const result = await supabase.auth.signOut();
      console.log('Supabase signOut result:', result);
    } catch (clientError) {
      console.error('Supabase client signOut error:', clientError);
    }

    // Then try the direct API call with the token if available
    if (accessToken) {
      try {
        const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`
          },
        });

        console.log('Direct logout API response:', response.status);
      } catch (directError) {
        console.error('Direct logout API error:', directError);
      }
    }

    // Force clear session state regardless of API success
    // This ensures the UI updates even if the API calls fail
    return { error: null };
  } catch (error) {
    console.error('Error in signOut:', error);
    // Return success anyway to ensure UI updates
    return { error: null };
  }
};

export const getCurrentUser = async () => {
  return await supabase.auth.getUser();
};

export const getSession = async () => {
  return await supabase.auth.getSession();
};

// Listen for auth changes
export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
