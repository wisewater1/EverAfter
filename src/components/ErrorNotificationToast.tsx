import React from 'react';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useErrorNotification, ErrorNotification } from '../contexts/ErrorNotificationContext';

export default function ErrorNotificationToast() {
  const { notifications, dismissError } = useErrorNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md pointer-events-none">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} onDismiss={dismissError} />
      ))}
    </div>
  );
}

function Toast({ notification, onDismiss }: { notification: ErrorNotification; onDismiss: (id: string) => void }) {
  const severityConfig = {
    critical: {
      icon: AlertCircle,
      bgClass: 'bg-red-950/95 border-red-800',
      iconClass: 'text-red-400',
      textClass: 'text-red-100',
    },
    warning: {
      icon: AlertTriangle,
      bgClass: 'bg-amber-950/95 border-amber-800',
      iconClass: 'text-amber-400',
      textClass: 'text-amber-100',
    },
    info: {
      icon: Info,
      bgClass: 'bg-blue-950/95 border-blue-800',
      iconClass: 'text-blue-400',
      textClass: 'text-blue-100',
    },
  };

  const config = severityConfig[notification.severity];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgClass} backdrop-blur-xl border rounded-xl shadow-2xl p-4 pointer-events-auto transform transition-all duration-300 animate-slide-in-right`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${config.iconClass}`}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.textClass} leading-relaxed`}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={() => onDismiss(notification.id)}
          className={`flex-shrink-0 ${config.iconClass} hover:opacity-70 transition-opacity ml-2`}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
