import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Smartphone, Watch, Activity, RefreshCw, CheckCircle, AlertCircle, Plus, Settings, Wrench } from 'lucide-react';
import TroubleshootingWizard from './TroubleshootingWizard';

interface HealthConnection {
  id: string;
  service_name: string;
  service_type: string;
  status: string;
  last_sync_at: string;
  sync_frequency: string;
  error_message: string;
}

const HEALTH_SERVICES = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: Smartphone,
    description: 'Sync data from iPhone Health app',
    color: 'from-red-600 to-pink-600'
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    icon: Activity,
    description: 'Connect with Google Fit',
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: Watch,
    description: 'Sync Fitbit device data',
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: Watch,
    description: 'Connect Garmin devices',
    color: 'from-orange-600 to-amber-600'
  },
  {
    id: 'oura_ring',
    name: 'Oura Ring',
    icon: Activity,
    description: 'Track sleep and recovery data',
    color: 'from-slate-600 to-gray-600'
  },
  {
    id: 'whoop',
    name: 'Whoop',
    icon: Activity,
    description: 'Connect Whoop strap data',
    color: 'from-gray-700 to-slate-700'
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: Activity,
    description: 'Sync running and cycling activities',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'myfitnesspal',
    name: 'MyFitnessPal',
    icon: Activity,
    description: 'Track nutrition and calories',
    color: 'from-blue-700 to-cyan-700'
  },
  {
    id: 'withings',
    name: 'Withings',
    icon: Watch,
    description: 'Connect Withings health devices',
    color: 'from-teal-600 to-emerald-600'
  },
  {
    id: 'samsung_health',
    name: 'Samsung Health',
    icon: Smartphone,
    description: 'Sync Samsung Health data',
    color: 'from-blue-600 to-indigo-600'
  }
];

