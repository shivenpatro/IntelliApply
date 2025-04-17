export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: number
          title: string
          company: string
          location: string
          description: string
          url: string
          source: string
          posted_date: string
          scraped_at: string
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          company: string
          location: string
          description: string
          url: string
          source: string
          posted_date?: string
          scraped_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          company?: string
          location?: string
          description?: string
          url?: string
          source?: string
          posted_date?: string
          scraped_at?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          resume_path: string | null
          desired_roles: string | null
          desired_locations: string | null
          min_salary: number | null
          created_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          resume_path?: string | null
          desired_roles?: string | null
          desired_locations?: string | null
          min_salary?: number | null
          created_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          resume_path?: string | null
          desired_roles?: string | null
          desired_locations?: string | null
          min_salary?: number | null
          created_at?: string
          updated_at?: string | null
          user_id?: string
        }
      }
      skills: {
        Row: {
          id: number
          name: string
          level: string | null
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          level?: string | null
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          level?: string | null
          profile_id?: string
          created_at?: string
        }
      }
      experiences: {
        Row: {
          id: number
          title: string
          company: string
          location: string | null
          start_date: string | null
          end_date: string | null
          description: string | null
          profile_id: string
          created_at: string
        }
        Insert: {
          id?: number
          title: string
          company: string
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          profile_id: string
          created_at?: string
        }
        Update: {
          id?: number
          title?: string
          company?: string
          location?: string | null
          start_date?: string | null
          end_date?: string | null
          description?: string | null
          profile_id?: string
          created_at?: string
        }
      }
      user_job_matches: {
        Row: {
          id: number
          user_id: string
          job_id: number
          relevance_score: number
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: number
          user_id: string
          job_id: number
          relevance_score: number
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          job_id?: number
          relevance_score?: number
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_jobs_for_user: {
        Args: {
          user_id: string
        }
        Returns: undefined
      }
    }
  }
}
