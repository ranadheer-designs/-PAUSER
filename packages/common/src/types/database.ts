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
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          streak_count: number
          total_reviews: number
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          streak_count?: number
          total_reviews?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          streak_count?: number
          total_reviews?: number
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      contents: {
        Row: {
          id: string
          type: 'video' | 'playlist'
          external_id: string
          title: string
          description: string | null
          thumbnail_url: string | null
          duration_seconds: number | null
          metadata: Json
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          type: 'video' | 'playlist'
          external_id: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          duration_seconds?: number | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          type?: 'video' | 'playlist'
          external_id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          duration_seconds?: number | null
          metadata?: Json
          created_by?: string | null
          created_at?: string
        }
      }
      checkpoints: {
        Row: {
          id: string
          content_id: string
          timestamp_seconds: number
          type: 'quiz' | 'flashcard' | 'code_challenge' | 'retrieval'
          title: string | null
          prompt: string
          options: Json | null
          answer_key: Json
          explanation: string | null
          difficulty: number
          ai_generated: boolean
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          timestamp_seconds: number
          type: 'quiz' | 'flashcard' | 'code_challenge' | 'retrieval'
          title?: string | null
          prompt: string
          options?: Json | null
          answer_key: Json
          explanation?: string | null
          difficulty?: number
          ai_generated?: boolean
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          timestamp_seconds?: number
          type?: 'quiz' | 'flashcard' | 'code_challenge' | 'retrieval'
          title?: string | null
          prompt?: string
          options?: Json | null
          answer_key?: Json
          explanation?: string | null
          difficulty?: number
          ai_generated?: boolean
          verified?: boolean
          created_at?: string
        }
      }
      concepts: {
        Row: {
          id: string
          checkpoint_id: string | null
          name: string
          definition: string | null
          keywords: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          checkpoint_id?: string | null
          name: string
          definition?: string | null
          keywords?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          checkpoint_id?: string | null
          name?: string
          definition?: string | null
          keywords?: string[] | null
          created_at?: string
        }
      }
      challenges: {
        Row: {
          id: string
          checkpoint_id: string
          title: string
          description: string
          starter_code: string
          language: string
          test_cases: Json
          solution_code: string | null
          time_limit_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          checkpoint_id: string
          title: string
          description: string
          starter_code: string
          language?: string
          test_cases?: Json
          solution_code?: string | null
          time_limit_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          checkpoint_id?: string
          title?: string
          description?: string
          starter_code?: string
          language?: string
          test_cases?: Json
          solution_code?: string | null
          time_limit_ms?: number
          created_at?: string
        }
      }
      attempts: {
        Row: {
          id: string
          user_id: string
          checkpoint_id: string
          challenge_id: string | null
          user_answer: Json
          is_correct: boolean
          score: number
          time_spent_ms: number | null
          attempt_number: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          checkpoint_id: string
          challenge_id?: string | null
          user_answer: Json
          is_correct: boolean
          score?: number
          time_spent_ms?: number | null
          attempt_number?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          checkpoint_id?: string
          challenge_id?: string | null
          user_answer?: Json
          is_correct?: boolean
          score?: number
          time_spent_ms?: number | null
          attempt_number?: number
          created_at?: string
        }
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          checkpoint_id: string | null
          concept_id: string | null
          front: string
          back: string
          tags: string[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          checkpoint_id?: string | null
          concept_id?: string | null
          front: string
          back: string
          tags?: string[] | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          checkpoint_id?: string | null
          concept_id?: string | null
          front?: string
          back?: string
          tags?: string[] | null
          created_at?: string
        }
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          flashcard_id: string
          rating: number
          ease_factor: number
          interval_days: number
          repetitions: number
          reviewed_at: string
          next_review_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flashcard_id: string
          rating: number
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          reviewed_at?: string
          next_review_at: string
        }
        Update: {
          id?: string
          user_id?: string
          flashcard_id?: string
          rating?: number
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          reviewed_at?: string
          next_review_at?: string
        }
      }
      user_contents: {
        Row: {
          id: string
          user_id: string
          content_id: string
          current_time_seconds: number
          completed_checkpoints: string[] | null
          is_completed: boolean
          last_watched_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          current_time_seconds?: number
          completed_checkpoints?: string[] | null
          is_completed?: boolean
          last_watched_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          current_time_seconds?: number
          completed_checkpoints?: string[] | null
          is_completed?: boolean
          last_watched_at?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          content_id: string
          start_time_seconds: number
          end_time_seconds: number | null
          title: string | null
          body: string
          is_draft: boolean
          local_id: string | null
          synced_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id: string
          start_time_seconds: number
          end_time_seconds?: number | null
          title?: string | null
          body: string
          is_draft?: boolean
          local_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string
          start_time_seconds?: number
          end_time_seconds?: number | null
          title?: string | null
          body?: string
          is_draft?: boolean
          local_id?: string | null
          synced_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
