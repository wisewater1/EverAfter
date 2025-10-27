import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Droplet,
  Heart,
  Moon,
  Activity,
  Loader,
  Settings,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface Widget {
  id: string;
  widget_type: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: any;
  data_sources: string[];
  refresh_interval: number;
}

interface WidgetRendererProps {
  widget: Widget;
  editMode?: boolean;
  onDelete?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onSizeChange?: (width: number, height: number) => void;
}

export default function WidgetRenderer({
  widget,
  editMode = false,
  onDelete,
  onPositionChange,
  onSizeChange,
}: WidgetRendererProps) {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWidgetData();
    const interval = setInterval(loadWidgetData, widget.refresh_interval * 1000);
    return () => clearInterval(interval);
  }, [widget.id, widget.config, widget.data_sources]);

  async function loadWidgetData() {
    try {
      setLoading(true);
      setError(null);

      const mockData = generateMockData(widget.widget_type);
      setData(mockData);
    } catch (err: any) {
      console.error('Error loading widget data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  function generateMockData(widgetType: string): any {
    switch (widgetType) {
      case 'glucose_trend':
        return {
          current: 125,
          trend: 'stable',
          readings: Array.from({ length: 24 }, (_, i) => ({
            time: `${i}:00`,
            value: 90 + Math.random() * 80,
          })),
          tir: 72,
        };

      case 'glucose_stats':
        return {
          mean: 132,
          gmi: 6.4,
          cv: 38,
          tir: 72,
          below: 5,
          above: 23,
        };

      case 'heart_rate_zones':
        return {
          zones: [
            { name: 'Rest', minutes: 1200, color: 'bg-gray-500' },
            { name: 'Light', minutes: 180, color: 'bg-blue-500' },
            { name: 'Moderate', minutes: 90, color: 'bg-green-500' },
            { name: 'Hard', minutes: 45, color: 'bg-yellow-500' },
            { name: 'Max', minutes: 15, color: 'bg-red-500' },
          ],
        };

      case 'hrv_trend':
        return {
          current: 62,
          baseline: 58,
          trend: Array.from({ length: 7 }, (_, i) => ({
            day: `Day ${i + 1}`,
            value: 50 + Math.random() * 30,
          })),
        };

      case 'sleep_stages':
        return {
          stages: [
            { type: 'awake', duration: 20, color: 'bg-red-500' },
            { type: 'light', duration: 180, color: 'bg-blue-400' },
            { type: 'deep', duration: 90, color: 'bg-blue-700' },
            { type: 'rem', duration: 110, color: 'bg-purple-500' },
          ],
          totalMinutes: 400,
        };

      case 'sleep_score':
        return {
          score: 84,
          quality: 'Good',
          duration: 7.2,
          efficiency: 92,
        };

      case 'activity_summary':
        return {
          steps: 8542,
          goal: 10000,
          calories: 2340,
          activeMinutes: 67,
        };

      case 'health_summary':
        return {
          metrics: [
            { label: 'Glucose', value: 125, unit: 'mg/dL', status: 'good' },
            { label: 'Heart Rate', value: 68, unit: 'bpm', status: 'good' },
            { label: 'Sleep', value: 7.2, unit: 'hrs', status: 'good' },
            { label: 'Steps', value: 8542, unit: 'steps', status: 'warning' },
          ],
        };

      case 'metric_gauge':
        return {
          value: 72,
          goal: 100,
          label: 'Daily Goal',
          unit: '%',
        };

      default:
        return { message: 'Widget data coming soon' };
    }
  }

  function renderWidgetContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      );
    }

    switch (widget.widget_type) {
      case 'glucose_trend':
        return renderGlucoseTrend(data);
      case 'glucose_stats':
        return renderGlucoseStats(data);
      case 'heart_rate_zones':
        return renderHeartRateZones(data);
      case 'sleep_stages':
        return renderSleepStages(data);
      case 'sleep_score':
        return renderSleepScore(data);
      case 'activity_summary':
        return renderActivitySummary(data);
      case 'health_summary':
        return renderHealthSummary(data);
      case 'metric_gauge':
        return renderMetricGauge(data);
      default:
        return (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            <p>{data?.message || 'Widget rendering coming soon'}</p>
          </div>
        );
    }
  }

  function renderGlucoseTrend(data: any) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-white">{data.current}</div>
            <div className="text-sm text-slate-400">mg/dL</div>
          </div>
          <div className="flex items-center gap-2">
            {data.trend === 'up' && <TrendingUp className="w-5 h-5 text-red-400" />}
            {data.trend === 'down' && <TrendingDown className="w-5 h-5 text-blue-400" />}
            {data.trend === 'stable' && <Minus className="w-5 h-5 text-emerald-400" />}
            <Droplet className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        <div className="flex-1 flex items-end gap-1">
          {data.readings.slice(-12).map((reading: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full rounded-t ${
                  reading.value < 70
                    ? 'bg-red-500'
                    : reading.value > 180
                    ? 'bg-orange-500'
                    : 'bg-emerald-500'
                }`}
                style={{ height: `${(reading.value / 200) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-slate-400 text-center">
          Time in Range: {data.tir}%
        </div>
      </div>
    );
  }

  function renderGlucoseStats(data: any) {
    return (
      <div className="p-4 h-full">
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Mean</div>
            <div className="text-2xl font-bold text-white">{data.mean}</div>
            <div className="text-xs text-slate-500">mg/dL</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">GMI</div>
            <div className="text-2xl font-bold text-white">{data.gmi}%</div>
          </div>
          <div className="bg-emerald-500/20 rounded-lg p-3">
            <div className="text-xs text-emerald-400 mb-1">In Range</div>
            <div className="text-2xl font-bold text-emerald-300">{data.tir}%</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">CV</div>
            <div className="text-2xl font-bold text-white">{data.cv}%</div>
          </div>
        </div>
      </div>
    );
  }

  function renderHeartRateZones(data: any) {
    const total = data.zones.reduce((sum: number, z: any) => sum + z.minutes, 0);
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex-1 space-y-2">
          {data.zones.map((zone: any, i: number) => (
            <div key={i}>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{zone.name}</span>
                <span>{zone.minutes} min</span>
              </div>
              <div className="h-6 bg-slate-700/30 rounded-full overflow-hidden">
                <div
                  className={`h-full ${zone.color} transition-all`}
                  style={{ width: `${(zone.minutes / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSleepStages(data: any) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {data.stages.map((stage: any, i: number) => {
                const percentage = (stage.duration / data.totalMinutes) * 100;
                const offset = data.stages
                  .slice(0, i)
                  .reduce((sum: number, s: any) => sum + (s.duration / data.totalMinutes) * 100, 0);
                return (
                  <circle
                    key={i}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="20"
                    strokeDasharray={`${percentage * 2.513} ${251.3 - percentage * 2.513}`}
                    strokeDashoffset={`${-offset * 2.513}`}
                    className={stage.color.replace('bg-', 'text-')}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Moon className="w-8 h-8 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {data.stages.map((stage: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${stage.color}`} />
              <span className="text-slate-400 capitalize">{stage.type}</span>
              <span className="text-slate-300 ml-auto">{stage.duration}m</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSleepScore(data: any) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-white mb-2">{data.score}</div>
        <div className="text-sm text-emerald-400 mb-4">{data.quality}</div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <div className="text-xl font-semibold text-white">{data.duration}</div>
            <div className="text-xs text-slate-400">hours</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-white">{data.efficiency}%</div>
            <div className="text-xs text-slate-400">efficiency</div>
          </div>
        </div>
      </div>
    );
  }

  function renderActivitySummary(data: any) {
    const progress = (data.steps / data.goal) * 100;
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Steps</span>
            <span className="text-sm text-white">{data.steps.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">Goal: {data.goal.toLocaleString()}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Calories</div>
            <div className="text-xl font-bold text-white">{data.calories}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Active</div>
            <div className="text-xl font-bold text-white">{data.activeMinutes}m</div>
          </div>
        </div>
      </div>
    );
  }

  function renderHealthSummary(data: any) {
    return (
      <div className="p-4 h-full flex items-center gap-4 overflow-x-auto">
        {data.metrics.map((metric: any, i: number) => (
          <div
            key={i}
            className="flex-shrink-0 bg-slate-700/30 rounded-lg p-4 min-w-[140px] text-center"
          >
            <div className="text-xs text-slate-400 mb-1">{metric.label}</div>
            <div className="text-2xl font-bold text-white mb-1">{metric.value}</div>
            <div className="text-xs text-slate-500">{metric.unit}</div>
          </div>
        ))}
      </div>
    );
  }

  function renderMetricGauge(data: any) {
    const percentage = (data.value / data.goal) * 100;
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 mb-4">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-700/30"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={`${percentage * 2.513} ${251.3 - percentage * 2.513}`}
              className="text-blue-500 transition-all"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{data.value}</div>
              <div className="text-xs text-slate-400">{data.unit}</div>
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-400">{data.label}</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden group relative">
      {editMode && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={loadWidgetData}
            className="p-1.5 bg-slate-900/90 hover:bg-slate-900 rounded text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 bg-slate-900/90 hover:bg-red-900 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{widget.title}</h3>
        {!editMode && (
          <button
            onClick={loadWidgetData}
            className="p-1 hover:bg-slate-700/50 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 hover:text-slate-400" />
          </button>
        )}
      </div>

      <div className="h-[calc(100%-52px)]">{renderWidgetContent()}</div>
    </div>
  );
}
