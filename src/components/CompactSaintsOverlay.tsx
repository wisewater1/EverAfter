import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Heart, Crown, Star, Clock, CheckCircle, Zap, ChevronDown, ChevronUp, Activity, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  todayActivities: number;
  weeklyActivities: number;
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
}

const saintDefinitions: Omit<Saint, 'active' | 'todayActivities' | 'weeklyActivities'>[] = [
  {
    id: 'raphael',
    name: 'St. Raphael',
    title: 'The Healer',
    description: 'Autonomous health AI managing appointments, prescriptions, and wellness.',
    responsibilities: ['Doctor appointments', 'Prescription management', 'Health tracking', 'Wellness coordination'],
    tier: 'classic',
    icon: Heart,
  },
  {
    id: 'michael',
    name: 'St. Michael',
    title: 'The Protector',
    description: 'Security and privacy protection AI.',
    responsibilities: ['Security monitoring', 'Privacy protection', 'Data integrity', 'Access control'],
    tier: 'premium',
    price: 24.99,
    icon: Shield,
  },
  {
    id: 'martin',
    name: 'St. Martin',
    title: 'The Compassionate',
    description: 'Charitable acts and community building AI.',
    responsibilities: ['Charitable giving', 'Community outreach', 'Legacy donations'],
    tier: 'premium',
    price: 29.99,
    icon: Crown,
  },
  {
    id: 'agatha',
    name: 'St. Agatha',
    title: 'The Resilient',
    description: 'Strength and family support AI.',
    responsibilities: ['Crisis support', 'Resilience building', 'Family strength'],
    tier: 'premium',
    price: 34.99,
    icon: Star,
  }
];

