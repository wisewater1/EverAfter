import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap, Calendar, Pill, Activity, AlertCircle, CheckCircle,
  Clock, RefreshCw, Play, Pause, Settings, ChevronRight
} from 'lucide-react';

interface HealthTask {
  id: string;
  task_type: string;
  title: string;
  description: string;
  scheduled_for: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: string;
  auto_execute: boolean;
  created_at: string;
}

export default function AutonomousHealthTaskManager() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HealthTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoExecuteEnabled, setAutoExecuteEnabled] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    completed: 0,
    failed: 0
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      const interval = setInterval(fetchTasks, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('engram_ai_tasks')
        .select('*')
        .order('scheduled_for', { ascending: true })
        .limit(20);

      if (error) throw error;

      setTasks(data || []);

      const pending = data?.filter(t => t.status === 'pending').length || 0;
      const completed = data?.filter(t => t.status === 'completed').length || 0;
      const failed = data?.filter(t => t.status === 'failed').length || 0;

      setStats({ pending, completed, failed });
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTaskIcon = (taskType: string) => {
    switch (taskType) {
      case 'appointment_reminder':
        return Calendar;
      case 'medication_reminder':
        return Pill;
      case 'health_check':
        return Activity;
      default:
        return AlertCircle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Auto-Execute Toggle */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Autonomous Health Tasks</h2>
              <p className="text-slate-400 text-sm">AI-powered background task execution</p>
            </div>
          </div>
          <button
            onClick={() => setAutoExecuteEnabled(!autoExecuteEnabled)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              autoExecuteEnabled
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {autoExecuteEnabled ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {autoExecuteEnabled ? 'Auto-Execute: ON' : 'Auto-Execute: OFF'}
            </span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.pending}</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{stats.completed}</p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400 uppercase tracking-wider">Failed</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Tasks</h3>
          <button
            onClick={fetchTasks}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400">No autonomous tasks yet. St. Raphael will create tasks as needed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const TaskIcon = getTaskIcon(task.task_type);
              return (
                <div
                  key={task.id}
                  className="group bg-slate-800/50 hover:bg-slate-800 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center flex-shrink-0">
                      <TaskIcon className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{task.title}</h4>
                          <p className="text-sm text-slate-400 leading-relaxed">{task.description}</p>
                        </div>
                        <span className={`ml-3 px-2.5 py-1 rounded-lg text-xs font-medium border flex-shrink-0 ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(task.scheduled_for).toLocaleString()}
                        </span>
                        <span className={`capitalize ${getPriorityColor(task.priority)}`}>
                          {task.priority} priority
                        </span>
                        {task.auto_execute && (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Zap className="w-3 h-3" />
                            Auto
                          </span>
                        )}
                      </div>
                    </div>

                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-700 rounded-lg transition-all">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 backdrop-blur-lg rounded-2xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Settings className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-white">Task Preferences</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <div>
              <p className="text-white font-medium">Medication Reminders</p>
              <p className="text-sm text-slate-400">Automatic daily medication notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
            <div>
              <p className="text-white font-medium">Appointment Reminders</p>
              <p className="text-sm text-slate-400">Notifications before scheduled appointments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-white font-medium">Health Check-ins</p>
              <p className="text-sm text-slate-400">Periodic health status assessments</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
