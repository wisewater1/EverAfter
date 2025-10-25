import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, RefreshCw, Settings } from 'lucide-react';

interface HealthConnection {
  id: string;
  service_name: string;
  service_type: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  last_sync_at: string | null;
  error_message: string | null;
}

export default function HealthConnectionStatus() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('health_connections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setConnections(data);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncConnection = async (connectionId: string) => {
    setSyncing(connectionId);
    try {
      const { error } = await supabase
        .from('health_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          status: 'connected'
        })
        .eq('id', connectionId);

      if (error) throw error;
      await fetchConnections();
    } catch (error) {
      console.error('Error syncing connection:', error);
    } finally {
      setSyncing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'disconnected':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Health Connections</h2>
        <button
          onClick={fetchConnections}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </button>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-purple-200 mb-4">No health services connected yet</p>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all font-medium">
            Connect a Service
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(connection.status)}
                  <div>
                    <h3 className="text-white font-medium">{connection.service_name}</h3>
                    <p className="text-purple-200 text-sm capitalize">{connection.service_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className={`text-sm font-medium capitalize ${getStatusColor(connection.status)}`}>
                      {connection.status}
                    </p>
                    <p className="text-purple-300 text-xs">
                      {formatLastSync(connection.last_sync_at)}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => syncConnection(connection.id)}
                      disabled={syncing === connection.id}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-purple-300 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                      <Settings className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
              {connection.error_message && (
                <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-300 text-sm">{connection.error_message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
