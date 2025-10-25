import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Heart, Crown, Star, Clock, CheckCircle, Zap, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Saint {
  id: string;
  name: string;
  title: string;
  description: string;
  responsibilities: string[];
  tier: 'classic' | 'premium';
  price?: number;
  stripeProductId?: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  todayActivities: number;
  weeklyActivities: number;
  lastActive: string;
}

interface SaintActivity {
  id: string;
  saint_id: string;
  action: string;
  description: string;
  created_at: string;
  status: 'completed' | 'in_progress' | 'scheduled';
  impact: 'high' | 'medium' | 'low';
  category: 'communication' | 'support' | 'protection' | 'memory' | 'family' | 'charity';
  details?: string | Record<string, unknown>;
}

interface SaintsDashboardProps {
  onOpenRaphaelAgent: () => void;
  onOpenHealthMonitor: () => void;
}

const saintDefinitions: Omit<Saint, 'active' | 'todayActivities' | 'weeklyActivities' | 'lastActive'>[] = [
  {
    id: 'raphael',
    name: 'St. Raphael',
    title: 'The Healer',
    description: 'Free autonomous AI agent for health management. Schedules appointments, manages prescriptions, tracks wellness, and handles all health-related tasks in the background.',
    responsibilities: ['Doctor appointments', 'Prescription management', 'Health tracking', 'Wellness coordination'],
    tier: 'classic',
    icon: Heart,
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Guardian AI that manages security, privacy protection, and digital legacy preservation.',
    responsibilities: ['Security monitoring', 'Privacy protection', 'Data integrity', 'Access control'],
    tier: 'premium',
    price: 24.99,
    icon: Shield,
  },
  {
    id: 'martin',
    name: 'St. Martin of Tours',
    title: 'The Compassionate',
    description: 'Premium AI specializing in charitable acts, community building, and legacy philanthropy.',
    responsibilities: ['Charitable giving', 'Community outreach', 'Legacy donations', 'Compassionate acts'],
    tier: 'premium',
    price: 29.99,
    icon: Crown,
  },
  {
    id: 'agatha',
    name: 'St. Agatha of Sicily',
    title: 'The Resilient',
    description: 'Premium AI focused on strength, perseverance, and helping families overcome challenges.',
    responsibilities: ['Crisis support', 'Resilience building', 'Family strength', 'Overcoming adversity'],
    tier: 'premium',
    price: 34.99,
    icon: Star,
  }
];

