/**
 * Health Data Transformation and Normalization Layer
 *
 * This module provides standardized data transformation utilities for
 * health metrics from various providers, ensuring consistent data format,
 * unit conversion, and quality validation across the application.
 */

export interface RawHealthMetric {
  value: number;
  unit?: string;
  timestamp?: string | Date;
  source: string;
  metricType: string;
  raw?: any;
}

export interface NormalizedHealthMetric {
  value: number;
  unit: string;
  timestamp: string;
  source: string;
  metric: string;
  qualityScore: number;
  isAnomaly: boolean;
  anomalyReason?: string;
  raw: any;
}

export interface MetricMetadata {
  standardUnit: string;
  validRange: {
    min: number;
    max: number;
  };
  decimalPlaces: number;
  category: 'vital' | 'activity' | 'metabolic' | 'sleep' | 'mental';
}

// Standardized metric definitions
const METRIC_DEFINITIONS: Record<string, MetricMetadata> = {
  glucose: {
    standardUnit: 'mg/dL',
    validRange: { min: 40, max: 400 },
    decimalPlaces: 1,
    category: 'metabolic',
  },
  heart_rate: {
    standardUnit: 'bpm',
    validRange: { min: 30, max: 220 },
    decimalPlaces: 0,
    category: 'vital',
  },
  resting_hr: {
    standardUnit: 'bpm',
    validRange: { min: 30, max: 120 },
    decimalPlaces: 0,
    category: 'vital',
  },
  steps: {
    standardUnit: 'count',
    validRange: { min: 0, max: 100000 },
    decimalPlaces: 0,
    category: 'activity',
  },
  sleep_hours: {
    standardUnit: 'hours',
    validRange: { min: 0, max: 24 },
    decimalPlaces: 1,
    category: 'sleep',
  },
  sleep_score: {
    standardUnit: 'score',
    validRange: { min: 0, max: 100 },
    decimalPlaces: 0,
    category: 'sleep',
  },
  hrv: {
    standardUnit: 'ms',
    validRange: { min: 10, max: 300 },
    decimalPlaces: 1,
    category: 'vital',
  },
  spo2: {
    standardUnit: '%',
    validRange: { min: 70, max: 100 },
    decimalPlaces: 1,
    category: 'vital',
  },
  weight: {
    standardUnit: 'kg',
    validRange: { min: 20, max: 300 },
    decimalPlaces: 1,
    category: 'vital',
  },
  body_temp: {
    standardUnit: 'C',
    validRange: { min: 32, max: 43 },
    decimalPlaces: 1,
    category: 'vital',
  },
  calories_burned: {
    standardUnit: 'kcal',
    validRange: { min: 0, max: 10000 },
    decimalPlaces: 0,
    category: 'activity',
  },
  distance: {
    standardUnit: 'km',
    validRange: { min: 0, max: 500 },
    decimalPlaces: 2,
    category: 'activity',
  },
  readiness_score: {
    standardUnit: 'score',
    validRange: { min: 0, max: 100 },
    decimalPlaces: 0,
    category: 'mental',
  },
  recovery_score: {
    standardUnit: 'score',
    validRange: { min: 0, max: 100 },
    decimalPlaces: 0,
    category: 'mental',
  },
  strain: {
    standardUnit: 'score',
    validRange: { min: 0, max: 21 },
    decimalPlaces: 1,
    category: 'activity',
  },
};

// Provider-specific metric name mappings
const PROVIDER_METRIC_MAPPINGS: Record<string, Record<string, string>> = {
  fitbit: {
    'activities-steps': 'steps',
    'activities-calories': 'calories_burned',
    'activities-distance': 'distance',
    'heart-rate': 'heart_rate',
    'sleep-score': 'sleep_score',
  },
  oura: {
    steps: 'steps',
    total_sleep_duration: 'sleep_hours',
    rmssd: 'hrv',
    readiness_score_delta: 'readiness_score',
    score: 'sleep_score',
  },
  terra: {
    steps_data: 'steps',
    heart_rate_data: 'heart_rate',
    sleep_durations_data: 'sleep_hours',
    hrv_data: 'hrv',
  },
  dexcom: {
    glucose_value: 'glucose',
    trend_arrow: 'glucose_trend',
  },
  whoop: {
    strain: 'strain',
    recovery: 'recovery_score',
    hrv: 'hrv',
    resting_heart_rate: 'resting_hr',
  },
};

