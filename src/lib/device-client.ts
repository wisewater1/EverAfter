import { supabase } from './supabase';

export interface Connection {
  id: string;
  provider: string;
  device_model?: string;
  status: 'connected' | 'degraded' | 'disconnected' | 'revoked';
  battery_pct?: number;
  signal_strength?: number;
  last_sync_at?: string;
  last_webhook_at?: string;
  firmware?: string;
  permissions?: any;
  created_at: string;
}

export interface DeviceHealth {
  provider: string;
  uptime_ratio_7d: number;
  avg_latency_ms_24h: number;
  data_freshness_s: number;
  completeness_pct_24h: number;
  gaps?: any[];
  last_eval_at: string;
}

export interface Alert {
  id: string;
  provider: string;
  severity: 'critical' | 'warn' | 'info';
  code: string;
  message: string;
  created_at: string;
  resolved_at?: string;
}

export interface WebhookLog {
  id: string;
  provider: string;
  received_at: string;
  event_type: string;
  http_status: number;
  parse_ms: number;
  error?: string;
}

export interface MetricData {
  id: string;
  metric_type: string;
  ts: string;
  value: number;
  unit: string;
  quality: number;
}

export const deviceClient = {
  async getConnections(): Promise<Connection[]> {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getDeviceHealth(): Promise<DeviceHealth[]> {
    const { data, error } = await supabase
      .from('device_health')
      .select('*');

    if (error) throw error;
    return data || [];
  },

  async getAlerts(includeResolved = false): Promise<Alert[]> {
    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeResolved) {
      query = query.is('resolved_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getWebhookLogs(provider?: string, limit = 10): Promise<WebhookLog[]> {
    let query = supabase
      .from('webhook_logs')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (provider) {
      query = query.eq('provider', provider);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getMetrics(provider: string, metricType: string, startDate: Date, endDate: Date): Promise<MetricData[]> {
    const { data, error } = await supabase
      .from('metrics_norm')
      .select('*')
      .eq('provider', provider)
      .eq('metric_type', metricType)
      .gte('ts', startDate.toISOString())
      .lte('ts', endDate.toISOString())
      .order('ts', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async revokeConnection(connectionId: string): Promise<void> {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'revoked' })
      .eq('id', connectionId);

    if (error) throw error;
  },

  async resolveAlert(alertId: string, note?: string): Promise<void> {
    const { error } = await supabase
      .from('alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolver_note: note,
      })
      .eq('id', alertId);

    if (error) throw error;
  },

  async triggerBackfill(provider: string, days: number): Promise<{ job_id: string }> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/device-backfill`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        provider,
        days,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger backfill');
    }

    return await response.json();
  },

  async exportData(format: 'csv' | 'json', startDate: Date, endDate: Date, providers?: string[]): Promise<Blob> {
    let query = supabase
      .from('metrics_norm')
      .select('*')
      .gte('ts', startDate.toISOString())
      .lte('ts', endDate.toISOString())
      .order('ts', { ascending: true });

    if (providers && providers.length > 0) {
      query = query.in('provider', providers);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (format === 'csv') {
      const headers = ['timestamp', 'provider', 'metric_type', 'value', 'unit', 'quality'];
      const rows = data.map(m => [m.ts, m.provider, m.metric_type, m.value, m.unit, m.quality]);
      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      return new Blob([csv], { type: 'text/csv' });
    } else {
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    }
  },

  async deleteAllData(provider: string): Promise<void> {
    const { error } = await supabase
      .from('metrics_norm')
      .delete()
      .eq('provider', provider);

    if (error) throw error;
  },

  subscribeToUpdates(userId: string, callbacks: {
    onConnection?: (data: any) => void;
    onAlert?: (data: any) => void;
    onWebhook?: (data: any) => void;
  }) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const eventSource = new EventSource(`${supabaseUrl}/functions/v1/device-stream?user_id=${userId}`);

    eventSource.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'connection_update':
          callbacks.onConnection?.(data);
          break;
        case 'new_alert':
          callbacks.onAlert?.(data);
          break;
        case 'webhook_received':
          callbacks.onWebhook?.(data);
          break;
      }
    });

    return () => eventSource.close();
  },
};