export default function SaintsDashboard({ onOpenRaphaelAgent, onOpenHealthMonitor }: SaintsDashboardProps) {
  const { user } = useAuth();
  const [saints, setSaints] = useState<Saint[]>([]);
  const [activities, setActivities] = useState<SaintActivity[]>([]);
  const [showActivityDetails, setShowActivityDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSaintsData = useCallback(async () => {
    if (!user) return;

    try {
      // Load user's active saints from database
      const { data: activeSaints, error: saintsError } = await supabase
        .from('saints_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (saintsError) throw saintsError;

      // Get activity counts for each saint
      const saintsWithData = await Promise.all(
        saintDefinitions.map(async (saintDef) => {
          const isActive = activeSaints?.some(s => s.saint_id === saintDef.id) || saintDef.id === 'raphael';

          if (!isActive) {
            return {
              ...saintDef,
              active: false,
              todayActivities: 0,
              weeklyActivities: 0,
              lastActive: 'Never',
            };
          }

          // Get today's activity count
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { count: todayCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', today.toISOString());

          // Get this week's activity count
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const { count: weekCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', weekAgo.toISOString());

          // Get last activity
          const { data: lastActivity } = await supabase
            .from('saint_activities')
            .select('created_at')
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const lastActive = lastActivity
            ? new Date(lastActivity.created_at).toLocaleDateString()
            : 'Active now';

          return {
            ...saintDef,
            active: isActive,
            todayActivities: todayCount || 0,
            weeklyActivities: weekCount || 0,
            lastActive,
          };
        })
      );

      setSaints(saintsWithData);
    } catch (error) {
      console.error('Error loading saints data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadActivities = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('saint_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSaintsData();
      loadActivities();
    }
  }, [user, loadSaintsData, loadActivities]);

  const handleSaintActivation = (saint: Saint) => {
    if (saint.tier === 'premium' && !saint.active) {
      alert(`${saint.name} is a premium feature. Coming soon!`);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'protection': return Shield;
      case 'support': return Heart;
      case 'memory': return Clock;
      default: return CheckCircle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400">Loading Saints AI...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-light text-white mb-2">Saints AI Agents</h2>
            <p className="text-gray-400 leading-relaxed max-w-2xl">
              Autonomous AI agents working in the background to manage your life, protect your legacy, and support your family.
            </p>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-base font-medium text-white">Today's Activities</h4>
                <p className="text-sm text-gray-400">Your Saints completed {activities.length} tasks today</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-light text-white">{activities.length}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Protection</span>
              </div>
              <div className="text-lg font-semibold text-blue-400">
                {activities.filter(a => a.category === 'protection').length}
              </div>
              <div className="text-xs text-gray-400">Security actions</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-medium text-white">Support</span>
              </div>
              <div className="text-lg font-semibold text-pink-400">
                {activities.filter(a => a.category === 'support').length}
              </div>
              <div className="text-xs text-gray-400">Comfort actions</div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">Memory</span>
              </div>
              <div className="text-lg font-semibold text-green-400">
                {activities.filter(a => a.category === 'memory').length}
              </div>
              <div className="text-xs text-gray-400">Memory actions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Saints Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {saints.map((saint) => {
          const Icon = saint.icon;
          return (
            <div
              key={saint.id}
              className={`border-2 rounded-xl p-6 transition-all duration-200 shadow-lg backdrop-blur-sm ${
                saint.active && saint.id === 'raphael'
                  ? 'border-green-600 bg-green-900/20 shadow-green-500/25'
                  : saint.active
                    ? 'border-blue-600 bg-blue-900/20 shadow-blue-500/25'
                    : saint.tier === 'premium'
                      ? 'border-amber-600 bg-amber-900/20 shadow-amber-500/25'
                      : 'border-gray-600 bg-gray-700/30 shadow-gray-900/20'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
                      saint.active && saint.id === 'raphael'
                        ? 'bg-green-900/50 shadow-green-500/25'
                        : saint.active
                          ? 'bg-blue-900/50 shadow-blue-500/25'
                          : saint.tier === 'premium'
                            ? 'bg-amber-900/50 shadow-amber-500/25'
                            : 'bg-gray-700 shadow-gray-500/25'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        saint.active && saint.id === 'raphael'
                          ? 'text-green-400'
                          : saint.active
                            ? 'text-blue-600'
                            : saint.tier === 'premium'
                              ? 'text-amber-600'
                              : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white">{saint.name}</h4>
                    <p className="text-sm text-gray-400">{saint.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {saint.tier === 'premium' && (
                    <span className="px-2 py-1 bg-amber-900/30 text-amber-400 text-xs font-medium rounded-full border border-amber-700/30 shadow-sm">
                      Premium
                    </span>
                  )}
                  {saint.active && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-4 leading-relaxed">{saint.description}</p>

              {saint.active && (
                <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">Today's Activity</span>
                    <span className="text-xs text-gray-400">{saint.lastActive}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-white">{saint.todayActivities}</span>
                      <span className="text-xs text-gray-400">today</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-white">{saint.weeklyActivities}</span>
                      <span className="text-xs text-gray-400">this week</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <h5 className="text-xs font-medium text-gray-300 mb-2 uppercase tracking-wide">Responsibilities</h5>
                <div className="flex flex-wrap gap-1">
                  {saint.responsibilities.map((responsibility, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full shadow-sm">
                      {responsibility}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {saint.price ? (
                    <span className="text-lg font-semibold text-white">${saint.price}/month</span>
                  ) : saint.tier === 'classic' && saint.active ? (
                    <span className="px-3 py-1 bg-green-900/30 text-green-400 text-sm font-medium rounded-full border border-green-700/30">
                      FREE
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  {saint.active && saint.id === 'raphael' && (
                    <>
                      <button
                        onClick={onOpenHealthMonitor}
                        className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg"
                      >
                        <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="whitespace-nowrap">Health Monitor</span>
                      </button>
                      <button
                        onClick={onOpenRaphaelAgent}
                        className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs sm:text-sm font-medium hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2"
                      >
                        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="whitespace-nowrap">View Agent Mode</span>
                      </button>
                    </>
                  )}
                  {!saint.active && saint.tier === 'premium' && (
                    <button
                      onClick={() => handleSaintActivation(saint)}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-amber-700 shadow-lg shadow-amber-500/25 transition-all duration-200"
                    >
                      Subscribe
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Today's Activity Feed</h3>
              <p className="text-sm text-gray-400">Real-time actions performed by your Saints</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Live</span>
          </div>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>No activities yet today. Your Saints will start working soon!</p>
            </div>
          ) : (
            activities
              .map((activity) => {
                const CategoryIcon = getCategoryIcon(activity.category);
                return (
                  <div
                    key={activity.id}
                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all cursor-pointer"
                    onClick={() => setShowActivityDetails(showActivityDetails === activity.id ? null : activity.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CategoryIcon className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="text-sm font-medium text-white mb-1">{activity.action}</h4>
                            <p className="text-xs text-gray-400 line-clamp-2">{activity.description}</p>
                          </div>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getImpactColor(activity.impact)}`}>
                            {activity.impact}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                          <span>•</span>
                          <span className="capitalize">{activity.category}</span>
                          <span>•</span>
                          <span className="text-green-400">{activity.status}</span>
                        </div>
                        {showActivityDetails === activity.id && activity.details && (
                          <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700/50">
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {typeof activity.details === 'string' ? activity.details : JSON.stringify(activity.details, null, 2)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
