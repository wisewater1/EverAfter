import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle,
  Cloud,
  Clock,
  Droplet,
  FlaskConical,
  Heart,
  LayoutDashboard,
  Link2,
  Moon,
  Plus,
  Radio,
  RefreshCw,
  Scale,
  Shield,
  Smartphone,
  Sparkles,
  Stethoscope,
  Watch,
  Zap,
} from 'lucide-react';
import CustomDashboardBuilder from './CustomDashboardBuilder';

type ServiceCategory =
  | 'aggregators'
  | 'wearables'
  | 'glucose'
  | 'ehr'
  | 'research'
  | 'platform'
  | 'custom';

type ConnectorStatus = 'live' | 'beta' | 'planned';

interface RegistryProvider {
  id: string;
  provider_key: string;
  display_name: string;
  description: string;
  category: 'os_hub' | 'wearable' | 'metabolic' | 'home_vitals' | 'fertility' | 'aggregator';
  vendor_name: string;
  icon_url?: string | null;
  brand_color?: string | null;
  oauth_enabled: boolean;
  oauth_authorize_url?: string | null;
  oauth_client_id_env_key?: string | null;
  supported_metrics: string[];
  is_enabled: boolean;
  is_beta: boolean;
}

interface HealthConnectionRow {
  id: string;
  provider?: string | null;
  service_name?: string | null;
  service_type?: string | null;
  status?: string | null;
  last_sync_at?: string | null;
}

interface ProviderAccountRow {
  id: string;
  provider: string;
  status?: string | null;
  last_sync_at?: string | null;
  updated_at?: string | null;
}

interface ConnectorCard {
  providerKey: string;
  name: string;
  category: ServiceCategory;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  status: ConnectorStatus;
  canConnect: boolean;
  badgeLabel: string;
}

interface ConnectionState {
  id: string;
  providerKey: string;
  status: string;
  lastSyncAt?: string | null;
  source: 'health_connections' | 'provider_accounts';
}

interface RoadmapProvider {
  providerKey: string;
  name: string;
  category: ServiceCategory;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  badgeLabel: string;
}

const CATEGORY_CONFIG: Array<{ id: ServiceCategory | 'all'; label: string; icon: React.ComponentType<any> }> = [
  { id: 'all', label: 'All Connectors', icon: Link2 },
  { id: 'aggregators', label: 'Multi-Device', icon: Cloud },
  { id: 'wearables', label: 'Wearables', icon: Watch },
  { id: 'glucose', label: 'CGM', icon: Droplet },
  { id: 'ehr', label: 'Health Records', icon: Stethoscope },
  { id: 'research', label: 'Research', icon: FlaskConical },
  { id: 'platform', label: 'Platforms', icon: Smartphone },
];

const CATEGORY_TITLES: Record<ServiceCategory, string> = {
  aggregators: 'Unified Data Aggregators',
  wearables: 'Wearables and Sensors',
  glucose: 'Glucose and Metabolic',
  ehr: 'Clinical and Health Records',
  research: 'Research and Extended Integrations',
  platform: 'Platform Integrations',
  custom: 'Custom Plugins',
};

const PROVIDER_ICON_OVERRIDES: Record<string, React.ComponentType<any>> = {
  terra: Cloud,
  fitbit: Watch,
  oura: Moon,
  garmin: Watch,
  whoop: Activity,
  dexcom_cgm: Droplet,
  abbott_libre: Droplet,
  withings: Scale,
  particle_health: Building2,
  '1up_health': Building2,
  health_gorilla: FlaskConical,
  zus_health: Shield,
  smart_on_fhir: Stethoscope,
  cms_blue_button: Shield,
  apple_health: Heart,
  android_health_connect: Smartphone,
  samsung_health: Smartphone,
  ble_heart_rate: Heart,
  ble_blood_pressure: Activity,
  ble_weight_scale: Scale,
  ble_glucose_meter: Droplet,
  ble_pulse_oximeter: Radio,
};

