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

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

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

  return (
    <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
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

      <div className="space-y-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className={`w-full px-4 py-3.5 ${action.bgColor} ${action.hoverColor} ${action.textColor} rounded-xl transition-all flex items-center gap-3 text-left group relative overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity`} />

              <div className={`w-10 h-10 bg-gradient-to-br ${action.gradient} rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{action.label}</p>
                  {action.showBadge && (
                    <span className={`px-2 py-0.5 ${action.badgeColor} rounded-full text-xs font-medium flex items-center gap-1`}>
                      {action.count > 0 && (
                        <>
                          <span className="font-bold">{action.count}</span>
                          <span className="hidden sm:inline">{action.countLabel}</span>
                        </>
                      )}
                      {action.count === 0 && action.id === 'connections' && 'None connected'}
                    </span>
                  )}
                </div>
                <p className={`text-xs ${action.textColor} opacity-80 mt-0.5`}>
                  {action.description}
                </p>
              </div>

              <div className={`w-6 h-6 rounded-full ${action.bgColor} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0 translate-x-2`}>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
