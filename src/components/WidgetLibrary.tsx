import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  X,
  Plus,
  TrendingUp,
  Activity,
  Droplet,
  Heart,
  Moon,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface WidgetType {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  defaultSize: { width: number; height: number };
  requiredSources: string[];
}

const widgetTypes: WidgetType[] = [
  {
    id: 'glucose_trend',
    name: 'Glucose Trend',
    description: 'Real-time glucose levels with trend line and time-in-range',
    icon: Droplet,
    category: 'Glucose',
    defaultSize: { width: 8, height: 4 },
    requiredSources: ['dexcom', 'libre-agg', 'manual'],
  },
  {
    id: 'glucose_stats',
    name: 'Glucose Statistics',
    description: 'Mean, GMI, CV, and TIR summary metrics',
    icon: BarChart3,
    category: 'Glucose',
    defaultSize: { width: 4, height: 3 },
    requiredSources: ['dexcom', 'libre-agg', 'manual'],
  },
  {
    id: 'heart_rate_zones',
    name: 'Heart Rate Zones',
    description: 'Time spent in different heart rate zones',
    icon: Heart,
    category: 'Cardiovascular',
    defaultSize: { width: 6, height: 4 },
    requiredSources: ['fitbit', 'oura', 'polar', 'terra'],
  },
  {
    id: 'hrv_trend',
    name: 'HRV Trend',
    description: 'Heart rate variability over time',
    icon: Activity,
    category: 'Cardiovascular',
    defaultSize: { width: 6, height: 4 },
    requiredSources: ['oura', 'whoop', 'polar'],
  },
  {
    id: 'sleep_stages',
    name: 'Sleep Stages',
    description: 'Visual breakdown of sleep stages throughout the night',
    icon: Moon,
    category: 'Sleep',
    defaultSize: { width: 8, height: 4 },
    requiredSources: ['oura', 'fitbit', 'whoop'],
  },
  {
    id: 'sleep_score',
    name: 'Sleep Score',
    description: 'Overall sleep quality score',
    icon: Target,
    category: 'Sleep',
    defaultSize: { width: 4, height: 3 },
    requiredSources: ['oura', 'fitbit', 'whoop'],
  },
  {
    id: 'activity_summary',
    name: 'Activity Summary',
    description: 'Steps, calories, and active minutes',
    icon: TrendingUp,
    category: 'Activity',
    defaultSize: { width: 4, height: 3 },
    requiredSources: ['fitbit', 'garmin', 'terra'],
  },
  {
    id: 'training_load',
    name: 'Training Load',
    description: 'Training intensity and recovery balance',
    icon: Gauge,
    category: 'Performance',
    defaultSize: { width: 6, height: 4 },
    requiredSources: ['garmin', 'polar', 'whoop'],
  },
  {
    id: 'vo2_max_trend',
    name: 'VO2 Max Trend',
    description: 'Cardio fitness level over time',
    icon: TrendingUp,
    category: 'Performance',
    defaultSize: { width: 6, height: 4 },
    requiredSources: ['garmin', 'polar'],
  },
  {
    id: 'correlation_chart',
    name: 'Correlation Chart',
    description: 'Compare two metrics to find relationships',
    icon: LineChart,
    category: 'Analysis',
    defaultSize: { width: 8, height: 4 },
    requiredSources: [],
  },
  {
    id: 'health_summary',
    name: 'Health Summary',
    description: 'Key metrics overview from all sources',
    icon: LayoutDashboard,
    category: 'Overview',
    defaultSize: { width: 12, height: 2 },
    requiredSources: [],
  },
  {
    id: 'metric_gauge',
    name: 'Metric Gauge',
    description: 'Single metric with goal progress',
    icon: Gauge,
    category: 'Overview',
    defaultSize: { width: 3, height: 3 },
    requiredSources: [],
  },
  {
    id: 'multi_metric_timeline',
    name: 'Multi-Metric Timeline',
    description: 'Multiple metrics on a shared timeline',
    icon: Calendar,
    category: 'Analysis',
    defaultSize: { width: 12, height: 4 },
    requiredSources: [],
  },
  {
    id: 'recovery_score',
    name: 'Recovery Score',
    description: 'Body recovery and readiness indicator',
    icon: Heart,
    category: 'Recovery',
    defaultSize: { width: 4, height: 3 },
    requiredSources: ['oura', 'whoop', 'polar'],
  },
  {
    id: 'strain_recovery',
    name: 'Strain vs Recovery',
    description: 'Balance between training and recovery',
    icon: BarChart3,
    category: 'Recovery',
    defaultSize: { width: 8, height: 4 },
    requiredSources: ['whoop'],
  },
];

interface WidgetLibraryProps {
  dashboardId: string;
  onClose: () => void;
  onWidgetAdded: () => void;
}

export default function WidgetLibrary({ dashboardId, onClose, onWidgetAdded }: WidgetLibraryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = ['all', ...new Set(widgetTypes.map(w => w.category))];
  const filteredWidgets = selectedCategory === 'all'
    ? widgetTypes
    : widgetTypes.filter(w => w.category === selectedCategory);

  async function addWidget(widgetType: WidgetType) {
    try {
      setAdding(widgetType.id);
      setError(null);

      const { data: existingWidgets } = await supabase
        .from('dashboard_widgets')
        .select('position_y, height')
        .eq('dashboard_id', dashboardId)
        .order('position_y', { ascending: false });

      let nextY = 0;
      if (existingWidgets && existingWidgets.length > 0) {
        const lastWidget = existingWidgets[0];
        nextY = lastWidget.position_y + lastWidget.height;
      }

      const { error: insertError } = await supabase
        .from('dashboard_widgets')
        .insert({
          dashboard_id: dashboardId,
          widget_type: widgetType.id,
          title: widgetType.name,
          position_x: 0,
          position_y: nextY,
          width: widgetType.defaultSize.width,
          height: widgetType.defaultSize.height,
          config: {},
          data_sources: [],
        });

      if (insertError) throw insertError;
      onWidgetAdded();
    } catch (err: any) {
      console.error('Error adding widget:', err);
      setError('Failed to add widget');
    } finally {
      setAdding(null);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Widget Library</h2>
              <p className="text-slate-400 text-sm mt-1">
                Add widgets to display your health data
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWidgets.map((widget) => {
              const Icon = widget.icon;
              const isAdding = adding === widget.id;

              return (
                <div
                  key={widget.id}
                  className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold mb-1">{widget.name}</h4>
                      <p className="text-sm text-slate-400 line-clamp-2">{widget.description}</p>
                    </div>
                  </div>

                  <div className="mb-3 text-xs text-slate-500">
                    Size: {widget.defaultSize.width}×{widget.defaultSize.height} units
                  </div>

                  {widget.requiredSources.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-slate-500 mb-1">Data sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {widget.requiredSources.slice(0, 2).map((source) => (
                          <span
                            key={source}
                            className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded"
                          >
                            {source}
                          </span>
                        ))}
                        {widget.requiredSources.length > 2 && (
                          <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                            +{widget.requiredSources.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => addWidget(widget)}
                    disabled={isAdding}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {isAdding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Add to Dashboard
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
