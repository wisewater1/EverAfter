import React, { useState, useEffect } from 'react';
import { Pill, Calendar, Target, Link2, Activity, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface QuickActionsProps {
  onNavigate: (tab: string) => void;
}

interface Stats {
  pendingMedications: number;
  upcomingAppointments: number;
  activeGoals: number;
  connectedDevices: number;
}

export default function QuickActions({ onNavigate }: QuickActionsProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    pendingMedications: 0,
    upcomingAppointments: 0,
    activeGoals: 0,
    connectedDevices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % 4);
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 7);
      const tomorrowStr = tomorrow.toISOString();

      const [medsResult, appointmentsResult, goalsResult, devicesResult] = await Promise.all([
        supabase
          .from('medication_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .gte('scheduled_time', todayStr)
          .lt('scheduled_time', tomorrowStr)
          .is('taken_at', null),

        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .gte('scheduled_at', todayStr)
          .lt('scheduled_at', tomorrowStr)
          .neq('status', 'cancelled'),

        supabase
          .from('health_goals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('status', 'active'),

        supabase
          .from('provider_accounts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user?.id)
          .eq('status', 'active'),
      ]);

      setStats({
        pendingMedications: medsResult.count || 0,
        upcomingAppointments: appointmentsResult.count || 0,
        activeGoals: goalsResult.count || 0,
        connectedDevices: devicesResult.count || 0,
      });
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError('Failed to load quick actions data');
    } finally {
      setLoading(false);
    }
  }

  const actions = [
    {
      id: 'medications',
      label: 'Track Medication',
      description: 'Log your daily medications',
      icon: Pill,
      color: 'pink',
      gradient: 'from-pink-600 to-rose-600',
      bgColor: 'bg-pink-600/20',
      hoverColor: 'hover:bg-pink-600/30',
      textColor: 'text-pink-300',
      badgeColor: 'bg-pink-500/30 text-pink-200',
      count: stats.pendingMedications,
      countLabel: 'pending today',
      showBadge: stats.pendingMedications > 0,
    },
    {
      id: 'appointments',
      label: 'Schedule Appointment',
      description: 'Book a medical appointment',
      icon: Calendar,
      color: 'orange',
      gradient: 'from-orange-600 to-amber-600',
      bgColor: 'bg-orange-600/20',
      hoverColor: 'hover:bg-orange-600/30',
      textColor: 'text-orange-300',
      badgeColor: 'bg-orange-500/30 text-orange-200',
      count: stats.upcomingAppointments,
      countLabel: 'in next 7 days',
      showBadge: stats.upcomingAppointments > 0,
    },
    {
      id: 'goals',
      label: 'Set Health Goal',
      description: 'Create a new health objective',
      icon: Target,
      color: 'cyan',
      gradient: 'from-cyan-600 to-blue-600',
      bgColor: 'bg-cyan-600/20',
      hoverColor: 'hover:bg-cyan-600/30',
      textColor: 'text-cyan-300',
      badgeColor: 'bg-cyan-500/30 text-cyan-200',
      count: stats.activeGoals,
      countLabel: 'active goals',
      showBadge: stats.activeGoals > 0,
    },
    {
      id: 'connections',
      label: 'Connect Health Service',
      description: 'Sync your health devices',
      icon: Link2,
      color: 'teal',
      gradient: 'from-teal-600 to-green-600',
      bgColor: 'bg-teal-600/20',
      hoverColor: 'hover:bg-teal-600/30',
      textColor: 'text-teal-300',
      badgeColor: 'bg-teal-500/30 text-teal-200',
      count: stats.connectedDevices,
      countLabel: 'connected',
      showBadge: stats.connectedDevices > 0,
    },
  ];

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-20 bg-gray-700/30 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">Unable to load actions</p>
            <p className="text-red-200/70 text-sm mt-1">{error}</p>
            <button
              onClick={loadStats}
              className="mt-3 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-medium transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const featuredAction = actions[currentIndex];
  const FeaturedIcon = featuredAction.icon;

  return (
    <div
      className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
            <p className="text-xs text-gray-400">Manage your health tasks</p>
          </div>
        </div>
        <button
          onClick={loadStats}
          className="p-2 hover:bg-gray-700/50 rounded-lg transition-all group"
          title="Refresh stats"
        >
          <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Featured Action - Large Card */}
      <button
        onClick={() => onNavigate(featuredAction.id)}
        className={`w-full px-6 py-8 ${featuredAction.bgColor} ${featuredAction.hoverColor} rounded-2xl transition-all flex flex-col items-center gap-4 text-center group relative overflow-hidden mb-4 shadow-lg`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${featuredAction.gradient} opacity-20 group-hover:opacity-30 transition-opacity`} />

        <div className={`w-20 h-20 bg-gradient-to-br ${featuredAction.gradient} rounded-2xl flex items-center justify-center shadow-2xl ring-4 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
          <FeaturedIcon className="w-10 h-10 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <p className="text-2xl font-bold text-white">{featuredAction.label}</p>
            {featuredAction.showBadge && featuredAction.count > 0 && (
              <span className={`px-3 py-1 ${featuredAction.badgeColor} rounded-full text-sm font-bold`}>
                {featuredAction.count}
              </span>
            )}
          </div>
          <p className="text-sm text-white/70">{featuredAction.description}</p>
        </div>

        <div className="flex gap-1.5 mt-2">
          {actions.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? `w-8 ${featuredAction.bgColor} opacity-100`
                  : 'w-1.5 bg-white/20 opacity-50'
              }`}
            />
          ))}
        </div>
      </button>

      {/* Compact Action List */}
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action, index) => {
          if (index === currentIndex) return null;
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => {
                setCurrentIndex(index);
                onNavigate(action.id);
              }}
              className={`px-3 py-3 ${action.bgColor} ${action.hoverColor} rounded-xl transition-all flex items-center gap-2 text-left group relative overflow-hidden`}
            >
              <div className={`w-8 h-8 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                <Icon className="w-4 h-4 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{action.label}</p>
                {action.showBadge && action.count > 0 && (
                  <span className="text-xs font-medium opacity-70">{action.count} {action.countLabel}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
          {(stats.pendingMedications + stats.upcomingAppointments + stats.activeGoals) > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="font-medium">
                {stats.pendingMedications + stats.upcomingAppointments + stats.activeGoals} active items
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
