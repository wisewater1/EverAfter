import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Settings,
  RotateCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Bell,
  Save,
  Activity,
  TrendingUp,
  Zap,
  Moon,
} from 'lucide-react';

interface RotationConfig {
  id?: string;
  enabled: boolean;
  rotation_interval: string;
  custom_interval_minutes: number | null;
  priority_order: string[];
  failover_enabled: boolean;
  max_retry_attempts: number;
  retry_delay_minutes: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  notification_enabled: boolean;
}

interface ProviderAccount {
  provider: string;
  status: string;
}

interface HealthMetric {
  provider: string;
  health_score: number;
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  last_success_at: string | null;
  uptime_percentage: number;
}

export default function ConnectionRotationConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<RotationConfig>({
    enabled: false,
    rotation_interval: 'every_6_hours',
    custom_interval_minutes: null,
    priority_order: [],
    failover_enabled: true,
    max_retry_attempts: 3,
    retry_delay_minutes: 15,
    quiet_hours_start: null,
    quiet_hours_end: null,
    notification_enabled: true,
  });
  const [providers, setProviders] = useState<ProviderAccount[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadConfig();
      loadProviders();
      loadHealthMetrics();
    }
  }, [user]);

  async function loadConfig() {
    try {
      const { data, error } = await supabase
        .from('connection_rotation_config')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadProviders() {
    try {
      const { data, error } = await supabase
        .from('provider_accounts')
        .select('provider, status')
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;
      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  }

  async function loadHealthMetrics() {
    try {
      const { data, error } = await supabase
        .from('connection_health_metrics')
        .select('*')
        .eq('user_id', user?.id)
        .order('health_score', { ascending: false });

      if (error) throw error;
      setHealthMetrics(data || []);
    } catch (error) {
      console.error('Error loading health metrics:', error);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);

    try {
      const configData = {
        ...config,
        user_id: user?.id,
      };

      if (config.id) {
        const { error } = await supabase
          .from('connection_rotation_config')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('connection_rotation_config')
          .insert([configData])
          .select()
          .single();

        if (error) throw error;
        setConfig(data);
      }

      // If enabled, schedule the first rotation
      if (config.enabled) {
        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connection-rotation?action=schedule_rotation`;
        const { data: { session } } = await supabase.auth.getSession();

        await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ user_id: user?.id }),
        });
      }

      setMessage({ type: 'success', text: 'Configuration saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving config:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  }

  function getHealthColor(score: number) {
    if (score >= 90) return 'text-green-400 bg-green-900/30';
    if (score >= 70) return 'text-yellow-400 bg-yellow-900/30';
    return 'text-red-400 bg-red-900/30';
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="text-white">Loading rotation configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-2xl p-6 border border-blue-500/20">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <RotateCw className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Connection Rotation System</h2>
            <p className="text-blue-200 text-sm">
              Automatically rotate through health connections to ensure continuous data availability
              and optimal sync performance
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-900/20 border border-green-500/30'
                : 'bg-red-900/20 border border-red-500/30'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span
              className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}
            >
              {message.text}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-white font-semibold">Enable Rotation</div>
                  <div className="text-gray-400 text-sm">Automatically sync connections</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-12 h-6 rounded-full appearance-none bg-gray-700 checked:bg-blue-600 relative cursor-pointer transition-colors before:content-[''] before:absolute before:w-5 before:h-5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 before:transition-transform checked:before:translate-x-6"
              />
            </label>
          </div>

          {/* Rotation Interval */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <label className="block">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white font-semibold">Rotation Interval</span>
              </div>
              <select
                value={config.rotation_interval}
                onChange={(e) =>
                  setConfig({ ...config, rotation_interval: e.target.value })
                }
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="hourly">Every Hour</option>
                <option value="every_6_hours">Every 6 Hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom Interval</option>
              </select>
            </label>
            {config.rotation_interval === 'custom' && (
              <input
                type="number"
                value={config.custom_interval_minutes || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    custom_interval_minutes: parseInt(e.target.value) || null,
                  })
                }
                placeholder="Minutes"
                className="w-full mt-3 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>

          {/* Failover Settings */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">Failover Protection</span>
            </div>
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={config.failover_enabled}
                onChange={(e) =>
                  setConfig({ ...config, failover_enabled: e.target.checked })
                }
                className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-300 text-sm">Enable automatic retry on failure</span>
            </label>
            {config.failover_enabled && (
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-xs block mb-1">Max Retry Attempts</label>
                  <input
                    type="number"
                    value={config.max_retry_attempts}
                    onChange={(e) =>
                      setConfig({ ...config, max_retry_attempts: parseInt(e.target.value) || 3 })
                    }
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs block mb-1">
                    Retry Delay (minutes)
                  </label>
                  <input
                    type="number"
                    value={config.retry_delay_minutes}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        retry_delay_minutes: parseInt(e.target.value) || 15,
                      })
                    }
                    min="5"
                    max="120"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quiet Hours */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-5 h-5 text-purple-400" />
              <span className="text-white font-semibold">Quiet Hours</span>
            </div>
            <p className="text-gray-400 text-xs mb-3">Don't sync during these hours</p>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs block mb-1">Start Time</label>
                <input
                  type="time"
                  value={config.quiet_hours_start || ''}
                  onChange={(e) =>
                    setConfig({ ...config, quiet_hours_start: e.target.value || null })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs block mb-1">End Time</label>
                <input
                  type="time"
                  value={config.quiet_hours_end || ''}
                  onChange={(e) =>
                    setConfig({ ...config, quiet_hours_end: e.target.value || null })
                  }
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white/5 rounded-xl p-5 border border-white/10 md:col-span-2">
            <label className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-yellow-400" />
              <input
                type="checkbox"
                checked={config.notification_enabled}
                onChange={(e) =>
                  setConfig({ ...config, notification_enabled: e.target.checked })
                }
                className="w-5 h-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-white font-semibold">Enable Notifications</div>
                <div className="text-gray-400 text-sm">
                  Get notified about sync failures and health issues
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Configuration
            </>
          )}
        </button>
      </div>

      {/* Health Metrics Dashboard */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">Connection Health Metrics</h3>
        </div>

        {healthMetrics.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No health metrics available yet</p>
            <p className="text-sm mt-1">Metrics will appear after connections sync</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthMetrics.map((metric) => (
              <div
                key={metric.provider}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-semibold capitalize">{metric.provider}</h4>
                    <p className="text-gray-400 text-xs">
                      {metric.total_syncs} total syncs
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-bold ${getHealthColor(
                      metric.health_score
                    )}`}
                  >
                    {metric.health_score}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Success Rate</span>
                    <span className="text-green-400 font-semibold">
                      {metric.total_syncs > 0
                        ? Math.round((metric.successful_syncs / metric.total_syncs) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-blue-400 font-semibold">
                      {metric.uptime_percentage?.toFixed(1) || 0}%
                    </span>
                  </div>
                  {metric.last_success_at && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last success: {new Date(metric.last_success_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {providers.length > 0 && (
        <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium mb-1">Active Connections: {providers.length}</p>
              <p className="text-blue-200/70">
                Rotation will cycle through your connected providers:{' '}
                {providers.map((p) => p.provider).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
