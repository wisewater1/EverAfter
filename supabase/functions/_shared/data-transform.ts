export interface StandardMetric {
  user_id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  source: string;
  recorded_at: string;
  metadata?: any;
}

export function transformDexcomData(data: any, userId: string): StandardMetric[] {
  if (!data.egvs || !Array.isArray(data.egvs)) {
    return [];
  }

  return data.egvs.map((egv: any) => ({
    user_id: userId,
    metric_type: 'glucose',
    metric_value: egv.value,
    metric_unit: egv.unit || 'mg/dL',
    source: 'dexcom',
    recorded_at: egv.systemTime,
    metadata: {
      trend: egv.trend,
      trend_rate: egv.trendRate,
      transmitter_id: egv.transmitterId,
      display_device: egv.displayDevice,
    },
  }));
}

export function transformFitbitData(data: any, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];
  const now = new Date().toISOString();

  if (data.activities?.summary) {
    const summary = data.activities.summary;

    if (summary.steps) {
      metrics.push({
        user_id: userId,
        metric_type: 'steps',
        metric_value: summary.steps,
        metric_unit: 'steps',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.distance) {
      metrics.push({
        user_id: userId,
        metric_type: 'distance',
        metric_value: summary.distance,
        metric_unit: 'km',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.caloriesOut) {
      metrics.push({
        user_id: userId,
        metric_type: 'calories_burned',
        metric_value: summary.caloriesOut,
        metric_unit: 'kcal',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.veryActiveMinutes || summary.fairlyActiveMinutes) {
      metrics.push({
        user_id: userId,
        metric_type: 'active_minutes',
        metric_value: (summary.veryActiveMinutes || 0) + (summary.fairlyActiveMinutes || 0),
        metric_unit: 'minutes',
        source: 'fitbit',
        recorded_at: now,
      });
    }
  }

  if (data.heart?.['activities-heart']?.[0]?.value) {
    const heartData = data.heart['activities-heart'][0].value;

    if (heartData.restingHeartRate) {
      metrics.push({
        user_id: userId,
        metric_type: 'resting_heart_rate',
        metric_value: heartData.restingHeartRate,
        metric_unit: 'bpm',
        source: 'fitbit',
        recorded_at: now,
        metadata: {
          heart_rate_zones: heartData.heartRateZones,
        },
      });
    }
  }

  if (data.sleep?.sleep?.[0]) {
    const sleep = data.sleep.sleep[0];

    metrics.push({
      user_id: userId,
      metric_type: 'sleep_duration',
      metric_value: sleep.minutesAsleep / 60,
      metric_unit: 'hours',
      source: 'fitbit',
      recorded_at: sleep.dateOfSleep,
      metadata: {
        efficiency: sleep.efficiency,
        stages: sleep.levels?.summary,
      },
    });
  }

  return metrics;
}

export function transformOuraData(data: any, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];

  if (data.sleep?.data) {
    data.sleep.data.forEach((item: any) => {
      metrics.push({
        user_id: userId,
        metric_type: 'sleep_score',
        metric_value: item.score || 0,
        metric_unit: 'score',
        source: 'oura',
        recorded_at: item.day,
        metadata: {
          total_sleep: item.contributors?.total_sleep_duration,
          efficiency: item.contributors?.sleep_efficiency,
          restfulness: item.contributors?.restfulness,
          rem_sleep: item.contributors?.rem_sleep_duration,
          deep_sleep: item.contributors?.deep_sleep_duration,
        },
      });
    });
  }

  if (data.activity?.data) {
    data.activity.data.forEach((item: any) => {
      if (item.steps) {
        metrics.push({
          user_id: userId,
          metric_type: 'steps',
          metric_value: item.steps,
          metric_unit: 'steps',
          source: 'oura',
          recorded_at: item.day,
        });
      }

      if (item.score) {
        metrics.push({
          user_id: userId,
          metric_type: 'activity_score',
          metric_value: item.score,
          metric_unit: 'score',
          source: 'oura',
          recorded_at: item.day,
          metadata: {
            active_calories: item.active_calories,
            equivalent_walking_distance: item.equivalent_walking_distance,
          },
        });
      }
    });
  }

  if (data.readiness?.data) {
    data.readiness.data.forEach((item: any) => {
      metrics.push({
        user_id: userId,
        metric_type: 'readiness_score',
        metric_value: item.score || 0,
        metric_unit: 'score',
        source: 'oura',
        recorded_at: item.day,
        metadata: {
          temperature_deviation: item.temperature_deviation,
          temperature_trend_deviation: item.temperature_trend_deviation,
          contributors: item.contributors,
        },
      });
    });
  }

  return metrics;
}

export function transformTerraData(data: any, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];

  if (data.daily?.data) {
    data.daily.data.forEach((day: any) => {
      if (day.distance_data?.steps) {
        metrics.push({
          user_id: userId,
          metric_type: 'steps',
          metric_value: day.distance_data.steps,
          metric_unit: 'steps',
          source: 'terra',
          recorded_at: day.metadata?.start_time || new Date().toISOString(),
        });
      }

      if (day.heart_rate_data?.summary?.avg_hr_bpm) {
        metrics.push({
          user_id: userId,
          metric_type: 'heart_rate',
          metric_value: day.heart_rate_data.summary.avg_hr_bpm,
          metric_unit: 'bpm',
          source: 'terra',
          recorded_at: day.metadata?.start_time || new Date().toISOString(),
          metadata: {
            min_hr: day.heart_rate_data.summary.min_hr_bpm,
            max_hr: day.heart_rate_data.summary.max_hr_bpm,
            resting_hr: day.heart_rate_data.summary.resting_hr_bpm,
          },
        });
      }

      if (day.calories_data?.total_burned_calories) {
        metrics.push({
          user_id: userId,
          metric_type: 'calories_burned',
          metric_value: day.calories_data.total_burned_calories,
          metric_unit: 'kcal',
          source: 'terra',
          recorded_at: day.metadata?.start_time || new Date().toISOString(),
        });
      }
    });
  }

  if (data.sleep?.data) {
    data.sleep.data.forEach((sleep: any) => {
      if (sleep.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
        metrics.push({
          user_id: userId,
          metric_type: 'sleep_duration',
          metric_value: sleep.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600,
          metric_unit: 'hours',
          source: 'terra',
          recorded_at: sleep.metadata?.start_time || new Date().toISOString(),
          metadata: {
            rem_duration: sleep.sleep_durations_data.rem?.duration_rem_state_seconds,
            deep_duration: sleep.sleep_durations_data.deep?.duration_deep_sleep_state_seconds,
            light_duration: sleep.sleep_durations_data.light?.duration_light_sleep_state_seconds,
          },
        });
      }
    });
  }

  return metrics;
}

export function transformToStandardFormat(data: any, provider: string, userId: string): StandardMetric[] {
  switch (provider.toLowerCase()) {
    case 'dexcom':
      return transformDexcomData(data, userId);
    case 'fitbit':
      return transformFitbitData(data, userId);
    case 'oura':
      return transformOuraData(data, userId);
    case 'terra':
      return transformTerraData(data, userId);
    default:
      console.warn(`No transformer available for provider: ${provider}`);
      return [];
  }
}
