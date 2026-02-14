import React from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';
import { useNotification, Notification } from '../contexts/NotificationContext';

export default function NotificationToast() {
    const { notifications, dismissNotification } = useNotification();

    if (notifications.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full pointer-events-none px-4 sm:px-0">
            {notifications.map((notification) => (
                <Toast key={notification.id} notification={notification} onDismiss={dismissNotification} />
            ))}
        </div>
    );
}

function Toast({ notification, onDismiss }: { notification: Notification; onDismiss: (id: string) => void }) {
    const typeConfig = {
        success: {
            icon: CheckCircle,
            bgClass: 'bg-emerald-950/90 border-emerald-500/30 shadow-emerald-500/10',
            iconClass: 'text-emerald-400',
            textClass: 'text-emerald-100',
        },
        error: {
            icon: AlertCircle,
            bgClass: 'bg-red-950/90 border-red-500/30 shadow-red-500/10',
            iconClass: 'text-red-400',
            textClass: 'text-red-100',
        },
        warning: {
            icon: AlertTriangle,
            bgClass: 'bg-amber-950/90 border-amber-500/30 shadow-amber-500/10',
            iconClass: 'text-amber-400',
            textClass: 'text-amber-100',
        },
        info: {
            icon: Info,
            bgClass: 'bg-slate-900/90 border-slate-500/30 shadow-slate-500/10',
            iconClass: 'text-sky-400',
            textClass: 'text-slate-100',
        },
    };

    const config = typeConfig[notification.type];
    const Icon = config.icon;

    return (
        <div
            className={`${config.bgClass} backdrop-blur-xl border rounded-xl shadow-lg p-4 pointer-events-auto transform transition-all duration-300 animate-slide-in-right flex items-start gap-3`}
            role="alert"
        >
            <div className={`flex-shrink-0 mt-0.5 ${config.iconClass}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${config.textClass}`}>
                    {notification.message}
                </p>
            </div>
            <button
                onClick={() => onDismiss(notification.id)}
                className={`flex-shrink-0 text-slate-400 hover:text-white transition-colors`}
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
