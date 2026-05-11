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
      teams: {
        Row: {
          id: string
          name: string
          customer_type: 'individual' | 'corporate'
          stripe_customer_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          customer_type: 'individual' | 'corporate'
          stripe_customer_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          customer_type?: 'individual' | 'corporate'
          stripe_customer_id?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          user_id: string
          team_id: string
          role: string
        }
        Insert: {
          user_id: string
          team_id: string
          role?: string
        }
        Update: {
          user_id?: string
          team_id?: string
          role?: string
        }
      }
      licenses: {
        Row: {
          id: string
          team_id: string
          tier: 'pro' | 'enterprise'
          status: string
          expires_at: string | null
          stripe_subscription_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          tier: 'pro' | 'enterprise'
          status?: string
          expires_at?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          tier?: 'pro' | 'enterprise'
          status?: string
          expires_at?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
        }
      }
      devices: {
        Row: {
          id: string
          license_id: string
          device_token: string
          device_name: string | null
          last_used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          license_id: string
          device_token: string
          device_name?: string | null
          last_used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          license_id?: string
          device_token?: string
          device_name?: string | null
          last_used_at?: string
          created_at?: string
        }
      }
      device_authorizations: {
        Row: {
          id: string
          device_code: string
          user_code: string
          verification_uri: string
          expires_at: string
          user_id: string | null
          is_authorized: boolean
          created_at: string
        }
        Insert: {
          id?: string
          device_code: string
          user_code: string
          verification_uri: string
          expires_at: string
          user_id?: string | null
          is_authorized?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          device_code?: string
          user_code?: string
          verification_uri?: string
          expires_at?: string
          user_id?: string | null
          is_authorized?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
