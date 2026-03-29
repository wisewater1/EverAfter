import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Connection {
  id: string;
  provider: string;
  status: string;
  created_at: string;
  last_sync_at: string | null;
  category: 'health' | 'social' | 'data' | 'service';
}

interface ConnectionsContextType {
  connections: Connection[];
  loading: boolean;
  isPanelOpen: boolean;
  activeCategory: string | null;
  openConnectionsPanel: (category?: string) => void;
  closeConnectionsPanel: () => void;
  refreshConnections: () => Promise<void>;
  getConnectionsByCategory: (category: string) => Connection[];
  getActiveConnectionsCount: () => number;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export function ConnectionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('provider_accounts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnections();

    // Subscribe to real-time updates
    if (user) {
      const subscription = supabase
        .channel('connections-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'provider_accounts',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadConnections();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, loadConnections]);

  const openConnectionsPanel = useCallback((category?: string) => {
    setActiveCategory(category || null);
    setIsPanelOpen(true);
  }, []);

  const closeConnectionsPanel = useCallback(() => {
    setIsPanelOpen(false);
    setActiveCategory(null);
  }, []);

  const refreshConnections = useCallback(async () => {
    await loadConnections();
  }, [loadConnections]);

  const getConnectionsByCategory = useCallback((category: string) => {
    return connections.filter(conn => conn.category === category);
  }, [connections]);

  const getActiveConnectionsCount = useCallback(() => {
    return connections.filter(conn => conn.status === 'active').length;
  }, [connections]);

  const value: ConnectionsContextType = {
    connections,
    loading,
    isPanelOpen,
    activeCategory,
    openConnectionsPanel,
    closeConnectionsPanel,
    refreshConnections,
    getConnectionsByCategory,
    getActiveConnectionsCount,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
}

export function useConnections() {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
}
