// Database Types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  question_id: string;
  question_text: string;
  response: string;
  response_type: 'text' | 'voice' | 'video';
  category: string;
  personality_aspect: string;
  difficulty: string;
  time_of_day: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  user_id: string;
  invited_user_id?: string;
  email: string;
  name: string;
  role: 'primary' | 'family' | 'friend';
  status: 'active' | 'pending' | 'inactive';
  permissions: string[];
  invited_at: string;
  accepted_at?: string;
  last_active?: string;
}

export interface SaintAI {
  id: string;
  user_id: string;
  saint_id: string;
  saint_name: string;
  is_active: boolean;
  tier: 'classic' | 'premium';
  activated_at?: string;
  deactivated_at?: string;
  settings: Record<string, any>;
}

export interface SaintActivity {
  id: string;
  user_id: string;
  saint_id: string;
  action: string;
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
  status: 'completed' | 'in_progress' | 'scheduled';
  details?: string;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  daily_question_frequency: string;
  preferred_time: string;
  memory_categories: string[];
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  privacy_settings: {
    profile_visible: boolean;
    memories_visible: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface ProjectionSettings {
  id: string;
  user_id: string;
  location: string;
  geofence_radius: number;
  environment_theme: string;
  ambient_audio: string;
  lighting: string;
  weather_effects: boolean;
  auto_activation: boolean;
  manual_override: boolean;
  activation_delay: number;
  session_duration: string;
  created_at: string;
  updated_at: string;
}

// Application State Types
export interface AppState {
  currentView: 'landing' | 'question' | 'timeline' | 'dashboard' | 'memorial' | 'environment';
  user: User | null;
  isAuthenticated: boolean;
  currentDay: number;
}
