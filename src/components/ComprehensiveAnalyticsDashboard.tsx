import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RefreshCw,
  Settings,
  Activity,
  Heart,
  Moon,
  Droplet,
  Footprints,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface MetricStats {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  trend: number;
  latest: number;
  unit: string;
}

interface ProviderAnalytics {
  provider: string;
  providerId: string;
  status: string;
  lastSync: string;
  displayName: string;
  icon: string;
  colorScheme: {
    primary: string;
    secondary: string;
  };
  metrics: Array<{
    category: string;
    statistics: MetricStats;
  }>;
  cached: boolean;
}

interface RotationState {
  isActive: boolean;
  currentSourceIndex: number;
  rotationOrder: string[];
  intervalSeconds: number;
  nextRotationAt: string;
  totalRotations: number;
}

const iconMap: Record<string, any> = {
  Activity,
  Heart,
  Moon,
  Droplet,
  Footprints,
  Flame,
  Globe: Activity,
  Circle: Activity,
  Apple: Heart,
  Scale: Activity,
  Navigation: Activity,
  Zap: Activity,
};

const metricIconMap: Record<string, any> = {
  steps: Footprints,
  heart_rate: Heart,
  sleep: Moon,
  glucose: Droplet,
  calories: Flame,
  activity: Activity,
  distance: Footprints,
};

