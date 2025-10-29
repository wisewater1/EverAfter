import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { terraClient, TerraConnection, TerraMetric } from '../lib/terra-client';
import { validateTerraConfig, TERRA_PROVIDERS, TerraProvider } from '../lib/terra-config';
import {
  Plus, Activity, Heart, Moon, Droplet, TrendingUp, Download, Trash2,
  CheckCircle, AlertCircle, RefreshCw, Settings, Sparkles, Clock
} from 'lucide-react';

export default function TerraIntegration() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<TerraConnection[]>([]);
  const [dailySummary, setDailySummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [configValid, setConfigValid] = useState(false);
  const [missingConfig, setMissingConfig] = useState<string[]>([]);

  useEffect(() => {
    const validation = validateTerraConfig();
    setConfigValid(validation.isValid);
    setMissingConfig(validation.missing);

    if (user && validation.isValid) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const [connectionsData, summaryData] = await Promise.all([
        terraClient.getConnections(user.id),
        terraClient.getDailySummary(user.id)
      ]);

      setConnections(connectionsData);
      setDailySummary(summaryData);
    } catch (error) {
      console.error('Error loading Terra data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user) return;

    setConnecting(true);

    try {
      const response = await terraClient.generateWidgetSession(user.id, [
        'FITBIT',
        'OURA',
        'GARMIN',
        'DEXCOM',
        'FREESTYLELIBRE',
        'WITHINGS',
        'POLAR'
      ]);

      window.open(response.url, '_blank', 'width=500,height=700');

      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (error) {
      console.error('Error connecting Terra:', error);
      alert('Failed to connect Terra. Please check your configuration.');
    } finally {
      setConnecting(false);
    }
  };

  const handleBackfill = async (provider: string) => {
    if (!user) return;

    try {
      await terraClient.triggerBackfill(user.id, provider, 7);
      alert('Backfill started! Data will sync in the background.');
      loadData();
    } catch (error) {
      console.error('Error triggering backfill:', error);
      alert('Failed to trigger backfill.');
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!user) return;

    try {
      const data = await terraClient.exportUserData(user.id, undefined, format);
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `terra-health-data-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data.');
    }
  };

  const handleDelete = async (provider?: string) => {
    if (!user) return;

    const confirmMessage = provider
      ? `Delete all data from ${provider}?`
      : 'Delete ALL Terra data? This cannot be undone.';

    if (!confirm(confirmMessage)) return;

    try {
      await terraClient.deleteUserData(user.id, provider);
      alert('Data deleted successfully.');
      loadData();
    } catch (error) {
      console.error('Error deleting data:', error);
      alert('Failed to delete data.');
    }
  };

  if (!configValid) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-orange-500/30">
            <Settings className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Terra Setup Required</h3>
            <p className="text-slate-400 text-sm mb-4">
              To connect 300+ health devices through Terra, you need to configure your API credentials.
            </p>
            <div className="p-4 rounded-xl bg-red-900/20 border border-red-500/30 mb-4">
              <p className="text-red-400 text-sm font-medium mb-2">Missing Configuration:</p>
              <ul className="text-red-400 text-xs space-y-1">
                {missingConfig.map(key => (
                  <li key={key}>• {key}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-slate-400 text-sm">
              <p className="font-medium text-white">Setup Steps:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Sign up for Terra at <a href="https://dashboard.tryterra.co" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">dashboard.tryterra.co</a></li>
                <li>Get your API Key and Dev ID from the dashboard</li>
                <li>Set up Destinations to receive webhooks</li>
                <li>Add your credentials to the .env file</li>
                <li>Set your webhook URL in Terra Dashboard</li>
              </ol>
            </div>
            <a
              href="https://docs.tryterra.co/docs/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all duration-300 text-sm"
            >
              <Sparkles className="w-4 h-4" />
              View Terra Documentation
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-center justify-center gap-3">
          <RefreshCw className="w-5 h-5 text-teal-400 animate-spin" />
          <span className="text-slate-400">Loading Terra integration...</span>
        </div>
      </div>
    );
  }

  const connectedProviders = connections.filter(c => c.status === 'connected');

  return (
    <div className="space-y-6">
      {/* Header with Connect Button */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Terra Health Integration</h2>
            <p className="text-slate-400 text-sm">
              Connect 300+ wearables, CGMs, and health devices through one unified API
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                <span className="text-teal-400 font-medium text-sm">{connectedProviders.length} Connected</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={connecting}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Connect Terra
            </>
          )}
        </button>
      </div>

      {/* Daily Summary */}
      {dailySummary && dailySummary.metrics && Object.keys(dailySummary.metrics as Record<string, unknown>).length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-teal-500/30">
              <TrendingUp className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Last 24 Hours</h3>
              <p className="text-slate-500 text-xs">Raphael is watching your health metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(dailySummary.metrics as Record<string, { latest: number; unit: string }>).map(([key, value]) => {
              const icon = getMetricIcon(key);
              return (
                <div key={key} className="p-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    {icon}
                    <span className="text-slate-400 text-xs capitalize">{formatMetricName(key)}</span>
                  </div>
                  <div className="text-white text-xl font-bold">
                    {value.latest?.toFixed(1) || 0}
                  </div>
                  <div className="text-slate-500 text-xs">{value.unit}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connected Devices */}
      {connections.length > 0 && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
          <h3 className="text-lg font-bold text-white mb-4">Connected Devices</h3>
          <div className="space-y-3">
            {connections.map(connection => (
              <div
                key={connection.id}
                className="p-4 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-purple-500/30">
                      <Activity className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-white font-semibold text-sm">{connection.provider}</div>
                      {connection.last_sync_at && (
                        <div className="text-slate-500 text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Last sync: {new Date(connection.last_sync_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBackfill(connection.provider)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-all text-xs font-medium flex items-center gap-1"
                      title="Sync last 7 days"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Sync
                    </button>
                    <button
                      onClick={() => handleDelete(connection.provider)}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all text-xs font-medium flex items-center gap-1"
                      title="Delete data"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Privacy Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <h3 className="text-lg font-bold text-white mb-4">Privacy & Data Control</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-400 hover:from-blue-500/20 hover:to-cyan-500/20 transition-all duration-300 flex items-center justify-center gap-2 border border-blue-500/20"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-3 rounded-xl bg-gradient-to-br from-green-500/10 to-teal-500/10 text-green-400 hover:from-green-500/20 hover:to-teal-500/20 transition-all duration-300 flex items-center justify-center gap-2 border border-green-500/20"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleDelete()}
            className="px-4 py-3 rounded-xl bg-gradient-to-br from-red-500/10 to-orange-500/10 text-red-400 hover:from-red-500/20 hover:to-orange-500/20 transition-all duration-300 flex items-center justify-center gap-2 border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Data
          </button>
        </div>
      </div>
    </div>
  );
}

function getMetricIcon(metricKey: string) {
  if (metricKey.includes('hr') || metricKey.includes('heart')) {
    return <Heart className="w-4 h-4 text-red-400" />;
  }
  if (metricKey.includes('sleep')) {
    return <Moon className="w-4 h-4 text-indigo-400" />;
  }
  if (metricKey.includes('glucose')) {
    return <Droplet className="w-4 h-4 text-blue-400" />;
  }
  return <Activity className="w-4 h-4 text-teal-400" />;
}

function formatMetricName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
