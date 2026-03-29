import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Droplet,
  Moon,
  Loader,
  Trash2,
  RefreshCw,
  AlertCircle,
  Brain,
  Sparkles,
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

export interface WidgetPayload {
  status: 'ready' | 'empty' | 'planned' | 'error';
  data?: any;
  error?: string;
}

interface WidgetRendererProps {
  widget: Widget;
  payload?: WidgetPayload | null;
  loading?: boolean;
  editMode?: boolean;
  onDelete?: () => void;
  onRefresh?: () => void;
  onPositionChange?: (x: number, y: number) => void;
  onSizeChange?: (width: number, height: number) => void;
}

export default function WidgetRenderer({
  widget,
  payload,
  loading = false,
  editMode = false,
  onDelete,
  onRefresh,
}: WidgetRendererProps) {
  const data = payload?.data;

  function renderStateCard(message: string, tone: 'muted' | 'error' | 'planned' = 'muted') {
    const toneClasses =
      tone === 'error'
        ? 'text-red-400'
        : tone === 'planned'
          ? 'text-amber-300'
          : 'text-slate-400';

    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-center">
          <AlertCircle className={`mx-auto mb-2 h-8 w-8 ${toneClasses}`} />
          <p className={`text-sm ${toneClasses}`}>{message}</p>
        </div>
      </div>
    );
  }

  function renderWidgetContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      );
    }

    if (!payload) {
      return renderStateCard('Loading widget data...');
    }

    if (payload.status === 'planned') {
      return renderStateCard(payload.error || 'This widget is planned and not available yet.', 'planned');
    }

    if (payload.status === 'empty') {
      return renderStateCard(payload.error || 'No data is available for this widget yet.');
    }

    if (payload.status === 'error') {
      return renderStateCard(payload.error || 'Failed to load widget data.', 'error');
    }

    switch (widget.widget_type) {
      case 'glucose_trend':
        return renderGlucoseTrend(data);
      case 'glucose_stats':
        return renderGlucoseStats(data);
      case 'heart_rate_zones':
        return renderHeartRateZones(data);
      case 'hrv_trend':
        return renderHrvTrend(data);
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
      case 'deep_dive_insight':
        return renderDeepDiveInsight(data);
      default:
        return renderStateCard('Widget rendering is not available for this type yet.', 'planned');
    }
  }

  function renderGlucoseTrend(widgetData: any) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-white">{widgetData.current}</div>
            <div className="text-sm text-slate-400">mg/dL</div>
          </div>
          <div className="flex items-center gap-2">
            {widgetData.trend === 'up' && <TrendingUp className="w-5 h-5 text-red-400" />}
            {widgetData.trend === 'down' && <TrendingDown className="w-5 h-5 text-blue-400" />}
            {widgetData.trend === 'stable' && <Minus className="w-5 h-5 text-emerald-400" />}
            <Droplet className="w-8 h-8 text-orange-400" />
          </div>
        </div>
        <div className="flex-1 flex items-end gap-1">
          {(widgetData.readings || []).slice(-12).map((reading: any, index: number) => (
            <div key={index} className="flex-1 flex flex-col items-center">
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
          Time in Range: {widgetData.tir}%
        </div>
      </div>
    );
  }

  function renderGlucoseStats(widgetData: any) {
    return (
      <div className="p-4 h-full">
        <div className="grid grid-cols-2 gap-4 h-full">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Mean</div>
            <div className="text-2xl font-bold text-white">{widgetData.mean}</div>
            <div className="text-xs text-slate-500">mg/dL</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">GMI</div>
            <div className="text-2xl font-bold text-white">{widgetData.gmi}%</div>
          </div>
          <div className="bg-emerald-500/20 rounded-lg p-3">
            <div className="text-xs text-emerald-400 mb-1">In Range</div>
            <div className="text-2xl font-bold text-emerald-300">{widgetData.tir}%</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">CV</div>
            <div className="text-2xl font-bold text-white">{widgetData.cv}%</div>
          </div>
        </div>
      </div>
    );
  }

  function renderHeartRateZones(widgetData: any) {
    const total = (widgetData.zones || []).reduce((sum: number, zone: any) => sum + zone.minutes, 0) || 1;
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex-1 space-y-2">
          {(widgetData.zones || []).map((zone: any, index: number) => (
            <div key={index}>
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

  function renderHrvTrend(widgetData: any) {
    const maxValue = Math.max(...(widgetData.trend || []).map((point: any) => point.value), widgetData.current || 1);
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-white">{widgetData.current}</div>
            <div className="text-sm text-slate-400">ms current</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Baseline</div>
            <div className="text-lg font-semibold text-emerald-300">{widgetData.baseline}</div>
          </div>
        </div>
        <div className="flex-1 flex items-end gap-2">
          {(widgetData.trend || []).map((point: any) => (
            <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t bg-cyan-500/80"
                style={{ height: `${Math.max((point.value / maxValue) * 100, 8)}%` }}
              />
              <span className="text-[10px] text-slate-500">{point.day}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSleepStages(widgetData: any) {
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {(widgetData.stages || []).map((stage: any, index: number) => {
                const percentage = (stage.duration / widgetData.totalMinutes) * 100;
                const offset = (widgetData.stages || [])
                  .slice(0, index)
                  .reduce((sum: number, item: any) => sum + (item.duration / widgetData.totalMinutes) * 100, 0);
                return (
                  <circle
                    key={index}
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
          {(widgetData.stages || []).map((stage: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${stage.color}`} />
              <span className="text-slate-400 capitalize">{stage.type}</span>
              <span className="text-slate-300 ml-auto">{stage.duration}m</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSleepScore(widgetData: any) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center">
        <div className="text-5xl font-bold text-white mb-2">{widgetData.score}</div>
        <div className="text-sm text-emerald-400 mb-4">{widgetData.quality}</div>
        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="text-center">
            <div className="text-xl font-semibold text-white">{widgetData.duration}</div>
            <div className="text-xs text-slate-400">hours</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-white">{widgetData.efficiency}%</div>
            <div className="text-xs text-slate-400">efficiency</div>
          </div>
        </div>
      </div>
    );
  }

  function renderActivitySummary(widgetData: any) {
    const progress = widgetData.goal ? (widgetData.steps / widgetData.goal) * 100 : 0;
    return (
      <div className="p-4 h-full flex flex-col">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Steps</span>
            <span className="text-sm text-white">{Number(widgetData.steps || 0).toLocaleString()}</span>
          </div>
          <div className="h-2 bg-slate-700/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-1">Goal: {Number(widgetData.goal || 0).toLocaleString()}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Calories</div>
            <div className="text-xl font-bold text-white">{widgetData.calories}</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">Active</div>
            <div className="text-xl font-bold text-white">{widgetData.activeMinutes}m</div>
          </div>
        </div>
      </div>
    );
  }

  function renderHealthSummary(widgetData: any) {
    return (
      <div className="p-4 h-full flex items-center gap-4 overflow-x-auto">
        {(widgetData.metrics || []).map((metric: any, index: number) => (
          <div
            key={index}
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

  function renderMetricGauge(widgetData: any) {
    const percentage = widgetData.goal ? (widgetData.value / widgetData.goal) * 100 : 0;
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
              <div className="text-2xl font-bold text-white">{widgetData.value}</div>
              <div className="text-xs text-slate-400">{widgetData.unit}</div>
            </div>
          </div>
        </div>
        <div className="text-sm text-slate-400">{widgetData.label}</div>
      </div>
    );
  }

  function renderDeepDiveInsight(widgetData: any) {
    return (
      <div className="p-4 h-full flex flex-col bg-gradient-to-br from-violet-900/10 to-pink-900/10 rounded-xl overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-white font-semibold flex items-center gap-2">
              {widgetData.title}
              <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
            </h4>
            <p className="text-xs text-violet-300">Generated from imported and normalized health history</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed flex-1">
          {widgetData.description}
        </p>
        <div className="mt-4 pt-3 border-t border-violet-500/20">
          <p className="text-xs text-violet-400 mb-2 font-medium">Key Factors Identified:</p>
          <div className="flex flex-wrap gap-2">
            {(widgetData.factors || []).map((factor: string, index: number) => (
              <span key={index} className="px-2 py-1 bg-violet-600/20 text-violet-300 rounded text-xs">
                {factor}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden group relative">
      {editMode && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onRefresh}
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
            onClick={onRefresh}
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
