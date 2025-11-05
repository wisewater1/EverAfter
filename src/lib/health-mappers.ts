/**
 * Health Data Mapping Layer
 *
 * Normalizes data from various providers into unified health metrics format.
 * Handles unit conversions, timezone normalization, and quality assessments.
 */

export interface RawHealthData {
  provider: string;
  data: unknown;
  timestamp: string;
  timezone?: string;
}

export interface UnifiedHealthMetric {
  metric_type: string;
  value: number;
  unit: string;
  start_time: string;
  end_time?: string;
  sampling_rate?: string;
  quality_flag?: string;
  confidence_score?: number;
  data_source?: string;
  activity_context?: string;
  tags?: string[];
  notes?: string;
}

// Unit conversion factors
const UNIT_CONVERSIONS = {
  // Distance
  meters_to_km: (m: number) => m / 1000,
  meters_to_miles: (m: number) => m * 0.000621371,
  km_to_miles: (km: number) => km * 0.621371,

  // Weight
  kg_to_lbs: (kg: number) => kg * 2.20462,
  lbs_to_kg: (lbs: number) => lbs / 2.20462,

  // Temperature
  celsius_to_fahrenheit: (c: number) => (c * 9 / 5) + 32,
  fahrenheit_to_celsius: (f: number) => (f - 32) * 5 / 9,

  // Glucose
  mmol_to_mgdl: (mmol: number) => mmol * 18.0182,
  mgdl_to_mmol: (mgdl: number) => mgdl / 18.0182,
};

// Standardized metric types and their expected units
export const METRIC_STANDARDS = {
  steps: { unit: 'steps', type: 'count' },
  distance: { unit: 'km', type: 'distance' },
  active_minutes: { unit: 'minutes', type: 'duration' },
  calories: { unit: 'kcal', type: 'energy' },
  floors: { unit: 'floors', type: 'count' },

  heart_rate: { unit: 'bpm', type: 'rate' },
  hrv: { unit: 'ms', type: 'duration' },
  resting_hr: { unit: 'bpm', type: 'rate' },

  sleep_duration: { unit: 'minutes', type: 'duration' },
  sleep_stages: { unit: 'minutes', type: 'duration' },
  sleep_score: { unit: 'score', type: 'score' },

  spo2: { unit: 'percent', type: 'percentage' },
  respiration_rate: { unit: 'breaths_per_minute', type: 'rate' },

  bp_systolic: { unit: 'mmHg', type: 'pressure' },
  bp_diastolic: { unit: 'mmHg', type: 'pressure' },

  weight: { unit: 'kg', type: 'mass' },
  body_fat: { unit: 'percent', type: 'percentage' },
  bmi: { unit: 'kg/m2', type: 'ratio' },

  glucose: { unit: 'mg/dL', type: 'concentration' },
  insulin_units: { unit: 'units', type: 'count' },

  temperature: { unit: 'celsius', type: 'temperature' },
  bbt: { unit: 'celsius', type: 'temperature' },

  vo2_max: { unit: 'mL/kg/min', type: 'rate' },
  training_load: { unit: 'score', type: 'score' },
  recovery_score: { unit: 'score', type: 'score' },
};

/**
 * Apple Health Mapper
 */
export class AppleHealthMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data.steps) {
      metrics.push({
        metric_type: 'steps',
        value: data.steps,
        unit: 'steps',
        start_time: data.start_date,
        end_time: data.end_date,
        sampling_rate: 'daily_summary',
        data_source: 'sensor',
      });
    }

    if (data.heart_rate) {
      metrics.push({
        metric_type: 'heart_rate',
        value: data.heart_rate,
        unit: 'bpm',
        start_time: data.timestamp,
        sampling_rate: 'instant',
        data_source: 'sensor',
      });
    }

    if (data.sleep_analysis) {
      metrics.push({
        metric_type: 'sleep_duration',
        value: data.sleep_analysis.duration_minutes,
        unit: 'minutes',
        start_time: data.sleep_analysis.start_time,
        end_time: data.sleep_analysis.end_time,
        sampling_rate: 'continuous',
        data_source: 'sensor',
        activity_context: 'sleep',
      });
    }

    return metrics;
  }
}

/**
 * Garmin Mapper
 */
