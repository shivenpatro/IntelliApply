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

      while (!token && attempts < maxAttempts) {
        attempts++;
        console.log(`[Interceptor] Attempt ${attempts} to get Supabase session...`);
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(`[Interceptor] Attempt ${attempts}: Error getting Supabase session:`, sessionError);
          break;
        } else {
          console.log(`[Interceptor] Attempt ${attempts}: supabase.auth.getSession() response data:`, sessionData);
          token = sessionData?.session?.access_token;
          if (token) {
            console.log(`[Interceptor] Attempt ${attempts}: Session and token found.`);
            break; 
          } else if (sessionData?.session) {
            console.log(`[Interceptor] Attempt ${attempts}: Session found, but no access_token. Session:`, sessionData.session);
          }
          else {
            console.log(`[Interceptor] Attempt ${attempts}: No active session object found in getSession() response.`);
          }
        }
        if (!token && attempts < maxAttempts) {
           console.log(`[Interceptor] Waiting ${delayMs}ms before next attempt...`);
           await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
        console.log('[Interceptor] Added Supabase JWT to Authorization header.');
      } else {
        console.warn('[Interceptor] No active Supabase session token found after multiple attempts, proceeding without token. This will likely lead to 401 errors for protected routes.');
      }

      console.log(`[Interceptor] Making ${config.method?.toUpperCase() || 'GET'} request to: ${config.url}`);
      return config;

    } catch (interceptorError) {
       console.error('[Interceptor] Unexpected error within request interceptor:', interceptorError);
       return Promise.reject(interceptorError);
    }
  },
  (error) => {
    console.error('[Interceptor] Error before request interceptor ran:', error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      // Log the error regardless
      console.error(`API Error: Status ${error.response.status}`, error.response.data);

      // For 401 or 403, it's important to reject the promise so the UI can react
      // (e.g., redirect to login, show specific auth error message)
      // The previous behavior of resolving with mocked data would hide these critical errors.
      if (error.response.status === 401 || error.response.status === 403) {
        // Optionally, you could add logic here to attempt a token refresh if you have one,
        // or trigger a logout via AuthContext if the token is definitively invalid.
        // For now, just rejecting allows the calling code to handle it.
        console.error(`Authentication/Authorization error (${error.response.status}). The request was not successful.`);
      } else if (error.response.status === 500) {
        console.error('Server error (500):', error.response.data);
      }
      // For all errors with a response, we should reject so the UI can handle it.
    } else if (error.request) {
      // The request was made but no response was received (e.g., network error, backend down)
      console.error('Network error or no response from server:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up API request:', error.message);
    }
    return Promise.reject(error); // Reject all errors to be handled by the calling function's catch block
  }
);

export const authAPI = {};

// Profile API
export const profileAPI = {
  getProfile: async () => {
    console.log('[api.ts] profileAPI.getProfile called. Attempting axiosInstance.get("/api/profile")...');
    try {
      const response = await axiosInstance.get('/api/profile');
      console.log('Profile data received:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error; 
    }
  },
  updatePreferences: async (preferences: {
    desired_roles?: string,
    desired_locations?: string,
    min_salary?: number,
    email?: string, 
    first_name?: string,
    last_name?: string
  }) => {
    console.log('[api.ts] Updating preferences via backend:', preferences);
    try {
      const { email, ...prefsToUpdate } = preferences;
      if (email) console.warn("Attempted to update email via profile preferences, ignoring.");
      const response = await axiosInstance.put('/api/profile/preferences', prefsToUpdate);
      console.log('Update preferences response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  },
  uploadResume: async (file: File) => {
    console.log('[api.ts] Uploading resume to backend:', file.name);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name); 
      const response = await axiosInstance.post('/api/profile/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      console.log('Upload resume response:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    }
  },
  addSkills: async (skills: Array<{name: string, level?: string}>) => {
    console.log('[api.ts] Adding skills via backend:', skills);
     try {
      const response = await axiosInstance.post('/api/profile/skills', skills);
      console.log('Add skills response:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error adding skills:', error);
      throw error;
    }
  },
  deleteSkill: async (skillId: number) => {
    console.log(`[api.ts] Deleting skill ${skillId} via backend...`);
    try {
      const response = await axiosInstance.delete(`/api/profile/skills/${skillId}`);
      console.log('Delete skill response status:', response.status);
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
      const response = await axiosInstance.post('/api/profile/experiences', experiences);
      console.log('Add experiences response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding experiences:', error);
      throw error;
    }
  },
  deleteExperience: async (experienceId: number) => {
    console.log(`[api.ts] Deleting experience ${experienceId} via backend...`);
     try {
      const response = await axiosInstance.delete(`/api/profile/experiences/${experienceId}`);
      console.log('Delete experience response status:', response.status);
      return response.status === 204;
    } catch (error) {
      console.error(`Error deleting experience ${experienceId}:`, error);
      throw error;
    }
  },
  deleteAllSkills: async () => {
    console.log('[api.ts] Deleting all skills via backend...');
    try {
      const response = await axiosInstance.delete('/api/profile/skills/all');
      console.log('Delete all skills response status:', response.status);
      return response.status === 204;
    } catch (error) {
      console.error('Error deleting all skills:', error);
      throw error;
    }
  }
};

// Jobs API
export const jobsAPI = {
  getMatchedJobs: async () => {
    console.log('[api.ts] Getting matched jobs from backend...');
    try {
      const response = await axiosInstance.get('/api/jobs/matched');
      console.log('Matched jobs received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching matched jobs:', error);
      throw error; 
    }
  },
  updateJobStatus: async (jobId: number, status: string) => {
    console.log(`[api.ts] Updating job ${jobId} status to ${status} via backend...`);
    try {
      const response = await axiosInstance.put(`/api/jobs/${jobId}/status`, { status }); // Corrected endpoint
      console.log('Update job status response:', response.data);
      return response.data; 
    } catch (error) {
      console.error(`Error updating job ${jobId} status:`, error);
      throw error;
    }
  },
  refreshJobs: async (): Promise<{ task_id: string; message: string }> => {
    console.log('[api.ts] Requesting job refresh from backend...');
    try {
      const response = await axiosInstance.post('/api/jobs/refresh');
      console.log('Refresh jobs response:', response.data);
      return response.data; 
    } catch (error) {
      console.error('Error refreshing jobs:', error);
      throw error;
    }
  },
  getRefreshStatus: async (taskId: string): Promise<{ task_id: string; status: string; message: string }> => {
    console.log(`[api.ts] Getting refresh status for task ${taskId} from backend...`);
    try {
      const response = await axiosInstance.get(`/api/jobs/refresh/status/${taskId}`);
      console.log('Refresh status received:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching refresh status for task ${taskId}:`, error);
      throw error;
    }
  },
  getJobCounts: async () => {
    console.log('[api.ts] Getting job counts from backend...');
     try {
      const response = await axiosInstance.get('/api/jobs/counts');
      console.log('Job counts received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching job counts:', error);
      throw error;
    }
  }
};
