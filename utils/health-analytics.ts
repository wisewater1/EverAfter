import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TimeSeriesData {
  timestamp: string;
  value: number;
}

interface AnalyticsReport {
  userId: string;
  provider: string;
  metricType: string;
  period: string;
  statistics: {
    count: number;
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    percentile25: number;
    percentile75: number;
  };
  trends: {
    direction: 'up' | 'down' | 'stable';
    changePercent: number;
    slope: number;
  };
  insights: string[];
  generatedAt: string;
}

interface CorrelationResult {
  metric1: string;
  metric2: string;
  correlation: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  dataPoints: number;
}

class HealthAnalytics {
  async generateReport(
    userId: string,
    provider: string,
    metricType: string,
    days: number = 30
  ): Promise<AnalyticsReport> {
    console.log(`📊 Generating analytics report for ${provider}/${metricType}`);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('health_metrics')
      .select('timestamp, value')
      .eq('user_id', userId)
      .eq('provider', provider)
      .eq('metric_type', metricType)
      .gte('timestamp', startDate)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data found for the specified criteria');
    }

    const values = data.map(d => d.value);
    const statistics = this.calculateStatistics(values);
    const trends = this.analyzeTrends(data);
    const insights = this.generateInsights(statistics, trends, metricType);

    return {
      userId,
      provider,
      metricType,
      period: `${days} days`,
      statistics,
      trends,
      insights,
      generatedAt: new Date().toISOString(),
    };
  }

  private calculateStatistics(values: number[]): AnalyticsReport['statistics'] {
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      count: n,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      min: sorted[0],
      max: sorted[n - 1],
      percentile25: sorted[Math.floor(n * 0.25)],
      percentile75: sorted[Math.floor(n * 0.75)],
    };
  }

  private analyzeTrends(data: TimeSeriesData[]): AnalyticsReport['trends'] {
    if (data.length < 2) {
      return { direction: 'stable', changePercent: 0, slope: 0 };
    }

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (changePercent > 5) direction = 'up';
    else if (changePercent < -5) direction = 'down';

    return {
      direction,
      changePercent: Math.round(changePercent * 100) / 100,
      slope: Math.round(slope * 1000) / 1000,
    };
  }

  private generateInsights(
    stats: AnalyticsReport['statistics'],
    trends: AnalyticsReport['trends'],
    metricType: string
  ): string[] {
    const insights: string[] = [];

    if (stats.stdDev > stats.mean * 0.3) {
      insights.push(`High variability detected in ${metricType} (±${Math.round(stats.stdDev)})`);
    }

    if (trends.direction === 'up') {
      insights.push(`${metricType} trending upward by ${trends.changePercent.toFixed(1)}%`);
    } else if (trends.direction === 'down') {
      insights.push(`${metricType} trending downward by ${Math.abs(trends.changePercent).toFixed(1)}%`);
    }

    if (metricType === 'glucose') {
      const target = { low: 70, high: 180 };
      const inRange = ((stats.median >= target.low && stats.median <= target.high) ? 'within' : 'outside');
      insights.push(`Median glucose is ${inRange} target range (${target.low}-${target.high} mg/dL)`);

      if (stats.min < target.low) {
        insights.push(`⚠️ Low glucose events detected (min: ${stats.min} mg/dL)`);
      }
      if (stats.max > 250) {
        insights.push(`⚠️ High glucose events detected (max: ${stats.max} mg/dL)`);
      }
    }

    if (metricType === 'heart_rate') {
      if (stats.mean < 60) {
        insights.push('Low average heart rate detected - may indicate good fitness');
      } else if (stats.mean > 100) {
        insights.push('⚠️ Elevated average heart rate - consider consulting healthcare provider');
      }
    }

    if (stats.count < 50) {
      insights.push(`Limited data points (${stats.count}) - more data needed for reliable analysis`);
    }

    return insights;
  }

  async findCorrelations(
    userId: string,
    metric1: string,
    metric2: string,
    days: number = 30
  ): Promise<CorrelationResult> {
    console.log(`🔗 Analyzing correlation between ${metric1} and ${metric2}`);

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [data1, data2] = await Promise.all([
      supabase
        .from('health_metrics')
        .select('timestamp, value')
        .eq('user_id', userId)
        .eq('metric_type', metric1)
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: true }),
      supabase
        .from('health_metrics')
        .select('timestamp, value')
        .eq('user_id', userId)
        .eq('metric_type', metric2)
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: true }),
    ]);

    if (data1.error || data2.error) {
      throw new Error('Failed to fetch correlation data');
    }

    const alignedData = this.alignTimeSeriesData(data1.data || [], data2.data || []);
    const correlation = this.calculateCorrelation(
      alignedData.map(d => d.value1),
      alignedData.map(d => d.value2)
    );

    let significance: CorrelationResult['significance'];
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.7) significance = 'strong';
    else if (absCorr > 0.4) significance = 'moderate';
    else if (absCorr > 0.2) significance = 'weak';
    else significance = 'none';

    return {
      metric1,
      metric2,
      correlation: Math.round(correlation * 1000) / 1000,
      significance,
      dataPoints: alignedData.length,
    };
  }

  private alignTimeSeriesData(
    data1: TimeSeriesData[],
    data2: TimeSeriesData[]
  ): Array<{ timestamp: string; value1: number; value2: number }> {
    const map1 = new Map(data1.map(d => [d.timestamp.split('T')[0], d.value]));
    const map2 = new Map(data2.map(d => [d.timestamp.split('T')[0], d.value]));

    const aligned: Array<{ timestamp: string; value1: number; value2: number }> = [];

    for (const [date, value1] of map1.entries()) {
      const value2 = map2.get(date);
      if (value2 !== undefined) {
        aligned.push({ timestamp: date, value1, value2 });
      }
    }

    return aligned;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const meanX = x.reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    if (denomX === 0 || denomY === 0) return 0;
    return numerator / Math.sqrt(denomX * denomY);
  }

  async exportReport(report: AnalyticsReport, format: 'json' | 'txt', outputPath: string): Promise<void> {
    let content: string;

    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
    } else {
      content = this.formatReportAsText(report);
    }

    fs.writeFileSync(outputPath, content);
    console.log(`✓ Report exported to ${outputPath}`);
  }

  private formatReportAsText(report: AnalyticsReport): string {
    const lines = [
      '═══════════════════════════════════════════════════════════',
      '                  HEALTH ANALYTICS REPORT',
      '═══════════════════════════════════════════════════════════',
      '',
      `User ID: ${report.userId}`,
      `Provider: ${report.provider}`,
      `Metric: ${report.metricType}`,
      `Period: ${report.period}`,
      `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
      '',
      '───────────────────────────────────────────────────────────',
      '  STATISTICS',
      '───────────────────────────────────────────────────────────',
      `  Data Points: ${report.statistics.count}`,
      `  Mean:        ${report.statistics.mean}`,
      `  Median:      ${report.statistics.median}`,
      `  Std Dev:     ${report.statistics.stdDev}`,
      `  Min:         ${report.statistics.min}`,
      `  Max:         ${report.statistics.max}`,
      `  25th %ile:   ${report.statistics.percentile25}`,
      `  75th %ile:   ${report.statistics.percentile75}`,
      '',
      '───────────────────────────────────────────────────────────',
      '  TRENDS',
      '───────────────────────────────────────────────────────────',
      `  Direction:   ${report.trends.direction.toUpperCase()}`,
      `  Change:      ${report.trends.changePercent > 0 ? '+' : ''}${report.trends.changePercent}%`,
      `  Slope:       ${report.trends.slope}`,
      '',
      '───────────────────────────────────────────────────────────',
      '  INSIGHTS',
      '───────────────────────────────────────────────────────────',
      ...report.insights.map(insight => `  • ${insight}`),
      '',
      '═══════════════════════════════════════════════════════════',
    ];

    return lines.join('\n');
  }

  async compareProviders(userId: string, metricType: string, days: number = 30): Promise<void> {
    console.log(`📊 Comparing providers for ${metricType}`);

    const providers = ['dexcom', 'terra', 'fitbit', 'oura'];
    const reports: AnalyticsReport[] = [];

    for (const provider of providers) {
      try {
        const report = await this.generateReport(userId, provider, metricType, days);
        reports.push(report);
      } catch (error) {
        console.log(`⚠️ No data for ${provider}`);
      }
    }

    if (reports.length === 0) {
      console.log('No data found from any provider');
      return;
    }

    console.log('\n📊 Provider Comparison\n');
    console.log('┌──────────┬───────┬─────────┬─────────┬─────────┬──────────┐');
    console.log('│ Provider │ Count │ Mean    │ Min     │ Max     │ Trend    │');
    console.log('├──────────┼───────┼─────────┼─────────┼─────────┼──────────┤');

    reports.forEach(report => {
      const provider = report.provider.padEnd(8);
      const count = report.statistics.count.toString().padEnd(5);
      const mean = report.statistics.mean.toFixed(1).padEnd(7);
      const min = report.statistics.min.toFixed(1).padEnd(7);
      const max = report.statistics.max.toFixed(1).padEnd(7);
      const trend = `${report.trends.direction} ${report.trends.changePercent.toFixed(1)}%`.padEnd(8);
      console.log(`│ ${provider} │ ${count} │ ${mean} │ ${min} │ ${max} │ ${trend} │`);
    });

    console.log('└──────────┴───────┴─────────┴─────────┴─────────┴──────────┘\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
USAGE:
  health-analytics report <user-id> <provider> <metric> [days] [output]
  health-analytics correlate <user-id> <metric1> <metric2> [days]
  health-analytics compare <user-id> <metric> [days]

EXAMPLES:
  health-analytics report user123 dexcom glucose 30 report.json
  health-analytics correlate user123 glucose steps 30
  health-analytics compare user123 heart_rate 30
    `);
    return;
  }

  const analytics = new HealthAnalytics();

  switch (command) {
    case 'report': {
      const [, userId, provider, metric, days, output] = args;
      const report = await analytics.generateReport(
        userId,
        provider,
        metric,
        parseInt(days) || 30
      );

      if (output) {
        const format = output.endsWith('.json') ? 'json' : 'txt';
        await analytics.exportReport(report, format, output);
      } else {
        console.log(JSON.stringify(report, null, 2));
      }
      break;
    }
    case 'correlate': {
      const [, userId, metric1, metric2, days] = args;
      const result = await analytics.findCorrelations(
        userId,
        metric1,
        metric2,
        parseInt(days) || 30
      );

      console.log(`\n📊 Correlation Analysis\n`);
      console.log(`  Metric 1: ${result.metric1}`);
      console.log(`  Metric 2: ${result.metric2}`);
      console.log(`  Correlation: ${result.correlation}`);
      console.log(`  Significance: ${result.significance}`);
      console.log(`  Data Points: ${result.dataPoints}\n`);
      break;
    }
    case 'compare': {
      const [, userId, metric, days] = args;
      await analytics.compareProviders(userId, metric, parseInt(days) || 30);
      break;
    }
    default:
      console.error(`Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { HealthAnalytics };
