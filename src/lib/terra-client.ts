import { supabase } from './supabase';
import { getTerraConfig, TerraProvider } from './terra-config';

export interface TerraWidgetResponse {
  status: string;
  session_id: string;
  url: string;
  expires_in: number;
  user_id?: string;
}

export interface TerraConnection {
  id: string;
  user_id: string;
  provider: string;
  status: string;
  last_sync_at?: string;
  last_error?: string;
  created_at: string;
}

export interface TerraMetric {
  id: string;
  user_id: string;
  provider: string;
  metric_type: string;
  metric_name: string;
  timestamp: string;
  value?: number;
  value_text?: string;
  unit?: string;
  quality?: string;
  metadata: Record<string, unknown>;
}

const IS_DEV = import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;
const USE_MOCK = import.meta.env.VITE_MOCK_TERRA_DATA === 'true';

export class TerraClient {
  private supabaseUrl: string;
  private isMockMode: boolean;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    this.isMockMode = IS_DEV && USE_MOCK;
  }

  async generateWidgetSession(
    userId: string,
    providers?: TerraProvider[]
  ): Promise<TerraWidgetResponse> {
    if (this.isMockMode) {
      console.log('🔧 Dev Mode: Using mock Terra widget session');
      return {
        status: 'success',
        session_id: 'mock-session-' + Date.now(),
        url: '#mock-oauth',
        expires_in: 3600,
        mock: true,
      } as TerraWidgetResponse & { mock: boolean };
    }

    const { data, error } = await supabase.functions.invoke('terra-widget', {
      body: {
        reference_id: userId,
        providers,
      },
    });

    if (error) {
      throw new Error(`Failed to generate widget session: ${error.message}`);
    }

    return data;
  }

  async getMockData(userId: string) {
    console.log('🔧 Dev Mode: Loading mock Terra data');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    return {
      connections: [
        {
          id: 'mock-fitbit-1',
          user_id: userId,
          provider: 'FITBIT',
          status: 'connected',
          last_sync_at: new Date(now.getTime() - 120000).toISOString(),
          created_at: oneDayAgo.toISOString(),
        },
        {
          id: 'mock-dexcom-1',
          user_id: userId,
          provider: 'DEXCOM',
          status: 'connected',
          last_sync_at: new Date(now.getTime() - 300000).toISOString(),
          created_at: oneDayAgo.toISOString(),
        },
      ],
      summary: {
        date: now.toISOString().split('T')[0],
        metrics: {
          hr_avg_hr: {
            latest: 72,
            average: 71.5,
            max: 165,
            min: 58,
            unit: 'bpm',
            count: 24,
          },
          steps_steps: {
            latest: 7842,
            average: 7842,
            max: 7842,
            min: 7842,
            unit: 'steps',
            count: 1,
          },
          sleep_sleep_duration: {
            latest: 432,
            average: 432,
            max: 432,
            min: 432,
            unit: 'minutes',
            count: 1,
          },
          glucose_glucose: {
            latest: 98,
            average: 102.3,
            max: 145,
            min: 85,
            unit: 'mg/dL',
            count: 288,
          },
        },
      },
      metrics: [
        {
          id: 'mock-hr-1',
          user_id: userId,
          provider: 'FITBIT',
          metric_type: 'hr',
          metric_name: 'avg_hr',
          timestamp: oneHourAgo.toISOString(),
          value: 72,
          unit: 'bpm',
          quality: 'good',
          metadata: {},
        },
        {
          id: 'mock-steps-1',
          user_id: userId,
          provider: 'FITBIT',
          metric_type: 'steps',
          metric_name: 'steps',
          timestamp: oneHourAgo.toISOString(),
          value: 7842,
          unit: 'steps',
          quality: 'good',
          metadata: {},
        },
        {
          id: 'mock-glucose-1',
          user_id: userId,
          provider: 'DEXCOM',
          metric_type: 'glucose',
          metric_name: 'glucose',
          timestamp: now.toISOString(),
          value: 98,
          unit: 'mg/dL',
          quality: 'good',
          metadata: {},
        },
      ],
    };
  }

  async getConnections(userId: string): Promise<TerraConnection[]> {
    if (this.isMockMode) {
      const mockData = await this.getMockData(userId);
      return mockData.connections;
    }

    const { data, error } = await supabase
      .from('terra_connections')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    return data || [];
  }

  async getMetrics(
    userId: string,
    metricType?: string,
    startDate?: Date,
    endDate?: Date,
    limit = 100
  ): Promise<TerraMetric[]> {
    let query = supabase
      .from('terra_metrics_normalized')
      .select('*')
      .eq('user_id', userId);

    if (metricType) {
      query = query.eq('metric_type', metricType);
    }

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }

    return data || [];
  }

  async getDailySummary(userId: string, date?: Date): Promise<Record<string, unknown>> {
    if (this.isMockMode) {
      const mockData = await this.getMockData(userId);
      return mockData.summary;
    }

    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const metrics = await this.getMetrics(
      userId,
      undefined,
      startOfDay,
      endOfDay,
      1000
    );

    const summary: Record<string, unknown> = {
      date: targetDate.toISOString().split('T')[0],
      metrics: {},
    };

    const metricGroups: Record<string, TerraMetric[]> = {};

    for (const metric of metrics) {
      const key = `${metric.metric_type}_${metric.metric_name}`;
      if (!metricGroups[key]) {
        metricGroups[key] = [];
      }
      metricGroups[key].push(metric);
    }

    for (const [key, values] of Object.entries(metricGroups)) {
      const numericValues = values
        .filter(m => m.value !== null && m.value !== undefined)
        .map(m => m.value!);

      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0);
        const avg = sum / numericValues.length;
        const max = Math.max(...numericValues);
        const min = Math.min(...numericValues);

        summary.metrics[key] = {
          count: values.length,
          latest: values[0].value,
          average: avg,
          max,
          min,
          unit: values[0].unit,
        };
      }
    }

    return summary;
  }

  async triggerBackfill(
    userId: string,
    provider: string,
    days = 7
  ): Promise<unknown> {
    const { data, error } = await supabase.functions.invoke('terra-backfill', {
      body: {
        user_id: userId,
        provider,
        days,
      },
    });

    if (error) {
      throw new Error(`Failed to trigger backfill: ${error.message}`);
    }

    return data;
  }

  async deleteUserData(userId: string, provider?: string): Promise<void> {
    if (provider) {
      await supabase
        .from('terra_metrics_normalized')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      await supabase
        .from('terra_metrics_raw')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      await supabase
        .from('terra_connections')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);

      await supabase
        .from('terra_users')
        .delete()
        .eq('user_id', userId)
        .eq('provider', provider);
    } else {
      await supabase
        .from('terra_metrics_normalized')
        .delete()
        .eq('user_id', userId);

      await supabase
        .from('terra_metrics_raw')
        .delete()
        .eq('user_id', userId);

      await supabase
        .from('terra_connections')
        .delete()
        .eq('user_id', userId);

      await supabase
        .from('terra_users')
        .delete()
        .eq('user_id', userId);
    }

    await supabase.from('terra_audit_log').insert({
      user_id: userId,
      action: 'delete',
      provider: provider || null,
      details: { timestamp: new Date().toISOString() } as unknown as Record<string, unknown>,
    });
  }

  async exportUserData(
    userId: string,
    provider?: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    let query = supabase
      .from('terra_metrics_normalized')
      .select('*')
      .eq('user_id', userId);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query.order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to export data: ${error.message}`);
    }

    await supabase.from('terra_audit_log').insert({
      user_id: userId,
      action: 'export',
      provider: provider || null,
      details: {
        timestamp: new Date().toISOString(),
        format,
        records: data?.length || 0,
      } as unknown as Record<string, unknown>,
    });

    if (format === 'csv') {
      if (!data || data.length === 0) return '';

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row =>
        Object.values(row)
          .map(val => (typeof val === 'string' ? `"${val}"` : val))
          .join(',')
      );

      return [headers, ...rows].join('\n');
    }

    return JSON.stringify(data, null, 2);
  }
}

export const terraClient = new TerraClient();
