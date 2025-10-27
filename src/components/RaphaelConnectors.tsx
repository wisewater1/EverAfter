import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Link2,
  CheckCircle,
  XCircle,
  Loader,
  RefreshCw,
  Activity,
  Heart,
  Droplet,
  Moon,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Upload,
  Plus,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import CustomDashboardBuilder from './CustomDashboardBuilder';

interface ProviderAccount {
  id: string;
  provider: string;
  status: string;
  created_at: string;
  last_sync_at: string | null;
}

interface Provider {
  id: string;
  name: string;
  category: 'aggregator' | 'wearable' | 'cgm' | 'ehr' | 'wellness';
  icon: any;
  color: string;
  description: string;
  features: string[];
  status: 'available' | 'coming_soon';
  setupUrl?: string;
}

const providers: Provider[] = [
  {
    id: 'terra',
    name: 'Terra',
    category: 'aggregator',
    icon: TrendingUp,
    color: 'from-green-600 to-emerald-600',
    description: 'Unified aggregator connecting multiple wearables',
    features: ['Steps', 'Heart Rate', 'Sleep', 'Activity'],
    status: 'available',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'wearable',
    icon: Activity,
    color: 'from-teal-600 to-cyan-600',
    description: 'Popular fitness tracker and smartwatch',
    features: ['Steps', 'Heart Rate', 'Sleep', 'Calories'],
    status: 'available',
    setupUrl: 'https://dev.fitbit.com/apps',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    category: 'wearable',
    icon: Moon,
    color: 'from-purple-600 to-pink-600',
    description: 'Advanced sleep and recovery tracking ring',
    features: ['Readiness', 'Sleep', 'HRV', 'Temperature'],
    status: 'available',
    setupUrl: 'https://cloud.ouraring.com/oauth',
  },
  {
    id: 'dexcom',
    name: 'Dexcom CGM',
    category: 'cgm',
    icon: Droplet,
    color: 'from-orange-600 to-red-600',
    description: 'Continuous glucose monitoring with real-time data',
    features: ['Glucose', 'Trends', 'Alerts', 'TIR'],
    status: 'available',
    setupUrl: 'https://developer.dexcom.com/',
  },
  {
    id: 'libre-agg',
    name: 'Abbott Libre',
    category: 'cgm',
    icon: Droplet,
    color: 'from-red-600 to-orange-600',
    description: 'FreeStyle Libre via aggregator partners',
    features: ['Glucose', 'TIR', 'Reports'],
    status: 'available',
    setupUrl: 'https://www.freestyle.abbott/',
  },
  {
    id: 'manual',
    name: 'Manual Upload',
    category: 'cgm',
    icon: Upload,
    color: 'from-blue-600 to-indigo-600',
    description: 'Upload CSV/JSON files from any CGM device',
    features: ['CSV Import', 'JSON Import', 'Bulk Upload'],
    status: 'available',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    category: 'wearable',
    icon: Heart,
    color: 'from-red-600 to-pink-600',
    description: 'Performance optimization wearable',
    features: ['Strain', 'Recovery', 'Sleep', 'HRV'],
    status: 'coming_soon',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    category: 'wearable',
    icon: Activity,
    color: 'from-blue-600 to-cyan-600',
    description: 'Fitness and outdoor GPS watches',
    features: ['Activity', 'Heart Rate', 'VO2 Max'],
    status: 'coming_soon',
  },
  {
    id: 'withings',
    name: 'Withings',
    category: 'wearable',
    icon: Activity,
    color: 'from-slate-600 to-gray-600',
    description: 'Connected scales and health monitors',
    features: ['Weight', 'BP', 'Heart Rate'],
    status: 'coming_soon',
  },
  {
    id: 'polar',
    name: 'Polar',
    category: 'wearable',
    icon: Heart,
    color: 'from-red-500 to-orange-500',
    description: 'Training load and performance tracking',
    features: ['Training Load', 'Recovery', 'HRV'],
    status: 'coming_soon',
  },
  {
    id: 'fhir',
    name: 'SMART on FHIR',
    category: 'ehr',
    icon: Activity,
    color: 'from-indigo-600 to-purple-600',
    description: 'Electronic Health Records (Epic, Cerner)',
    features: ['Lab Results', 'HbA1c', 'Medications'],
    status: 'coming_soon',
    setupUrl: 'https://docs.smarthealthit.org/',
  },
];

