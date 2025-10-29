import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { Alert } from '../../lib/raphael/monitors';

interface TodayAlertsCardProps {
  alerts: Alert[];
}

export default function TodayAlertsCard({ alerts }: TodayAlertsCardProps) {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-400" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'critical':
        return 'from-red-500/10 to-red-600/5 border-red-500/20';
      case 'warning':
        return 'from-amber-500/10 to-amber-600/5 border-amber-500/20';
      default:
        return 'from-cyan-500/10 to-cyan-600/5 border-cyan-500/20';
    }
  };

  return (
    <div className="glass-card neon-border group cursor-pointer">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Alerts</h3>
          {alerts.length === 0 && (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-400">All clear today</p>
            <p className="text-xs text-slate-500 mt-1">No alerts or warnings</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg bg-gradient-to-br ${getAlertColor(alert.type)} border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {alert.message}
                    </p>
                    {alert.value && (
                      <p className="text-xs text-slate-400 mt-1">
                        Value: {alert.value.toFixed(1)}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length > 3 && (
              <button className="w-full py-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                +{alerts.length - 3} more alerts
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
