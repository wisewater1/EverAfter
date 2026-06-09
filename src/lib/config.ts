export const config = {
  app: {
    name: 'EverAfter',
    description: 'Digital Legacy Platform',
    version: '2.0.0',
    environment: import.meta.env.MODE || 'development'
  },

  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },

  features: {
    healthTracking: true,
    saintsAI: true,
    customEngrams: true,
    familyMembers: true,
    dailyQuestions: true,
    oauthIntegrations: true,
    premiumFeatures: true
  },

  health: {
    supportedServices: [
      {
        id: 'apple-health',
        name: 'Apple Health',
        type: 'apple_health',
        requiresOAuth: true,
        enabled: true
      },
      {
        id: 'google-fit',
        name: 'Google Fit',
        type: 'google_fit',
        requiresOAuth: true,
        enabled: true
      },
      {
        id: 'fitbit',
        name: 'Fitbit',
        type: 'fitbit',
        requiresOAuth: true,
        enabled: true
      },
      {
        id: 'garmin',
        name: 'Garmin',
        type: 'garmin',
        requiresOAuth: true,
        enabled: false
      },
      {
        id: 'manual',
        name: 'Manual Entry',
        type: 'manual',
        requiresOAuth: false,
        enabled: true
      }
    ],
    metricTypes: [
      { id: 'steps', name: 'Steps', unit: 'steps', category: 'activity' },
      { id: 'distance', name: 'Distance', unit: 'km', category: 'activity' },
      { id: 'calories', name: 'Calories', unit: 'kcal', category: 'activity' },
      { id: 'heart_rate', name: 'Heart Rate', unit: 'bpm', category: 'vitals' },
      { id: 'blood_pressure_systolic', name: 'Blood Pressure (Systolic)', unit: 'mmHg', category: 'vitals' },
      { id: 'blood_pressure_diastolic', name: 'Blood Pressure (Diastolic)', unit: 'mmHg', category: 'vitals' },
      { id: 'sleep', name: 'Sleep Duration', unit: 'hours', category: 'sleep' },
      { id: 'sleep_quality', name: 'Sleep Quality', unit: 'score', category: 'sleep' },
      { id: 'weight', name: 'Weight', unit: 'kg', category: 'body' },
      { id: 'body_fat', name: 'Body Fat', unit: '%', category: 'body' },
      { id: 'active_minutes', name: 'Active Minutes', unit: 'minutes', category: 'activity' },
      { id: 'exercise_minutes', name: 'Exercise Minutes', unit: 'minutes', category: 'activity' }
    ],
    syncFrequencies: [
      { id: 'realtime', name: 'Real-time', interval: 0 },
      { id: 'hourly', name: 'Hourly', interval: 3600 },
      { id: 'daily', name: 'Daily', interval: 86400 },
      { id: 'weekly', name: 'Weekly', interval: 604800 }
    ]
  },

  saints: {
    free: ['st-raphael'],
    premium: ['st-michael', 'st-martin', 'st-agatha'],
    definitions: {
      'st-raphael': {
        id: 'st-raphael',
        name: 'St. Raphael',
        tier: 'classic',
        description: 'Health management and emotional support',
        capabilities: ['health-tracking', 'appointments', 'prescriptions', 'wellness-advice']
      },
      'st-michael': {
        id: 'st-michael',
        name: 'St. Michael',
        tier: 'premium',
        description: 'Security and privacy protection',
        capabilities: ['security-monitoring', 'privacy-alerts', 'data-protection']
      },
      'st-joseph': {
        id: 'st-joseph',
        name: 'St. Joseph',
        tier: 'premium',
        description: 'Family and home management',
        capabilities: ['chore-tracking', 'family-calendar', 'household-coordination']
      },
      'st-martin': {
        id: 'st-martin',
        name: 'St. Martin',
        tier: 'premium',
        description: 'Charitable giving and community support',
        capabilities: ['donation-tracking', 'volunteer-coordination', 'impact-reports']
      },
      'st-agatha': {
        id: 'st-agatha',
        name: 'St. Agatha',
        tier: 'premium',
        description: 'Crisis support and resilience',
        capabilities: ['crisis-detection', 'emergency-contacts', 'mental-health-resources']
      }
    }
  },

  engrams: {
    minQuestionsForActivation: 292,
    totalQuestions: 365,
    readinessThreshold: 80,
    categories: [
      'personality',
      'values',
      'memories',
      'humor',
      'relationships',
      'wisdom',
      'daily-life',
      'philosophy'
    ]
  },

  ui: {
    theme: {
      primary: 'blue',
      secondary: 'teal',
      accent: 'cyan'
    },
    animations: {
      enabled: true,
      duration: 300
    }
  },

  api: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  storage: {
    maxFileSize: 10485760,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg']
  }
};

export type AppConfig = typeof config;

export default config;