export default function RaphaelConnectors() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCustomDashboard, setShowCustomDashboard] = useState(false);

  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  async function loadConnections() {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('provider_accounts')
        .select('*')
        .eq('user_id', user?.id);

      if (fetchError) throw fetchError;
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Error loading connections:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function isConnected(providerId: string): boolean {
    return accounts.some(
      (acc) => acc.provider === providerId && acc.status === 'active'
    );
  }

  function getAccount(providerId: string): ProviderAccount | undefined {
    return accounts.find((acc) => acc.provider === providerId);
  }

  async function handleConnect(providerId: string) {
    if (providerId === 'manual') {
      handleManualUpload();
      return;
    }

    if (providerId === 'dexcom') {
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cgm-dexcom-oauth?action=init`;
      window.location.href = functionUrl;
      return;
    }

    const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-start?provider=${providerId}`;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Please log in to connect providers');
      return;
    }

    window.location.href = functionUrl;
  }

  async function handleManualUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) return;

      setSyncing('manual');
      setError(null);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cgm-manual-upload`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json();
        alert(`Successfully uploaded ${result.readings_inserted} glucose readings from ${file.name}`);

        await loadConnections();
      } catch (err: any) {
        console.error('Upload error:', err);
        setError(err.message);
      } finally {
        setSyncing(null);
      }
    };
    input.click();
  }

  async function handleDisconnect(providerId: string) {
    if (!confirm(`Disconnect ${providerId}? This will stop syncing health data.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('provider_accounts')
        .delete()
        .eq('user_id', user?.id)
        .eq('provider', providerId);

      if (deleteError) throw deleteError;

      setAccounts((prev) => prev.filter((acc) => acc.provider !== providerId));
    } catch (err: any) {
      console.error('Error disconnecting:', err);
      setError(err.message);
    }
  }

  async function handleSync(providerId: string) {
    setSyncing(providerId);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-health-now`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ provider: providerId, days: 7 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sync failed');
      }

      const result = await response.json();
      alert(`Synced ${result.metrics_ingested} metrics from ${providerId}`);

      await loadConnections();
    } catch (err: any) {
      console.error('Sync error:', err);
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  }

  const categoryGroups = {
    aggregator: providers.filter((p) => p.category === 'aggregator'),
    wearable: providers.filter((p) => p.category === 'wearable'),
    cgm: providers.filter((p) => p.category === 'cgm'),
    ehr: providers.filter((p) => p.category === 'ehr'),
    wellness: providers.filter((p) => p.category === 'wellness'),
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-teal-900/20 to-cyan-900/20 rounded-xl p-6 border border-teal-500/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Health Connectors</h2>
            <p className="text-teal-200 text-sm">
              Connect your health devices, apps, and medical records to give Raphael a complete
              view of your health journey.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading connections...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(categoryGroups).map(([category, providerList]) => {
            if (providerList.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-white mb-4 capitalize flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full" />
                  {category === 'cgm' ? 'Glucose Monitoring' : category + 's'}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providerList.map((provider) => {
                    const Icon = provider.icon;
                    const connected = isConnected(provider.id);
                    const account = getAccount(provider.id);
                    const isSyncing = syncing === provider.id;

                    return (
                      <div
                        key={provider.id}
                        className={`rounded-xl border p-5 transition-all hover:scale-[1.01] ${
                          connected
                            ? 'bg-gradient-to-br from-gray-800/70 to-gray-900/70 border-teal-500/30'
                            : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 bg-gradient-to-br ${provider.color} rounded-lg flex items-center justify-center`}
                            >
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-white font-semibold">{provider.name}</h4>
                              {provider.status === 'coming_soon' && (
                                <span className="text-xs text-gray-500">Coming Soon</span>
                              )}
                            </div>
                          </div>

                          {connected ? (
                            <div className="flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-600" />
                          )}
                        </div>

                        <p className="text-sm text-gray-400 mb-3">{provider.description}</p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {provider.features.map((feature) => (
                            <span
                              key={feature}
                              className="text-xs px-2 py-1 bg-white/5 text-gray-400 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>

                        {connected && account && (
                          <div className="text-xs text-gray-500 mb-3">
                            Connected {new Date(account.created_at).toLocaleDateString()}
                            {account.last_sync_at && (
                              <span className="ml-2">
                                • Synced {new Date(account.last_sync_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {provider.status === 'available' ? (
                            connected ? (
                              <>
                                <button
                                  onClick={() => handleSync(provider.id)}
                                  disabled={isSyncing}
                                  className="flex-1 px-4 py-2 bg-teal-600/20 hover:bg-teal-600/30 disabled:opacity-50 text-teal-300 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  {isSyncing ? (
                                    <>
                                      <Loader className="w-4 h-4 animate-spin" />
                                      Syncing...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="w-4 h-4" />
                                      Sync Now
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDisconnect(provider.id)}
                                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-all text-sm font-medium"
                                >
                                  Disconnect
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleConnect(provider.id)}
                                disabled={isSyncing && provider.id === 'manual'}
                                className={`flex-1 px-4 py-2 bg-gradient-to-r ${provider.color} hover:opacity-90 disabled:opacity-50 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2`}
                              >
                                {isSyncing && provider.id === 'manual' ? (
                                  <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Link2 className="w-4 h-4" />
                                    {provider.id === 'manual' ? 'Upload File' : `Connect ${provider.name}`}
                                  </>
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              disabled
                              className="flex-1 px-4 py-2 bg-gray-700/50 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed"
                            >
                              Coming Soon
                            </button>
                          )}

                          {provider.setupUrl && (
                            <a
                              href={provider.setupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-400 rounded-lg transition-all"
                              title="Setup Documentation"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-gradient-to-br from-violet-900/20 via-fuchsia-900/20 to-pink-900/20 border border-violet-500/30 rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.01] transition-all cursor-pointer"
        onClick={() => setShowCustomDashboard(true)}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                  Create Your Own Health Plugin
                  <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
                </h3>
                <p className="text-violet-200 text-sm">
                  Build custom dashboards combining multiple data sources
                </p>
              </div>
            </div>

            <div className="w-10 h-10 bg-violet-600/30 rounded-lg flex items-center justify-center group-hover:bg-violet-600/50 transition-all">
              <Plus className="w-5 h-5 text-violet-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Connected Sources</div>
              <div className="text-2xl font-bold text-white">{accounts.filter(a => a.status === 'active').length}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Data Points</div>
              <div className="text-2xl font-bold text-violet-300">All</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Views</div>
              <div className="text-2xl font-bold text-fuchsia-300">Custom</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10">
              <div className="text-xs text-gray-400 mb-1">Insights</div>
              <div className="text-2xl font-bold text-pink-300">AI</div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold text-violet-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Features You Can Build:
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Unified health timeline across all devices
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                Custom correlation charts (glucose vs activity)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
                Personalized health score algorithms
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                Multi-metric comparison dashboards
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full" />
                Automated health reports
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-pink-400 rounded-full" />
                Real-time alert systems
              </li>
            </ul>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCustomDashboard(true);
            }}
            className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 shadow-lg group-hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Start Building Your Custom Plugin
            <Sparkles className="w-4 h-4 ml-1" />
          </button>

          <div className="mt-3 text-xs text-center text-gray-400">
            {accounts.filter(a => a.status === 'active').length > 0 ? (
              <span>Ready to integrate {accounts.filter(a => a.status === 'active').length} connected source{accounts.filter(a => a.status === 'active').length > 1 ? 's' : ''}</span>
            ) : (
              <span>Connect health sources above to get started</span>
            )}
          </div>
        </div>
      </div>

      {showCustomDashboard && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-auto">
          <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="w-7 h-7 text-violet-400" />
                  Custom Health Plugin Builder
                  <Sparkles className="w-6 h-6 text-violet-400 animate-pulse" />
                </h2>
                <button
                  onClick={() => setShowCustomDashboard(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                  Close
                </button>
              </div>

              <CustomDashboardBuilder />
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Privacy & Security
        </h4>
        <ul className="text-sm text-blue-200/80 space-y-1">
          <li>• All connections use OAuth 2.0 for secure authentication</li>
          <li>• Your credentials are never stored in our database</li>
          <li>• Data is encrypted in transit and at rest</li>
          <li>• You can disconnect any service at any time</li>
          <li>• We only access health data you explicitly authorize</li>
        </ul>
      </div>
    </div>
  );
}
