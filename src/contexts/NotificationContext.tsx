import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
}

interface NotificationContextType {
    notifications: Notification[];
    showNotification: (message: string, type: NotificationType, duration?: number) => void;
    dismissNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const dismissNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showNotification = useCallback((message: string, type: NotificationType, duration = 5000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const notification: Notification = { id, message, type, duration };

        setNotifications((prev) => [...prev, notification]);

        if (duration > 0) {
            setTimeout(() => {
                dismissNotification(id);
            }, duration);
        }
    }, [dismissNotification]);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
