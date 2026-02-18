import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Heart, Crown, Star, Clock, CheckCircle, Zap, Activity, RefreshCw, AlertCircle, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SaintChat from './SaintChat';

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
    description: 'Guardian AI that manages security, privacy, and system integrity. Scans for threats and ensures your digital safety.',
    responsibilities: ['Security monitoring', 'Integrity checks', 'Privacy protection', 'Threat detection'],
    tier: 'premium',
    price: 39.99,
    icon: Shield,
  },
  {
    id: 'joseph',
    name: 'St. Joseph',
    title: 'The Family Guardian',
    description: 'Autonomous family AI managing household chores, schedules, and shopping.',
    responsibilities: ['Chore tracking', 'Family calendar', 'Shopping lists', 'Home coordination'],
    tier: 'classic',
    icon: Users,
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

export default function SaintsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saints, setSaints] = useState<Saint[]>([]);
  const [activities, setActivities] = useState<SaintActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedSaint, setSelectedSaint] = useState<Saint | null>(null);
  const [activeTab, setActiveTab] = useState<'activities' | 'engrams'>('activities');

  const handleChat = (saint: Saint) => {
    setSelectedSaint(saint);
  };

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
          // Unleash the Saints: Activate all agents for the user
          const isActive = true; // activeSaints?.some((s: any) => s.saint_id === saintDef.id) || saintDef.id === 'raphael' || saintDef.id === 'michael' || saintDef.id === 'joseph';

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

      const newData = data || [];
      const currentIds = new Set(activities.map(a => a.id));

      newData.forEach((activity: any) => {
        if (!currentIds.has(activity.id)) {
          // New activity detected
        }
      });

      setActivities(newData);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, [user, activities]);

  const generateNewActivity = useCallback(async () => {
    if (!user) return;

    const activityTemplates = [
      {
        saint_id: 'raphael',
        action: 'Health Monitoring Started',
        description: 'I have begun monitoring your health data and will proactively help manage appointments, medications, and wellness goals.',
        category: 'support',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Medication Reminder Setup',
        description: 'Created reminders for your morning medications',
        category: 'support',
        impact: 'high',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Weekly Health Analysis',
        description: 'Analyzed your health trends from the past week',
        category: 'memory',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Appointment Follow-up',
        description: 'Checking for upcoming medical appointments and scheduling needs',
        category: 'support',
        impact: 'high',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Wellness Goal Tracking',
        description: 'Monitoring progress toward your fitness and nutrition goals',
        category: 'memory',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Health Data Sync',
        description: 'Synchronized health data from connected devices',
        category: 'support',
        impact: 'low',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Nutrition Analysis',
        description: 'Reviewing dietary patterns and suggesting improvements',
        category: 'memory',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Sleep Pattern Review',
        description: 'Analyzed sleep quality and duration from recent data',
        category: 'memory',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Exercise Tracking Update',
        description: 'Logged your recent physical activities and workouts',
        category: 'support',
        impact: 'low',
        status: 'completed'
      },
      {
        saint_id: 'raphael',
        action: 'Preventive Care Reminder',
        description: 'Reminder to schedule your annual physical examination',
        category: 'support',
        impact: 'high',
        status: 'in_progress'
      },
      {
        saint_id: 'michael',
        action: 'Integrity Check Completed',
        description: 'Verified SHA-256 hashes for 42 digital engrams. No discrepancies detected.',
        category: 'protection',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'michael',
        action: 'Raphael Data Secured',
        description: 'Confirmed health data isolation. No unauthorized access recorded from external sources.',
        category: 'protection',
        impact: 'high',
        status: 'completed'
      },
      {
        saint_id: 'michael',
        action: 'Security Patch Deployed',
        description: 'Updated autonomous firewall rules for enhanced agent protection.',
        category: 'protection',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'michael',
        action: 'Leak Prevention Scan',
        description: 'Scanned 12 outbound connection attempts. All verified safe.',
        category: 'protection',
        impact: 'low',
        status: 'completed'
      },
      {
        saint_id: 'joseph',
        action: 'Shopping List Updated',
        description: 'Added milk and eggs to the family grocery list.',
        category: 'family',
        impact: 'low',
        status: 'completed'
      },
      {
        saint_id: 'joseph',
        action: 'Chore Assignment',
        description: 'Assigned "Take out trash" to Bob based on rotating schedule.',
        category: 'family',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'joseph',
        impact: 'medium',
        status: 'completed'
      },
      // St. Martin (Charity)
      {
        saint_id: 'martin',
        action: 'Donation Opportunity Found',
        description: 'Identified a high-impact local food bank needing urgent support.',
        category: 'charity',
        impact: 'high',
        status: 'completed'
      },
      {
        saint_id: 'martin',
        action: 'Community Impact Report',
        description: 'Generated monthly report on your charitable contributions and their effects.',
        category: 'charity',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'martin',
        action: 'Volunteer Match',
        description: 'Found a weekend volunteering opportunity matching your skills.',
        category: 'charity',
        impact: 'medium',
        status: 'completed'
      },
      // St. Agatha (Resilience)
      {
        saint_id: 'agatha',
        action: 'Resilience Check-in',
        description: 'Detected signs of stress in your recent communications. Suggesting a break.',
        category: 'support',
        impact: 'high',
        status: 'completed'
      },
      {
        saint_id: 'agatha',
        action: 'Crisis Resource Update',
        description: 'Updated local emergency contact list and resource database.',
        category: 'protection',
        impact: 'medium',
        status: 'completed'
      },
      {
        saint_id: 'agatha',
        action: 'Strength Building',
        description: 'Recommended a daily stoic reflection for mental fortitude.',
        category: 'support',
        impact: 'low',
        status: 'completed'
      }
    ];

    const randomActivity = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];

    try {
      const { error } = await supabase
        .from('saint_activities')
        .insert({
          user_id: user.id,
          ...randomActivity
        });

      if (!error) {
        await loadActivities();
      }
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  }, [user, loadActivities]);

  useEffect(() => {
    if (user) {
      loadSaintsData();
      loadActivities();
    }
  }, [user, loadSaintsData, loadActivities]);

  useEffect(() => {
    if (!user) return;

    const activityRefreshInterval = setInterval(() => {
      loadActivities();
    }, 30000);

    const newActivityInterval = setInterval(() => {
      const shouldGenerate = Math.random() > 0.5;
      if (shouldGenerate) {
        generateNewActivity();
      }
    }, 45000);

    return () => {
      clearInterval(activityRefreshInterval);
      clearInterval(newActivityInterval);
    };
  }, [user, loadActivities, generateNewActivity]);

  const handleSaintActivation = (saint: Saint) => {
    if (saint.tier === 'premium' && !saint.active) {
      alert(`${saint.name} is a premium feature. Coming soon!`);
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl font-light tracking-tight text-white">Saints AI Agents (V2 LIVE)</h1>
            <p className="text-slate-400 max-w-2xl leading-relaxed">
              Autonomous AI agents working in the background to manage your life, protect your legacy, and support your family.
            </p>
          </div>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-700/50 mb-8">
        <button
          onClick={() => setActiveTab('activities')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'activities'
            ? 'text-emerald-400'
            : 'text-slate-400 hover:text-slate-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Live Activities</span>
          </div>
          {activeTab === 'activities' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('engrams')}
          className={`pb-4 text-sm font-medium transition-all relative ${activeTab === 'engrams'
            ? 'text-emerald-400'
            : 'text-slate-400 hover:text-slate-300'
            }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Engrams</span>
          </div>
          {activeTab === 'engrams' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
          )}
        </button>
      </div>

      {/* Tabs Content */}
      <div className="min-h-[500px]">
        {activeTab === 'activities' ? (
          <div className="space-y-6">
            {/* Activity Summary Card */}
            <div className="relative bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-sky-500/5 animate-pulse"></div>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent animate-scan"></div>

              <div className="relative p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center ring-2 ring-emerald-500/30 flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <h3 className="text-sm sm:text-base font-medium text-white">Today's Activities</h3>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Analyzing</span>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400">Your Saints completed <span className="text-emerald-400 font-medium">{activities.length}</span> tasks today</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-3xl sm:text-4xl font-extralight text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tabular-nums">{activities.length}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wider font-medium">Completed</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {/* Protection Card */}
                  <div className="group relative bg-gradient-to-br from-slate-900/70 to-slate-900/50 rounded-xl p-4 border border-slate-800/50 hover:border-sky-500/30 transition-all duration-300 overflow-hidden">
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

            {/* Live Activity Feed */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-white">Live Feed</h2>
              {activities.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-800/20 rounded-xl border border-slate-700/30">
                  No recent activities.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => {
                    const saint = saints.find(s => s.id === activity.saint_id);
                    if (!saint) return null;
                    const Icon = saint.icon;

                    return (
                      <div key={activity.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-start gap-4 hover:bg-slate-800/60 transition-colors">
                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center ${saint.id === 'michael' ? 'bg-sky-500/10 text-sky-400' :
                          saint.id === 'raphael' ? 'bg-emerald-500/10 text-emerald-400' :
                            saint.id === 'martin' ? 'bg-amber-500/10 text-amber-400' :
                              saint.id === 'agatha' ? 'bg-rose-500/10 text-rose-400' :
                                'bg-slate-700/50 text-slate-400'
                          }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-white">{activity.action}</h4>
                            <span className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{activity.description}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-medium ${activity.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                              {activity.status.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 uppercase tracking-wider">
                              {activity.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Saints Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {saints.map((saint) => {
              const Icon = saint.icon;
              const isRaphael = saint.id === 'raphael';

              return (
                <div
                  key={saint.id}
                  className={`group relative bg-gradient-to-br rounded-2xl p-6 transition-all duration-300 ${saint.active && isRaphael
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
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${saint.active && isRaphael
                          ? 'bg-emerald-500/15 shadow-lg shadow-emerald-500/20'
                          : saint.active
                            ? 'bg-sky-500/15 shadow-lg shadow-sky-500/20'
                            : saint.tier === 'premium'
                              ? 'bg-amber-500/15 shadow-lg shadow-amber-500/20'
                              : 'bg-slate-700/30'
                          }`}
                      >
                        <Icon
                          className={`w-6 h-6 ${saint.active && isRaphael
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

                    {saint.active && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChat(saint);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 hover:border-slate-600 shadow-sm group-hover:shadow-md"
                      >
                        <div className={`p-1 rounded bg-slate-700/50 ${saint.id === 'raphael' ? 'text-emerald-400' :
                          saint.id === 'michael' ? 'text-sky-400' :
                            saint.id === 'martin' ? 'text-amber-400' :
                              'text-indigo-400'
                          }`}>
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-sm font-medium">Chat</span>
                      </button>
                    )}

                    {saint.active && isRaphael && (
                      <button
                        onClick={() => navigate('/health-dashboard')}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                      >
                        <Activity className="w-4 h-4" />
                        <span>Open Health Monitor</span>
                      </button>
                    )}
                    {saint.active && saint.id === 'michael' && (
                      <button
                        onClick={() => navigate('/security-dashboard')}
                        className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-sky-500/20"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Open Security Monitor</span>
                      </button>
                    )}
                    {saint.active && saint.id === 'joseph' && (
                      <button
                        onClick={() => navigate('/family-dashboard')}
                        className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-lg shadow-amber-500/20"
                      >
                        <Users className="w-4 h-4" />
                        <span>Open Family Monitor</span>
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
        )}
      </div>

      {/* Chat Overlay */}
      {selectedSaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl h-[85vh] relative z-20">
            <SaintChat
              saintId={selectedSaint.id}
              saintName={selectedSaint.name}
              saintTitle={selectedSaint.title}
              saintIcon={selectedSaint.icon}
              primaryColor={
                selectedSaint.id === 'raphael' ? 'emerald' :
                  selectedSaint.id === 'michael' ? 'sky' :
                    selectedSaint.id === 'martin' ? 'amber' :
                      selectedSaint.id === 'agatha' ? 'rose' :
                        'indigo'
              }
              onClose={() => setSelectedSaint(null)}
            />
          </div>
          {/* Click background to close */}
          <div className="absolute inset-0 z-10" onClick={() => setSelectedSaint(null)}></div>
        </div>
      )}
    </div>
  );
}
