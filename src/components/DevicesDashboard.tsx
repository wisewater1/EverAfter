import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConnections } from '../contexts/ConnectionsContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  Activity, AlertCircle, AlertTriangle, Battery, CheckCircle, ChevronRight,
  Clock, Download, ExternalLink, Link, Plus, RefreshCw, Settings, Trash2,
  TrendingUp, Wifi, WifiOff, X, Zap
} from 'lucide-react';

interface Connection {
  id: string;
  provider: string;
  device_model?: string;
  status: 'connected' | 'degraded' | 'disconnected' | 'revoked';
  battery_pct?: number;
  signal_strength?: number;
  last_sync_at?: string;
  last_webhook_at?: string;
  firmware?: string;
  permissions?: Record<string, unknown> | null;
  created_at: string;
}

interface DeviceHealth {
  provider: string;
  uptime_ratio_7d: number;
  avg_latency_ms_24h: number;
  data_freshness_s: number;
  completeness_pct_24h: number;
  gaps?: unknown[];
  last_eval_at: string;
}

interface Alert {
  id: string;
  provider: string;
  severity: 'critical' | 'warn' | 'info';
  code: string;
  message: string;
  created_at: string;
  resolved_at?: string;
}

interface WebhookLog {
  id: string;
  provider: string;
  received_at: string;
  event_type: string;
  http_status: number;
  parse_ms: number;
  error?: string;
}

/** Rows from health_metrics; column names vary across schema revisions, so both variants are tolerated. */
interface HealthMetricRow {
  metric_type?: string | null;
  metric_value?: number | string | null;
  value?: number | string | null;
  metric_unit?: string | null;
  unit?: string | null;
  recorded_at?: string | null;
}

interface MetricSummary {
  type: string;
  count: number;
  latestValue: string;
  latestAt: string | null;
}

const MONITORING_ACTIVE_WINDOW_MS = 15 * 60 * 1000;

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return 'unknown';
  if (diffMs < 60000) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) return '—';
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

