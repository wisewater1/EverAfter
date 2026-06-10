import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Heart, Calendar, Pill, FileText, Activity, CheckCircle, Clock, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HealthTask {
  id: string;
  task_title: string;
  task_description: string;
  task_type: string;
  priority: string;
  status: string;
  completion_percentage: number;
  scheduled_for: string;
  created_at: string;
  result?: Record<string, unknown>;
}

interface RaphaelAgentModeProps {
  userId: string;
  engramId: string;
  onClose: () => void;
}

const TASK_TYPES = [
  { value: 'doctor_appointment', label: 'Doctor Appointment', icon: Calendar },
  { value: 'prescription_refill', label: 'Prescription Refill', icon: Pill },
  { value: 'lab_results', label: 'Lab Results Check', icon: FileText },
  { value: 'health_reminder', label: 'Health Reminder', icon: Activity },
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
];

export default function RaphaelAgentMode({ userId, engramId, onClose }: RaphaelAgentModeProps) {
  const [tasks, setTasks] = useState<HealthTask[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    task_type: 'doctor_appointment',
    task_title: '',
    task_description: '',
    priority: 'medium',
  });

  const loadTasks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agent_task_queue')
        .select('*')
        .eq('user_id', userId)
        .eq('engram_id', engramId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, engramId]);

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, 5000);
    return () => clearInterval(interval);
  }, [loadTasks]);

  const createTask = async () => {
    if (!newTask.task_title || !newTask.task_description) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('agent_task_queue')
        .insert([{
          engram_id: engramId,
          user_id: userId,
          task_type: newTask.task_type,
          task_title: newTask.task_title,
          task_description: newTask.task_description,
          priority: newTask.priority,
          status: 'pending',
          requires_credentials: ['doctor_appointment', 'prescription_refill', 'lab_results'].includes(newTask.task_type),
        }]);

      if (error) throw error;

      setShowCreateModal(false);
      setNewTask({
        task_type: 'doctor_appointment',
        task_title: '',
        task_description: '',
        priority: 'medium',
      });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-gray-700 text-gray-300',
      awaiting_credentials: 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30',
      in_progress: 'bg-blue-900/30 text-blue-400 border border-blue-500/30',
      completed: 'bg-green-900/30 text-green-400 border border-green-500/30',
      failed: 'bg-red-900/30 text-red-400 border border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Loader className="w-4 h-4 animate-spin" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'awaiting_credentials': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    const task = TASK_TYPES.find(t => t.value === taskType);
    const Icon = task?.icon || Activity;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-light text-white">St. Raphael Agent Mode</h2>
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-medium border border-green-500/30">
                    ACTIVE
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">Real-time health management in progress</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create New Task Section */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium flex items-center justify-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Create New Health Task
            </button>
          </div>

          {/* Tasks List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Health Tasks</h3>
              <span className="text-sm text-gray-400">
                {tasks.length} total tasks
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-400">
                <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-gray-800/50 rounded-xl p-12 text-center border border-gray-700/30">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No health tasks yet. Create your first task to get started!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-5 border border-gray-700/50 hover:border-green-500/30 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {getTaskTypeIcon(task.task_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{task.task_title}</h4>
                            <p className="text-sm text-gray-400 line-clamp-2">{task.task_description}</p>
                          </div>
                          <span className={`ml-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap ${getStatusColor(task.status)}`}>
                            {getStatusIcon(task.status)}
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className={PRIORITIES.find(p => p.value === task.priority)?.color}>
                            {task.priority.toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>{new Date(task.created_at).toLocaleDateString()}</span>
                          {task.completion_percentage > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">{task.completion_percentage}% complete</span>
                            </>
                          )}
                        </div>

                        {task.status === 'in_progress' && task.completion_percentage < 100 && (
                          <div className="mt-3">
                            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-600 to-emerald-600 rounded-full transition-all duration-500"
                                style={{ width: `${task.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {task.status === 'completed' && task.result && (
                          <div className="mt-3 p-3 bg-green-900/20 rounded-lg border border-green-500/20">
                            <p className="text-xs text-green-400 font-medium mb-1">✓ Task Completed Successfully</p>
                            {task.result.appointment_details && (
                              <div className="text-xs text-gray-400">
                                <p>Appointment: {task.result.appointment_details.date} at {task.result.appointment_details.time}</p>
                                <p>Doctor: {task.result.appointment_details.doctor}</p>
                              </div>
                            )}
                            {task.result.refill_details && (
                              <div className="text-xs text-gray-400">
                                <p>Medication: {task.result.refill_details.medication}</p>
                                <p>Ready by: {task.result.refill_details.ready_by}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-light text-white mb-6">New Health Task</h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Type</label>
                <select
                  value={newTask.task_type}
                  onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                >
                  {TASK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                <input
                  type="text"
                  value={newTask.task_title}
                  onChange={(e) => setNewTask({ ...newTask, task_title: e.target.value })}
                  placeholder="e.g., Schedule annual checkup"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newTask.task_description}
                  onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                  placeholder="Describe what needs to be done..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg font-medium"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
