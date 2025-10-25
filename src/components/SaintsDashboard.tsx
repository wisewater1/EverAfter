import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Heart, Crown, Star, Clock, CheckCircle, Zap, Activity, RefreshCw, AlertCircle } from 'lucide-react';
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

export default function SaintsDashboard({ onOpenHealthMonitor }: SaintsDashboardProps) {
  const { user } = useAuth();
  const [saints, setSaints] = useState<Saint[]>([]);
  const [activities, setActivities] = useState<SaintActivity[]>([]);
  const [showActivityDetails, setShowActivityDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const restoreSaintsData = async () => {
    if (!user) return;

    setRestoring(true);
    setError(null);

    try {
      const { error: insertError } = await supabase
        .from('saints_subscriptions')
        .insert([{
          user_id: user.id,
          saint_id: 'raphael',
          is_active: true,
          activated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }

      await supabase
        .from('saint_activities')
        .insert([{
          user_id: user.id,
          saint_id: 'raphael',
          action: 'Welcome to EverAfter AI',
          description: 'St. Raphael has been activated and is ready to assist you with health management.',
          category: 'support',
          impact: 'high',
          status: 'completed'
        }]);

      await loadSaintsData();
      await loadActivities();
    } catch (err) {
      console.error('Error restoring saints:', err);
      setError('Failed to restore Saints data. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const loadSaintsData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);

      const { data: activeSaints, error: saintsError } = await supabase
        .from('saints_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (saintsError) {
        console.error('Error loading saints subscriptions:', saintsError);
        setError('Unable to load Saints data from database.');
        throw saintsError;
      }

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

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const { count: todayCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', today.toISOString());

          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);

          const { count: weekCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', weekAgo.toISOString());

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

      if (!activeSaints || activeSaints.length === 0) {
        setError('No Saints found. Click "Restore Saints" to initialize your AI agents.');
      }
    } catch (error) {
      console.error('Error loading saints data:', error);
      setError('Failed to load Saints. Please try refreshing the page.');
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
      case 'high': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'low': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
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
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500">Loading Saints AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight text-white">Saints AI Agents</h1>
          <p className="text-slate-400 max-w-2xl leading-relaxed">
            Autonomous AI agents working in the background to manage your life, protect your legacy, and support your family.
          </p>
        </div>
        <button
          onClick={() => { loadSaintsData(); loadActivities(); }}
          className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-rose-300 mb-1">Error Loading Saints</h4>
              <p className="text-sm text-slate-400 mb-3">{error}</p>
              <button
                onClick={restoreSaintsData}
                disabled={restoring}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${restoring ? 'animate-spin' : ''}`} />
                {restoring ? 'Restoring...' : 'Restore Saints Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Summary Card - Enhanced Real-time Look */}
      <div className="relative bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-sky-500/5 animate-pulse"></div>

        {/* Scanning Line Effect */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent animate-scan"></div>

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center ring-2 ring-emerald-500/30">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-base font-medium text-white">Today's Activities</h3>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Analyzing</span>
                  </div>
                </div>
                <p className="text-sm text-slate-400">Your Saints completed <span className="text-emerald-400 font-medium">{activities.length}</span> tasks today</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-extralight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tabular-nums">{activities.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Completed</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Protection Card */}
            <div className="group relative bg-gradient-to-br from-slate-900/70 to-slate-900/50 rounded-xl p-4 border border-slate-800/50 hover:border-sky-500/30 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 to-sky-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/20">
                    <Shield className="w-4 h-4 text-sky-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Protection</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-3xl font-extralight text-white tabular-nums">
                    {activities.filter(a => a.category === 'protection').length}
                  </div>
                  <div className="flex items-center gap-1 text-sky-400">
                    <Zap className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-medium">ACTIVE</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium">Security actions</div>
                {/* Progress Bar */}
                <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((activities.filter(a => a.category === 'protection').length / Math.max(activities.length, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="group relative bg-gradient-to-br from-slate-900/70 to-slate-900/50 rounded-xl p-4 border border-slate-800/50 hover:border-rose-500/30 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center ring-1 ring-rose-500/20">
                    <Heart className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Support</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-3xl font-extralight text-white tabular-nums">
                    {activities.filter(a => a.category === 'support').length}
                  </div>
                  <div className="flex items-center gap-1 text-rose-400">
                    <Zap className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-medium">ACTIVE</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium">Comfort actions</div>
                {/* Progress Bar */}
                <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((activities.filter(a => a.category === 'support').length / Math.max(activities.length, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Memory Card */}
            <div className="group relative bg-gradient-to-br from-slate-900/70 to-slate-900/50 rounded-xl p-4 border border-slate-800/50 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                    <Clock className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Memory</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <div className="text-3xl font-extralight text-white tabular-nums">
                    {activities.filter(a => a.category === 'memory').length}
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Zap className="w-3 h-3 animate-pulse" />
                    <span className="text-[10px] font-medium">ACTIVE</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-medium">Memory actions</div>
                {/* Progress Bar */}
                <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((activities.filter(a => a.category === 'memory').length / Math.max(activities.length, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {saints.map((saint) => {
          const Icon = saint.icon;
          const isRaphael = saint.id === 'raphael';

          return (
            <div
              key={saint.id}
              className={`group relative bg-gradient-to-br rounded-2xl p-6 transition-all duration-300 ${
                saint.active && isRaphael
                  ? 'from-emerald-500/10 to-teal-500/5 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/5'
                  : saint.active
                    ? 'from-sky-500/10 to-blue-500/5 border-2 border-sky-500/30 shadow-xl shadow-sky-500/5'
                    : saint.tier === 'premium'
                      ? 'from-amber-500/10 to-orange-500/5 border-2 border-amber-500/20 shadow-xl shadow-amber-500/5'
                      : 'from-slate-800/50 to-slate-900/50 border-2 border-slate-700/30'
              }`}
            >
              {/* Saint Header */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      saint.active && isRaphael
                        ? 'bg-emerald-500/15 shadow-lg shadow-emerald-500/20'
                        : saint.active
                          ? 'bg-sky-500/15 shadow-lg shadow-sky-500/20'
                          : saint.tier === 'premium'
                            ? 'bg-amber-500/15 shadow-lg shadow-amber-500/20'
                            : 'bg-slate-700/30'
                    }`}
                  >
                    <Icon
                      className={`w-6 h-6 ${
                        saint.active && isRaphael
                          ? 'text-emerald-400'
                          : saint.active
                            ? 'text-sky-400'
                            : saint.tier === 'premium'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white mb-0.5">{saint.name}</h3>
                    <p className="text-sm text-slate-400">{saint.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {saint.tier === 'premium' && (
                    <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full border border-amber-500/20">
                      Premium
                    </span>
                  )}
                  {saint.active && (
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50"></div>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-300 mb-5 leading-relaxed">{saint.description}</p>

              {/* Activity Stats */}
              {saint.active && (
                <div className="mb-5 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today's Activity</span>
                    <span className="text-xs text-slate-500">{saint.lastActive}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-light text-white">{saint.todayActivities}</span>
                      <span className="text-xs text-slate-500">today</span>
                    </div>
                    <div className="w-px h-6 bg-slate-700"></div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-light text-white">{saint.weeklyActivities}</span>
                      <span className="text-xs text-slate-500">this week</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Responsibilities */}
              <div className="mb-5">
                <h5 className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">Responsibilities</h5>
                <div className="flex flex-wrap gap-2">
                  {saint.responsibilities.map((responsibility, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 text-slate-300 text-xs rounded-lg"
                    >
                      {responsibility}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer Action */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700/30">
                <div>
                  {saint.price ? (
                    <span className="text-xl font-light text-white">${saint.price}<span className="text-sm text-slate-500">/month</span></span>
                  ) : saint.tier === 'classic' && saint.active ? (
                    <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-sm font-medium rounded-lg border border-emerald-500/20">
                      FREE
                    </span>
                  ) : null}
                </div>

                {saint.active && isRaphael && (
                  <button
                    onClick={onOpenHealthMonitor}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Activity className="w-4 h-4" />
                    <span>Open Health Monitor</span>
                  </button>
                )}
                {!saint.active && saint.tier === 'premium' && (
                  <button
                    onClick={() => handleSaintActivation(saint)}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-medium shadow-lg shadow-amber-500/20 transition-all duration-200"
                  >
                    Subscribe
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Today's Activity Feed</h3>
              <p className="text-sm text-slate-400">Real-time actions performed by your Saints</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {activities.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">No activities yet today. Your Saints will start working soon!</p>
            </div>
          ) : (
            activities.map((activity) => {
              const CategoryIcon = getCategoryIcon(activity.category);
              return (
                <div
                  key={activity.id}
                  className="group bg-slate-900/50 hover:bg-slate-900/70 rounded-xl p-4 border border-slate-800/50 hover:border-slate-700/50 transition-all cursor-pointer"
                  onClick={() => setShowActivityDetails(showActivityDetails === activity.id ? null : activity.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-slate-800 transition-colors">
                      <CategoryIcon className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-white mb-1">{activity.action}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{activity.description}</p>
                        </div>
                        <span className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border ${getImpactColor(activity.impact)}`}>
                          {activity.impact}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{new Date(activity.created_at).toLocaleTimeString()}</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        <span className="capitalize">{activity.category}</span>
                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        <span className="text-emerald-400 capitalize">{activity.status}</span>
                      </div>
                      {showActivityDetails === activity.id && activity.details && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                          <p className="text-xs text-slate-300 leading-relaxed font-mono">
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
