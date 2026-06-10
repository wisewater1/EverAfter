import React from 'react';
import { Pill, Calendar, Activity, Heart, FileText, Users, Target, TrendingUp } from 'lucide-react';

interface HealthQuickActionsProps {
  onNavigate: (tab: string) => void;
}

export default function HealthQuickActions({ onNavigate }: HealthQuickActionsProps) {
  const actions = [
    {
      id: 'medications',
      icon: Pill,
      label: 'Log Medication',
      description: 'Track your daily medications',
      color: 'from-green-600 to-emerald-600',
      borderColor: 'border-green-500/30',
      bgColor: 'bg-green-600/10'
    },
    {
      id: 'appointments',
      icon: Calendar,
      label: 'Schedule Appointment',
      description: 'Book a doctor visit',
      color: 'from-blue-600 to-cyan-600',
      borderColor: 'border-blue-500/30',
      bgColor: 'bg-blue-600/10'
    },
    {
      id: 'analytics',
      icon: TrendingUp,
      label: 'View Analytics',
      description: 'Check your health trends',
      color: 'from-purple-600 to-pink-600',
      borderColor: 'border-purple-500/30',
      bgColor: 'bg-purple-600/10'
    },
    {
      id: 'goals',
      icon: Target,
      label: 'Set Health Goal',
      description: 'Create a new objective',
      color: 'from-orange-600 to-amber-600',
      borderColor: 'border-orange-500/30',
      bgColor: 'bg-orange-600/10'
    },
    {
      id: 'connections',
      icon: Activity,
      label: 'Connect Device',
      description: 'Add health tracking device',
      color: 'from-teal-600 to-cyan-600',
      borderColor: 'border-teal-500/30',
      bgColor: 'bg-teal-600/10'
    },
    {
      id: 'reports',
      icon: FileText,
      label: 'Generate Report',
      description: 'Export health summary',
      color: 'from-indigo-600 to-blue-600',
      borderColor: 'border-indigo-500/30',
      bgColor: 'bg-indigo-600/10'
    },
    {
      id: 'contacts',
      icon: Users,
      label: 'Emergency Contacts',
      description: 'Manage emergency info',
      color: 'from-red-600 to-rose-600',
      borderColor: 'border-red-500/30',
      bgColor: 'bg-red-600/10'
    },
    {
      id: 'metrics',
      icon: Heart,
      label: 'Log Vitals',
      description: 'Manually enter health data',
      color: 'from-pink-600 to-rose-600',
      borderColor: 'border-pink-500/30',
      bgColor: 'bg-pink-600/10'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onNavigate(action.id)}
              className={`group relative ${action.bgColor} hover:bg-opacity-20 rounded-xl p-4 border ${action.borderColor} transition-all duration-300 text-left overflow-hidden`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="relative">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-white font-medium text-sm mb-1">{action.label}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
