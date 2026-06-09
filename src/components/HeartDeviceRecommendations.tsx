import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart,
  Activity,
  Zap,
  CheckCircle,
  ChevronRight,
  Star,
  TrendingUp,
  Shield,
  Battery,
  Smartphone,
  DollarSign,
  AlertCircle,
  Info,
  ArrowRight,
  X,
  Filter,
  Search,
} from 'lucide-react';

interface HeartDevice {
  id: string;
  device_name: string;
  manufacturer: string;
  device_category: string;
  primary_use_case: string;
  description: string;
  key_features: string[];
  form_factor: string;
  has_ecg: boolean;
  ecg_lead_count: number | null;
  has_continuous_monitoring: boolean;
  has_hrv: boolean;
  has_medical_certification: boolean;
  fda_cleared: boolean;
  ce_marked: boolean;
  accuracy_rating: number;
  battery_life_hours: number | null;
  connectivity_types: string[];
  compatible_platforms: string[];
  data_export_formats: string[];
  price_usd: number;
  insurance_eligible: boolean;
  requires_subscription: boolean;
  subscription_price_monthly: number | null;
  manufacturer_url: string;
}

interface Recommendation {
  device_id: string;
  device_name: string;
  manufacturer: string;
  device_category: string;
  confidence_score: number;
  match_reasons: string[];
  rank: number;
}

interface UserProfile {
  primary_goal: string;
  activity_level: string;
  has_heart_condition: boolean;
  needs_medical_grade: boolean;
  preferred_form_factors: string[];
  budget_range: string;
}

export default function HeartDeviceRecommendations() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<HeartDevice[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<HeartDevice | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [comparisonList, setComparisonList] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      setLoading(true);

      const [devicesRes, profileRes] = await Promise.all([
        supabase
          .from('heart_device_catalog')
          .select('*')
          .eq('is_available', true)
          .order('device_name'),
        supabase
          .from('user_heart_monitoring_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (devicesRes.data) {
        setDevices(devicesRes.data);
      }

      if (profileRes.data) {
        setUserProfile(profileRes.data);
        await loadRecommendations();
      } else {
        setShowProfileSetup(true);
      }
    } catch (error) {
      console.error('Error loading heart device data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecommendations() {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('get_heart_device_recommendations', {
        p_user_id: user.id,
        p_limit: 5,
      });

      if (error) throw error;
      if (data) setRecommendations(data);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    }
  }

  async function saveProfile(profile: Partial<UserProfile>) {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_heart_monitoring_profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setUserProfile(profile as UserProfile);
      setShowProfileSetup(false);
      await loadRecommendations();
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  }

  function getCategoryIcon(category: string) {
    switch (category) {
      case 'medical_ecg':
        return Heart;
      case 'hybrid_smartwatch':
        return Activity;
      case 'chest_strap_sensor':
        return Zap;
      case 'wearable_ring':
        return Activity;
      case 'continuous_ecg':
        return Heart;
      default:
        return Activity;
    }
  }

  function getCategoryLabel(category: string) {
    return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function getUseCaseLabel(useCase: string) {
    return useCase.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  }

  function toggleComparison(deviceId: string) {
    setComparisonList((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : prev.length < 4
          ? [...prev, deviceId]
          : prev
    );
  }

  const filteredDevices = devices.filter((device) => {
    const matchesCategory = filterCategory === 'all' || device.device_category === filterCategory;
    const matchesSearch =
      searchQuery === '' ||
      device.device_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const recommendedDevices = recommendations
    .map((rec) => devices.find((d) => d.id === rec.device_id))
    .filter((d): d is HeartDevice => d !== undefined);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-900/20 to-rose-900/20 rounded-2xl p-6 border border-pink-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Heart className="w-7 h-7 text-pink-400" />
              Heart Monitoring Device Recommendations
            </h2>
            <p className="text-pink-200 text-sm">
              Find the perfect heart monitoring device for your health goals and lifestyle
            </p>
          </div>
          {userProfile && (
            <button
              onClick={() => setShowProfileSetup(true)}
              className="px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg transition-all text-sm"
            >
              Update Preferences
            </button>
          )}
        </div>
      </div>

      {showProfileSetup && (
        <ProfileSetupModal
          initialProfile={userProfile}
          onSave={saveProfile}
          onClose={() => setShowProfileSetup(false)}
        />
      )}

      {!showProfileSetup && recommendations.length > 0 && (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            Personalized Recommendations for You
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendedDevices.slice(0, 4).map((device, idx) => {
              const recommendation = recommendations.find((r) => r.device_id === device.id);
              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  recommendation={recommendation}
                  rank={idx + 1}
                  onViewDetails={() => setSelectedDevice(device)}
                  onToggleComparison={() => toggleComparison(device.id)}
                  isInComparison={comparisonList.includes(device.id)}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Browse All Devices</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search devices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <option value="all">All Categories</option>
              <option value="medical_ecg">Medical ECG</option>
              <option value="hybrid_smartwatch">Hybrid Smartwatch</option>
              <option value="chest_strap_sensor">Chest Strap Sensor</option>
              <option value="wearable_ring">Wearable Ring</option>
              <option value="continuous_ecg">Continuous ECG</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onViewDetails={() => setSelectedDevice(device)}
              onToggleComparison={() => toggleComparison(device.id)}
              isInComparison={comparisonList.includes(device.id)}
            />
          ))}
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No devices found matching your criteria</p>
          </div>
        )}
      </div>

      {comparisonList.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl p-4 shadow-2xl border border-pink-400/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">
              {comparisonList.length} device{comparisonList.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setComparisonList([])}
              className="text-pink-200 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => {
              const compareDevices = devices.filter((d) => comparisonList.includes(d.id));
              console.log('Compare:', compareDevices);
            }}
            className="w-full px-4 py-2 bg-white text-pink-600 rounded-lg font-medium hover:bg-pink-50 transition-colors"
          >
            Compare Devices
          </button>
        </div>
      )}

      {selectedDevice && (
        <DeviceDetailsModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  );
}

