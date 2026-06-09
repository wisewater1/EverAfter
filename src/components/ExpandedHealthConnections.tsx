import React, { useState, useEffect } from 'react';
import {
  Activity, Heart, Droplet, Scale, Moon, Baby, Link2, Search,
  CheckCircle, Clock, AlertCircle, RefreshCw, Smartphone, Watch,
  TrendingUp, Zap, Plus
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface HealthProvider {
  id: string;
  provider_key: string;
  display_name: string;
  description: string;
  category: 'os_hub' | 'wearable' | 'metabolic' | 'home_vitals' | 'fertility' | 'aggregator';
  vendor_name: string;
  icon_url?: string;
  brand_color: string;
  oauth_enabled: boolean;
  supported_metrics: string[];
  is_enabled: boolean;
  is_beta: boolean;
  documentation_url?: string;
}

interface HealthConnection {
  id: string;
  provider: string;
  status: string;
  last_synced_at?: string;
  created_at: string;
}

const CATEGORY_ICONS = {
  os_hub: Smartphone,
  wearable: Watch,
  metabolic: Droplet,
  home_vitals: Scale,
  fertility: Baby,
  aggregator: Link2,
};

const CATEGORY_LABELS = {
  os_hub: 'OS Hubs',
  wearable: 'Wearables & Rings',
  metabolic: 'Metabolic / Diabetes',
  home_vitals: 'Home Vitals & Sleep',
  fertility: 'Fertility & Women\'s Health',
  aggregator: 'Aggregators',
};

export default function ExpandedHealthConnections() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<HealthProvider[]>([]);
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load providers
      const { data: providersData, error: providersError } = await supabase
        .from('health_providers_registry')
        .select('*')
        .eq('is_enabled', true)
        .order('display_name');

      if (providersError) throw providersError;

      // Load existing connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('health_connections')
        .select('*')
        .eq('user_id', user!.id);

      if (connectionsError) throw connectionsError;

      setProviders(providersData || []);
      setConnections(connectionsData || []);
    } catch (error) {
      console.error('Error loading health connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerKey: string) => {
    setConnecting(providerKey);

    try {
      const { data, error } = await supabase.functions.invoke('health-oauth-initiate', {
        body: { provider_key: providerKey }
      });

      if (error) throw error;

      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (error) {
      console.error('Error initiating connection:', error);
      alert('Failed to initiate connection. Please try again.');
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    if (!confirm('Are you sure you want to disconnect this device?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('health_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error('Error disconnecting:', error);
      alert('Failed to disconnect. Please try again.');
    }
  };

  const getConnectionStatus = (providerKey: string) => {
    return connections.find(c => c.provider === providerKey);
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = !selectedCategory || provider.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedProviders = filteredProviders.reduce((acc, provider) => {
    if (!acc[provider.category]) {
      acc[provider.category] = [];
    }
    acc[provider.category].push(provider);
    return acc;
  }, {} as Record<string, HealthProvider[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading health connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-white">
              Health Service Connections
            </h1>
            <p className="text-slate-400 leading-relaxed">
              Connect your health devices and apps to automatically sync data
            </p>
          </div>

          <button
            onClick={loadData}
            className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search devices and services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-slate-800 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === null
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === key
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Connected Status Banner */}
        {connections.length > 0 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  {connections.length} {connections.length === 1 ? 'Device' : 'Devices'} Connected
                </p>
                <p className="text-xs text-slate-400">
                  Automatically syncing health data
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Provider Grid */}
      <div className="space-y-8">
        {Object.entries(groupedProviders).map(([category, categoryProviders]) => {
          const CategoryIcon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center">
                  <CategoryIcon className="w-5 h-5 text-slate-400" />
                </div>
                <h2 className="text-xl font-light text-white">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </h2>
                <span className="px-2.5 py-1 bg-slate-800/50 text-slate-400 text-xs font-medium rounded-full">
                  {categoryProviders.length}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryProviders.map((provider) => {
                  const connection = getConnectionStatus(provider.provider_key);
                  const isConnected = !!connection;
                  const isConnecting = connecting === provider.provider_key;

                  return (
                    <div
                      key={provider.id}
                      className={`group relative p-6 rounded-3xl transition-all duration-300 ${
                        isConnected
                          ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                          : 'bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-2 border-slate-700/30 hover:border-slate-600/50'
                      }`}
                      style={{
                        borderColor: isConnected ? undefined : `${provider.brand_color}20`,
                      }}
                    >
                      {/* Beta Badge */}
                      {provider.is_beta && (
                        <div className="absolute top-4 right-4 px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold rounded">
                          BETA
                        </div>
                      )}

                      {/* Provider Header */}
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
                          style={{
                            backgroundColor: `${provider.brand_color}20`,
                            color: provider.brand_color,
                          }}
                        >
                          {provider.icon_url ? (
                            <img
                              src={provider.icon_url}
                              alt={provider.display_name}
                              className="w-6 h-6"
                            />
                          ) : (
                            <Activity className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-white mb-1">
                            {provider.display_name}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {provider.description}
                          </p>
                        </div>
                      </div>

                      {/* Metrics Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {provider.supported_metrics.slice(0, 4).map((metric) => (
                          <span
                            key={metric}
                            className="px-2 py-1 bg-slate-800/50 text-slate-400 text-xs rounded"
                          >
                            {metric.replace('_', ' ')}
                          </span>
                        ))}
                        {provider.supported_metrics.length > 4 && (
                          <span className="px-2 py-1 bg-slate-800/50 text-slate-400 text-xs rounded">
                            +{provider.supported_metrics.length - 4}
                          </span>
                        )}
                      </div>

                      {/* Connection Status or Button */}
                      {isConnected ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span className="font-medium">Connected</span>
                            {connection.last_synced_at && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400 text-xs">
                                  Synced {new Date(connection.last_synced_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          <button
                            onClick={() => handleDisconnect(connection.id)}
                            className="w-full px-4 py-2.5 bg-slate-800/50 hover:bg-rose-600 border border-slate-700/50 hover:border-rose-500 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(provider.provider_key)}
                          disabled={isConnecting}
                          className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: provider.brand_color,
                            color: 'white',
                          }}
                        >
                          {isConnecting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Connecting...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Connect {provider.display_name}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Your Own Plugin Section */}
      <div className="relative bg-gradient-to-br from-purple-500/10 via-violet-500/5 to-purple-600/10 backdrop-blur-xl rounded-3xl border border-purple-500/20 p-8 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-violet-500/5"></div>

        <div className="relative space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-light text-white mb-2">
                Create Your Own Health Plugin
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Build custom dashboards combining multiple data sources
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="text-sm text-slate-400 mb-1">Connected Sources</div>
              <div className="text-3xl font-light text-white">{connections.length}</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="text-sm text-slate-400 mb-1">Data Points</div>
              <div className="text-3xl font-light text-white">All</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="text-sm text-slate-400 mb-1">Views</div>
              <div className="text-3xl font-light text-white">Custom</div>
            </div>
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
              <div className="text-sm text-slate-400 mb-1">Insights</div>
              <div className="text-3xl font-light text-white">AI</div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-slate-300">Features You Can Build:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Unified health timeline across all devices
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Custom correlation charts (glucose vs activity)
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Personalized health score algorithms
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Multi-metric comparison dashboards
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Automated health reports
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Real-time alert systems
              </div>
            </div>
          </div>

          <button className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20">
            <Plus className="w-4 h-4" />
            Start Building
          </button>
        </div>
      </div>

      {/* No Results */}
      {filteredProviders.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-400 mb-2">No devices found</p>
          <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
