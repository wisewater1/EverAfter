import React from 'react';
import { Heart, Activity, Droplet, Moon, Footprints } from 'lucide-react';
import type { VitalsSummary } from '../../lib/raphael/monitors';

interface TodayVitalsCardProps {
  summary: VitalsSummary | null;
}

export default function TodayVitalsCard({ summary }: TodayVitalsCardProps) {
  if (!summary) {
    return (
      <div className="ea-panel group cursor-pointer">
        <div className="relative z-10 p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Vitals</h3>
          <div className="text-center py-6">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No vitals data</p>
            <p className="text-xs text-slate-500 mt-1">Connect devices to see vitals</p>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
      case 'good':
        return 'text-emerald-400';
      case 'elevated':
      case 'high':
      case 'fair':
        return 'text-amber-400';
      case 'low':
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="ea-panel group cursor-pointer">
      <div className="relative z-10 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Vitals</h3>
          <span className="text-xs text-slate-500">
            {new Date(summary.lastUpdated).toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-3">
          {summary.heartRate && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-slate-300">Heart Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getStatusColor(summary.heartRate.status)}`}>
                  {summary.heartRate.value}
                </span>
                <span className="text-xs text-slate-500">bpm</span>
              </div>
            </div>
          )}

          {summary.glucose && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Droplet className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-slate-300">Glucose</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getStatusColor(summary.glucose.status)}`}>
                  {summary.glucose.value}
                </span>
                <span className="text-xs text-slate-500">{summary.glucose.unit}</span>
              </div>
            </div>
          )}

          {summary.steps && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Footprints className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-300">Steps</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {summary.steps.value.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">
                  / {summary.steps.goal.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {summary.sleep && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-slate-300">Sleep</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${getStatusColor(summary.sleep.quality)}`}>
                  {summary.sleep.hours}h
                </span>
                <span className="text-xs text-slate-500 capitalize">{summary.sleep.quality}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
