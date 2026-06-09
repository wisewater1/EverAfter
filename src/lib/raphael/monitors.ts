import { supabase } from '../supabase';

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: string;
  metric?: string;
  value?: number;
}

export interface VitalsSummary {
  heartRate?: { value: number; status: 'normal' | 'elevated' | 'low' };
  bloodPressure?: { systolic: number; diastolic: number; status: 'normal' | 'high' | 'low' };
  glucose?: { value: number; status: 'normal' | 'high' | 'low'; unit: string };
  steps?: { value: number; goal: number };
  sleep?: { hours: number; quality: 'good' | 'fair' | 'poor' };
  lastUpdated: string;
}

export interface TrendPoint {
  date: string;
  metric: string;
  value: number;
  change: number;
  direction: 'up' | 'down' | 'stable';
}

export interface ReportStub {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  summary: string;
}

export interface TaskStub {
  id: string;
  title: string;
  dueAt: string | null;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  category: string;
}

export interface TodayOverview {
  alerts: Alert[];
  vitalsSummary: VitalsSummary | null;
  trends: TrendPoint[];
  recentReports: ReportStub[];
  tasks: TaskStub[];
}

export async function getTodayOverview(userId: string): Promise<TodayOverview> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [alertsData, vitalsData, trendsData, reportsData, tasksData] = await Promise.all([
      fetchTodayAlerts(userId, today),
      fetchVitalsSummary(userId),
      fetchTrends(userId),
      fetchRecentReports(userId),
      fetchTodayTasks(userId),
    ]);

    return {
      alerts: alertsData,
      vitalsSummary: vitalsData,
      trends: trendsData,
      recentReports: reportsData,
      tasks: tasksData,
    };
  } catch (error) {
    console.error('Error fetching today overview:', error);
    return {
      alerts: [],
      vitalsSummary: null,
      trends: [],
      recentReports: [],
      tasks: [],
    };
  }
}

async function fetchTodayAlerts(userId: string, today: Date): Promise<Alert[]> {
  try {
    const { data: deviceAlerts } = await supabase
      .from('device_alerts')
      .select('id, alert_type, severity, metric_type, value_at_trigger, triggered_at')
      .eq('user_id', userId)
      .gte('triggered_at', today.toISOString())
      .is('acknowledged_at', null)
      .order('triggered_at', { ascending: false })
      .limit(5);

    if (!deviceAlerts) return [];

    return deviceAlerts.map(alert => ({
      id: alert.id,
      type: alert.severity === 'critical' ? 'critical' : alert.severity === 'high' ? 'warning' : 'info',
      message: `${alert.alert_type}: ${alert.metric_type}`,
      timestamp: alert.triggered_at,
      metric: alert.metric_type,
      value: alert.value_at_trigger,
    }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

async function fetchVitalsSummary(userId: string): Promise<VitalsSummary | null> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('metric_type, value, unit, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', yesterday.toISOString())
      .order('recorded_at', { ascending: false });

    if (!metrics || metrics.length === 0) return null;

    const latest: Record<string, any> = {};
    metrics.forEach(m => {
      if (!latest[m.metric_type]) {
        latest[m.metric_type] = m;
      }
    });

    const summary: VitalsSummary = {
      lastUpdated: new Date().toISOString(),
    };

    if (latest.heart_rate) {
      const hr = latest.heart_rate.value;
      summary.heartRate = {
        value: hr,
        status: hr > 100 ? 'elevated' : hr < 60 ? 'low' : 'normal',
      };
    }

    if (latest.glucose) {
      const gluc = latest.glucose.value;
      summary.glucose = {
        value: gluc,
        unit: latest.glucose.unit || 'mg/dL',
        status: gluc > 140 ? 'high' : gluc < 70 ? 'low' : 'normal',
      };
    }

    if (latest.steps) {
      summary.steps = {
        value: latest.steps.value,
        goal: 10000,
      };
    }

    if (latest.sleep_duration) {
      const hours = latest.sleep_duration.value;
      summary.sleep = {
        hours,
        quality: hours >= 7 ? 'good' : hours >= 5 ? 'fair' : 'poor',
      };
    }

    return summary;
  } catch (error) {
    console.error('Error fetching vitals:', error);
    return null;
  }
}

async function fetchTrends(userId: string): Promise<TrendPoint[]> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: metrics } = await supabase
      .from('health_metrics')
      .select('metric_type, value, recorded_at')
      .eq('user_id', userId)
      .gte('recorded_at', sevenDaysAgo.toISOString())
      .in('metric_type', ['heart_rate', 'steps', 'glucose', 'sleep_duration'])
      .order('recorded_at', { ascending: true });

    if (!metrics || metrics.length === 0) return [];

    const grouped: Record<string, number[]> = {};
    metrics.forEach(m => {
      if (!grouped[m.metric_type]) grouped[m.metric_type] = [];
      grouped[m.metric_type].push(m.value);
    });

    const trends: TrendPoint[] = [];
    Object.entries(grouped).forEach(([metric, values]) => {
      if (values.length < 2) return;

      const latest = values[values.length - 1];
      const previous = values[values.length - 2];
      const change = ((latest - previous) / previous) * 100;

      trends.push({
        date: new Date().toISOString(),
        metric,
        value: latest,
        change: Math.round(change * 10) / 10,
        direction: change > 1 ? 'up' : change < -1 ? 'down' : 'stable',
      });
    });

    return trends;
  } catch (error) {
    console.error('Error fetching trends:', error);
    return [];
  }
}

async function fetchRecentReports(userId: string): Promise<ReportStub[]> {
  try {
    const { data: reports } = await supabase
      .from('insight_reports')
      .select('id, report_title, report_type, generated_at, key_findings')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(3);

    if (!reports) return [];

    return reports.map(r => ({
      id: r.id,
      title: r.report_title,
      type: r.report_type,
      createdAt: r.generated_at,
      summary: r.key_findings?.[0] || 'No summary available',
    }));
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

async function fetchTodayTasks(userId: string): Promise<TaskStub[]> {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const { data: tasks } = await supabase
      .from('agent_tasks')
      .select('id, task_title, due_date, priority, status, task_type')
      .eq('user_id', userId)
      .lte('due_date', today.toISOString())
      .in('status', ['pending', 'in_progress'])
      .order('priority', { ascending: false })
      .order('due_date', { ascending: true })
      .limit(5);

    if (!tasks) return [];

    return tasks.map(t => ({
      id: t.id,
      title: t.task_title,
      dueAt: t.due_date,
      priority: t.priority as 'high' | 'medium' | 'low',
      completed: t.status === 'completed',
      category: t.task_type,
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}
