import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { TrendPoint } from '../../lib/raphael/monitors';

interface TodayTrendsCardProps {
  trends: TrendPoint[];
}

export default function TodayTrendsCard({ trends }: TodayTrendsCardProps) {
  const getTrendIcon = (direction: TrendPoint['direction']) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTrendColor = (direction: TrendPoint['direction']) => {
    switch (direction) {
      case 'up':
        return 'text-emerald-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-slate-400';
    }
  };

  const formatMetricName = (metric: string) => {
    return metric
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="ea-panel group cursor-pointer">
      <div className="relative z-10 p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Trends</h3>

        {trends.length === 0 ? (
          <div className="text-center py-6">
            <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No trend data</p>
            <p className="text-xs text-slate-500 mt-1">Check back after more activity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trends.map((trend, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(trend.direction)}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {formatMetricName(trend.metric)}
                      </p>
                      <p className="text-xs text-slate-500">7-day trend</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${getTrendColor(trend.direction)}`}>
                      {trend.change > 0 ? '+' : ''}{trend.change}%
                    </p>
                    <p className="text-xs text-slate-500">{trend.value.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
