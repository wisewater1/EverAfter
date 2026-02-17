/**
 * Comprehensive TypeScript type definitions for Supabase database schema
 * Generated based on EverAfter database migrations
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      archetypal_ais: {
        Row: ArchetypalAI;
        Insert: Omit<ArchetypalAI, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ArchetypalAI, 'id' | 'created_at'>>;
      };
      daily_question_pool: {
        Row: DailyQuestion;
        Insert: Omit<DailyQuestion, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyQuestion, 'id' | 'created_at'>>;
      };
      daily_question_responses: {
        Row: DailyQuestionResponse;
        Insert: Omit<DailyQuestionResponse, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyQuestionResponse, 'id' | 'created_at'>>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, 'id' | 'created_at'>;
        Update: Partial<Omit<FamilyMember, 'id' | 'created_at'>>;
      };
      saints_subscriptions: {
        Row: SaintSubscription;
        Insert: Omit<SaintSubscription, 'id' | 'created_at'>;
        Update: Partial<Omit<SaintSubscription, 'id' | 'created_at'>>;
      };
      health_metrics: {
        Row: HealthMetric;
        Insert: Omit<HealthMetric, 'id' | 'created_at'>;
        Update: Partial<Omit<HealthMetric, 'id' | 'created_at'>>;
      };
      provider_accounts: {
        Row: ProviderAccount;
        Insert: Omit<ProviderAccount, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProviderAccount, 'id' | 'created_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>;
      };
      delphi_trajectories: {
        Row: DelphiTrajectory;
        Insert: Omit<DelphiTrajectory, 'id' | 'created_at'>;
        Update: Partial<Omit<DelphiTrajectory, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchetypalAI {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_ai_active: boolean;
  readiness_score: number;
  personality_traits: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DailyQuestion {
  id: string;
  question_text: string;
  category: string;
  sequence_number: number;
  created_at: string;
}

export interface DailyQuestionResponse {
  id: string;
  user_id: string;
  engram_id: string | null;
  question_id: string;
  response_text: string;
  created_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  invited_user_id: string | null;
  name: string;
  email: string;
  relationship: string;
  status: 'pending' | 'active' | 'declined';
  created_at: string;
}

export interface SaintSubscription {
  id: string;
  user_id: string;
  saint_id: string;
  is_active: boolean;
  tier: 'free' | 'premium';
  created_at: string;
}

export interface HealthMetric {
  id: string;
  user_id: string;
  metric_type: string;
  value: number;
  unit: string;
  recorded_at: string;
  source: string;
  created_at: string;
}

export interface ProviderAccount {
  id: string;
  user_id: string;
  provider: string;
  provider_user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  tier: 'free' | 'premium' | 'enterprise';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface DelphiTrajectory {
  id: string;
  user_id: string;
  prediction_type: string;
  predicted_value: number;
  confidence: number;
  risk_level: string;
  contributing_factors: string[];
  trajectory_data: Array<{ timestamp: string; value: number }>;
  metrics_used: number;
  data_source: 'live' | 'simulated';
  generated_at: string;
  created_at: string;
}

// Edge Function Response Types
export interface EdgeFunctionResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    hint?: string;
  };
}

export interface ChatResponse {
  message: string;
  conversationId: string;
  timestamp: string;
}

export interface DailyQuestionResponseData {
  question: DailyQuestion;
  hasAnswered: boolean;
}

export interface TaskResponse {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
}

// Health Connector Types
export type HealthProvider =
  | 'apple_health'
  | 'google_fit'
  | 'fitbit'
  | 'oura'
  | 'dexcom'
  | 'terra'
  | 'manual';

export interface HealthConnectionStatus {
  provider: HealthProvider;
  connected: boolean;
  lastSync: string | null;
  error: string | null;
}

// Utility Types
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
