import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  Battery,
  Signal,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Bell,
  Settings,
  Zap,
  Heart,
  Droplet,
  Wrench,
} from 'lucide-react';
import TroubleshootingWizard from './TroubleshootingWizard';

interface DeviceConnection {
  id: string;
  friendly_name: string;
  connection_status: string;
  last_data_received_at: string;
  battery_level: number;
  signal_quality: string;
  error_count: number;
  device_registry: {
    manufacturer: string;
    model_name: string;
    device_type: string;
    data_types: string[];
  };
}

interface DeviceAlert {
  id: string;
  alert_type: string;
  severity: string;
  metric_type: string;
  triggered_at: string;
  value_at_trigger: number;
  acknowledged_at: string | null;
}

interface DataQualityMetric {
  metric_type: string;
  avg_quality: number;
  anomaly_count: number;
  total_readings: number;
}

export default function DeviceMonitorDashboard() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceConnection[]>([]);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<DataQualityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSummary, setStatusSummary] = useState<Record<string, unknown> | null>(null);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadDeviceData();
      const interval = setInterval(loadDeviceData, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadDeviceData() {
    try {
      const [devicesResponse, alertsResponse, qualityResponse, summaryResponse] = await Promise.all([
        supabase
          .from('device_connections')
          .select('*, device_registry:device_registry_id(*)')
          .order('paired_at', { ascending: false }),

        supabase
          .from('device_alerts')
          .select('*')
          .is('resolved_at', null)
          .order('triggered_at', { ascending: false })
          .limit(10),

        supabase
          .from('data_quality_logs')
          .select('metric_type, quality_score, anomaly_detected')
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),

        supabase.rpc('get_device_status_summary', { p_user_id: user?.id }),
      ]);

      if (devicesResponse.data) {
        setDevices(devicesResponse.data);
      }

      if (alertsResponse.data) {
        setAlerts(alertsResponse.data);
      }

      if (qualityResponse.data) {
        interface QualityLog { metric_type: string; quality_score: number; anomaly_detected: boolean }
        interface MetricGroup { scores: number[]; anomalies: number; total: number }
        const metricGroups = qualityResponse.data.reduce((acc: Record<string, MetricGroup>, log: QualityLog) => {
          if (!acc[log.metric_type]) {
            acc[log.metric_type] = { scores: [], anomalies: 0, total: 0 };
          }
          acc[log.metric_type].scores.push(log.quality_score);
          if (log.anomaly_detected) acc[log.metric_type].anomalies++;
          acc[log.metric_type].total++;
          return acc;
        }, {});

        const metrics = Object.entries(metricGroups).map(([type, data]: [string, MetricGroup]) => ({
          metric_type: type,
          avg_quality: Math.round(data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length),
          anomaly_count: data.anomalies,
          total_readings: data.total,
        }));

        setQualityMetrics(metrics);
      }

      if (summaryResponse.data) {
        setStatusSummary(summaryResponse.data);
      }
    } catch (error) {
      console.error('Error loading device data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('device_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (!error) {
        setAlerts(alerts.map(a => a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'cgm': return Droplet;
      case 'fitness_tracker': return Activity;
      case 'smartwatch': return Activity;
      case 'wearable_ring': return Activity;
      case 'performance_band': return Zap;
      default: return Heart;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30 border-green-500/30';
      case 'pairing': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      case 'disconnected': return 'text-gray-400 bg-gray-900/30 border-gray-500/30';
      case 'error': return 'text-red-400 bg-red-900/30 border-red-500/30';
      case 'low_battery': return 'text-orange-400 bg-orange-900/30 border-orange-500/30';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500/30';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-600 text-white';
      case 'critical': return 'bg-orange-600 text-white';
      case 'warning': return 'bg-yellow-600 text-white';
      case 'info': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  // Battery icon utility (reserved for future display enhancements)
  // const getBatteryIcon = (level: number) => {
  //   if (level > 75) return '🔋';
  //   if (level > 50) return '🔋';
  //   if (level > 25) return '🪫';
  //   return '🪫';
  // };

  const getTimeSince = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Device Monitoring Dashboard</h2>
            <p className="text-blue-200 text-sm">Real-time health monitoring and device status</p>
          </div>
          <button
            onClick={loadDeviceData}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-all"
          >
            <RefreshCw className="w-5 h-5 text-blue-400" />
          </button>
        </div>

        {statusSummary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400 mb-1">Total Devices</div>
              <div className="text-2xl font-bold text-white">{statusSummary.total_devices || 0}</div>
            </div>
            <div className="bg-green-900/20 rounded-xl p-4 border border-green-500/30">
              <div className="text-sm text-green-300 mb-1">Active</div>
              <div className="text-2xl font-bold text-green-400">{statusSummary.active_devices || 0}</div>
            </div>
            <div className="bg-gray-900/20 rounded-xl p-4 border border-gray-500/30">
              <div className="text-sm text-gray-300 mb-1">Disconnected</div>
              <div className="text-2xl font-bold text-gray-400">{statusSummary.disconnected_devices || 0}</div>
            </div>
            <div className="bg-red-900/20 rounded-xl p-4 border border-red-500/30">
              <div className="text-sm text-red-300 mb-1">Error</div>
              <div className="text-2xl font-bold text-red-400">{statusSummary.error_devices || 0}</div>
            </div>
            <div className="bg-orange-900/20 rounded-xl p-4 border border-orange-500/30">
              <div className="text-sm text-orange-300 mb-1">Low Battery</div>
              <div className="text-2xl font-bold text-orange-400">{statusSummary.low_battery_devices || 0}</div>
            </div>
            <div className="bg-blue-900/20 rounded-xl p-4 border border-blue-500/30">
              <div className="text-sm text-blue-300 mb-1">Health Score</div>
              <div className="text-2xl font-bold text-blue-400">{statusSummary.average_health_score || 0}</div>
            </div>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-bold text-white">Active Alerts</h3>
            <span className="px-2 py-1 bg-red-600/20 text-red-400 text-xs rounded-full">
              {alerts.filter(a => !a.acknowledged_at).length} unacknowledged
            </span>
          </div>

          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.acknowledged_at
                    ? 'bg-gray-900/30 border-gray-700/30 opacity-60'
                    : 'bg-red-900/20 border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-lg font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-sm">{alert.metric_type}</span>
                      <span className="text-gray-500 text-xs">{getTimeSince(alert.triggered_at)}</span>
                    </div>
                    <div className="text-white font-medium mb-1">
                      {alert.alert_type.replace(/_/g, ' ')} - Value: {alert.value_at_trigger}
                    </div>
                  </div>
                  {!alert.acknowledged_at && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all text-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-400" />
            Connected Devices
          </h3>

          {devices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No devices connected yet</p>
              <p className="text-sm mt-1">Connect your first device to start monitoring</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const DeviceIcon = getDeviceIcon(device.device_registry?.device_type || 'unknown');
                return (
                  <div
                    key={device.id}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                          <DeviceIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {device.friendly_name || `${device.device_registry?.manufacturer} ${device.device_registry?.model_name}`}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {device.device_registry?.device_type.replace(/_/g, ' ')}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(device.connection_status)}`}>
                        {device.connection_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Battery className={`w-4 h-4 ${device.battery_level < 20 ? 'text-orange-400' : 'text-green-400'}`} />
                        <span className="text-gray-400">{device.battery_level}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Signal className="w-4 h-4 text-blue-400" />
                        <span className="text-gray-400">{device.signal_quality}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${device.error_count > 0 ? 'text-red-400' : 'text-gray-600'}`} />
                        <span className="text-gray-400">{device.error_count} errors</span>
                      </div>
                    </div>

                    {device.last_data_received_at && (
                      <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400">
                        Last data: {getTimeSince(device.last_data_received_at)}
                      </div>
                    )}

                    {(device.connection_status === 'error' || device.error_count > 0) && (
                      <button
                        onClick={() => {
                          setSelectedDevice({
                            id: device.id,
                            name: device.friendly_name || device.device_registry?.model_name || 'Device',
                            type: device.device_registry?.device_type || 'general'
                          });
                          setTroubleshootingOpen(true);
                        }}
                        className="mt-3 w-full px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-lg transition-all text-sm flex items-center justify-center gap-2 min-h-[44px]"
                      >
                        <Wrench className="w-4 h-4" />
                        Troubleshoot Issues
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-400" />
            Data Quality (24h)
          </h3>

          {qualityMetrics.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No quality data available yet</p>
              <p className="text-sm mt-1">Data quality metrics will appear after devices start sending data</p>
            </div>
          ) : (
            <div className="space-y-3">
              {qualityMetrics.map((metric) => (
                <div key={metric.metric_type} className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium capitalize">
                      {metric.metric_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-2xl font-bold ${
                      metric.avg_quality >= 90 ? 'text-green-400' :
                      metric.avg_quality >= 70 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {metric.avg_quality}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{metric.total_readings} readings</span>
                    {metric.anomaly_count > 0 && (
                      <span className="text-orange-400">{metric.anomaly_count} anomalies</span>
                    )}
                  </div>

                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        metric.avg_quality >= 90 ? 'bg-green-500' :
                        metric.avg_quality >= 70 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${metric.avg_quality}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-blue-300 font-medium mb-2">Real-Time Monitoring</h4>
            <p className="text-blue-200/80 text-sm mb-2">
              This dashboard refreshes automatically every 30 seconds to show the latest device status,
              alerts, and data quality metrics.
            </p>
            <ul className="text-sm text-blue-200/70 space-y-1">
              <li>• Device health scores are calculated based on connection status, battery level, and data freshness</li>
              <li>• Critical alerts trigger automatic emergency contact notifications</li>
              <li>• Data quality is validated against clinical ranges and device specifications</li>
            </ul>
          </div>
        </div>
      </div>

      {selectedDevice && (
        <TroubleshootingWizard
          isOpen={troubleshootingOpen}
          onClose={() => {
            setTroubleshootingOpen(false);
            setSelectedDevice(null);
          }}
          deviceType={selectedDevice.type}
          deviceName={selectedDevice.name}
          deviceConnectionId={selectedDevice.id}
        />
      )}
    </div>
  );
}