function DeviceCard({
  device,
  recommendation,
  rank,
  onViewDetails,
  onToggleComparison,
  isInComparison,
}: {
  device: HeartDevice;
  recommendation?: Recommendation;
  rank?: number;
  onViewDetails: () => void;
  onToggleComparison: () => void;
  isInComparison: boolean;
}) {
  const CategoryIcon = getCategoryIcon(device.device_category);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-5 hover:border-pink-500/30 transition-all group">
      {rank && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">#{rank}</span>
          </div>
          {recommendation && (
            <div className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded-full">
              {Math.round(recommendation.confidence_score * 100)}% match
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-600 to-rose-600 rounded-lg flex items-center justify-center">
            <CategoryIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-white font-semibold">{device.device_name}</h4>
            <p className="text-gray-400 text-sm">{device.manufacturer}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-pink-300 font-bold text-lg">{formatPrice(device.price_usd)}</div>
          {device.requires_subscription && (
            <div className="text-gray-400 text-xs">
              +${device.subscription_price_monthly}/mo
            </div>
          )}
        </div>
      </div>

      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{device.description}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {device.fda_cleared && (
          <span className="px-2 py-1 bg-blue-600/20 text-blue-300 text-xs rounded flex items-center gap-1">
            <Shield className="w-3 h-3" />
            FDA Cleared
          </span>
        )}
        {device.has_ecg && (
          <span className="px-2 py-1 bg-red-600/20 text-red-300 text-xs rounded">
            ECG {device.ecg_lead_count && `(${device.ecg_lead_count}-lead)`}
          </span>
        )}
        {device.has_hrv && (
          <span className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded">HRV</span>
        )}
        {device.has_continuous_monitoring && (
          <span className="px-2 py-1 bg-green-600/20 text-green-300 text-xs rounded">
            24/7 Monitoring
          </span>
        )}
      </div>

      {recommendation && recommendation.match_reasons.length > 0 && (
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 mb-3">
          <div className="text-green-300 text-xs font-medium mb-2">Why this matches you:</div>
          <ul className="space-y-1">
            {recommendation.match_reasons.slice(0, 2).map((reason, idx) => (
              <li key={idx} className="text-green-200 text-xs flex items-start gap-2">
                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="flex-1 px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleComparison}
          className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
            isInComparison
              ? 'bg-purple-600 text-white'
              : 'bg-white/10 hover:bg-white/20 text-gray-300'
          }`}
        >
          {isInComparison ? 'Added' : 'Compare'}
        </button>
      </div>
    </div>
  );
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'medical_ecg':
      return Heart;
    case 'hybrid_smartwatch':
      return Activity;
    case 'chest_strap_sensor':
      return Zap;
    default:
      return Activity;
  }
}

function ProfileSetupModal({
  initialProfile,
  onSave,
  onClose,
}: {
  initialProfile: UserProfile | null;
  onSave: (profile: Partial<UserProfile>) => void;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Partial<UserProfile>>(
    initialProfile || {
      primary_goal: 'wellness_tracking',
      activity_level: 'moderate',
      has_heart_condition: false,
      needs_medical_grade: false,
      preferred_form_factors: [],
      budget_range: '100_200',
    }
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-[#1a1a24]/95 to-[#13131a]/95 backdrop-blur-xl rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-auto p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center border border-pink-500/30">
              <Heart className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-2xl font-bold text-white">Your Heart Monitoring Needs</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-300 transition-all border border-white/10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <label className="block text-white font-medium mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              Primary Goal
            </label>
            <select
              value={profile.primary_goal}
              onChange={(e) => setProfile({ ...profile, primary_goal: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all backdrop-blur-sm"
            >
              <option value="medical_monitoring">Medical Monitoring</option>
              <option value="fitness_optimization">Fitness Optimization</option>
              <option value="wellness_tracking">Wellness Tracking</option>
              <option value="performance_training">Performance Training</option>
              <option value="recovery_tracking">Recovery Tracking</option>
            </select>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <label className="block text-white font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-400" />
              Activity Level
            </label>
            <select
              value={profile.activity_level}
              onChange={(e) => setProfile({ ...profile, activity_level: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all backdrop-blur-sm"
            >
              <option value="sedentary">Sedentary</option>
              <option value="light">Light Activity</option>
              <option value="moderate">Moderate Activity</option>
              <option value="active">Active</option>
              <option value="very_active">Very Active</option>
              <option value="athlete">Athlete</option>
            </select>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <label className="block text-white font-medium mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-400" />
              Budget Range
            </label>
            <select
              value={profile.budget_range}
              onChange={(e) => setProfile({ ...profile, budget_range: e.target.value })}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all backdrop-blur-sm"
            >
              <option value="under_50">Under $50</option>
              <option value="50_100">$50 - $100</option>
              <option value="100_200">$100 - $200</option>
              <option value="200_400">$200 - $400</option>
              <option value="over_400">Over $400</option>
              <option value="no_limit">No Budget Limit</option>
            </select>
          </div>

          <div className="bg-pink-500/10 backdrop-blur-sm rounded-xl p-4 border border-pink-500/20 space-y-3">
            <div className="flex items-center gap-2 text-pink-300 font-medium mb-3">
              <Shield className="w-4 h-4" />
              Medical Requirements
            </div>

            <label className="flex items-center gap-3 text-white cursor-pointer group p-3 rounded-lg hover:bg-white/5 transition-all">
              <input
                type="checkbox"
                checked={profile.has_heart_condition || false}
                onChange={(e) =>
                  setProfile({ ...profile, has_heart_condition: e.target.checked })
                }
                className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-pink-500 checked:border-pink-500 focus:ring-2 focus:ring-pink-500/50 transition-all"
              />
              <span className="flex-1">I have a heart condition requiring monitoring</span>
              <AlertCircle className="w-4 h-4 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </label>

            <label className="flex items-center gap-3 text-white cursor-pointer group p-3 rounded-lg hover:bg-white/5 transition-all">
              <input
                type="checkbox"
                checked={profile.needs_medical_grade || false}
                onChange={(e) => setProfile({ ...profile, needs_medical_grade: e.target.checked })}
                className="w-5 h-5 rounded border-2 border-white/30 bg-white/10 checked:bg-pink-500 checked:border-pink-500 focus:ring-2 focus:ring-pink-500/50 transition-all"
              />
              <span className="flex-1">I need a medical-grade device (FDA cleared)</span>
              <Shield className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-all border border-white/10 backdrop-blur-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(profile)}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl font-medium transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
            >
              Save & Get Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceDetailsModal({
  device,
  onClose,
}: {
  device: HeartDevice;
  onClose: () => void;
}) {
  const CategoryIcon = getCategoryIcon(device.device_category);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-rose-600 rounded-xl flex items-center justify-center">
              <CategoryIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{device.device_name}</h3>
              <p className="text-gray-400">{device.manufacturer}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Price</div>
            <div className="text-2xl font-bold text-pink-300">{formatPrice(device.price_usd)}</div>
            {device.requires_subscription && (
              <div className="text-gray-400 text-xs mt-1">
                + ${device.subscription_price_monthly}/month subscription
              </div>
            )}
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Accuracy Rating</div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-yellow-300">{device.accuracy_rating}</div>
              <div className="text-yellow-300">/5.0</div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-white font-semibold mb-2">Description</h4>
            <p className="text-gray-300 text-sm">{device.description}</p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-2">Key Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {device.key_features.map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-300 bg-white/5 rounded-lg p-2"
                >
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Form Factor</div>
              <div className="text-white text-sm font-medium capitalize">
                {device.form_factor.replace(/_/g, ' ')}
              </div>
            </div>
            {device.battery_life_hours && (
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-gray-400 text-xs mb-1">Battery Life</div>
                <div className="text-white text-sm font-medium">
                  {Math.floor(device.battery_life_hours / 24)} days
                </div>
              </div>
            )}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">Insurance</div>
              <div className="text-white text-sm font-medium">
                {device.insurance_eligible ? 'Eligible' : 'Not Eligible'}
              </div>
            </div>
          </div>

          {device.manufacturer_url && (
            <a
              href={device.manufacturer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              Learn More & Purchase
              <ArrowRight className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price);
}
