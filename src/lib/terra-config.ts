interface TerraConfig {
  apiKey: string;
  devId: string;
  webhookSecret: string;
  baseUrl: string;
  apiBaseUrl: string;
}

interface TerraConfigValidation {
  isValid: boolean;
  missing: string[];
  config?: TerraConfig;
}

export function validateTerraConfig(): TerraConfigValidation {
  const apiKey = import.meta.env.TERRA_API_KEY;
  const devId = import.meta.env.TERRA_DEV_ID;
  const webhookSecret = import.meta.env.TERRA_WEBHOOK_SECRET;
  const baseUrl = import.meta.env.BASE_URL || import.meta.env.VITE_SUPABASE_URL;

  const missing: string[] = [];

  if (!apiKey) missing.push('TERRA_API_KEY');
  if (!devId) missing.push('TERRA_DEV_ID');
  if (!webhookSecret) missing.push('TERRA_WEBHOOK_SECRET');
  if (!baseUrl) missing.push('BASE_URL');

  if (missing.length > 0) {
    return {
      isValid: false,
      missing
    };
  }

  return {
    isValid: true,
    missing: [],
    config: {
      apiKey,
      devId,
      webhookSecret,
      baseUrl,
      apiBaseUrl: 'https://api.tryterra.co/v2'
    }
  };
}

export function getTerraConfig(): TerraConfig {
  const validation = validateTerraConfig();

  if (!validation.isValid) {
    throw new Error(
      `Terra configuration incomplete. Missing: ${validation.missing.join(', ')}`
    );
  }

  return validation.config!;
}

export const TERRA_PROVIDERS = [
  'FITBIT',
  'OURA',
  'GARMIN',
  'WAHOO',
  'PELOTON',
  'ZWIFT',
  'TRAININGPEAKS',
  'FREESTYLELIBRE',
  'DEXCOM',
  'COROS',
  'HUAWEI',
  'OMRON',
  'RENPHO',
  'POLAR',
  'SUUNTO',
  'EIGHT',
  'WITHINGS',
  'IFIT',
  'TEMPO',
  'CRONOMETER',
  'FATSECRET',
  'NUTRACHECK',
  'UNDERARMOUR',
  'GOOGLE',
  'APPLE'
] as const;

export type TerraProvider = typeof TERRA_PROVIDERS[number];

export const TERRA_EVENT_TYPES = [
  'activity',
  'sleep',
  'daily',
  'body',
  'heart_rate',
  'glucose',
  'nutrition',
  'menstruation'
] as const;

export type TerraEventType = typeof TERRA_EVENT_TYPES[number];

export interface TerraMetricType {
  id: string;
  label: string;
  description: string;
  unit?: string;
}

export const TERRA_METRIC_TYPES: Record<string, TerraMetricType> = {
  activity: {
    id: 'activity',
    label: 'Activity',
    description: 'Steps, distance, calories, active minutes',
    unit: 'various'
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep',
    description: 'Sleep duration, stages, quality',
    unit: 'minutes'
  },
  hr: {
    id: 'hr',
    label: 'Heart Rate',
    description: 'Resting HR, average HR, max HR',
    unit: 'bpm'
  },
  hrv: {
    id: 'hrv',
    label: 'Heart Rate Variability',
    description: 'HRV measurements',
    unit: 'ms'
  },
  glucose: {
    id: 'glucose',
    label: 'Glucose',
    description: 'Blood glucose levels',
    unit: 'mg/dL'
  },
  steps: {
    id: 'steps',
    label: 'Steps',
    description: 'Step count',
    unit: 'steps'
  },
  bp: {
    id: 'bp',
    label: 'Blood Pressure',
    description: 'Systolic and diastolic BP',
    unit: 'mmHg'
  },
  weight: {
    id: 'weight',
    label: 'Weight',
    description: 'Body weight',
    unit: 'kg'
  },
  resp: {
    id: 'resp',
    label: 'Respiration',
    description: 'Breathing rate',
    unit: 'breaths/min'
  },
  readiness: {
    id: 'readiness',
    label: 'Readiness',
    description: 'Overall readiness score',
    unit: 'score'
  }
};
