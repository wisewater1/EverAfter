import { useState, useEffect } from 'react';
import { Heart, Activity, Moon, Droplet, TrendingUp, TrendingDown, Minus, Calendar, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MetricDataPoint {
  ts: string;
  value: number;
  quality?: string;
}

interface MetricStats {
  current: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  unit: string;
}

interface MetricCard {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  metricType: string;
  unit: string;
}

const METRIC_CARDS: MetricCard[] = [
  {
    id: 'heart_rate',
    name: 'Heart Rate',
    icon: <Heart className="w-6 h-6" />,
    color: 'from-red-500 to-pink-500',
    metricType: 'heart_rate',
    unit: 'bpm',
  },
  {
    id: 'steps',
    name: 'Steps',
    icon: <Activity className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    metricType: 'steps',
    unit: 'steps',
  },
  {
    id: 'sleep',
    name: 'Sleep',
    icon: <Moon className="w-6 h-6" />,
    color: 'from-purple-500 to-indigo-500',
    metricType: 'sleep_duration',
    unit: 'hours',
  },
  {
    id: 'glucose',
    name: 'Glucose',
    icon: <Droplet className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-500',
    metricType: 'glucose',
    unit: 'mg/dL',
  },
  {
    id: 'calories',
    name: 'Calories',
    icon: <Activity className="w-6 h-6" />,
    color: 'from-orange-500 to-amber-500',
    metricType: 'calories_burned',
    unit: 'kcal',
  },
  {
    id: 'hrv',
    name: 'HRV',
    icon: <Heart className="w-6 h-6" />,
    color: 'from-teal-500 to-cyan-500',
    metricType: 'hrv',
    unit: 'ms',
  },
];

export default function TerraMetricsVisualization() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedMetric, setSelectedMetric] = useState<MetricCard>(METRIC_CARDS[0]);
  const [metricsData, setMetricsData] = useState<Record<string, MetricDataPoint[]>>({});
  const [stats, setStats] = useState<Record<string, MetricStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadMetrics();
    }
  }, [user, timeRange]);

  const loadMetrics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const now = new Date();
      const startDate = new Date(now);

      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      const promises = METRIC_CARDS.map(async (card) => {
        const { data } = await supabase
          .from('terra_metrics_norm')
          .select('ts, value, quality')
          .eq('user_id', user.id)
          .eq('metric_type', card.metricType)
          .gte('ts', startDate.toISOString())
          .lte('ts', now.toISOString())
          .order('ts', { ascending: true });

        return { metricType: card.metricType, data: data || [] };
      });

      const results = await Promise.all(promises);
      const dataMap: Record<string, MetricDataPoint[]> = {};
      const statsMap: Record<string, MetricStats> = {};

      results.forEach(({ metricType, data }) => {
        dataMap[metricType] = data;

        if (data.length > 0) {
          const values = data.map(d => d.value);
          const current = values[values.length - 1];
          const average = values.reduce((a, b) => a + b, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          const midpoint = Math.floor(values.length / 2);
          const firstHalf = values.slice(0, midpoint);
          const secondHalf = values.slice(midpoint);
          const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
          const change = ((secondAvg - firstAvg) / firstAvg) * 100;

          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (Math.abs(change) > 5) {
            trend = change > 0 ? 'up' : 'down';
          }

          const card = METRIC_CARDS.find(c => c.metricType === metricType);

          statsMap[metricType] = {
            current,
            average,
            min,
            max,
            trend,
            change,
            unit: card?.unit || '',
          };
        }
      });

      setMetricsData(dataMap);
      setStats(statsMap);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    const data = metricsData[selectedMetric.metricType];
    if (!data || data.length === 0) return;

    const csv = [
      ['Timestamp', 'Value', 'Quality'],
      ...data.map(d => [d.ts, d.value, d.quality || 'good'])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedMetric.id}_${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'hours') {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}h ${minutes}m`;
    }
    return `${value.toFixed(1)} ${unit}`;
  };

  const currentStats = stats[selectedMetric.metricType];
  const currentData = metricsData[selectedMetric.metricType] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Health Metrics</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '24h'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              timeRange === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {METRIC_CARDS.map((card) => {
          const metricStats = stats[card.metricType];
          const hasData = metricStats && metricStats.current > 0;

          return (
            <button
              key={card.id}
              onClick={() => setSelectedMetric(card)}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedMetric.id === card.id
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white mb-3`}>
                {card.icon}
              </div>
              <div className="text-left">
                <p className="text-sm text-gray-400 mb-1">{card.name}</p>
                {hasData ? (
                  <p className="text-lg font-bold text-white">
                    {formatValue(metricStats.current, card.unit)}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">No data</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-12 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading metrics...</p>
        </div>
      ) : currentStats ? (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${selectedMetric.color} flex items-center justify-center text-white`}>
                {selectedMetric.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{selectedMetric.name}</h3>
                <p className="text-sm text-gray-400">
                  {timeRange === '24h' ? 'Last 24 hours' : timeRange === '7d' ? 'Last 7 days' : 'Last 30 days'}
                </p>
              </div>
            </div>
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Current"
              value={formatValue(currentStats.current, currentStats.unit)}
              trend={currentStats.trend}
              change={currentStats.change}
            />
            <StatCard
              label="Average"
              value={formatValue(currentStats.average, currentStats.unit)}
            />
            <StatCard
              label="Minimum"
              value={formatValue(currentStats.min, currentStats.unit)}
            />
            <StatCard
              label="Maximum"
              value={formatValue(currentStats.max, currentStats.unit)}
            />
          </div>

          <div className="bg-gray-900/50 rounded-xl p-6 h-64 relative">
            <MiniChart data={currentData} color={selectedMetric.color} unit={currentStats.unit} />
          </div>

          {currentData.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No data available for this time range</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Data Available</h3>
          <p className="text-gray-400">Connect a device to start tracking {selectedMetric.name.toLowerCase()}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, trend, change }: { label: string; value: string; trend?: 'up' | 'down' | 'stable'; change?: number }) {
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {trend && change !== undefined && (
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
          {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
          {trend === 'stable' && <Minus className="w-4 h-4 text-gray-400" />}
          <span className={`text-xs ${
            trend === 'up' ? 'text-green-400' :
            trend === 'down' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function MiniChart({ data, color, unit }: { data: MetricDataPoint[]; color: string; unit: string }) {
  if (data.length === 0) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`0,100 ${points} 100,100`}
        fill={`url(#gradient-${color})`}
        className={`text-blue-500`}
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.5"
        className={`text-blue-400`}
      />
    </svg>
  );
}