export default function CompactSaintsOverlay() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saints, setSaints] = useState<Saint[]>([]);
  const [activities, setActivities] = useState<SaintActivity[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSaint, setSelectedSaint] = useState<string | null>(null);

  const loadSaintsData = useCallback(async () => {
    if (!user) return;

    try {
      const { data: activeSaints } = await supabase
        .from('saints_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const saintsWithData = await Promise.all(
        saintDefinitions.map(async (saintDef) => {
          const isActive = activeSaints?.some(s => s.saint_id === saintDef.id) || saintDef.id === 'raphael';

          const { count: todayCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', today.toISOString());

          const { count: weekCount } = await supabase
            .from('saint_activities')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('saint_id', saintDef.id)
            .gte('created_at', weekAgo.toISOString());

          return {
            ...saintDef,
            active: isActive,
            todayActivities: todayCount || 0,
            weeklyActivities: weekCount || 0,
          };
        })
      );

      setSaints(saintsWithData);
    } catch (error) {
      console.error('Error loading saints:', error);
    }
  }, [user]);

  const loadActivities = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('saint_activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

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

  const totalActivities = saints.reduce((sum, saint) => sum + saint.todayActivities, 0);
  const activeSaints = saints.filter(s => s.active);

  return (
    <div className="relative">
      {/* Compact Header Bar - Always Visible */}
      <div
        className="bg-gradient-to-r from-slate-900/95 via-emerald-900/20 to-slate-900/95 backdrop-blur-xl border border-emerald-500/20 rounded-xl shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-emerald-500/40"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-2.5 flex items-center justify-between">
          {/* Left: Saints Summary */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                <Heart className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Your Saints</h3>
              <p className="text-xs text-slate-400">
                {activeSaints.length} active • {totalActivities} tasks today
              </p>
            </div>
          </div>

          {/* Center: Quick Stats */}
          <div className="hidden md:flex items-center gap-4">
            {saints.slice(0, 4).map((saint) => {
              const Icon = saint.icon;
              return (
                <div
                  key={saint.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
                    saint.active
                      ? 'bg-emerald-500/10 border border-emerald-500/30'
                      : 'bg-slate-800/50 border border-slate-700/50 opacity-40'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${saint.active ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-medium ${saint.active ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {saint.todayActivities}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right: Expand Button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Active</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Subtle Glow Effect */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent"></div>
      </div>

      {/* Expanded Content - Slides Down */}
      {isExpanded && (
        <div className="mt-2 bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-2xl border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-slideDown max-h-[50vh] overflow-y-auto">
          {/* Category Stats Bar */}
          <div className="border-b border-slate-800/50 bg-slate-900/50">
            <div className="px-4 py-3 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-500/10 flex items-center justify-center">
                  <Shield className="w-3 h-3 text-sky-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Protection</div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {activities.filter(a => a.category === 'protection').length}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center">
                  <Heart className="w-3 h-3 text-rose-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Support</div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {activities.filter(a => a.category === 'support').length}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <Clock className="w-3 h-3 text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs text-slate-400">Memory</div>
                  <div className="text-sm font-semibold text-white tabular-nums">
                    {activities.filter(a => a.category === 'memory').length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Saints Compact Cards */}
          <div className="p-4 space-y-2">
            {saints.map((saint) => {
              const Icon = saint.icon;
              const isSelected = selectedSaint === saint.id;
              const isRaphael = saint.id === 'raphael';
              const isTrainable = isRaphael;

              return (
                <div key={saint.id} className="space-y-2">
                  {/* Saint Compact Row */}
                  <div
                    onClick={() => isTrainable && setSelectedSaint(isSelected ? null : saint.id)}
                    className={`group relative rounded-lg p-3 transition-all ${
                      isTrainable
                        ? saint.active && isRaphael
                          ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 hover:border-emerald-500/50 cursor-pointer'
                          : 'bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 cursor-pointer'
                        : 'bg-slate-800/10 border border-slate-700/20 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Icon */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            saint.active && isRaphael
                              ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30'
                              : saint.tier === 'premium'
                                ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20'
                                : 'bg-slate-700/50'
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              saint.active && isRaphael
                                ? 'text-emerald-400'
                                : saint.tier === 'premium'
                                  ? 'text-amber-400'
                                  : 'text-slate-500'
                            }`}
                          />
                        </div>

                        {/* Name & Title */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className={`text-sm font-semibold truncate ${isTrainable ? 'text-white' : 'text-slate-500'}`}>{saint.name}</h4>
                            {!isTrainable && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-slate-700/50 border border-slate-600/30 rounded uppercase tracking-wider">
                                Coming Soon
                              </span>
                            )}
                            {saint.tier === 'premium' && !saint.active && isTrainable && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded uppercase tracking-wider">
                                Premium
                              </span>
                            )}
                            {saint.active && isTrainable && (
                              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isTrainable ? 'text-slate-400' : 'text-slate-600'}`}>{saint.title}</p>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right hidden sm:block">
                            <div className="text-lg font-semibold text-white tabular-nums">{saint.todayActivities}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Today</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-emerald-400 tabular-nums">{saint.weeklyActivities}</div>
                            <div className="text-[10px] text-slate-500 uppercase">Week</div>
                          </div>
                        </div>

                        {/* Expand Icon */}
                        {isTrainable && (
                          <div className="flex-shrink-0">
                            {isSelected ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="ml-11 pl-3 border-l-2 border-emerald-500/20 py-2 space-y-2 animate-slideDown">
                      <p className="text-xs text-slate-300 leading-relaxed">{saint.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {saint.responsibilities.slice(0, 4).map((resp, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[10px] bg-slate-800/50 text-slate-400 rounded border border-slate-700/50"
                          >
                            {resp}
                          </span>
                        ))}
                      </div>
                      {saint.tier === 'premium' && !saint.active && (
                        <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between">
                          <span className="text-sm font-semibold text-amber-400">${saint.price}/month</span>
                          <button className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-all">
                            Subscribe
                          </button>
                        </div>
                      )}
                      {isRaphael && (
                        <button
                          onClick={() => navigate('/health-dashboard')}
                          className="mt-2 w-full px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <Activity className="w-3 h-3" />
                          Open Health Monitor
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Recent Activities */}
          {activities.length > 0 && (
            <div className="border-t border-slate-800/50 bg-slate-900/50 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <CheckCircle className="w-3 h-3" />
                Recent Activity
              </h4>
              <div className="space-y-1.5">
                {activities.slice(0, 3).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 p-2 bg-slate-800/30 rounded-lg border border-slate-700/30"
                  >
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{activity.action}</p>
                      <p className="text-[10px] text-slate-500 truncate">{activity.description}</p>
                    </div>
                    <span className="text-[9px] text-slate-500 flex-shrink-0">
                      {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
