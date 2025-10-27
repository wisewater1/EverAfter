import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  XCircle,
} from 'lucide-react';

interface ConnectionHealth {
  provider: string;
  status: string;
  healthScore: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastSyncAt: string | null;
  expiresAt: string | null;
  syncErrorCount: number;
  metricsLast7Days: number;
  pendingQualityIssues: number;
}

interface HealthSummary {
  totalConnections: number;
  activeConnections: number;
  errorConnections: number;
  avgHealthScore: number;
  providersNeedingAttention: string[];
}

export default function ConnectionHealthMonitor() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionHealth[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadConnectionHealth();

      // Refresh every 30 seconds
      const interval = setInterval(loadConnectionHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function loadConnectionHealth() {
    if (!user) return;

    try {
      setRefreshing(true);

      // Load connection dashboard data
      const { data: dashboardData, error: dashboardError } = await supabase
        .from('mv_connection_dashboard')
        .select('*')
        .eq('user_id', user.id);

      if (dashboardError) {
        console.error('Error loading connection dashboard:', dashboardError);
      } else {
        setConnections(dashboardData || []);
      }

      // Load health summary
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_connection_health_summary', { p_user_id: user.id });

      if (summaryError) {
        console.error('Error loading health summary:', summaryError);
      } else if (summaryData && summaryData.length > 0) {
        setSummary(summaryData[0]);
      }

    } catch (err) {
      console.error('Error loading connection health:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleRefreshDashboard() {
    try {
      setRefreshing(true);
      await supabase.rpc('refresh_connection_dashboard');
      await loadConnectionHealth();
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  }

  function getHealthScoreColor(score: number): string {
    if (score >= 0.9) return 'text-green-400';
    if (score >= 0.7) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getHealthScoreIcon(score: number) {
    if (score >= 0.9) return CheckCircle;
    if (score >= 0.7) return AlertTriangle;
    return XCircle;
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      active: { bg: 'bg-green-600/20', text: 'text-green-300', icon: CheckCircle },
      error: { bg: 'bg-red-600/20', text: 'text-red-300', icon: XCircle },
      token_expired: { bg: 'bg-orange-600/20', text: 'text-orange-300', icon: Clock },
      inactive: { bg: 'bg-gray-600/20', text: 'text-gray-300', icon: Activity },
    };

    const style = styles[status] || styles.inactive;
    const Icon = style.icon;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${style.bg} ${style.text} rounded-full text-xs font-medium`}>
        <Icon className="w-3 h-3" />
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </div>
    );
  }

  function formatTimeAgo(timestamp: string | null): string {
    if (!timestamp) return 'Never';

    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  }

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-400">Loading health status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Summary Card */}
      {summary && (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Connection Health</h2>
                <p className="text-sm text-gray-400">Real-time monitoring and diagnostics</p>
              </div>
            </div>
            <button
              onClick={handleRefreshDashboard}
              disabled={refreshing}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400">Total Connections</span>
              </div>
              <div className="text-3xl font-bold text-white">{summary.totalConnections}</div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-xs text-gray-400">Active</span>
              </div>
              <div className="text-3xl font-bold text-green-400">{summary.activeConnections}</div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-teal-400" />
                <span className="text-xs text-gray-400">Health Score</span>
              </div>
              <div className={`text-3xl font-bold ${getHealthScoreColor(summary.avgHealthScore)}`}>
                {Math.round(summary.avgHealthScore * 100)}%
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-400">Need Attention</span>
              </div>
              <div className="text-3xl font-bold text-orange-400">{summary.errorConnections}</div>
            </div>
          </div>

          {summary.providersNeedingAttention && summary.providersNeedingAttention.length > 0 && (
            <div className="mt-4 p-4 bg-orange-600/10 border border-orange-500/30 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 font-medium text-sm">Providers needing attention:</p>
                  <p className="text-orange-200 text-sm mt-1">
                    {summary.providersNeedingAttention.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Individual Connection Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connections.map((conn) => {
          const HealthIcon = getHealthScoreIcon(conn.healthScore);
          const successRate = conn.totalSyncs > 0
            ? Math.round((conn.successfulSyncs / conn.totalSyncs) * 100)
            : 100;

          return (
            <div
              key={conn.provider}
              className="bg-white/5 backdrop-blur-lg rounded-xl p-5 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white capitalize mb-1">
                    {conn.provider}
                  </h3>
                  {getStatusBadge(conn.status)}
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getHealthScoreColor(conn.healthScore)}`}>
                    {Math.round(conn.healthScore * 100)}%
                  </div>
                  <div className="text-xs text-gray-400">Health Score</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-teal-400" />
                    <span className="text-xs text-gray-400">Success Rate</span>
                  </div>
                  <div className={`text-lg font-semibold ${successRate >= 90 ? 'text-green-400' : successRate >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {successRate}%
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3 h-3 text-blue-400" />
                    <span className="text-xs text-gray-400">Total Syncs</span>
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {conn.totalSyncs}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-gray-300">
                  <span className="text-gray-400">Last Sync:</span>
                  <span className="font-medium">{formatTimeAgo(conn.lastSyncAt)}</span>
                </div>

                {conn.metricsLast7Days !== undefined && (
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-gray-400">Metrics (7d):</span>
                    <span className="font-medium">{conn.metricsLast7Days}</span>
                  </div>
                )}

                {conn.failedSyncs > 0 && (
                  <div className="flex items-center justify-between text-red-300">
                    <span className="text-gray-400">Failed Syncs:</span>
                    <span className="font-medium">{conn.failedSyncs}</span>
                  </div>
                )}

                {conn.pendingQualityIssues > 0 && (
                  <div className="flex items-center justify-between text-orange-300">
                    <span className="text-gray-400">Quality Issues:</span>
                    <span className="font-medium">{conn.pendingQualityIssues}</span>
                  </div>
                )}

                {conn.expiresAt && (
                  <div className="flex items-center justify-between text-gray-300">
                    <span className="text-gray-400">Token Expires:</span>
                    <span className="font-medium">{formatTimeAgo(conn.expiresAt)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {connections.length === 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-12 border border-white/10 text-center">
          <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No connections configured yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Connect your health devices to start monitoring
          </p>
        </div>
      )}
    </div>
  );
}