export default function DevicesDashboard() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Connection | null>(null);
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [connectionsRes, healthRes, alertsRes, webhooksRes] = await Promise.all([
        supabase.from('connections').select('*').order('created_at', { ascending: false }),
        supabase.from('device_health').select('*'),
        supabase.from('alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false }),
        supabase.from('webhook_logs').select('*').order('received_at', { ascending: false }).limit(10)
      ]);

      if (connectionsRes.data) setConnections(connectionsRes.data);
      if (healthRes.data) setDeviceHealth(healthRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (webhooksRes.data) setWebhookLogs(webhooksRes.data);
    } catch (error) {
      console.error('Error fetching device data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const dismissAlert = async (target: Alert) => {
    // Optimistic removal; restored (in created_at order) if the update fails.
    setAlerts(prev => prev.filter(a => a.id !== target.id));
    const { error } = await supabase
      .from('alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', target.id);
    if (error) {
      setAlerts(prev =>
        [...prev, target].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      showNotification('Could not dismiss the alert. Please try again.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] bg-[#0a0a0f]">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Device Monitor</h1>
            <p className="text-slate-400">Real-time health source management</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConnectWizard(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Connect
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ConnectedDevicesCard connections={connections} onDeviceClick={setSelectedDevice} />
          <DataQualityCard deviceHealth={deviceHealth} />
          <RealTimeMonitoringCard connections={connections} webhookLogs={webhookLogs} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SyncWebhookHealthCard webhookLogs={webhookLogs} refreshing={refreshing} onRefresh={handleRefresh} />
          <AlertsCard alerts={alerts} onDismiss={dismissAlert} />
        </div>

        <ActionsCard
          onConnect={() => setShowConnectWizard(true)}
          onExport={() => setShowExport(true)}
          onDelete={() => setShowDeleteDialog(true)}
          hasDevices={connections.length > 0}
        />

        {selectedDevice && (
          <DeviceDetailDrawer
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
          />
        )}

        {showConnectWizard && (
          <ConnectDeviceWizard onClose={() => setShowConnectWizard(false)} />
        )}

        {showExport && (
          <ExportDataModal
            onClose={() => setShowExport(false)}
            connections={connections}
            deviceHealth={deviceHealth}
            alerts={alerts}
            webhookLogs={webhookLogs}
          />
        )}

        {showDeleteDialog && (
          <DeleteDataDialog
            providers={[...new Set(connections.map(c => c.provider))]}
            onClose={() => setShowDeleteDialog(false)}
            onDeleted={async () => {
              setShowDeleteDialog(false);
              await fetchData();
            }}
          />
        )}
      </div>
    </div>
  );
}

function ConnectedDevicesCard({ connections, onDeviceClick }: { connections: Connection[]; onDeviceClick: (device: Connection) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'from-emerald-500/20 to-green-500/20 border-emerald-500/50';
      case 'degraded': return 'from-amber-500/20 to-orange-500/20 border-amber-500/50';
      case 'disconnected': return 'from-rose-500/20 to-red-500/20 border-rose-500/50';
      default: return 'from-slate-500/20 to-gray-500/20 border-slate-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="w-4 h-4 text-emerald-400" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'disconnected': return <WifiOff className="w-4 h-4 text-rose-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
          <Link className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Connected Devices</h3>
          <p className="text-slate-400 text-sm">{connections.length} total</p>
        </div>
      </div>

      <div className="space-y-2">
        {connections.length === 0 ? (
          <div className="text-center py-8">
            <WifiOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No devices connected</p>
          </div>
        ) : (
          connections.slice(0, 5).map((device) => (
            <button
              key={device.id}
              onClick={() => onDeviceClick(device)}
              className={`w-full p-3 rounded-xl bg-gradient-to-br ${getStatusColor(device.status)} border transition-all hover:scale-[1.01] text-left`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(device.status)}
                  <div>
                    <p className="text-white font-medium text-sm">{device.provider}</p>
                    {device.device_model && (
                      <p className="text-slate-400 text-xs">{device.device_model}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {device.battery_pct !== undefined && (
                    <div className="flex items-center gap-1">
                      <Battery className={`w-3 h-3 ${device.battery_pct < 20 ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <span className="text-xs text-slate-400">{device.battery_pct}%</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function DataQualityCard({ deviceHealth }: { deviceHealth: DeviceHealth[] }) {
  const avgFreshness = deviceHealth.reduce((acc, h) => acc + h.data_freshness_s, 0) / (deviceHealth.length || 1);
  const avgCompleteness = deviceHealth.reduce((acc, h) => acc + h.completeness_pct_24h, 0) / (deviceHealth.length || 1);
  const avgLatency = deviceHealth.reduce((acc, h) => acc + h.avg_latency_ms_24h, 0) / (deviceHealth.length || 1);

  const getQualityColor = (value: number, reverse = false) => {
    if (reverse) {
      if (value < 1800) return 'text-emerald-400';
      if (value < 7200) return 'text-amber-400';
      return 'text-rose-400';
    }
    if (value >= 90) return 'text-emerald-400';
    if (value >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Data Quality</h3>
          <p className="text-slate-400 text-sm">Last 24h</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Freshness</span>
            <span className={`text-sm font-medium ${getQualityColor(avgFreshness, true)}`}>
              {Math.floor(avgFreshness / 60)}m ago
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
              style={{ width: `${Math.max(0, 100 - (avgFreshness / 72))}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Completeness</span>
            <span className={`text-sm font-medium ${getQualityColor(avgCompleteness)}`}>
              {avgCompleteness.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${avgCompleteness}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm">Avg Latency</span>
            <span className="text-sm font-medium text-slate-300">
              {avgLatency.toFixed(0)}ms
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (1000 - avgLatency) / 10)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RealTimeMonitoringCard({ connections, webhookLogs }: { connections: Connection[]; webhookLogs: WebhookLog[] }) {
  const newestEventIso = webhookLogs.reduce<string | null>(
    (newest, log) =>
      !newest || new Date(log.received_at).getTime() > new Date(newest).getTime()
        ? log.received_at
        : newest,
    null
  );
  const monitoringActive =
    newestEventIso !== null &&
    Date.now() - new Date(newestEventIso).getTime() <= MONITORING_ACTIVE_WINDOW_MS;

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Real-Time</h3>
          <p className="text-slate-400 text-sm">Live updates</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">Connected</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {connections.filter(c => c.status === 'connected').length}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-medium">Degraded</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {connections.filter(c => c.status === 'degraded').length}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-white/5">
        {monitoringActive ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
            <span>Monitoring active</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-slate-500" />
            <span>
              Monitoring idle
              {newestEventIso ? ` — last event ${formatRelativeTime(newestEventIso)}` : ' — no events yet'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function WebhookLogRow({ log }: { log: WebhookLog }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {log.error ? (
          <AlertCircle className="w-4 h-4 text-rose-400" />
        ) : (
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        )}
        <div>
          <p className="text-white text-sm">{log.provider}</p>
          <p className="text-slate-500 text-xs">{log.event_type}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-slate-400 text-xs">
          {Number.isFinite(log.parse_ms) ? `${log.parse_ms.toFixed(0)}ms` : '—'}
        </p>
        <p className="text-slate-500 text-xs">{new Date(log.received_at).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

function SyncWebhookHealthCard({ webhookLogs, refreshing, onRefresh }: { webhookLogs: WebhookLog[]; refreshing: boolean; onRefresh: () => Promise<void> }) {
  const { showNotification } = useNotification();
  const [expanded, setExpanded] = useState(false);
  const [allLogs, setAllLogs] = useState<WebhookLog[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const fetchAllLogs = async (): Promise<boolean> => {
    setLoadingAll(true);
    try {
      const { data, error } = await supabase
        .from('webhook_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setAllLogs((data ?? []) as WebhookLog[]);
      return true;
    } catch {
      showNotification('Could not load webhook logs. Please try again.', 'error');
      return false;
    } finally {
      setLoadingAll(false);
    }
  };

  const handleToggleLogs = async () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (await fetchAllLogs()) {
      setExpanded(true);
    }
  };

  const handleWebhookRefresh = async () => {
    await Promise.all([onRefresh(), expanded ? fetchAllLogs() : Promise.resolve(true)]);
  };

  const visibleLogs = expanded ? allLogs : webhookLogs.slice(0, 5);

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Sync & Webhook Health</h3>
          <p className="text-slate-400 text-sm">
            {expanded ? `Last ${allLogs.length} events` : 'Recent events'}
          </p>
        </div>
      </div>

      <div className={`space-y-2 mb-4 ${expanded ? 'max-h-96 overflow-y-auto pr-1' : ''}`}>
        {visibleLogs.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No webhook events yet</p>
        ) : (
          visibleLogs.map((log) => <WebhookLogRow key={log.id} log={log} />)
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleLogs}
          disabled={loadingAll}
          className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingAll ? 'Loading...' : expanded ? 'Show Recent' : 'View All Logs'}
        </button>
        <button
          onClick={handleWebhookRefresh}
          disabled={refreshing || loadingAll}
          aria-label="Refresh webhook activity"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function AlertsCard({ alerts, onDismiss }: { alerts: Alert[]; onDismiss: (alert: Alert) => void }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'from-rose-500/20 to-red-500/20 border-rose-500/50 text-rose-400';
      case 'warn': return 'from-amber-500/20 to-orange-500/20 border-amber-500/50 text-amber-400';
      default: return 'from-blue-500/20 to-indigo-500/20 border-blue-500/50 text-blue-400';
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-rose-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Active Alerts</h3>
          <p className="text-slate-400 text-sm">{alerts.length} unresolved</p>
        </div>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No active alerts</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl bg-gradient-to-br ${getSeverityColor(alert.severity)} border`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-medium text-sm ${getSeverityColor(alert.severity).split(' ').pop()}`}>
                    {alert.message}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">{alert.provider} • {alert.code}</p>
                </div>
                <button
                  onClick={() => onDismiss(alert)}
                  aria-label={`Dismiss alert: ${alert.code}`}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ActionsCard({ onConnect, onExport, onDelete, hasDevices }: { onConnect: () => void; onExport: () => void; onDelete: () => void; hasDevices: boolean }) {
  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Quick Actions</h3>
          <p className="text-slate-400 text-sm">Manage your devices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={onConnect}
          className="p-4 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:opacity-90 transition-all flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">Connect Device</p>
            <p className="text-xs opacity-80">Add new source</p>
          </div>
        </button>

        <button
          onClick={onExport}
          disabled={!hasDevices}
          className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
            hasDevices
              ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
              : 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Download className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">Export Data</p>
            <p className="text-xs opacity-60">CSV or JSON</p>
          </div>
        </button>

        <button
          onClick={onDelete}
          disabled={!hasDevices}
          className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
            hasDevices
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              : 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-5 h-5" />
          <div className="text-left">
            <p className="font-medium">Delete Data</p>
            <p className="text-xs opacity-60">Irreversible</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function DeleteDataDialog({ providers, onClose, onDeleted }: { providers: string[]; onClose: () => void; onDeleted: () => Promise<void> }) {
  const { showNotification } = useNotification();
  const [provider, setProvider] = useState(providers[0] ?? '');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = provider !== '' && confirmText.trim() === provider && !deleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      // Order matters: dependent rows first, the connection row itself last.
      for (const table of ['webhook_logs', 'alerts', 'device_health', 'connections']) {
        const { error } = await supabase.from(table).delete().eq('provider', provider);
        if (error) throw error;
      }
      showNotification(`All ${provider} data has been deleted.`, 'success');
      await onDeleted();
    } catch {
      showNotification(`Could not delete ${provider} data. Please try again.`, 'error');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-rose-500/30 max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Data</h2>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            aria-label="Close"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-4">
          This permanently deletes the selected provider's webhook logs, alerts, device health
          history, and connection. This cannot be undone.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2 text-sm">Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setConfirmText('');
              }}
              disabled={deleting}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white disabled:opacity-50"
            >
              {providers.map((p) => (
                <option key={p} value={p} className="bg-[#1a1a24]">{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-medium mb-2 text-sm">
              Type <span className="text-rose-400 font-mono">{provider}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder={provider}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 focus:border-rose-500/50 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={deleting}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceDetailDrawer({ device, onClose }: { device: Connection; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'status' | 'metrics' | 'permissions' | 'diagnostics' | 'history'>('status');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-t-3xl md:rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 w-full md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-br from-[#1a1a24] to-[#13131a] border-b border-white/10 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{device.provider}</h2>
              <p className="text-slate-400 text-sm">{device.device_model || 'Device details'}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close device details"
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto">
            {(['status', 'metrics', 'permissions', 'diagnostics', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'status' && <StatusTab device={device} />}
          {activeTab === 'metrics' && <MetricsTab device={device} />}
          {activeTab === 'permissions' && <PermissionsTab device={device} />}
          {activeTab === 'diagnostics' && <DiagnosticsTab device={device} />}
          {activeTab === 'history' && <HistoryTab device={device} />}
        </div>
      </div>
    </div>
  );
}

function StatusTab({ device }: { device: Connection }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-slate-400 text-sm mb-1">Status</p>
          <p className="text-white font-medium capitalize">{device.status}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-slate-400 text-sm mb-1">Battery</p>
          <p className="text-white font-medium">{device.battery_pct || 'N/A'}%</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-slate-400 text-sm mb-1">Signal</p>
          <p className="text-white font-medium">{device.signal_strength || 'N/A'}/100</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5">
          <p className="text-slate-400 text-sm mb-1">Firmware</p>
          <p className="text-white font-medium">{device.firmware || 'Unknown'}</p>
        </div>
      </div>

      {device.last_sync_at && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <p className="text-blue-400 text-sm mb-1">Last Sync</p>
          <p className="text-white">{new Date(device.last_sync_at).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}

function MetricsTab({ device }: { device: Connection }) {
  const [summaries, setSummaries] = useState<MetricSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('health_metrics')
          .select('*')
          .ilike('source', device.provider)
          .gte('recorded_at', since)
          .order('recorded_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        if (cancelled) return;

        const rows = (data ?? []) as HealthMetricRow[];
        const grouped = new Map<string, MetricSummary>();
        for (const row of rows) {
          const type = row.metric_type || 'unknown';
          const existing = grouped.get(type);
          if (existing) {
            existing.count += 1;
          } else {
            // Rows are ordered newest-first, so the first row per type is the latest reading.
            const rawValue = row.metric_value ?? row.value;
            const unit = row.metric_unit ?? row.unit ?? '';
            grouped.set(type, {
              type,
              count: 1,
              latestValue:
                rawValue === null || rawValue === undefined
                  ? '—'
                  : `${rawValue}${unit ? ` ${unit}` : ''}`,
              latestAt: row.recorded_at ?? null,
            });
          }
        }
        setSummaries([...grouped.values()].sort((a, b) => a.type.localeCompare(b.type)));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [device.provider]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
        <p className="text-rose-400 text-sm">Could not load metrics for this device.</p>
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">No metrics recorded for this provider yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 text-xs uppercase tracking-wide bg-white/5">
              <th className="px-4 py-3 font-medium">Metric</th>
              <th className="px-4 py-3 font-medium">Latest</th>
              <th className="px-4 py-3 font-medium">Readings</th>
              <th className="px-4 py-3 font-medium">Last recorded</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((summary) => (
              <tr key={summary.type} className="border-t border-white/5">
                <td className="px-4 py-3 text-white font-medium capitalize">{summary.type.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-slate-300">{summary.latestValue}</td>
                <td className="px-4 py-3 text-slate-400">{summary.count}</td>
                <td className="px-4 py-3 text-slate-400">
                  {summary.latestAt ? formatRelativeTime(summary.latestAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-slate-500 text-xs">Metrics from the last 7 days for {device.provider}.</p>
    </div>
  );
}

function PermissionsTab({ device }: { device: Connection }) {
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Permissions: {JSON.stringify(device.permissions || {}, null, 2)}</p>
    </div>
  );
}

function DiagnosticsTab({ device }: { device: Connection }) {
  const [health, setHealth] = useState<DeviceHealth | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [healthRes, logsRes] = await Promise.all([
          supabase
            .from('device_health')
            .select('*')
            .eq('provider', device.provider)
            .order('last_eval_at', { ascending: false })
            .limit(1),
          supabase
            .from('webhook_logs')
            .select('*')
            .eq('provider', device.provider)
            .order('received_at', { ascending: false })
            .limit(5),
        ]);
        if (cancelled) return;
        if (healthRes.error) throw healthRes.error;
        if (logsRes.error) throw logsRes.error;
        setHealth(((healthRes.data ?? []) as DeviceHealth[])[0] ?? null);
        setLogs(((logsRes.data ?? []) as WebhookLog[]).slice(0, 5));
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [device.provider]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
        <p className="text-rose-400 text-sm">Could not load diagnostics for this device.</p>
      </div>
    );
  }

  const pct = (value: number) => (Number.isFinite(value) ? `${value.toFixed(1)}%` : '—');
  const stats = health
    ? [
        { label: 'Uptime (7d)', value: pct(health.uptime_ratio_7d * 100) },
        {
          label: 'Avg latency (24h)',
          value: Number.isFinite(health.avg_latency_ms_24h) ? `${Math.round(health.avg_latency_ms_24h)} ms` : '—',
        },
        { label: 'Data freshness', value: formatDuration(health.data_freshness_s) },
        { label: 'Completeness (24h)', value: pct(health.completeness_pct_24h) },
        { label: 'Last evaluated', value: new Date(health.last_eval_at).toLocaleString() },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-white font-medium text-sm mb-3">Device health</h4>
        {health ? (
          <div className="space-y-2">
            {stats.map((stat) => (
              <div key={stat.label} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
                <span className="text-slate-400 text-sm">{stat.label}</span>
                <span className="text-white text-sm font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm py-2">No diagnostics recorded for this provider yet</p>
        )}
      </div>

      <div>
        <h4 className="text-white font-medium text-sm mb-3">Recent webhook events</h4>
        {logs.length === 0 ? (
          <p className="text-slate-500 text-sm py-2">No webhook events for this provider yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => <WebhookLogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryTab({ device }: { device: Connection }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-white/5">
        <p className="text-slate-400 text-sm mb-1">Connected</p>
        <p className="text-white">{new Date(device.created_at).toLocaleString()}</p>
      </div>
    </div>
  );
}

function ConnectDeviceWizard({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { openConnectionsPanel } = useConnections();

  const handleProviderSelect = (provider: string) => {
    onClose();
    if (provider === 'Terra') {
      navigate('/setup/terra');
    } else {
      openConnectionsPanel('health');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Connect Device</h2>
          <button
            onClick={onClose}
            aria-label="Close connect wizard"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-slate-400 mb-4">Choose a health source to connect</p>

        <div className="grid grid-cols-1 gap-3">
          {['Terra', 'Fitbit', 'Oura', 'Dexcom', 'Apple HealthKit'].map((provider) => (
            <button
              key={provider}
              onClick={() => handleProviderSelect(provider)}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all flex items-center justify-between"
            >
              <span className="text-white font-medium">{provider}</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>

        <p className="text-slate-500 text-xs mt-4">
          Terra opens its guided setup; other providers open the Connections panel, which hosts the secure account-linking flows.
        </p>
      </div>
    </div>
  );
}

function ExportDataModal({ onClose, connections, deviceHealth, alerts, webhookLogs }: {
  onClose: () => void;
  connections: Connection[];
  deviceHealth: DeviceHealth[];
  alerts: Alert[];
  webhookLogs: WebhookLog[];
}) {
  const { showNotification } = useNotification();
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = () => {
    if (exporting) return;
    if (startDate && endDate && startDate > endDate) {
      showNotification('Start date must be on or before the end date.', 'warning');
      return;
    }

    setExporting(true);
    try {
      const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
      const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
      const inRange = (iso?: string) => {
        if (!iso) return true;
        const t = new Date(iso).getTime();
        if (Number.isNaN(t)) return true;
        if (startMs !== null && t < startMs) return false;
        if (endMs !== null && t > endMs) return false;
        return true;
      };

      const filteredConnections = connections.filter(c => inRange(c.created_at));
      const filteredHealth = deviceHealth.filter(h => inRange(h.last_eval_at));
      const filteredAlerts = alerts.filter(a => inRange(a.created_at));
      const filteredLogs = webhookLogs.filter(l => inRange(l.received_at));

      const total =
        format === 'json'
          ? filteredConnections.length + filteredHealth.length + filteredAlerts.length + filteredLogs.length
          : filteredLogs.length;
      if (total === 0) {
        showNotification('No data found in the selected date range.', 'warning');
        return;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      let blob: Blob;
      let filename: string;

      if (format === 'json') {
        const payload = {
          exported_at: new Date().toISOString(),
          date_range: { from: startDate || null, to: endDate || null },
          connections: filteredConnections,
          device_health: filteredHealth,
          alerts: filteredAlerts,
          webhook_logs: filteredLogs,
        };
        blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        filename = `everafter-devices-${stamp}.json`;
      } else {
        const escapeCsv = (value: unknown) => {
          const s = value === null || value === undefined ? '' : String(value);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const header = ['id', 'provider', 'received_at', 'event_type', 'http_status', 'parse_ms', 'error'];
        const rows = filteredLogs.map(log =>
          [log.id, log.provider, log.received_at, log.event_type, log.http_status, log.parse_ms, log.error ?? '']
            .map(escapeCsv)
            .join(',')
        );
        blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
        filename = `everafter-webhook-logs-${stamp}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      showNotification(
        format === 'json' ? 'Device data exported as JSON.' : 'Webhook logs exported as CSV.',
        'success'
      );
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Export Data</h2>
          <button
            onClick={onClose}
            aria-label="Close export dialog"
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as 'csv' | 'json')}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
            >
              <option value="csv" className="bg-[#1a1a24]">CSV</option>
              <option value="json" className="bg-[#1a1a24]">JSON</option>
            </select>
            <p className="text-slate-500 text-xs mt-2">
              CSV exports webhook logs; JSON includes connections, device health, alerts, and webhook logs.
            </p>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Export start date"
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="Export end date"
                className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              />
            </div>
            <p className="text-slate-500 text-xs mt-2">Leave blank to export everything currently loaded.</p>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>
    </div>
  );
}
