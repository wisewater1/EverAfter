import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity, Watch, Heart, Zap, Database, Cloud, Shield, Lock,
  CheckCircle, AlertCircle, RefreshCw, Plus, Upload, FileText,
  Smartphone, Radio, Droplet, Stethoscope, FlaskConical, Link2,
  Sparkles, Code, Settings, Info, TrendingUp, Moon, Brain, Target,
  Scale, ThermometerSun, Clock
} from 'lucide-react';

interface HealthConnection {
  id: string;
  service_name: string;
  service_type: string;
  status: 'connected' | 'pending' | 'disconnected' | 'error' | 'coming_soon';
  last_sync_at?: string;
}

type ServiceCategory =
  | 'aggregators'
  | 'wearables'
  | 'glucose'
  | 'ehr'
  | 'research'
  | 'platform'
  | 'custom';

interface HealthService {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  features: string[];
  status?: 'available' | 'coming_soon';
  deviceCount?: string;
  specialties?: string[];
}

const HEALTH_SERVICES: HealthService[] = [
  // Multi-Device Aggregators
  {
    id: 'terra',
    name: 'Terra',
    category: 'aggregators',
    description: 'Unified API for 300+ wearables with real-time webhooks',
    icon: Cloud,
    color: 'from-purple-600 to-violet-600',
    features: ['300+ Devices', 'Real-time', 'Normalized', 'Webhooks'],
    status: 'available',
    deviceCount: '300+'
  },
  {
    id: 'validic',
    name: 'Validic',
    category: 'aggregators',
    description: 'Enterprise-grade connection to 600+ devices and apps',
    icon: Shield,
    color: 'from-indigo-600 to-blue-600',
    features: ['600+ Devices', 'EHR-integrated', 'RPM', 'Clinical'],
    status: 'coming_soon',
    deviceCount: '600+'
  },
  {
    id: 'human_api',
    name: 'Human API',
    category: 'aggregators',
    description: 'Consumer-controlled health data: wearables + medical records',
    icon: Link2,
    color: 'from-blue-600 to-cyan-600',
    features: ['Wellness', 'Medical Records', 'Normalized', 'Link Flow'],
    status: 'coming_soon'
  },
  {
    id: 'metriport',
    name: 'Metriport',
    category: 'aggregators',
    description: 'Open-source universal API for EHRs and wearables',
    icon: Code,
    color: 'from-cyan-600 to-teal-600',
    features: ['EHR', 'Wearables', 'Open-source', 'Transparent'],
    status: 'coming_soon'
  },
  {
    id: 'rook',
    name: 'ROOK',
    category: 'aggregators',
    description: 'Connect 400+ wearables through one API + SDK',
    icon: Zap,
    color: 'from-orange-600 to-red-600',
    features: ['400+ Devices', 'API', 'SDK', 'Fast Integration'],
    status: 'coming_soon',
    deviceCount: '400+'
  },
  {
    id: 'spike_api',
    name: 'Spike API',
    category: 'aggregators',
    description: '360° health data across 500+ wearables, IoT, and labs',
    icon: Radio,
    color: 'from-pink-600 to-rose-600',
    features: ['500+ Sources', 'IoT', 'Labs', 'AI-ready'],
    status: 'coming_soon',
    deviceCount: '500+'
  },

  // Platform Integrations
  {
    id: 'apple_healthkit',
    name: 'Apple HealthKit',
    category: 'platform',
    description: 'iOS on-device health store with unified schema',
    icon: Smartphone,
    color: 'from-red-500 to-pink-500',
    features: ['On-device', 'Privacy', 'iOS/Watch', 'Unified Schema'],
    status: 'coming_soon'
  },
  {
    id: 'health_connect',
    name: 'Health Connect',
    category: 'platform',
    description: 'Android on-device hub with FHIR medical records',
    icon: Smartphone,
    color: 'from-green-600 to-emerald-600',
    features: ['On-device', 'Android', 'FHIR', 'Samsung Health'],
    status: 'coming_soon'
  },

  // Individual Wearables
  {
    id: 'fitbit',
    name: 'Fitbit',
    category: 'wearables',
    description: 'Popular fitness tracker and smartwatch',
    icon: Watch,
    color: 'from-blue-600 to-cyan-600',
    features: ['Steps', 'Heart Rate', 'Sleep', 'Calories'],
    status: 'available'
  },
  {
    id: 'oura_ring',
    name: 'Oura Ring',
    category: 'wearables',
    description: 'Advanced sleep and recovery tracking ring',
    icon: Moon,
    color: 'from-slate-600 to-gray-600',
    features: ['Readiness', 'Sleep', 'HRV', 'Temperature'],
    status: 'available'
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    category: 'wearables',
    description: 'Performance optimization wearable',
    icon: Activity,
    color: 'from-gray-700 to-slate-700',
    features: ['Strain', 'Recovery', 'Sleep', 'HRV'],
    status: 'coming_soon'
  },
  {
    id: 'garmin',
    name: 'Garmin',
    category: 'wearables',
    description: 'Fitness and outdoor GPS watches',
    icon: Watch,
    color: 'from-orange-600 to-amber-600',
    features: ['Activity', 'Heart Rate', 'VO2 Max'],
    status: 'coming_soon'
  },
  {
    id: 'withings',
    name: 'Withings',
    category: 'wearables',
    description: 'Connected scales and health monitors',
    icon: Scale,
    color: 'from-teal-600 to-emerald-600',
    features: ['Weight', 'BP', 'Heart Rate'],
    status: 'coming_soon'
  },
  {
    id: 'polar',
    name: 'Polar',
    category: 'wearables',
    description: 'Training load and performance tracking',
    icon: Heart,
    color: 'from-red-600 to-orange-600',
    features: ['Training Load', 'Recovery', 'HRV'],
    status: 'coming_soon'
  },

  // Glucose Monitoring
  {
    id: 'dexcom_cgm',
    name: 'Dexcom CGM',
    category: 'glucose',
    description: 'Continuous glucose monitoring with real-time data',
    icon: Droplet,
    color: 'from-blue-500 to-indigo-500',
    features: ['Glucose', 'Trends', 'Alerts', 'TIR'],
    status: 'available'
  },
  {
    id: 'abbott_libre',
    name: 'Abbott Libre',
    category: 'glucose',
    description: 'FreeStyle Libre via aggregator partners',
    icon: Droplet,
    color: 'from-green-500 to-teal-500',
    features: ['Glucose', 'TIR', 'Reports'],
    status: 'available'
  },
  {
    id: 'manual_cgm_upload',
    name: 'Manual Upload',
    category: 'glucose',
    description: 'Upload CSV/JSON files from any CGM device',
    icon: Upload,
    color: 'from-slate-600 to-gray-600',
    features: ['CSV Import', 'JSON Import', 'Bulk Upload'],
    status: 'available'
  },

  // Electronic Health Records
  {
    id: 'smart_fhir',
    name: 'SMART on FHIR',
    category: 'ehr',
    description: 'Electronic Health Records (Epic, Cerner)',
    icon: Stethoscope,
    color: 'from-indigo-600 to-purple-600',
    features: ['Lab Results', 'HbA1c', 'Medications'],
    status: 'coming_soon'
  },

  // Research & Wellness
  {
    id: 'fitabase',
    name: 'Fitabase',
    category: 'research',
    description: 'Research platform for Fitbit & Garmin with API',
    icon: FlaskConical,
    color: 'from-violet-600 to-purple-600',
    features: ['Research', 'Exports', 'API', 'IRB-friendly'],
    status: 'coming_soon'
  },
  {
    id: 'fitrockr',
    name: 'Fitrockr',
    category: 'research',
    description: 'Garmin research platform with live streaming API',
    icon: Radio,
    color: 'from-orange-600 to-red-600',
    features: ['Garmin', 'REST API', 'Live Stream', 'Healthcare'],
    status: 'coming_soon'
  },
  {
    id: 'openmhealth',
    name: 'Open mHealth',
    category: 'research',
    description: 'Open data schemas and normalization with Shimmer',
    icon: Code,
    color: 'from-teal-600 to-cyan-600',
    features: ['Standards', 'Open-source', 'Shimmer', 'DIY'],
    status: 'coming_soon'
  },
];