/**
 * Unit conversion functions
 */
export class UnitConverter {
  static glucoseMmolToMgDl(value: number): number {
    return Math.round(value * 18.0182 * 10) / 10;
  }

  static glucoseMgDlToMmol(value: number): number {
    return Math.round((value / 18.0182) * 10) / 10;
  }

  static weightLbsToKg(value: number): number {
    return Math.round(value * 0.453592 * 10) / 10;
  }

  static weightKgToLbs(value: number): number {
    return Math.round(value * 2.20462 * 10) / 10;
  }

  static distanceMilesToKm(value: number): number {
    return Math.round(value * 1.60934 * 100) / 100;
  }

  static distanceKmToMiles(value: number): number {
    return Math.round(value * 0.621371 * 100) / 100;
  }

  static tempFahrenheitToCelsius(value: number): number {
    return Math.round(((value - 32) * 5 / 9) * 10) / 10;
  }

  static tempCelsiusToFahrenheit(value: number): number {
    return Math.round((value * 9 / 5 + 32) * 10) / 10;
  }

  static sleepMinutesToHours(value: number): number {
    return Math.round(value / 60 * 10) / 10;
  }

  static sleepSecondsToHours(value: number): number {
    return Math.round(value / 3600 * 10) / 10;
  }
}

/**
 * Normalize metric name from provider-specific format to standard format
 */