const ROADMAP_PROVIDERS: RoadmapProvider[] = [
  {
    providerKey: 'validic',
    name: 'Validic',
    category: 'aggregators',
    description: 'Enterprise-grade connection to 600+ devices and apps.',
    icon: Shield,
    color: 'from-indigo-600 to-blue-600',
    features: ['600+ Devices', 'Clinical', 'EHR-integrated'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'human_api',
    name: 'Human API',
    category: 'aggregators',
    description: 'Consumer-controlled wellness plus medical-record aggregation.',
    icon: Link2,
    color: 'from-blue-600 to-cyan-600',
    features: ['Medical Records', 'Wearables', 'Normalized'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'metriport',
    name: 'Metriport',
    category: 'ehr',
    description: 'Open-source universal API for EHRs and wearables.',
    icon: Zap,
    color: 'from-cyan-600 to-teal-600',
    features: ['FHIR', 'Open-source', 'Clinical'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'rook',
    name: 'ROOK',
    category: 'aggregators',
    description: 'Wearable aggregation with SDK-first onboarding.',
    icon: Cloud,
    color: 'from-orange-600 to-red-600',
    features: ['API', 'SDK', 'Wearables'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'spike_api',
    name: 'Spike API',
    category: 'aggregators',
    description: 'Broad health-device and lab aggregation layer.',
    icon: Radio,
    color: 'from-pink-600 to-rose-600',
    features: ['Wearables', 'Labs', 'AI-ready'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'fitabase',
    name: 'Fitabase',
    category: 'research',
    description: 'Research exports and analysis for Fitbit and Garmin.',
    icon: FlaskConical,
    color: 'from-violet-600 to-purple-600',
    features: ['Research', 'Exports', 'IRB-friendly'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'fitrockr',
    name: 'Fitrockr',
    category: 'research',
    description: 'Garmin research workflows with live stream support.',
    icon: Radio,
    color: 'from-orange-600 to-red-600',
    features: ['Garmin', 'Live Stream', 'Research'],
    badgeLabel: 'Planned',
  },
  {
    providerKey: 'openmhealth',
    name: 'Open mHealth',
    category: 'research',
    description: 'Schema-first interoperability for health data pipelines.',
    icon: Zap,
    color: 'from-teal-600 to-cyan-600',
    features: ['Standards', 'Open-source', 'Normalization'],
    badgeLabel: 'Planned',
  },
];

function mapRegistryCategory(provider: RegistryProvider): ServiceCategory {
  if (provider.provider_key === 'terra') return 'aggregators';

  const metrics = provider.supported_metrics || [];
  if (
    provider.category === 'aggregator' &&
    metrics.some((metric) =>
      ['clinical_records', 'lab_results', 'medications', 'conditions', 'claims', 'procedures'].includes(metric),
    )
  ) {
    return 'ehr';
  }

  switch (provider.category) {
    case 'os_hub':
      return 'platform';
    case 'wearable':
    case 'home_vitals':
    case 'fertility':
      return 'wearables';
    case 'metabolic':
      return 'glucose';
    case 'aggregator':
      return 'aggregators';
    default:
      return 'research';
  }
}

function iconForProvider(provider: RegistryProvider): React.ComponentType<any> {
  return PROVIDER_ICON_OVERRIDES[provider.provider_key] || Activity;
}

function gradientForProvider(provider: RegistryProvider): string {
  switch (provider.provider_key) {
    case 'terra':
      return 'from-purple-600 to-violet-600';
    case 'fitbit':
      return 'from-blue-600 to-cyan-600';
    case 'oura':
      return 'from-slate-600 to-gray-600';
    case 'dexcom_cgm':
      return 'from-orange-600 to-amber-600';
    case 'abbott_libre':
      return 'from-green-600 to-teal-600';
    case 'smart_on_fhir':
    case 'particle_health':
    case '1up_health':
    case 'health_gorilla':
    case 'zus_health':
      return 'from-indigo-600 to-purple-600';
    default:
      return 'from-teal-600 to-cyan-600';
  }
}

function featuresForProvider(provider: RegistryProvider): string[] {
  const metrics = provider.supported_metrics || [];
  if (metrics.length === 0) {
    return [provider.vendor_name];
  }

  return metrics
    .slice(0, 4)
    .map((metric) => metric.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()));
}

function buildConnectorCard(provider: RegistryProvider): ConnectorCard {
  const connectable = Boolean(
    provider.is_enabled &&
    provider.oauth_enabled &&
    provider.oauth_authorize_url &&
    provider.oauth_client_id_env_key,
  );

  let status: ConnectorStatus = 'planned';
  let badgeLabel = 'Planned';
  if (connectable) {
    status = provider.is_beta ? 'beta' : 'live';
    badgeLabel = provider.is_beta ? 'Beta' : 'Live';
  } else if (provider.is_beta) {
    status = 'beta';
    badgeLabel = 'Beta';
  }

  return {
    providerKey: provider.provider_key,
    name: provider.display_name,
    category: mapRegistryCategory(provider),
    description: provider.description,
    icon: iconForProvider(provider),
    color: gradientForProvider(provider),
    features: featuresForProvider(provider),
    status,
    canConnect: connectable,
    badgeLabel,
  };
}

function normalizeProviderKey(connection: HealthConnectionRow): string {
  const candidate =
    connection.provider ||
    connection.service_type ||
    connection.service_name ||
    '';

  const normalized = candidate.toLowerCase().trim();
  switch (normalized) {
    case 'apple_healthkit':
      return 'apple_health';
    case 'health_connect':
      return 'android_health_connect';
    case 'oura_ring':
      return 'oura';
    case 'smart_on_fhir_generic':
    case 'smart_fhir':
      return 'smart_on_fhir';
    default:
      return normalized.replace(/[^a-z0-9]+/g, '_');
  }
}

function mergeConnectionState(
  connectionRows: HealthConnectionRow[],
  providerAccountRows: ProviderAccountRow[],
): Map<string, ConnectionState> {
  const index = new Map<string, ConnectionState>();

  for (const connection of connectionRows) {
    const providerKey = normalizeProviderKey(connection);
    if (!providerKey) continue;
    index.set(providerKey, {
      id: connection.id,
      providerKey,
      status: String(connection.status || 'pending'),
      lastSyncAt: connection.last_sync_at || null,
      source: 'health_connections',
    });
  }

  for (const account of providerAccountRows) {
    const providerKey = String(account.provider || '').trim();
    if (!providerKey) continue;

    const existing = index.get(providerKey);
    const accountStatus = String(account.status || 'active');
    if (!existing || existing.status !== 'connected') {
      index.set(providerKey, {
        id: account.id,
        providerKey,
        status: accountStatus === 'active' ? 'connected' : accountStatus,
        lastSyncAt: account.last_sync_at || account.updated_at || null,
        source: 'provider_accounts',
      });
    }
  }

  return index;
}

function formatSyncLabel(value?: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString();
}

export default function ComprehensiveHealthConnectors() {
  const { user, isDemoMode } = useAuth();
  const [providers, setProviders] = useState<RegistryProvider[]>([]);
  const [connections, setConnections] = useState<Map<string, ConnectionState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [connectingSource, setConnectingSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCustomDashboard, setShowCustomDashboard] = useState(false);

  useEffect(() => {
    void loadData();
  }, [user?.id, isDemoMode]);

  const liveCards = useMemo(() => providers.map(buildConnectorCard), [providers]);
  const connectionCount = Array.from(connections.values()).filter((connection) =>
    ['connected', 'active', 'synced'].includes(connection.status),
  ).length;

  const roadmapCards = useMemo(() => {
    const liveProviderKeys = new Set(liveCards.map((card) => card.providerKey));
    return ROADMAP_PROVIDERS.filter((provider) => !liveProviderKeys.has(provider.providerKey));
  }, [liveCards]);

  const allCards = useMemo(() => {
    const live = liveCards.map((card) => ({
      ...card,
      connection: connections.get(card.providerKey),
    }));
    const roadmap = roadmapCards.map((card) => ({
      ...card,
      connection: undefined,
    }));
    return [...live, ...roadmap];
  }, [connections, liveCards, roadmapCards]);

  const filteredCards = selectedCategory === 'all'
    ? allCards
    : allCards.filter((card) => card.category === selectedCategory);

  const groupedCards = filteredCards.reduce((acc, card) => {
    if (!acc[card.category]) {
      acc[card.category] = [];
    }
    acc[card.category].push(card);
    return acc;
  }, {} as Record<ServiceCategory, Array<(typeof filteredCards)[number]>>);

  async function loadData() {
    if (!supabase) {
      setProviders([]);
      setConnections(new Map());
      setError('Supabase is not configured for health connectors.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const providerQuery = supabase
        .from('health_providers_registry')
        .select(
          'id, provider_key, display_name, description, category, vendor_name, icon_url, brand_color, oauth_enabled, oauth_authorize_url, oauth_client_id_env_key, supported_metrics, is_enabled, is_beta',
        )
        .eq('is_enabled', true)
        .order('display_name');

      const connectionQuery = user
        ? supabase
            .from('health_connections')
            .select('id, provider, service_name, service_type, status, last_sync_at')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null } as any);

      const accountQuery = user
        ? supabase
            .from('provider_accounts')
            .select('id, provider, status, last_sync_at, updated_at')
            .eq('user_id', user.id)
        : Promise.resolve({ data: [], error: null } as any);

      const [{ data: providerRows, error: providerError }, { data: connectionRows, error: connectionError }, { data: accountRows, error: accountError }] =
        await Promise.all([providerQuery, connectionQuery, accountQuery]);

      if (providerError) throw providerError;
      if (connectionError) throw connectionError;
      if (accountError) throw accountError;

      setProviders((providerRows || []) as RegistryProvider[]);
      setConnections(mergeConnectionState((connectionRows || []) as HealthConnectionRow[], (accountRows || []) as ProviderAccountRow[]));
    } catch (err: any) {
      console.error('Error loading health connectors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load health connectors.');
      setProviders([]);
      setConnections(new Map());
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(providerKey: string) {
    if (!supabase) {
      setError('Supabase is not configured for health connectors.');
      return;
    }
    if (isDemoMode) {
      setError('Health connectors require a real signed-in account. Presentation mode cannot start live OAuth connections.');
      return;
    }

    setConnectingSource(providerKey);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('health-oauth-initiate', {
        body: { provider_key: providerKey },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (!data?.authorization_url) {
        throw new Error('The provider did not return an authorization URL.');
      }

      window.location.href = data.authorization_url;
    } catch (err: any) {
      console.error('Error initiating health connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate provider connection.');
    } finally {
      setConnectingSource(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
        <div className="flex items-center justify-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-teal-400" />
          <div className="text-slate-400">Loading health connectors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">Health Device Connections</h2>
            <p className="text-sm text-slate-400">
              Live cards can start a real OAuth connection now. Planned cards stay visible as roadmap surfaces until the backend contract is fully provisioned.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-white/20 hover:bg-white/5 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 px-4 py-2 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium text-teal-400">{connectionCount} Connected</span>
              </div>
            </div>
          </div>
        </div>

        {isDemoMode && (
          <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300" />
              <div>
                <p className="font-medium text-amber-200">Presentation mode is read-only for live health connectors.</p>
                <p className="mt-1 text-sm text-amber-100/80">
                  Sign in with a real account to initiate OAuth connections and sync live device data.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-900/20 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
              <div>
                <p className="font-medium text-red-200">Connector error</p>
                <p className="mt-1 text-sm text-red-100/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORY_CONFIG.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex-shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 font-medium transition-all duration-300 ${
                  isActive
                    ? 'border border-teal-500/30 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4)]'
                    : 'border border-transparent text-slate-500 shadow-[2px_2px_5px_rgba(0,0,0,0.2)] hover:border-white/5 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{category.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {Object.entries(groupedCards).map(([category, cards]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-white">{CATEGORY_TITLES[category as ServiceCategory]}</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-700 to-transparent" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <ConnectorServiceCard
                key={card.providerKey}
                card={card}
                connection={card.connection}
                disabled={isDemoMode}
                isConnecting={connectingSource === card.providerKey}
                onConnect={handleConnect}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]">
            <Sparkles className="h-6 w-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="mb-2 text-lg font-bold text-white">Create Your Own Health Plugin</h3>
            <p className="mb-4 text-sm text-slate-400">Build custom dashboards combining normalized data across the connectors you have already enabled.</p>
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 p-3">
                <div className="mb-1 text-xs text-teal-400">Connected Sources</div>
                <div className="text-xl font-bold text-white">{connectionCount}</div>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 p-3">
                <div className="mb-1 text-xs text-blue-400">Data Points</div>
                <div className="text-xl font-bold text-white">Live</div>
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-3">
                <div className="mb-1 text-xs text-purple-400">Views</div>
                <div className="text-xl font-bold text-white">Custom</div>
              </div>
              <div className="rounded-xl border border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5 p-3">
                <div className="mb-1 text-xs text-orange-400">Insights</div>
                <div className="text-xl font-bold text-white">AI</div>
              </div>
            </div>
            <button
              onClick={() => setShowCustomDashboard(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              Start Building Your Custom Plugin
            </button>
            {connectionCount === 0 && (
              <p className="mt-2 text-xs text-teal-400">
                Connect at least one live source to unlock normalized device metrics in your custom dashboards.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-cyan-500/5 p-4 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]">
            <Shield className="h-5 w-5 text-teal-400" />
          </div>
          <div className="flex-1">
            <p className="mb-2 text-sm font-medium text-teal-400">Privacy and Security</p>
            <ul className="space-y-1 text-xs leading-relaxed text-slate-400">
              <li>- Live connectors use the registry-backed OAuth initiation flow.</li>
              <li>- Planned connectors stay visible as roadmap cards and do not initiate network requests.</li>
              <li>- Connection status is derived from canonical `health_connections` and `provider_accounts` records.</li>
              <li>- No connector in this surface falls back to localhost-only APIs or placeholder OAuth endpoints.</li>
            </ul>
          </div>
        </div>
      </div>

      {showCustomDashboard && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/90 backdrop-blur-sm">
          <div className="min-h-screen p-4">
            <div className="mx-auto max-w-7xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
                  <LayoutDashboard className="h-7 w-7 text-violet-400" />
                  Custom Health Plugin Builder
                  <Sparkles className="h-6 w-6 animate-pulse text-violet-400" />
                </h2>
                <button
                  onClick={() => setShowCustomDashboard(false)}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-white transition-all hover:bg-slate-600"
                >
                  Close
                </button>
              </div>
              <CustomDashboardBuilder />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ConnectorServiceCardProps {
  card: ConnectorCard & { connection?: ConnectionState };
  connection?: ConnectionState;
  disabled: boolean;
  isConnecting: boolean;
  onConnect: (providerKey: string) => void;
}

function ConnectorServiceCard({ card, connection, disabled, isConnecting, onConnect }: ConnectorServiceCardProps) {
  const Icon = card.icon;
  const badgeTone =
    card.status === 'live'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : card.status === 'beta'
        ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
        : 'border-amber-500/20 bg-amber-500/10 text-amber-300';

  const lastSyncLabel = formatSyncLabel(connection?.lastSyncAt);
  const isConnected = Boolean(connection) && ['connected', 'active', 'synced'].includes(connection.status);
  const canInitiate = card.canConnect && !disabled;

  return (
    <div className="group rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-5 shadow-[4px_4px_8px_#08080c,-4px_-4px_8px_#1c1c28] transition-all duration-300 hover:border-teal-500/20">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-lg transition-transform group-hover:scale-105`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <h3 className="truncate text-[15px] font-bold leading-tight text-white">{card.name}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${badgeTone}`}>
                {card.badgeLabel}
              </span>
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug text-slate-500">{card.description}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {card.features.map((feature) => (
          <span
            key={feature}
            className="rounded-lg border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] px-2 py-1 text-xs font-medium text-slate-400"
          >
            {feature}
          </span>
        ))}
      </div>

      {isConnected ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-green-400">
            <CheckCircle className="h-4 w-4" />
            Connected
          </div>
          {lastSyncLabel && <p className="text-xs text-slate-400">Last synced: {lastSyncLabel}</p>}
        </div>
      ) : canInitiate ? (
        <button
          onClick={() => onConnect(card.providerKey)}
          disabled={isConnecting}
          className={`relative flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${card.color} px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ${
            isConnecting ? 'opacity-80' : 'hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isConnecting ? (
            <>
              <div className="absolute inset-0 animate-pulse bg-white/20" />
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="relative z-10 font-semibold tracking-wide">Connecting...</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Connect {card.name}
            </>
          )}
        </button>
      ) : (
        <button
          disabled
          className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-700/30 bg-slate-800/40 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500"
        >
          <Clock className="h-3.5 w-3.5" />
          {disabled ? 'Sign In To Connect' : card.badgeLabel}
        </button>
      )}
    </div>
  );
}
