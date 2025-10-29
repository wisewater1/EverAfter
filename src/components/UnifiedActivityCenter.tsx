import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Heart, Brain, MessageCircle, Activity, Pill,
  Calendar, CheckSquare, Lightbulb, Link, Users, BookOpen,
  Star, Clock, TrendingUp, Zap, ChevronRight, RotateCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getTodayOverview, type TodayOverview } from '../lib/raphael/monitors';
import TodayAlertsCard from './raphael/TodayAlertsCard';
import TodayVitalsCard from './raphael/TodayVitalsCard';
import TodayTrendsCard from './raphael/TodayTrendsCard';
import TodayReportsCard from './raphael/TodayReportsCard';
import TodayTasksCard from './raphael/TodayTasksCard';

interface ActivityCategory {
  category: string;
  display_name: string;
  icon_name: string;
  color: string;
  today_count: number;
  week_count: number;
  is_active: boolean;
}

interface UnifiedActivity {
  id: string;
  source_type: string;
  category: string;
  action: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  status: string;
  created_at: string;
  category_display_name: string;
  icon_name: string;
  category_color: string;
}

interface RotationConfig {
  rotation_interval_seconds: number;
  current_rotation_index: number;
  enabled: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Heart, Brain, MessageCircle, Activity, Pill,
  Calendar, CheckSquare, Lightbulb, Link, Users, BookOpen, Star
};