export default function HealthConnectionManager() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [troubleshootingOpen, setTroubleshootingOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<{
    type: string;
    name: string;
    connectionId?: string;
  } | null>(null);

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
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectService = async (serviceType: string, serviceName: string) => {
    try {
      const { error } = await supabase
        .from('health_connections')
        .insert([{
          user_id: user?.id,
          service_name: serviceName,
          service_type: serviceType,
          status: 'pending',
          sync_frequency: 'daily'
        }]);

      if (error) throw error;

      alert(`${serviceName} connection initiated! In a production app, this would redirect to OAuth authentication.`);
      fetchConnections();
    } catch (error) {
      console.error('Error connecting service:', error);
      alert('Failed to connect service');
    }
  };

  const syncConnection = async (connectionId: string, serviceName: string) => {
    setSyncing(connectionId);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from('health_connections')
        .update({
          status: 'connected',
          last_sync_at: new Date().toISOString()
        })
        .eq('id', connectionId);

      if (error) throw error;

      const demoMetrics = [
        {
          user_id: user?.id,
          metric_type: 'steps',
          metric_value: Math.floor(Math.random() * 5000) + 5000,
          metric_unit: 'steps',
          recorded_at: new Date().toISOString(),
          source: serviceName
        },
        {
          user_id: user?.id,
          metric_type: 'heart_rate',
          metric_value: Math.floor(Math.random() * 20) + 65,
          metric_unit: 'bpm',
          recorded_at: new Date().toISOString(),
          source: serviceName
        },
        {
          user_id: user?.id,
          metric_type: 'sleep',
          metric_value: Math.floor(Math.random() * 3) + 6,
          metric_unit: 'hours',
          recorded_at: new Date().toISOString(),
          source: serviceName
        }
      ];

      await supabase.from('health_metrics').insert(demoMetrics);

      fetchConnections();
      alert(`Successfully synced data from ${serviceName}!`);
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  const disconnectService = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this service?')) return;

    try {
      const { error } = await supabase
        .from('health_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId);

      if (error) throw error;
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { color: 'bg-green-900/30 text-green-400 border-green-500/30', icon: CheckCircle },
      disconnected: { color: 'bg-gray-900/30 text-gray-400 border-gray-500/30', icon: AlertCircle },
      error: { color: 'bg-red-900/30 text-red-400 border-red-500/30', icon: AlertCircle },
      pending: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30', icon: RefreshCw }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const StatusIcon = config.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.color}`}>
        <StatusIcon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getServiceByType = (type: string) => {
    return HEALTH_SERVICES.find(s => s.id === type);
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading connections...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Health Service Connections</h2>
          <p className="text-gray-400 text-sm">Connect your health devices and apps to automatically sync data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {HEALTH_SERVICES.map((service) => {
            const Icon = service.icon;
            const existingConnection = connections.find(c => c.service_type === service.id && c.status !== 'disconnected');
            const isConnected = existingConnection?.status === 'connected';

            return (
              <div
                key={service.id}
                className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{service.name}</h3>
                      <p className="text-gray-400 text-xs">{service.description}</p>
                    </div>
                  </div>
                  {existingConnection && getStatusBadge(existingConnection.status)}
                </div>

                {existingConnection ? (
                  <div className="space-y-2">
                    {existingConnection.last_sync_at && (
                      <p className="text-gray-300 text-xs">
                        Last synced: {new Date(existingConnection.last_sync_at).toLocaleString()}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedDevice({
                            type: service.id,
                            name: service.name,
                            connectionId: existingConnection.id
                          });
                          setTroubleshootingOpen(true);
                        }}
                        className="px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded-lg transition-all text-sm flex items-center gap-2 min-h-[44px]"
                        title="Troubleshoot connection issues"
                      >
                        <Wrench className="w-4 h-4" />
                      </button>
                      {isConnected && (
                        <button
                          onClick={() => syncConnection(existingConnection.id, service.name)}
                          disabled={syncing === existingConnection.id}
                          className="flex-1 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === existingConnection.id ? 'animate-spin' : ''}`} />
                          {syncing === existingConnection.id ? 'Syncing...' : 'Sync Now'}
                        </button>
                      )}
                      <button
                        onClick={() => disconnectService(existingConnection.id)}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all text-sm min-h-[44px]"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => connectService(service.id, service.name)}
                    className={`w-full px-4 py-2 bg-gradient-to-r ${service.color} text-white rounded-lg hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2`}
                  >
                    <Plus className="w-4 h-4" />
                    Connect {service.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-400 font-medium text-sm mb-1">OAuth Integration Note</p>
              <p className="text-blue-300 text-xs">
                In production, clicking "Connect" would redirect you to the service's OAuth authorization page.
                After authorization, health data would automatically sync based on your preferences.
                This demo simulates the connection process.
              </p>
            </div>
          </div>
        </div>
      </div>

      {connections.filter(c => c.status === 'connected').length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-xl font-semibold text-white mb-4">Active Connections</h3>
          <div className="space-y-3">
            {connections.filter(c => c.status === 'connected').map((connection) => {
              const service = getServiceByType(connection.service_type);
              if (!service) return null;
              const Icon = service.icon;

              return (
                <div key={connection.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${service.color} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{connection.service_name}</p>
                      <p className="text-gray-400 text-xs">
                        Syncs {connection.sync_frequency} • Last: {new Date(connection.last_sync_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => syncConnection(connection.id, connection.service_name)}
                    disabled={syncing === connection.id}
                    className="p-2 hover:bg-blue-500/20 rounded-lg transition-all"
                  >
                    <RefreshCw className={`w-4 h-4 text-blue-400 ${syncing === connection.id ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedDevice && (
        <TroubleshootingWizard
          isOpen={troubleshootingOpen}
          onClose={() => {
            setTroubleshootingOpen(false);
            setSelectedDevice(null);
          }}
          deviceType={selectedDevice.type}
          deviceName={selectedDevice.name}
          deviceConnectionId={selectedDevice.connectionId}
        />
      )}
    </div>
  );
}