export class GarminMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    // Daily summaries
    if (data.dailies) {
      for (const daily of data.dailies) {
        if (daily.steps) {
          metrics.push({
            metric_type: 'steps',
            value: daily.steps,
            unit: 'steps',
            start_time: daily.calendarDate,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }

        if (daily.distanceInMeters) {
          metrics.push({
            metric_type: 'distance',
            value: UNIT_CONVERSIONS.meters_to_km(daily.distanceInMeters),
            unit: 'km',
            start_time: daily.calendarDate,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }

        if (daily.restingHeartRateInBeatsPerMinute) {
          metrics.push({
            metric_type: 'resting_hr',
            value: daily.restingHeartRateInBeatsPerMinute,
            unit: 'bpm',
            start_time: daily.calendarDate,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }
      }
    }

    // Sleep data
    if (data.sleeps) {
      for (const sleep of data.sleeps) {
        metrics.push({
          metric_type: 'sleep_duration',
          value: sleep.sleepTimeInSeconds / 60,
          unit: 'minutes',
          start_time: sleep.sleepStartTimestampGMT,
          end_time: sleep.sleepEndTimestampGMT,
          sampling_rate: 'continuous',
          data_source: 'sensor',
          activity_context: 'sleep',
        });
      }
    }

    return metrics;
  }
}

/**
 * Fitbit Mapper
 */
export class FitbitMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data['activities-steps']) {
      for (const entry of data['activities-steps']) {
        metrics.push({
          metric_type: 'steps',
          value: parseInt(entry.value),
          unit: 'steps',
          start_time: entry.dateTime,
          sampling_rate: 'daily_summary',
          data_source: 'sensor',
        });
      }
    }

    if (data['activities-heart']) {
      for (const entry of data['activities-heart']) {
        if (entry.value?.restingHeartRate) {
          metrics.push({
            metric_type: 'resting_hr',
            value: entry.value.restingHeartRate,
            unit: 'bpm',
            start_time: entry.dateTime,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }
      }
    }

    if (data.sleep) {
      for (const sleep of data.sleep) {
        metrics.push({
          metric_type: 'sleep_duration',
          value: sleep.minutesAsleep,
          unit: 'minutes',
          start_time: sleep.startTime,
          end_time: sleep.endTime,
          sampling_rate: 'continuous',
          data_source: 'sensor',
          activity_context: 'sleep',
        });
      }
    }

    return metrics;
  }
}

/**
 * Oura Mapper
 */
export class OuraMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data.sleep) {
      for (const sleep of data.sleep) {
        metrics.push({
          metric_type: 'sleep_duration',
          value: sleep.total_sleep_duration / 60,
          unit: 'minutes',
          start_time: sleep.bedtime_start,
          end_time: sleep.bedtime_end,
          sampling_rate: 'continuous',
          data_source: 'sensor',
          activity_context: 'sleep',
        });

        if (sleep.score) {
          metrics.push({
            metric_type: 'sleep_score',
            value: sleep.score,
            unit: 'score',
            start_time: sleep.bedtime_start,
            sampling_rate: 'daily_summary',
            data_source: 'derived',
          });
        }

        if (sleep.average_heart_rate) {
          metrics.push({
            metric_type: 'heart_rate',
            value: sleep.average_heart_rate,
            unit: 'bpm',
            start_time: sleep.bedtime_start,
            end_time: sleep.bedtime_end,
            sampling_rate: 'continuous',
            data_source: 'sensor',
            activity_context: 'sleep',
          });
        }

        if (sleep.average_hrv) {
          metrics.push({
            metric_type: 'hrv',
            value: sleep.average_hrv,
            unit: 'ms',
            start_time: sleep.bedtime_start,
            end_time: sleep.bedtime_end,
            sampling_rate: 'continuous',
            data_source: 'sensor',
            activity_context: 'sleep',
          });
        }
      }
    }

    if (data.readiness) {
      for (const ready of data.readiness) {
        metrics.push({
          metric_type: 'recovery_score',
          value: ready.score,
          unit: 'score',
          start_time: ready.day,
          sampling_rate: 'daily_summary',
          data_source: 'derived',
        });
      }
    }

    return metrics;
  }
}

/**
 * WHOOP Mapper
 */
