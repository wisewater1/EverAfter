export interface StandardMetric {
  user_id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  source: string;
  recorded_at: string;
  metadata?: Record<string, unknown>;
}

type ApiData = Record<string, unknown>;

export function transformDexcomData(data: ApiData, userId: string): StandardMetric[] {
  if (!data.egvs || !Array.isArray(data.egvs)) {
    return [];
  }

  return (data.egvs as ApiData[]).map((egv) => ({
    user_id: userId,
    metric_type: 'glucose',
    metric_value: egv.value as number,
    metric_unit: (egv.unit as string) || 'mg/dL',
    source: 'dexcom',
    recorded_at: egv.systemTime as string,
    metadata: {
      trend: egv.trend,
      trend_rate: egv.trendRate,
      transmitter_id: egv.transmitterId,
      display_device: egv.displayDevice,
    },
  }));
}

export function transformFitbitData(data: ApiData, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];
  const now = new Date().toISOString();

  const activities = data.activities as ApiData | undefined;
  const summary = activities?.summary as ApiData | undefined;

  if (summary) {
    if (summary.steps) {
      metrics.push({
        user_id: userId,
        metric_type: 'steps',
        metric_value: summary.steps as number,
        metric_unit: 'steps',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.distance) {
      metrics.push({
        user_id: userId,
        metric_type: 'distance',
        metric_value: summary.distance as number,
        metric_unit: 'km',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.caloriesOut) {
      metrics.push({
        user_id: userId,
        metric_type: 'calories_burned',
        metric_value: summary.caloriesOut as number,
        metric_unit: 'kcal',
        source: 'fitbit',
        recorded_at: now,
      });
    }

    if (summary.veryActiveMinutes || summary.fairlyActiveMinutes) {
      metrics.push({
        user_id: userId,
        metric_type: 'active_minutes',
        metric_value: ((summary.veryActiveMinutes as number) || 0) + ((summary.fairlyActiveMinutes as number) || 0),
        metric_unit: 'minutes',
        source: 'fitbit',
        recorded_at: now,
      });
    }
  }

  const heart = data.heart as ApiData | undefined;
  const heartEntries = heart?.['activities-heart'] as ApiData[] | undefined;
  const firstHeartEntry = heartEntries?.[0];
  const heartData = firstHeartEntry?.value as ApiData | undefined;

  if (heartData?.restingHeartRate) {
    metrics.push({
      user_id: userId,
      metric_type: 'resting_heart_rate',
      metric_value: heartData.restingHeartRate as number,
      metric_unit: 'bpm',
      source: 'fitbit',
      recorded_at: now,
      metadata: {
        heart_rate_zones: heartData.heartRateZones,
      },
    });
  }

  const sleepData = data.sleep as ApiData | undefined;
  const sleepEntries = sleepData?.sleep as ApiData[] | undefined;
  const firstSleep = sleepEntries?.[0];

  if (firstSleep) {
    metrics.push({
      user_id: userId,
      metric_type: 'sleep_duration',
      metric_value: (firstSleep.minutesAsleep as number) / 60,
      metric_unit: 'hours',
      source: 'fitbit',
      recorded_at: firstSleep.dateOfSleep as string,
      metadata: {
        efficiency: firstSleep.efficiency,
        stages: (firstSleep.levels as ApiData | undefined)?.summary,
      },
    });
  }

  return metrics;
}

export function transformOuraData(data: ApiData, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];

  const sleepData = data.sleep as ApiData | undefined;
  if (sleepData?.data) {
    (sleepData.data as ApiData[]).forEach((item) => {
      metrics.push({
        user_id: userId,
        metric_type: 'sleep_score',
        metric_value: (item.score as number) || 0,
        metric_unit: 'score',
        source: 'oura',
        recorded_at: item.day as string,
        metadata: {
          total_sleep: (item.contributors as ApiData | undefined)?.total_sleep_duration,
          efficiency: (item.contributors as ApiData | undefined)?.sleep_efficiency,
          restfulness: (item.contributors as ApiData | undefined)?.restfulness,
          rem_sleep: (item.contributors as ApiData | undefined)?.rem_sleep_duration,
          deep_sleep: (item.contributors as ApiData | undefined)?.deep_sleep_duration,
        },
      });
    });
  }

  const activityData = data.activity as ApiData | undefined;
  if (activityData?.data) {
    (activityData.data as ApiData[]).forEach((item) => {
      if (item.steps) {
        metrics.push({
          user_id: userId,
          metric_type: 'steps',
          metric_value: item.steps as number,
          metric_unit: 'steps',
          source: 'oura',
          recorded_at: item.day as string,
        });
      }

      if (item.score) {
        metrics.push({
          user_id: userId,
          metric_type: 'activity_score',
          metric_value: item.score as number,
          metric_unit: 'score',
          source: 'oura',
          recorded_at: item.day as string,
          metadata: {
            active_calories: item.active_calories,
            equivalent_walking_distance: item.equivalent_walking_distance,
          },
        });
      }
    });
  }

  const readinessData = data.readiness as ApiData | undefined;
  if (readinessData?.data) {
    (readinessData.data as ApiData[]).forEach((item) => {
      metrics.push({
        user_id: userId,
        metric_type: 'readiness_score',
        metric_value: (item.score as number) || 0,
        metric_unit: 'score',
        source: 'oura',
        recorded_at: item.day as string,
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

export function transformTerraData(data: ApiData, userId: string): StandardMetric[] {
  const metrics: StandardMetric[] = [];

  const dailyData = data.daily as ApiData | undefined;
  if (dailyData?.data) {
    (dailyData.data as ApiData[]).forEach((day) => {
      const distanceData = day.distance_data as ApiData | undefined;
      if (distanceData?.steps) {
        metrics.push({
          user_id: userId,
          metric_type: 'steps',
          metric_value: distanceData.steps as number,
          metric_unit: 'steps',
          source: 'terra',
          recorded_at: (day.metadata as ApiData | undefined)?.start_time as string || new Date().toISOString(),
        });
      }

      const hrData = day.heart_rate_data as ApiData | undefined;
      const hrSummary = hrData?.summary as ApiData | undefined;
      if (hrSummary?.avg_hr_bpm) {
        metrics.push({
          user_id: userId,
          metric_type: 'heart_rate',
          metric_value: hrSummary.avg_hr_bpm as number,
          metric_unit: 'bpm',
          source: 'terra',
          recorded_at: (day.metadata as ApiData | undefined)?.start_time as string || new Date().toISOString(),
          metadata: {
            min_hr: hrSummary.min_hr_bpm,
            max_hr: hrSummary.max_hr_bpm,
            resting_hr: hrSummary.resting_hr_bpm,
          },
        });
      }

      const caloriesData = day.calories_data as ApiData | undefined;
      if (caloriesData?.total_burned_calories) {
        metrics.push({
          user_id: userId,
          metric_type: 'calories_burned',
          metric_value: caloriesData.total_burned_calories as number,
          metric_unit: 'kcal',
          source: 'terra',
          recorded_at: (day.metadata as ApiData | undefined)?.start_time as string || new Date().toISOString(),
        });
      }
    });
  }

  const sleepData = data.sleep as ApiData | undefined;
  if (sleepData?.data) {
    (sleepData.data as ApiData[]).forEach((sleep) => {
      const sleepDurations = sleep.sleep_durations_data as ApiData | undefined;
      const asleep = sleepDurations?.asleep as ApiData | undefined;
      if (asleep?.duration_asleep_state_seconds) {
        metrics.push({
          user_id: userId,
          metric_type: 'sleep_duration',
          metric_value: (asleep.duration_asleep_state_seconds as number) / 3600,
          metric_unit: 'hours',
          source: 'terra',
          recorded_at: (sleep.metadata as ApiData | undefined)?.start_time as string || new Date().toISOString(),
          metadata: {
            rem_duration: (sleepDurations?.rem as ApiData | undefined)?.duration_rem_state_seconds,
            deep_duration: (sleepDurations?.deep as ApiData | undefined)?.duration_deep_sleep_state_seconds,
            light_duration: (sleepDurations?.light as ApiData | undefined)?.duration_light_sleep_state_seconds,
          },
        });
      }
    });
  }

  return metrics;
}

export function transformToStandardFormat(data: ApiData, provider: string, userId: string): StandardMetric[] {
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