export default function ComprehensiveAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<ProviderAnalytics[]>([]);
  const [rotationState, setRotationState] = useState<RotationState | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const [timePeriod, setTimePeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rotationSpeed, setRotationSpeed] = useState(30);
  const [viewMode, setViewMode] = useState<'rotation' | 'grid'>('rotation');

  const fetchAnalytics = useCallback(async (refreshCache = false) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analytics-aggregator`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            timePeriod,
            refreshCache,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();

      if (result.success) {
        setAnalytics(result.analytics);

        // Update rotation order if not set
        if (!rotationState || rotationState.rotationOrder.length === 0) {
          const providers = result.analytics.map((a: ProviderAnalytics) => a.provider);
          await updateRotationOrder(providers);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [timePeriod, rotationState]);

  const fetchRotationState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('analytics_rotation_state')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setRotationState(data);
        setCurrentIndex(data.currentSourceIndex);
        setIsRotating(data.isActive);
        setRotationSpeed(data.intervalSeconds);
      }
    } catch (err) {
      console.error('Error fetching rotation state:', err);
    }
  }, []);

  const updateRotationOrder = async (providers: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('analytics_rotation_state')
        .upsert({
          user_id: user.id,
          rotation_order: providers,
          interval_seconds: rotationSpeed,
        });

      if (error) throw error;

      await fetchRotationState();
    } catch (err) {
      console.error('Error updating rotation order:', err);
    }
  };

  const advanceRotation = useCallback(async () => {
    if (analytics.length === 0) return;

    const nextIndex = (currentIndex + 1) % analytics.length;
    setCurrentIndex(nextIndex);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('analytics_rotation_state')
        .update({
          current_source_index: nextIndex,
          last_rotation_at: new Date().toISOString(),
          next_rotation_at: new Date(Date.now() + rotationSpeed * 1000).toISOString(),
          total_rotations: (rotationState?.totalRotations || 0) + 1,
        })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error advancing rotation:', err);
    }
  }, [currentIndex, analytics.length, rotationSpeed, rotationState]);

  const toggleRotation = async () => {
    const newState = !isRotating;
    setIsRotating(newState);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('analytics_rotation_state')
        .update({
          is_active: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error toggling rotation:', err);
    }
  };

  const previousSource = () => {
    if (analytics.length === 0) return;
    const prevIndex = currentIndex === 0 ? analytics.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
  };

  const nextSource = () => {
    advanceRotation();
  };

  useEffect(() => {
    fetchAnalytics();
    fetchRotationState();
  }, []);

  useEffect(() => {
    if (isRotating && analytics.length > 0) {
      const interval = setInterval(() => {
        advanceRotation();
      }, rotationSpeed * 1000);

      return () => clearInterval(interval);
    }
  }, [isRotating, rotationSpeed, advanceRotation, analytics.length]);

  const currentAnalytics = analytics[currentIndex];

  const renderMetricCard = (metric: { category: string; statistics: MetricStats }, provider: ProviderAnalytics) => {
    const MetricIcon = metricIconMap[metric.category] || Activity;
    const isPositiveTrend = metric.statistics.trend > 0;
    const isNegativeTrend = metric.statistics.trend < 0;

    return (
      <div
        key={metric.category}
        className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-white/20 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${provider.colorScheme.primary}, ${provider.colorScheme.secondary})`,
              }}
            >
              <MetricIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-medium capitalize">
                {metric.category.replace(/_/g, ' ')}
              </h3>
              <p className="text-xs text-gray-400">{timePeriod}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {isPositiveTrend && (
              <>
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-green-400">+{metric.statistics.trend.toFixed(1)}%</span>
              </>
            )}
            {isNegativeTrend && (
              <>
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-red-400">{metric.statistics.trend.toFixed(1)}%</span>
              </>
            )}
            {!isPositiveTrend && !isNegativeTrend && (
              <>
                <Minus className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">0%</span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-3xl font-bold text-white">
              {metric.statistics.latest.toLocaleString()}
              <span className="text-lg text-gray-400 ml-2">{metric.statistics.unit}</span>
            </div>
            <p className="text-sm text-gray-400">Latest Reading</p>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
            <div>
              <div className="text-sm font-semibold text-white">
                {metric.statistics.avg.toFixed(1)}
              </div>
              <p className="text-xs text-gray-400">Average</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {metric.statistics.min.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">Min</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {metric.statistics.max.toLocaleString()}
              </div>
              <p className="text-xs text-gray-400">Max</p>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            {metric.statistics.count} data points
          </div>
        </div>
      </div>
    );
  };

  if (loading && analytics.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h3 className="text-red-400 font-medium">Error Loading Analytics</h3>
        </div>
        <p className="text-gray-300">{error}</p>
        <button
          onClick={() => fetchAnalytics(true)}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (analytics.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Data Sources Connected</h3>
        <p className="text-gray-400 mb-6">
          Connect health devices and apps to see comprehensive analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-white">Health Analytics</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last {timePeriod}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Period Selector */}
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="year">Last Year</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex gap-1 bg-white/10 rounded-lg p-1">
              <button
                onClick={() => setViewMode('rotation')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'rotation'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                } transition-colors text-sm`}
              >
                Rotation
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                } transition-colors text-sm`}
              >
                Grid
              </button>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={loading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Rotation Controls */}
        {viewMode === 'rotation' && (
          <div className="mt-4 flex items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <button
                onClick={previousSource}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Previous Source"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={toggleRotation}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  isRotating
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isRotating ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause Rotation
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Rotation
                  </>
                )}
              </button>

              <button
                onClick={nextSource}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                title="Next Source"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 ml-4">
                <label className="text-sm text-gray-400">Speed:</label>
                <select
                  value={rotationSpeed}
                  onChange={(e) => setRotationSpeed(Number(e.target.value))}
                  className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={10}>10s</option>
                  <option value={30}>30s</option>
                  <option value={60}>1min</option>
                  <option value={300}>5min</option>
                </select>
              </div>
            </div>

            <div className="text-sm text-gray-400">
              Source {currentIndex + 1} of {analytics.length}
            </div>
          </div>
        )}
      </div>

      {/* Analytics Display */}
      {viewMode === 'rotation' && currentAnalytics && (
        <div className="space-y-6">
          {/* Source Header */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${currentAnalytics.colorScheme.primary}, ${currentAnalytics.colorScheme.secondary})`,
                  }}
                >
                  {React.createElement(iconMap[currentAnalytics.icon] || Activity, {
                    className: 'w-8 h-8 text-white',
                  })}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {currentAnalytics.displayName}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      {currentAnalytics.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      <span className="text-sm text-gray-400 capitalize">
                        {currentAnalytics.status}
                      </span>
                    </div>
                    {currentAnalytics.lastSync && (
                      <span className="text-sm text-gray-400">
                        Last sync: {new Date(currentAnalytics.lastSync).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {currentAnalytics.cached && (
                <div className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 rounded-full text-sm text-blue-400">
                  Cached Data
                </div>
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentAnalytics.metrics.map((metric) =>
              renderMetricCard(metric, currentAnalytics)
            )}
          </div>

          {currentAnalytics.metrics.length === 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No metrics available for this period</p>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-8">
          {analytics.map((provider) => (
            <div key={provider.providerId} className="space-y-4">
              {/* Provider Header */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${provider.colorScheme.primary}, ${provider.colorScheme.secondary})`,
                  }}
                >
                  {React.createElement(iconMap[provider.icon] || Activity, {
                    className: 'w-5 h-5 text-white',
                  })}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{provider.displayName}</h3>
                  <p className="text-sm text-gray-400">
                    {provider.metrics.length} metrics available
                  </p>
                </div>
              </div>

              {/* Provider Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {provider.metrics.map((metric) => renderMetricCard(metric, provider))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
