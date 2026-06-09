import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface HealthPattern {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  prediction_next_7_days: {
    expected_range: [number, number];
    risk_level: 'low' | 'medium' | 'high';
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const analysisType = url.searchParams.get('type') || 'comprehensive';
    const lookbackDays = parseInt(url.searchParams.get('lookbackDays') || '30');

    const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: healthMetrics, error: metricsError } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('ts', startDate)
      .order('ts', { ascending: true });

    if (metricsError) {
      throw metricsError;
    }

    if (!healthMetrics || healthMetrics.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Insufficient data for analysis',
          patterns: [],
          insights: [],
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const metricsByType = healthMetrics.reduce((acc: any, metric: any) => {
      if (!acc[metric.metric]) {
        acc[metric.metric] = [];
      }
      acc[metric.metric].push({
        value: parseFloat(metric.value),
        timestamp: metric.ts,
      });
      return acc;
    }, {});

    const patterns: HealthPattern[] = [];
    const insights: string[] = [];
    const correlations: any[] = [];

    for (const [metricType, readings] of Object.entries(metricsByType) as [string, any[]][]) {
      if (readings.length < 7) continue;

      const values = readings.map((r: any) => r.value);
      const recent = values.slice(-7);
      const previous = values.slice(-14, -7);

      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const previousAvg = previous.length > 0
        ? previous.reduce((a, b) => a + b, 0) / previous.length
        : recentAvg;

      const percentChange = previousAvg !== 0
        ? ((recentAvg - previousAvg) / previousAvg) * 100
        : 0;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (Math.abs(percentChange) > 5) {
        if (metricType === 'glucose' || metricType === 'blood_pressure_systolic') {
          trend = percentChange < 0 ? 'improving' : 'declining';
        } else if (metricType === 'steps' || metricType === 'active_minutes') {
          trend = percentChange > 0 ? 'improving' : 'declining';
        } else {
          trend = percentChange > 0 ? 'improving' : 'declining';
        }
      }

      const stdDev = calculateStdDev(values);
      const min = Math.min(...values);
      const max = Math.max(...values);

      const pattern: HealthPattern = {
        metric: metricType,
        trend: trend,
        confidence: Math.min(95, 60 + (readings.length / 10) * 10),
        prediction_next_7_days: {
          expected_range: [
            Math.max(0, recentAvg - stdDev * 1.5),
            recentAvg + stdDev * 1.5,
          ],
          risk_level: stdDev > (recentAvg * 0.2) ? 'high' : stdDev > (recentAvg * 0.1) ? 'medium' : 'low',
        },
      };

      patterns.push(pattern);

      if (trend === 'declining' && pattern.prediction_next_7_days.risk_level !== 'low') {
        insights.push(
          `⚠️ Your ${metricType.replace(/_/g, ' ')} has declined by ${Math.abs(percentChange).toFixed(1)}% in the past week. Consider consulting with your healthcare provider.`
        );
      } else if (trend === 'improving') {
        insights.push(
          `✅ Great progress! Your ${metricType.replace(/_/g, ' ')} has improved by ${Math.abs(percentChange).toFixed(1)}% recently.`
        );
      }

      if (pattern.prediction_next_7_days.risk_level === 'high') {
        insights.push(
          `📊 High variability detected in ${metricType.replace(/_/g, ' ')}. Focus on consistency in your routines.`
        );
      }
    }

    if (metricsByType['glucose'] && metricsByType['steps']) {
      const glucoseVals = metricsByType['glucose'].map((r: any) => r.value);
      const stepsVals = metricsByType['steps'].map((r: any) => r.value);

      if (glucoseVals.length > 10 && stepsVals.length > 10) {
        const correlation = calculateCorrelation(
          glucoseVals.slice(-Math.min(glucoseVals.length, stepsVals.length)),
          stepsVals.slice(-Math.min(glucoseVals.length, stepsVals.length))
        );

        correlations.push({
          metric_1: 'glucose',
          metric_2: 'steps',
          correlation: correlation,
          strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
        });

        if (Math.abs(correlation) > 0.5) {
          const direction = correlation < 0 ? 'lower' : 'higher';
          insights.push(
            `🔗 Strong correlation detected: More physical activity is associated with ${direction} glucose levels.`
          );
        }
      }
    }

    if (metricsByType['glucose'] && metricsByType['sleep_duration']) {
      const glucoseVals = metricsByType['glucose'].map((r: any) => r.value);
      const sleepVals = metricsByType['sleep_duration'].map((r: any) => r.value);

      if (glucoseVals.length > 10 && sleepVals.length > 10) {
        const correlation = calculateCorrelation(
          glucoseVals.slice(-Math.min(glucoseVals.length, sleepVals.length)),
          sleepVals.slice(-Math.min(glucoseVals.length, sleepVals.length))
        );

        correlations.push({
          metric_1: 'glucose',
          metric_2: 'sleep_duration',
          correlation: correlation,
          strength: Math.abs(correlation) > 0.7 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
        });

        if (Math.abs(correlation) > 0.4) {
          insights.push(
            `😴 Sleep quality appears to influence your glucose control. Aim for consistent 7-9 hours per night.`
          );
        }
      }
    }

    const { data: existingAlerts } = await supabase
      .from('device_alerts')
      .select('*')
      .eq('user_id', user.id)
      .is('resolved_at', null)
      .gte('triggered_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const recentAlertsCount = existingAlerts?.length || 0;

    if (recentAlertsCount > 5) {
      insights.push(
        `⚕️ You've had ${recentAlertsCount} alerts in the past week. Consider scheduling a check-in with your care team.`
      );
    }

    const personalizedRecommendations = generateRecommendations(patterns, correlations);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          period_analyzed: `${lookbackDays} days`,
          total_data_points: healthMetrics.length,
          metrics_analyzed: Object.keys(metricsByType).length,
        },
        patterns: patterns,
        correlations: correlations,
        insights: insights,
        recommendations: personalizedRecommendations,
        generated_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in predictive analytics:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function calculateStdDev(values: number[]): number {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}

function calculateCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  if (xDenominator === 0 || yDenominator === 0) return 0;

  return numerator / Math.sqrt(xDenominator * yDenominator);
}

function generateRecommendations(patterns: HealthPattern[], correlations: any[]): string[] {
  const recommendations: string[] = [];

  const decliningMetrics = patterns.filter(p => p.trend === 'declining');
  const highRiskMetrics = patterns.filter(p => p.prediction_next_7_days.risk_level === 'high');

  if (decliningMetrics.length > 2) {
    recommendations.push(
      '🏥 Multiple health metrics are declining. Schedule a comprehensive health review with your provider.'
    );
  }

  if (highRiskMetrics.length > 0) {
    recommendations.push(
      '📈 High variability detected in your metrics. Focus on maintaining consistent daily routines (sleep, meals, activity).'
    );
  }

  const strongCorrelations = correlations.filter(c => c.strength === 'strong');
  if (strongCorrelations.length > 0) {
    recommendations.push(
      '🎯 We\'ve identified key factors influencing your health. Use these insights to optimize your daily habits.'
    );
  }

  const improvingMetrics = patterns.filter(p => p.trend === 'improving');
  if (improvingMetrics.length > 0) {
    recommendations.push(
      '✨ Your efforts are paying off! Continue your current health routines for sustained improvement.'
    );
  }

  if (patterns.some(p => p.metric === 'glucose' && p.prediction_next_7_days.risk_level === 'high')) {
    recommendations.push(
      '🩺 Glucose variability detected. Consider logging meals and timing to identify patterns with your care team.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '👍 Your health metrics are stable. Keep up your current routines and continue monitoring regularly.'
    );
  }

  return recommendations;
}