export function normalizeMetricName(providerMetricName: string, provider: string): string {
  const providerMappings = PROVIDER_METRIC_MAPPINGS[provider.toLowerCase()];

  if (providerMappings && providerMappings[providerMetricName]) {
    return providerMappings[providerMetricName];
  }

  // Fallback to basic normalization
  return providerMetricName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Convert value to standard unit for the metric
 */
export function convertToStandardUnit(
  value: number,
  currentUnit: string,
  metricType: string
): { value: number; unit: string } {
  const metadata = METRIC_DEFINITIONS[metricType];
  if (!metadata) {
    return { value, unit: currentUnit || 'unknown' };
  }

  const standardUnit = metadata.standardUnit;
  const currentUnitLower = currentUnit?.toLowerCase() || '';

  // Glucose conversions
  if (metricType === 'glucose') {
    if (currentUnitLower.includes('mmol') || currentUnitLower === 'mmol/l') {
      return {
        value: UnitConverter.glucoseMmolToMgDl(value),
        unit: standardUnit,
      };
    }
    return { value, unit: standardUnit };
  }

  // Weight conversions
  if (metricType === 'weight') {
    if (currentUnitLower === 'lbs' || currentUnitLower === 'pounds') {
      return {
        value: UnitConverter.weightLbsToKg(value),
        unit: standardUnit,
      };
    }
    return { value, unit: standardUnit };
  }

  // Distance conversions
  if (metricType === 'distance') {
    if (currentUnitLower === 'miles' || currentUnitLower === 'mi') {
      return {
        value: UnitConverter.distanceMilesToKm(value),
        unit: standardUnit,
      };
    }
    if (currentUnitLower === 'm' || currentUnitLower === 'meters') {
      return {
        value: Math.round(value / 1000 * 100) / 100,
        unit: standardUnit,
      };
    }
    return { value, unit: standardUnit };
  }

  // Temperature conversions
  if (metricType === 'body_temp') {
    if (currentUnitLower === 'f' || currentUnitLower === 'fahrenheit') {
      return {
        value: UnitConverter.tempFahrenheitToCelsius(value),
        unit: standardUnit,
      };
    }
    return { value, unit: standardUnit };
  }

  // Sleep conversions
  if (metricType === 'sleep_hours') {
    if (currentUnitLower === 'minutes' || currentUnitLower === 'min') {
      return {
        value: UnitConverter.sleepMinutesToHours(value),
        unit: standardUnit,
      };
    }
    if (currentUnitLower === 'seconds' || currentUnitLower === 's') {
      return {
        value: UnitConverter.sleepSecondsToHours(value),
        unit: standardUnit,
      };
    }
    return { value, unit: standardUnit };
  }

  return { value, unit: standardUnit };
}

/**
 * Validate metric value against expected ranges
 */
export function validateMetricValue(
  value: number,
  metricType: string
): { isValid: boolean; qualityScore: number; anomalyReason?: string } {
  const metadata = METRIC_DEFINITIONS[metricType];

  if (!metadata) {
    return { isValid: true, qualityScore: 1.0 };
  }

  const { validRange } = metadata;

  // Check basic range
  if (value < validRange.min || value > validRange.max) {
    return {
      isValid: false,
      qualityScore: 0.0,
      anomalyReason: `Value ${value} outside valid range [${validRange.min}, ${validRange.max}]`,
    };
  }

  // Value is within range
  return { isValid: true, qualityScore: 1.0 };
}

/**
 * Round value to appropriate decimal places
 */
export function roundToDecimalPlaces(value: number, metricType: string): number {
  const metadata = METRIC_DEFINITIONS[metricType];
  if (!metadata) {
    return Math.round(value * 100) / 100;
  }

  const multiplier = Math.pow(10, metadata.decimalPlaces);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Normalize timestamp to ISO 8601 format
 */
export function normalizeTimestamp(timestamp: string | Date | number | undefined): string {
  if (!timestamp) {
    return new Date().toISOString();
  }

  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }

  if (typeof timestamp === 'number') {
    // Assume Unix timestamp in milliseconds or seconds
    const ts = timestamp > 9999999999 ? timestamp : timestamp * 1000;
    return new Date(ts).toISOString();
  }

  try {
    return new Date(timestamp).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Main transformation function - converts raw health metric to normalized format
 */
export function transformHealthMetric(raw: RawHealthMetric): NormalizedHealthMetric {
  // Normalize metric name
  const normalizedMetricName = normalizeMetricName(raw.metricType, raw.source);

  // Convert to standard unit
  const { value: convertedValue, unit: standardUnit } = convertToStandardUnit(
    raw.value,
    raw.unit || '',
    normalizedMetricName
  );

  // Round to appropriate decimal places
  const roundedValue = roundToDecimalPlaces(convertedValue, normalizedMetricName);

  // Validate value
  const validation = validateMetricValue(roundedValue, normalizedMetricName);

  // Normalize timestamp
  const normalizedTimestamp = normalizeTimestamp(raw.timestamp);

  return {
    value: roundedValue,
    unit: standardUnit,
    timestamp: normalizedTimestamp,
    source: raw.source.toLowerCase(),
    metric: normalizedMetricName,
    qualityScore: validation.qualityScore,
    isAnomaly: !validation.isValid,
    anomalyReason: validation.anomalyReason,
    raw: raw.raw || {},
  };
}

/**
 * Batch transform multiple metrics
 */
export function transformHealthMetrics(rawMetrics: RawHealthMetric[]): NormalizedHealthMetric[] {
  return rawMetrics.map(transformHealthMetric);
}

/**
 * Get metric metadata
 */
export function getMetricMetadata(metricType: string): MetricMetadata | null {
  return METRIC_DEFINITIONS[metricType] || null;
}

/**
 * Check if metric type is supported
 */
export function isSupportedMetric(metricType: string): boolean {
  return metricType in METRIC_DEFINITIONS;
}

/**
 * Get all supported metrics
 */
export function getSupportedMetrics(): string[] {
  return Object.keys(METRIC_DEFINITIONS);
}

/**
 * Get metrics by category
 */
export function getMetricsByCategory(category: string): string[] {
  return Object.entries(METRIC_DEFINITIONS)
    .filter(([_, metadata]) => metadata.category === category)
    .map(([metric, _]) => metric);
}
