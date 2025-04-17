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

// Add a request interceptor to include the Supabase token in all requests
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      // Get the current session directly from Supabase
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (session && session.access_token) {
        // Make sure we're using the correct format: "Bearer <token>"
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
        console.log(`Added Supabase auth token to request: ${session.access_token.substring(0, 20)}...`);

        // For debugging - log the full token to console
        console.log('Full token:', session.access_token);

        // Also add the token as a custom header in case Bearer auth is having issues
        config.headers['X-Supabase-Auth'] = session.access_token;
      } else {
        // Fallback to localStorage if needed
        const supabaseSession = localStorage.getItem('sb-' + import.meta.env.VITE_SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token');

        if (supabaseSession) {
          try {
            const parsedSession = JSON.parse(supabaseSession);
            const token = parsedSession?.access_token;

            if (token) {
              config.headers['Authorization'] = `Bearer ${token}`;
              console.log(`Added Supabase token from localStorage: ${token.substring(0, 20)}...`);

              // Also add the token as a custom header in case Bearer auth is having issues
              config.headers['X-Supabase-Auth'] = token;
            } else {
              console.log('No valid token in localStorage Supabase session');
            }
          } catch (e) {
            console.error('Error parsing Supabase session from localStorage:', e);
          }
        } else {
          console.log('No Supabase session found in getSession() or localStorage');
        }
      }
    } catch (e) {
      console.error('Error getting Supabase session:', e);
    }

    // Log the request being made (helpful for debugging)
    console.log(`Making ${config.method?.toUpperCase() || 'GET'} request to: ${config.url}`);

    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
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
        console.error(`Authentication failed (${error.response.status})! Redirecting to login...`);
        console.error('Error details:', error.response.data);

        // Check if we have a valid session
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          // No valid session, redirect to login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } else {
          // We have a session but still got 401/403, might be a token issue
          console.log('Session exists but authentication failed. Refreshing session...');
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) throw refreshError;
            console.log('Session refreshed successfully');
          } catch (refreshErr) {
            console.error('Failed to refresh session:', refreshErr);
            // Sign out and redirect to login
            await supabase.auth.signOut();
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
          }
        }
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

// Profile API
export const profileAPI = {
  getProfile: async () => {
    const response = await axiosInstance.get('/api/profile');
    return response.data;
  },

  updatePreferences: async (preferences: {
    desired_roles?: string,
    desired_locations?: string,
    min_salary?: number
  }) => {
    const response = await axiosInstance.put('/api/profile/preferences', preferences);
    return response.data;
  },

  uploadResume: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/api/profile/resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  addSkills: async (skills: Array<{name: string, level?: string}>) => {
    const response = await axiosInstance.post('/api/profile/skills', skills);
    return response.data;
  },

  deleteSkill: async (skillId: number) => {
    await axiosInstance.delete(`/api/profile/skills/${skillId}`);
    return true;
  },

  addExperiences: async (experiences: Array<{
    title: string,
    company: string,
    location?: string,
    start_date?: string,
    end_date?: string,
    description?: string
  }>) => {
    const response = await axiosInstance.post('/api/profile/experiences', experiences);
    return response.data;
  },

  deleteExperience: async (experienceId: number) => {
    await axiosInstance.delete(`/api/profile/experiences/${experienceId}`);
    return true;
  }
};

// Jobs API
export const jobsAPI = {
  getMatchedJobs: async () => {
    try {
      console.log('Calling getMatchedJobs API endpoint');
      const response = await axiosInstance.get('/api/jobs/matched');
      console.log('getMatchedJobs response received');
      return response.data;
    } catch (error) {
      console.error('Error in getMatchedJobs:', error);
      throw error;
    }
  },

  updateJobStatus: async (jobId: number, status: string) => {
    try {
      console.log(`Updating job ${jobId} status to ${status}`);
      const response = await axiosInstance.put(`/api/jobs/${jobId}/status`, { status });
      console.log('updateJobStatus response received');
      return response.data;
    } catch (error) {
      console.error('Error in updateJobStatus:', error);
      throw error;
    }
  },

  refreshJobs: async () => {
    try {
      console.log('Calling refreshJobs API endpoint');
      const response = await axiosInstance.post('/api/jobs/refresh');
      console.log('refreshJobs response received');
      return response.data;
    } catch (error) {
      console.error('Error in refreshJobs:', error);
      throw error;
    }
  },

  getJobCounts: async () => {
    try {
      console.log('Calling getJobCounts API endpoint');
      const response = await axiosInstance.get('/api/jobs/count');
      console.log('getJobCounts response received');
      return response.data;
    } catch (error) {
      console.error('Error in getJobCounts:', error);
      throw error;
    }
  }
};
