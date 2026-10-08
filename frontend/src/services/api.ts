import axios from 'axios';
import { clearLocalSession, getAccessToken, getSession } from '../lib/neon';
import type { TaskStatus } from '../lib/tasks';
const API_URL = import.meta.env.VITE_API_BASE_URL || '/';
const api = axios.create({ baseURL: API_URL, timeout: 20000 });
api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(response => response, async error => {
  const original = error.config;
  if (error.response?.status === 401 && original && !original._retry) {
    original._retry = true;
    const { data } = await getSession({ force: true });
    if (data.session?.token) {
      original.headers.Authorization = `Bearer ${data.session.token}`;
      return api(original);
    }
  }
  if (error.response?.status === 401) clearLocalSession();
  return Promise.reject(error);
});
export interface Preferences { desired_roles?: string; desired_locations?: string; min_salary?: number; first_name?: string; last_name?: string; }
export interface ExperienceInput { title: string; company: string; location?: string; start_date?: string; end_date?: string; description?: string; }
export const profileAPI = {
  getProfile: async () => (await api.get('/api/profile')).data,
  updatePreferences: async (values: Preferences) => (await api.put('/api/profile/preferences', values)).data,
  uploadResume: async (file: File) => {
    const body = new FormData(); body.append('file', file);
    return (await api.post('/api/profile/resume', body)).data;
  },
  getResumeStatus: async (id: string): Promise<TaskStatus> => (await api.get(`/api/profile/resume/status/${id}`)).data,
  addSkills: async (skills: Array<{name: string; level?: string}>) => (await api.post('/api/profile/skills', skills)).data,
  deleteSkill: async (id: number) => (await api.delete(`/api/profile/skills/${id}`)).status === 204,
  deleteAllSkills: async () => (await api.delete('/api/profile/skills/all')).status === 204,
  addExperiences: async (items: ExperienceInput[]) => (await api.post('/api/profile/experiences', items)).data,
  updateExperience: async (id: number, values: ExperienceInput) => (await api.put(`/api/profile/experiences/${id}`, values)).data,
  deleteExperience: async (id: number) => (await api.delete(`/api/profile/experiences/${id}`)).status === 204,
};
export const jobsAPI = {
  getMatchedJobs: async () => (await api.get('/api/jobs/matched')).data,
  getJobCounts: async () => (await api.get('/api/jobs/counts')).data,
  updateJobStatus: async (id: number, status: string) => (await api.put(`/api/jobs/${id}/status`, { status })).data,
  refreshJobs: async (): Promise<{task_id: string; message: string}> => (await api.post('/api/jobs/refresh')).data,
  getRefreshStatus: async (id: string): Promise<TaskStatus> => (await api.get(`/api/jobs/refresh/status/${id}`)).data,
};
