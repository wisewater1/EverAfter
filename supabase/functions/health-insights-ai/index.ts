import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getCorsHeaders,
  supabaseFromRequest,
  serviceSupabase,
  errorResponse,
  jsonResponse,
} from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

interface HealthInsightRequest {
  timeframe_days?: number;
  metric_types?: string[];
  generate_recommendations?: boolean;
}

interface HealthInsight {
  insight_type: string;
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  metrics_analyzed: string[];
  data_points: any[];
  recommendations?: string[];
  created_at: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = supabaseFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const {
      timeframe_days = 30,
      metric_types = ['glucose', 'heart_rate', 'steps', 'sleep_hours'],
      generate_recommendations = true,
    }: HealthInsightRequest = await req.json();

    const serviceClient = serviceSupabase();

    // Calculate timeframe
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe_days);

    // Fetch health metrics for analysis
    const { data: metrics, error: metricsError } = await serviceClient
      .from('health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .in('metric', metric_types)
      .gte('ts', startDate.toISOString())
      .lte('ts', endDate.toISOString())
      .gte('quality_score', 0.5)
      .order('ts', { ascending: true });

    if (metricsError) {
      return errorResponse('Failed to fetch health metrics', 500);
    }

    if (!metrics || metrics.length === 0) {
      return jsonResponse({
        insights: [],
        summary: 'Insufficient data for generating insights. Connect more devices or wait for data collection.',
      });
    }

    // Get St. Raphael engram for AI context
    const { data: raphaelEngram } = await serviceClient
      .from('engrams')
      .select('id, name')
      .eq('name', 'St. Raphael')
      .limit(1)
      .maybeSingle();

    // Generate insights
    const insights: HealthInsight[] = [];

    // 1. Analyze trends
    const trendInsights = analyzeTrends(metrics, timeframe_days);
    insights.push(...trendInsights);

    // 2. Detect anomalies
    const anomalyInsights = detectAnomalies(metrics);
    insights.push(...anomalyInsights);

    // 3. Correlation analysis
    const correlationInsights = analyzeCorrelations(metrics);
    insights.push(...correlationInsights);

    // 4. Generate recommendations
    if (generate_recommendations) {
      const recommendations = generateRecommendations(metrics, insights);
      insights.push(...recommendations);
    }

    // Store insights in database for St. Raphael AI access
    if (raphaelEngram) {
      for (const insight of insights) {
        await storeInsightForAI(serviceClient, user.id, raphaelEngram.id, insight);
      }
    }

    return jsonResponse({
      insights: insights,
      timeframe_days: timeframe_days,
      metrics_analyzed: metric_types,
      total_data_points: metrics.length,
      summary: generateSummary(insights),
    });

  } catch (err: any) {
    console.error('health-insights-ai error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});

function analyzeTrends(metrics: any[], timeframeDays: number): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const metricsByType = groupByMetric(metrics);

  for (const [metricType, data] of Object.entries(metricsByType)) {
    if (data.length < 7) continue; // Need at least a week of data

    const values = data.map((m: any) => m.value);
    const trend = calculateTrend(values);

    if (Math.abs(trend.slope) > 0.1) {
      const direction = trend.slope > 0 ? 'increasing' : 'decreasing';
      const severity = Math.abs(trend.slope) > 0.3 ? 'warning' : 'info';

      insights.push({
        insight_type: 'trend',
        title: `${capitalizeMetric(metricType)} is ${direction}`,
        description: `Over the past ${timeframeDays} days, your ${metricType.replace('_', ' ')} has been ${direction} by ${Math.abs(trend.percentChange).toFixed(1)}%.`,
        severity: severity as any,
        metrics_analyzed: [metricType],
        data_points: data.slice(-14), // Last 2 weeks
        created_at: new Date().toISOString(),
      });
    }
  }

  return insights;
}

function detectAnomalies(metrics: any[]): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const anomalies = metrics.filter(m => m.is_anomaly && m.anomaly_reason);

  if (anomalies.length > 0) {
    const anomaliesByType = groupByMetric(anomalies);

    for (const [metricType, data] of Object.entries(anomaliesByType)) {
      if (data.length > 3) {
        insights.push({
          insight_type: 'anomaly',
          title: `Multiple anomalies detected in ${capitalizeMetric(metricType)}`,
          description: `We detected ${data.length} unusual readings in your ${metricType.replace('_', ' ')} data. This may indicate data quality issues or health changes requiring attention.`,
          severity: 'warning',
          metrics_analyzed: [metricType],
          data_points: data,
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return insights;
}

function analyzeCorrelations(metrics: any[]): HealthInsight[] {
  const insights: HealthInsight[] = [];
  const metricsByType = groupByMetric(metrics);

  // Analyze glucose-activity correlation
  if (metricsByType['glucose'] && metricsByType['steps']) {
    const glucoseData = metricsByType['glucose'];
    const stepsData = metricsByType['steps'];

    const correlation = calculateCorrelation(glucoseData, stepsData);

    if (Math.abs(correlation) > 0.5) {
      insights.push({
        insight_type: 'correlation',
        title: 'Activity affects your glucose levels',
        description: `We found a ${correlation > 0 ? 'positive' : 'negative'} correlation between your activity levels and glucose readings. ${correlation > 0 ? 'Higher activity is associated with higher glucose' : 'Higher activity is associated with lower glucose'}.`,
        severity: 'info',
        metrics_analyzed: ['glucose', 'steps'],
        data_points: [],
        created_at: new Date().toISOString(),
      });
    }
  }

  // Analyze sleep-heart rate correlation
  if (metricsByType['sleep_hours'] && metricsByType['resting_hr']) {
    const sleepData = metricsByType['sleep_hours'];
    const hrData = metricsByType['resting_hr'];

    const correlation = calculateCorrelation(sleepData, hrData);

    if (Math.abs(correlation) > 0.4) {
      insights.push({
        insight_type: 'correlation',
        title: 'Sleep quality impacts your resting heart rate',
        description: `Your sleep duration shows a ${Math.abs(correlation) > 0.6 ? 'strong' : 'moderate'} correlation with resting heart rate. Better sleep is associated with ${correlation > 0 ? 'higher' : 'lower'} resting HR.`,
        severity: 'info',
        metrics_analyzed: ['sleep_hours', 'resting_hr'],
        data_points: [],
        created_at: new Date().toISOString(),
      });
    }
  }

  return insights;
}

function generateRecommendations(metrics: any[], insights: HealthInsight[]): HealthInsight[] {
  const recommendations: HealthInsight[] = [];
  const metricsByType = groupByMetric(metrics);

  // Recommendation based on step count
  if (metricsByType['steps']) {
    const avgSteps = calculateAverage(metricsByType['steps'].map((m: any) => m.value));
    if (avgSteps < 5000) {
      recommendations.push({
        insight_type: 'recommendation',
        title: 'Increase daily activity',
        description: 'Your average daily step count is below the recommended 7,000-10,000 steps. Consider setting incremental goals to increase your activity level.',
        severity: 'info',
        metrics_analyzed: ['steps'],
        data_points: [],
        recommendations: [
          'Start with a goal of 6,000 steps per day',
          'Take short walking breaks every hour',
          'Consider using stairs instead of elevators',
          'Schedule a daily 20-minute walk',
        ],
        created_at: new Date().toISOString(),
      });
    }
  }

  // Recommendation based on sleep
  if (metricsByType['sleep_hours']) {
    const avgSleep = calculateAverage(metricsByType['sleep_hours'].map((m: any) => m.value));
    if (avgSleep < 7) {
      recommendations.push({
        insight_type: 'recommendation',
        title: 'Improve sleep duration',
        description: `Your average sleep of ${avgSleep.toFixed(1)} hours is below the recommended 7-9 hours. Quality sleep is essential for health and recovery.`,
        severity: 'warning',
        metrics_analyzed: ['sleep_hours'],
        data_points: [],
        recommendations: [
          'Establish a consistent bedtime routine',
          'Avoid screens 1 hour before bed',
          'Keep bedroom temperature cool (60-67°F)',
          'Limit caffeine after 2 PM',
        ],
        created_at: new Date().toISOString(),
      });
    }
  }

  return recommendations;
}

function groupByMetric(metrics: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  for (const metric of metrics) {
    if (!grouped[metric.metric]) {
      grouped[metric.metric] = [];
    }
    grouped[metric.metric].push(metric);
  }

  return grouped;
}

function calculateTrend(values: number[]): { slope: number; percentChange: number } {
  if (values.length < 2) return { slope: 0, percentChange: 0 };

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const percentChange = yMean !== 0 ? (slope * n / yMean) * 100 : 0;

  return { slope, percentChange };
}

function calculateCorrelation(data1: any[], data2: any[]): number {
  const timestamps1 = data1.map(d => new Date(d.ts).getTime());
  const timestamps2 = data2.map(d => new Date(d.ts).getTime());

  const paired = [];
  for (const d1 of data1) {
    const ts1 = new Date(d1.ts).getTime();
    const closest = data2.reduce((prev, curr) => {
      const tsCurr = new Date(curr.ts).getTime();
      const tsPrev = new Date(prev.ts).getTime();
      return Math.abs(tsCurr - ts1) < Math.abs(tsPrev - ts1) ? curr : prev;
    });

    if (Math.abs(new Date(closest.ts).getTime() - ts1) < 24 * 60 * 60 * 1000) {
      paired.push({ x: d1.value, y: closest.value });
    }
  }

  if (paired.length < 5) return 0;

  const xMean = paired.reduce((sum, p) => sum + p.x, 0) / paired.length;
  const yMean = paired.reduce((sum, p) => sum + p.y, 0) / paired.length;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (const p of paired) {
    numerator += (p.x - xMean) * (p.y - yMean);
    xDenominator += Math.pow(p.x - xMean, 2);
    yDenominator += Math.pow(p.y - yMean, 2);
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator !== 0 ? numerator / denominator : 0;
}

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function capitalizeMetric(metric: string): string {
  return metric.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function generateSummary(insights: HealthInsight[]): string {
  const criticalCount = insights.filter(i => i.severity === 'critical').length;
  const warningCount = insights.filter(i => i.severity === 'warning').length;

  if (criticalCount > 0) {
    return `Found ${criticalCount} critical issue(s) and ${warningCount} warning(s) requiring immediate attention.`;
  }

  if (warningCount > 0) {
    return `Found ${warningCount} area(s) for improvement in your health data.`;
  }

  return `Your health metrics are looking good! ${insights.length} insights generated.`;
}

async function storeInsightForAI(
  supabase: any,
  userId: string,
  engramId: string,
  insight: HealthInsight
): Promise<void> {
  try {
    await supabase.from('agent_memories').insert({
      user_id: userId,
      engram_id: engramId,
      memory_type: 'health_insight',
      content: JSON.stringify(insight),
      importance_score: insight.severity === 'critical' ? 1.0 : insight.severity === 'warning' ? 0.7 : 0.5,
      created_at: insight.created_at,
    });
  } catch (err) {
    console.error('Failed to store insight for AI:', err);
  }
}
