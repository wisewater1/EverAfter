import React, { createContext, useContext, useState, useCallback } from 'react';

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface ErrorNotification {
  id: string;
  message: string;
  severity: ErrorSeverity;
  timestamp: number;
}

interface ErrorNotificationContextType {
  notifications: ErrorNotification[];
  showError: (message: string, severity?: ErrorSeverity) => void;
  dismissError: (id: string) => void;
  clearAll: () => void;
}

const ErrorNotificationContext = createContext<ErrorNotificationContextType | undefined>(undefined);

export function ErrorNotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  const showError = useCallback((message: string, severity: ErrorSeverity = 'critical') => {
    const notification: ErrorNotification = {
      id: `error-${Date.now()}-${Math.random()}`,
      message,
      severity,
      timestamp: Date.now(),
    };

    setNotifications((prev) => [...prev, notification]);

    if (severity !== 'critical') {
      setTimeout(() => {
        dismissError(notification.id);
      }, 5000);
    }
  }, []);

  const dismissError = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <ErrorNotificationContext.Provider value={{ notifications, showError, dismissError, clearAll }}>
      {children}
    </ErrorNotificationContext.Provider>
  );
}

export function useErrorNotification() {
  const context = useContext(ErrorNotificationContext);
  if (!context) {
    throw new Error('useErrorNotification must be used within ErrorNotificationProvider');
  }
  return context;
}