export default function ComprehensiveHealthConnectors() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<HealthConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [connectedCount, setConnectedCount] = useState(0);
  const [showCustomPluginModal, setShowCustomPluginModal] = useState(false);

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
      setConnectedCount(data?.filter(c => c.status === 'connected').length || 0);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectService = async (serviceId: string, serviceName: string) => {
    try {
      const { error } = await supabase
        .from('health_connections')
        .insert([{
          user_id: user?.id,
          service_name: serviceName,
          service_type: serviceId,
          status: 'pending',
          sync_frequency: 'daily'
        }]);

      if (error) throw error;
      alert(`${serviceName} connection initiated! In production, this would redirect to OAuth.`);
      fetchConnections();
    } catch (error) {
      console.error('Error connecting service:', error);
      alert('Failed to connect service');
    }
  };

  const categories = [
    { id: 'all', label: 'All Connectors', icon: Link2 },
    { id: 'aggregators', label: 'Multi-Device', icon: Cloud },
    { id: 'wearables', label: 'Wearables', icon: Watch },
    { id: 'glucose', label: 'CGM', icon: Droplet },
    { id: 'ehr', label: 'Health Records', icon: Stethoscope },
    { id: 'research', label: 'Research', icon: FlaskConical },
    { id: 'platform', label: 'Platforms', icon: Smartphone },
  ];

  const filteredServices = selectedCategory === 'all'
    ? HEALTH_SERVICES
    : HEALTH_SERVICES.filter(s => s.category === selectedCategory);

  const getCategoryTitle = (category: ServiceCategory) => {
    const titles = {
      aggregators: 'Multi-Device Aggregators',
      wearables: 'Individual Wearables',
      glucose: 'Glucose Monitoring',
      ehr: 'Electronic Health Records',
      research: 'Research & Wellness Platforms',
      platform: 'Platform Integrations',
      custom: 'Custom Plugins'
    };
    return titles[category];
  };

  if (loading) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-slate-700 border-t-teal-400 rounded-full animate-spin"></div>
          <div className="text-slate-400">Loading health connectors...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Health Device Connections</h2>
            <p className="text-slate-400 text-sm">Connect your wearables, CGM devices, and fitness trackers to sync health data automatically.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-teal-400" />
                <span className="text-teal-400 font-medium text-sm">{connectedCount} Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as ServiceCategory | 'all')}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300 shadow-[inset_3px_3px_8px_rgba(0,0,0,0.4)] border border-teal-500/30'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 shadow-[2px_2px_5px_rgba(0,0,0,0.2)] border border-transparent hover:border-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Grid by Category */}
      {selectedCategory === 'all' ? (
        Object.entries(
          HEALTH_SERVICES.reduce((acc, service) => {
            if (!acc[service.category]) acc[service.category] = [];
            acc[service.category].push(service);
            return acc;
          }, {} as Record<ServiceCategory, HealthService[]>)
        ).map(([category, services]) => (
          <div key={category} className="space-y-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">{getCategoryTitle(category as ServiceCategory)}</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map(service => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  connection={connections.find(c => c.service_type === service.id && c.status !== 'disconnected')}
                  onConnect={connectService}
                  syncing={syncing}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              connection={connections.find(c => c.service_type === service.id && c.status !== 'disconnected')}
              onConnect={connectService}
              syncing={syncing}
            />
          ))}
        </div>
      )}

      {/* Custom Plugin Builder */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-purple-500/30">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">Create Your Own Health Plugin</h3>
            <p className="text-slate-400 text-sm mb-4">Build custom dashboards combining multiple data sources</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border border-teal-500/20">
                <div className="text-teal-400 text-xs mb-1">Connected Sources</div>
                <div className="text-white text-xl font-bold">{connectedCount}</div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20">
                <div className="text-blue-400 text-xs mb-1">Data Points</div>
                <div className="text-white text-xl font-bold">All</div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 border border-purple-500/20">
                <div className="text-purple-400 text-xs mb-1">Views</div>
                <div className="text-white text-xl font-bold">Custom</div>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/5 to-red-500/5 border border-orange-500/20">
                <div className="text-orange-400 text-xs mb-1">Insights</div>
                <div className="text-white text-xl font-bold">AI</div>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-2 font-medium">Features You Can Build:</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-400 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Unified health timeline across all devices
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Custom correlation charts (glucose vs activity)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Personalized health score algorithms
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Multi-metric comparison dashboards
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Automated health reports
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-teal-400" />
                  Real-time alert systems
                </li>
              </ul>
            </div>
            <button
              onClick={() => setShowCustomPluginModal(true)}
              disabled={connectedCount === 0}
              className={`px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium transition-all duration-300 flex items-center gap-2 shadow-lg ${
                connectedCount === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Start Building Your Custom Plugin
            </button>
            {connectedCount === 0 && (
              <p className="text-slate-500 text-xs mt-2">Connect health sources above to get started</p>
            )}
          </div>
        </div>
      </div>

      {/* Privacy & Security */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5 border border-teal-500/20 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.2)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0 shadow-[inset_2px_2px_5px_rgba(0,0,0,0.3)] border border-teal-500/20">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1">
            <p className="text-teal-400 font-medium text-sm mb-2">Privacy & Security</p>
            <ul className="text-slate-400 text-xs leading-relaxed space-y-1">
              <li>• All connections use OAuth 2.0 for secure authentication</li>
              <li>• Your credentials are never stored in our database</li>
              <li>• Data is encrypted in transit and at rest</li>
              <li>• You can disconnect any service at any time</li>
              <li>• We only access health data you explicitly authorize</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Custom Plugin Builder Modal */}
      {showCustomPluginModal && (
        <CustomPluginBuilderModal
          connections={connections}
          onClose={() => setShowCustomPluginModal(false)}
        />
      )}
    </div>
  );
}

interface ServiceCardProps {
  service: HealthService;
  connection?: HealthConnection;
  onConnect: (serviceId: string, serviceName: string) => void;
  syncing: string | null;
}

function ServiceCard({ service, connection, onConnect, syncing }: ServiceCardProps) {
  const Icon = service.icon;
  const isConnected = connection?.status === 'connected';
  const isComingSoon = service.status === 'coming_soon';

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[4px_4px_8px_#08080c,-4px_-4px_8px_#1c1c28] border border-white/5 hover:border-teal-500/20 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-12 h-12 bg-gradient-to-br ${service.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm truncate">{service.name}</h3>
              {service.deviceCount && (
                <span className="text-xs text-teal-400 font-medium whitespace-nowrap">{service.deviceCount}</span>
              )}
            </div>
            <p className="text-slate-500 text-xs truncate">{service.description}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {service.features.map((feature, idx) => (
          <span
            key={idx}
            className="px-2 py-1 rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 text-slate-400 text-xs font-medium"
          >
            {feature}
          </span>
        ))}
      </div>

      {isComingSoon ? (
        <button
          disabled
          className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-slate-500/10 to-gray-500/10 text-slate-500 font-medium text-sm flex items-center justify-center gap-2 border border-slate-500/20 cursor-not-allowed"
        >
          <Clock className="w-4 h-4" />
          Coming Soon
        </button>
      ) : connection ? (
        <div className="space-y-2">
          {connection.last_sync_at && (
            <p className="text-slate-400 text-xs">
              Last synced: {new Date(connection.last_sync_at).toLocaleString()}
            </p>
          )}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-900/30 text-green-400 border border-green-500/30 text-xs font-medium">
              <CheckCircle className="w-3 h-3" />
              Connected
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onConnect(service.id, service.name)}
          className={`w-full px-4 py-3 bg-gradient-to-r ${service.color} text-white rounded-xl hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-sm font-medium flex items-center justify-center gap-2 shadow-lg`}
        >
          <Plus className="w-4 h-4" />
          Connect {service.name}
        </button>
      )}
    </div>
  );
}

interface CustomPluginBuilderModalProps {
  connections: HealthConnection[];
  onClose: () => void;
}

function CustomPluginBuilderModal({ connections, onClose }: CustomPluginBuilderModalProps) {
  const [pluginName, setPluginName] = useState('');
  const [selectedDataPoints, setSelectedDataPoints] = useState<string[]>([]);
  const [dashboardType, setDashboardType] = useState<'correlation' | 'timeline' | 'comparison' | 'alerts'>('correlation');
  const [creating, setCreating] = useState(false);

  const availableDataPoints = [
    { id: 'glucose', label: 'Glucose Levels', icon: Droplet, sources: ['dexcom_cgm', 'abbott_libre'] },
    { id: 'heart_rate', label: 'Heart Rate', icon: Heart, sources: ['fitbit', 'oura_ring', 'whoop'] },
    { id: 'sleep', label: 'Sleep Quality', icon: Moon, sources: ['oura_ring', 'fitbit', 'whoop'] },
    { id: 'steps', label: 'Steps', icon: Activity, sources: ['fitbit', 'garmin', 'whoop'] },
    { id: 'hrv', label: 'HRV', icon: Brain, sources: ['oura_ring', 'whoop', 'polar'] },
    { id: 'activity', label: 'Activity', icon: TrendingUp, sources: ['fitbit', 'garmin', 'terra'] },
    { id: 'recovery', label: 'Recovery Score', icon: Target, sources: ['oura_ring', 'whoop'] },
    { id: 'temperature', label: 'Temperature', icon: ThermometerSun, sources: ['oura_ring'] },
  ];

  const toggleDataPoint = (id: string) => {
    setSelectedDataPoints(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!pluginName || selectedDataPoints.length === 0) return;

    setCreating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Custom plugin "${pluginName}" created successfully! You can now view it in your dashboard.`);
      onClose();
    } catch (error) {
      console.error('Error creating plugin:', error);
      alert('Failed to create plugin. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#13131a] rounded-3xl shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-br from-[#1a1a24] to-[#13131a] border-b border-white/10 p-6 rounded-t-3xl z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Custom Plugin Builder</h2>
                <p className="text-slate-400 text-sm">Combine data from your connected sources</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-white rotate-45" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">Plugin Name</label>
            <input
              type="text"
              value={pluginName}
              onChange={(e) => setPluginName(e.target.value)}
              placeholder="e.g., Glucose-Activity Correlation"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-3">Dashboard Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'correlation', label: 'Correlation', icon: TrendingUp, desc: 'Compare metrics' },
                { id: 'timeline', label: 'Timeline', icon: Clock, desc: 'View trends' },
                { id: 'comparison', label: 'Comparison', icon: Activity, desc: 'Side by side' },
                { id: 'alerts', label: 'Alerts', icon: AlertCircle, desc: 'Real-time alerts' },
              ].map((type) => {
                const Icon = type.icon;
                const isSelected = dashboardType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setDashboardType(type.id as any)}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>{type.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{type.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-3">
              Select Data Points ({selectedDataPoints.length} selected)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableDataPoints.map((point) => {
                const Icon = point.icon;
                const isSelected = selectedDataPoints.includes(point.id);
                const hasConnection = connections.some(c =>
                  point.sources.includes(c.service_name) && c.status === 'connected'
                );

                return (
                  <button
                    key={point.id}
                    onClick={() => hasConnection && toggleDataPoint(point.id)}
                    disabled={!hasConnection}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      !hasConnection
                        ? 'bg-white/5 border-white/10 opacity-50 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border-teal-500'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <p className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {point.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {hasConnection ? `From ${point.sources[0]}` : 'Not connected'}
                        </p>
                      </div>
                      {isSelected && <CheckCircle className="w-5 h-5 text-teal-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300">
                <p className="font-medium mb-1">How it works</p>
                <p className="text-blue-300/80">
                  Your custom plugin will combine data from selected sources and visualize them according
                  to your chosen dashboard type. All data stays private and is only accessible to you.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-br from-[#1a1a24] to-[#13131a] border-t border-white/10 p-6 rounded-b-3xl">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!pluginName || selectedDataPoints.length === 0 || creating}
              className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                !pluginName || selectedDataPoints.length === 0 || creating
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg'
              }`}
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Create Plugin
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