const colorMap: Record<string, { border: string; bg: string; text: string; icon: string }> = {
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', icon: 'text-blue-500' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-500/5', text: 'text-rose-400', icon: 'text-rose-500' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', text: 'text-emerald-400', icon: 'text-emerald-500' },
  purple: { border: 'border-purple-500/30', bg: 'bg-purple-500/5', text: 'text-purple-400', icon: 'text-purple-500' },
  cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-500/5', text: 'text-cyan-400', icon: 'text-cyan-500' },
  orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', icon: 'text-orange-500' },
  indigo: { border: 'border-indigo-500/30', bg: 'bg-indigo-500/5', text: 'text-indigo-400', icon: 'text-indigo-500' },
  teal: { border: 'border-teal-500/30', bg: 'bg-teal-500/5', text: 'text-teal-400', icon: 'text-teal-500' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', icon: 'text-amber-500' },
  sky: { border: 'border-sky-500/30', bg: 'bg-sky-500/5', text: 'text-sky-400', icon: 'text-sky-500' },
  pink: { border: 'border-pink-500/30', bg: 'bg-pink-500/5', text: 'text-pink-400', icon: 'text-pink-500' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/5', text: 'text-violet-400', icon: 'text-violet-500' },
  slate: { border: 'border-slate-500/30', bg: 'bg-slate-500/5', text: 'text-slate-400', icon: 'text-slate-500' }
};

export default function UnifiedActivityCenter() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [rotationConfig, setRotationConfig] = useState<RotationConfig>({
    rotation_interval_seconds: 10,
    current_rotation_index: 0,
    enabled: true
  });
  const [totalTodayActivities, setTotalTodayActivities] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [todayData, setTodayData] = useState<TodayOverview | null>(null);

  const loadCategories = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_category_stats')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      setCategories(data || []);

      const total = (data || []).reduce((sum, cat) => sum + cat.today_count, 0);
      setTotalTodayActivities(total);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, [user]);

  const loadActivities = useCallback(async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('v_today_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }, [user]);

  const loadRotationConfig = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('activity_rotation_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRotationConfig({
          rotation_interval_seconds: data.rotation_interval_seconds,
          current_rotation_index: data.current_rotation_index,
          enabled: data.enabled
        });
      }
    } catch (error) {
      console.error('Error loading rotation config:', error);
    }
  }, [user]);

  const rotateCategories = useCallback(async () => {
    if (!user || !rotationConfig.enabled) return;

    try {
      setAnalyzing(true);

      const { error } = await supabase.rpc('rotate_activity_categories', {
        p_user_id: user.id
      });

      if (error) throw error;

      await loadRotationConfig();

      setTimeout(() => setAnalyzing(false), 1000);
    } catch (error) {
      console.error('Error rotating categories:', error);
      setAnalyzing(false);
    }
  }, [user, rotationConfig.enabled, loadRotationConfig]);

  const loadTodayData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getTodayOverview(user.id);
      setTodayData(data);
    } catch (error) {
      console.error('Failed to load today data:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        loadCategories(),
        loadActivities(),
        loadRotationConfig(),
        loadTodayData()
      ]);
      setLoading(false);
    };

    init();
  }, [loadCategories, loadActivities, loadRotationConfig, loadTodayData]);

  useEffect(() => {
    if (!rotationConfig.enabled) return;

    const interval = setInterval(() => {
      rotateCategories();
    }, rotationConfig.rotation_interval_seconds * 1000);

    return () => clearInterval(interval);
  }, [rotationConfig, rotateCategories]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('unified-activities')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unified_activities',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadCategories();
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadCategories, loadActivities]);

  const getCurrentCategory = () => {
    if (categories.length === 0) return null;
    const index = rotationConfig.current_rotation_index % categories.length;
    return categories[index];
  };

  const currentCategory = getCurrentCategory();

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
        <div className="relative p-6">
          <div className="flex items-center justify-center py-12">
            <RotateCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-slate-800/50 via-slate-800/30 to-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-transparent pointer-events-none" />

      <div className="relative p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl blur-lg opacity-30 animate-pulse" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckSquare className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-white">Today's Activities</h2>
                {analyzing && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Zap className="w-3 h-3" />
                    ANALYZING
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">
                Completed {totalTodayActivities} {totalTodayActivities === 1 ? 'task' : 'tasks'} today
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-2xl font-bold text-emerald-400">
            {totalTodayActivities}
            <span className="text-sm font-normal text-slate-400">COMPLETED</span>
          </div>
        </div>

        {todayData && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <TodayAlertsCard alerts={todayData.alerts} />
              <TodayVitalsCard summary={todayData.vitalsSummary} />
              <TodayTrendsCard trends={todayData.trends} />
              <TodayReportsCard reports={todayData.recentReports} />
            </div>

            <div className="mb-6">
              <TodayTasksCard tasks={todayData.tasks} />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {categories.slice(0, 3).map((category, index) => {
            const Icon = iconMap[category.icon_name] || Star;
            const colors = colorMap[category.color] || colorMap.slate;
            const isCurrent = index === (rotationConfig.current_rotation_index % categories.length);

            return (
              <div
                key={category.category}
                className={`group relative rounded-xl border ${colors.border} ${colors.bg} p-4 transition-all duration-500 ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-offset-slate-900 ' + colors.border.replace('/30', '') : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center ${
                    isCurrent ? 'animate-pulse' : ''
                  }`}>
                    <Icon className={`w-5 h-5 ${colors.icon}`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className={`w-4 h-4 ${colors.text}`} />
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {isCurrent && <span className="animate-pulse">● </span>}
                      ACTIVE
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className={`text-3xl font-bold ${colors.text}`}>
                      {category.today_count}
                    </span>
                    <span className="text-sm text-slate-400 uppercase tracking-wider">
                      {category.display_name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {category.today_count} {category.today_count === 1 ? 'action' : 'actions'} today
                  </div>
                </div>

                {isCurrent && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Recent Activity
            </h3>
            <button
              onClick={() => loadActivities()}
              className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              Refresh
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No activities yet today</p>
                <p className="text-xs mt-1">Activities will appear here as you use the app</p>
              </div>
            ) : (
              activities.map((activity) => {
                const Icon = iconMap[activity.icon_name] || Star;
                const colors = colorMap[activity.category_color] || colorMap.slate;
                const timeAgo = new Date(activity.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={activity.id}
                    className={`group relative rounded-lg border ${colors.border} ${colors.bg} p-3 hover:bg-slate-800/30 transition-all duration-200`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-white truncate">
                            {activity.action}
                          </p>
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {timeAgo}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-slate-400 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.text} ${colors.bg} border ${colors.border}`}>
                            {activity.category_display_name || activity.category}
                          </span>
                          {activity.impact === 'high' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              High Impact
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
