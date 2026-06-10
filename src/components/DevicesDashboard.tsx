import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity, AlertCircle, Battery, CheckCircle, Clock, Download,
  FileText, Heart, Link, RefreshCw, Settings, Shield, Signal,
  Trash2, TrendingUp, Wifi, WifiOff, X, ChevronRight, Droplet,
  Brain, Moon, Footprints, Target, ThermometerSun, Zap, Eye,
  Play, Info, AlertTriangle, Plus, ExternalLink
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
  permissions?: any;
  created_at: string;
}

interface DeviceHealth {
  provider: string;
  uptime_ratio_7d: number;
  avg_latency_ms_24h: number;
  data_freshness_s: number;
  completeness_pct_24h: number;
  gaps?: any[];
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

export default function DevicesDashboard() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [deviceHealth, setDeviceHealth] = useState<DeviceHealth[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Connection | null>(null);
  const [showConnectWizard, setShowConnectWizard] = useState(false);
  const [showExport, setShowExport] = useState(false);

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

  const connectedCount = connections.filter(c => c.status === 'connected').length;
  const degradedCount = connections.filter(c => c.status === 'degraded').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
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
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ConnectedDevicesCard connections={connections} onDeviceClick={setSelectedDevice} />
          <DataQualityCard deviceHealth={deviceHealth} />
          <RealTimeMonitoringCard connections={connections} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SyncWebhookHealthCard webhookLogs={webhookLogs} />
          <AlertsCard alerts={alerts} onResolve={fetchData} />
        </div>

        <ActionsCard
          onConnect={() => setShowConnectWizard(true)}
          onExport={() => setShowExport(true)}
          hasDevices={connections.length > 0}
        />

        {selectedDevice && (
          <DeviceDetailDrawer
            device={selectedDevice}
            onClose={() => setSelectedDevice(null)}
            onRefresh={fetchData}
          />
        )}

        {showConnectWizard && (
          <ConnectDeviceWizard onClose={() => setShowConnectWizard(false)} onSuccess={fetchData} />
        )}

        {showExport && (
          <ExportDataModal onClose={() => setShowExport(false)} connections={connections} />
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

function RealTimeMonitoringCard({ connections }: { connections: Connection[] }) {
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
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Monitoring active</span>
        </div>
      </div>
    </div>
  );
}

function SyncWebhookHealthCard({ webhookLogs }: { webhookLogs: WebhookLog[] }) {
  const recentErrors = webhookLogs.filter(log => log.error).length;
  const avgParseTime = webhookLogs.reduce((acc, log) => acc + log.parse_ms, 0) / (webhookLogs.length || 1);

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold">Sync & Webhook Health</h3>
          <p className="text-slate-400 text-sm">Last 10 events</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {webhookLogs.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No webhook events yet</p>
        ) : (
          webhookLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between">
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
                <p className="text-slate-400 text-xs">{log.parse_ms.toFixed(0)}ms</p>
                <p className="text-slate-500 text-xs">{new Date(log.received_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="flex-1 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all">
          View All Logs
        </button>
        <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:opacity-90 transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AlertsCard({ alerts, onResolve }: { alerts: Alert[]; onResolve: () => void }) {
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
                <button className="text-slate-400 hover:text-white transition-colors">
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

function ActionsCard({ onConnect, onExport, hasDevices }: { onConnect: () => void; onExport: () => void; hasDevices: boolean }) {
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

function DeviceDetailDrawer({ device, onClose, onRefresh }: { device: Connection; onClose: () => void; onRefresh: () => void }) {
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
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Metrics data will appear here</p>
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
  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Diagnostic data for {device.provider}</p>
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

function ConnectDeviceWizard({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Connect Device</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-slate-400 mb-4">Choose a health source to connect</p>

        <div className="grid grid-cols-1 gap-3">
          {['Terra', 'Fitbit', 'Oura', 'Dexcom', 'Apple HealthKit'].map((provider) => (
            <button
              key={provider}
              className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all flex items-center justify-between"
            >
              <span className="text-white font-medium">{provider}</span>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExportDataModal({ onClose, connections }: { onClose: () => void; connections: Connection[] }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Export Data</h2>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Format</label>
            <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
              <input type="date" className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white" />
            </div>
          </div>

          <button className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