export class WhoopMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data.recovery) {
      for (const recovery of data.recovery) {
        metrics.push({
          metric_type: 'recovery_score',
          value: recovery.score.recovery_score,
          unit: 'score',
          start_time: recovery.created_at,
          sampling_rate: 'daily_summary',
          data_source: 'derived',
        });

        if (recovery.score.resting_heart_rate) {
          metrics.push({
            metric_type: 'resting_hr',
            value: recovery.score.resting_heart_rate,
            unit: 'bpm',
            start_time: recovery.created_at,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }

        if (recovery.score.hrv_rmssd_milli) {
          metrics.push({
            metric_type: 'hrv',
            value: recovery.score.hrv_rmssd_milli,
            unit: 'ms',
            start_time: recovery.created_at,
            sampling_rate: 'daily_summary',
            data_source: 'sensor',
          });
        }
      }
    }

    if (data.sleep) {
      for (const sleep of data.sleep) {
        metrics.push({
          metric_type: 'sleep_duration',
          value: sleep.score.total_in_bed_time_milli / 60000,
          unit: 'minutes',
          start_time: sleep.start,
          end_time: sleep.end,
          sampling_rate: 'continuous',
          data_source: 'sensor',
          activity_context: 'sleep',
        });
      }
    }

    return metrics;
  }
}

/**
 * Dexcom CGM Mapper
 */
export class DexcomMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data.egvs) {
      for (const reading of data.egvs) {
        metrics.push({
          metric_type: 'glucose',
          value: reading.value,
          unit: 'mg/dL',
          start_time: reading.systemTime,
          sampling_rate: 'continuous',
          data_source: 'sensor',
          quality_flag: reading.status === 'high' || reading.status === 'low' ? 'device_calibrating' : 'normal',
          tags: reading.trend ? [reading.trend] : undefined,
        });
      }
    }

    return metrics;
  }
}

/**
 * Withings Mapper
 */
export class WithingsMapper {
  static map(data: any): UnifiedHealthMetric[] {
    const metrics: UnifiedHealthMetric[] = [];

    if (data.measuregrps) {
      for (const group of data.measuregrps) {
        const timestamp = new Date(group.date * 1000).toISOString();

        for (const measure of group.measures) {
          const value = measure.value * Math.pow(10, measure.unit);

          switch (measure.type) {
            case 1: // Weight
              metrics.push({
                metric_type: 'weight',
                value: value,
                unit: 'kg',
                start_time: timestamp,
                sampling_rate: 'instant',
                data_source: 'sensor',
              });
              break;

            case 6: // Body Fat
              metrics.push({
                metric_type: 'body_fat',
                value: value,
                unit: 'percent',
                start_time: timestamp,
                sampling_rate: 'instant',
                data_source: 'sensor',
              });
              break;

            case 9: // Diastolic BP
              metrics.push({
                metric_type: 'bp_diastolic',
                value: value,
                unit: 'mmHg',
                start_time: timestamp,
                sampling_rate: 'instant',
                data_source: 'sensor',
              });
              break;

            case 10: // Systolic BP
              metrics.push({
                metric_type: 'bp_systolic',
                value: value,
                unit: 'mmHg',
                start_time: timestamp,
                sampling_rate: 'instant',
                data_source: 'sensor',
              });
              break;

            case 11: // Heart Rate
              metrics.push({
                metric_type: 'heart_rate',
                value: value,
                unit: 'bpm',
                start_time: timestamp,
                sampling_rate: 'instant',
                data_source: 'sensor',
              });
              break;
          }
        }
      }
    }

    return metrics;
  }
}

/**
 * Main mapper factory
 */
export class HealthDataMapper {
  static mapProviderData(
    provider: string,
    data: any
  ): UnifiedHealthMetric[] {
    switch (provider) {
      case 'apple_health':
        return AppleHealthMapper.map(data);
      case 'garmin':
        return GarminMapper.map(data);
      case 'fitbit':
        return FitbitMapper.map(data);
      case 'oura':
        return OuraMapper.map(data);
      case 'whoop':
        return WhoopMapper.map(data);
      case 'dexcom_cgm':
        return DexcomMapper.map(data);
      case 'withings':
        return WithingsMapper.map(data);
      default:
        console.warn(`No mapper found for provider: ${provider}`);
        return [];
    }
  }

  /**
   * Normalize timezone to UTC
   */
  static normalizeTimezone(
    timestamp: string,
    timezone?: string
  ): string {
    const date = new Date(timestamp);
    return date.toISOString();
  }

  /**
   * Validate metric data
   */
  static validateMetric(metric: UnifiedHealthMetric): boolean {
    if (!metric.metric_type || !metric.value || !metric.unit || !metric.start_time) {
      return false;
    }

    const standard = METRIC_STANDARDS[metric.metric_type as keyof typeof METRIC_STANDARDS];
    if (!standard) {
      return false;
    }

    // Check if value is reasonable
    if (metric.value < 0 || !isFinite(metric.value)) {
      return false;
    }

    return true;
  }
}
