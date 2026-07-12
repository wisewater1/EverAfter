import { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, Play, Trash2, Calendar, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import ConfirmDialog from './shared/ConfirmDialog';

// Row shape of engram_ai_tasks — the single user-facing task table.
interface Task {
  id: string;
  title: string;
  task_description: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'failed' | 'cancelled';
  details: { task_type?: string; frequency?: string; priority?: string } | null;
  created_at: string;
  completed_at: string | null;
}

interface ExecuteResponse {
  executed?: boolean;
  result?: string;
  message?: string;
}

interface Engram {
  id: string;
  name: string;
  is_ai_active: boolean;
}

interface EngramTaskManagerProps {
  engrams: Engram[];
  userId: string;
}

const STATUS_STYLES: Record<Task['status'], string> = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  in_progress: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  done: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  cancelled: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  reminder: 'Reminder',
  notification: 'Notification',
  action: 'Action',
  general: 'General',
  council_deliberation: 'Council action',
};

export default function EngramTaskManager({ engrams, userId }: EngramTaskManagerProps) {
  const { showNotification } = useNotification();
  const [selectedEngram, setSelectedEngram] = useState<Engram | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadedEngrams, setLoadedEngrams] = useState<Engram[]>([]);
  const [newTask, setNewTask] = useState({
    task_name: '',
    task_description: '',
    task_type: 'reminder' as 'reminder' | 'notification' | 'action',
    frequency: 'on_demand' as 'on_demand' | 'daily' | 'weekly' | 'monthly',
  });

  const loadEngrams = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('archetypal_ais')
        .select('id, name, training_status')
        .eq('user_id', userId);

      if (data) {
        const formattedEngrams = data.map((ai: { id: string; name: string; training_status: string }) => ({
          id: ai.id,
          name: ai.name,
          is_ai_active: ai.training_status === 'ready',
        }));
        setLoadedEngrams(formattedEngrams);
      }
    } catch (error) {
      console.error('Error loading engrams:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadEngrams();
  }, [loadEngrams]);

  const activeEngrams = loadedEngrams.length > 0 ? loadedEngrams.filter(e => e.is_ai_active) : engrams.filter(e => e.is_ai_active);

  useEffect(() => {
    if (activeEngrams.length > 0 && !selectedEngram) {
      setSelectedEngram(activeEngrams[0]);
    }
  }, [activeEngrams, selectedEngram]);

  const loadTasks = useCallback(async () => {
    if (!selectedEngram) return;
    setLoading(true);
    setLoadError(null);
    try {
      const tasksData = await apiClient.listTasks(selectedEngram.id);
      setTasks(tasksData as Task[]);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setLoadError('Tasks could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEngram]);

  useEffect(() => {
    if (selectedEngram) {
      loadTasks();
    }
  }, [selectedEngram, loadTasks]);

  const createTask = async () => {
    if (!selectedEngram || !newTask.task_name.trim()) return;

    setCreating(true);
    try {
      await apiClient.createTask(selectedEngram.id, {
        ...newTask,
        engram_name: selectedEngram.name,
      });
      setShowCreateModal(false);
      setNewTask({ task_name: '', task_description: '', task_type: 'reminder', frequency: 'on_demand' });
      showNotification('Task created', 'success');
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
      showNotification('The task could not be created. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const executeTask = async (task: Task) => {
    setExecutingId(task.id);
    try {
      const result = (await apiClient.executeTask(task.id)) as ExecuteResponse;
      if (result?.executed) {
        showNotification(result.message || 'Reminder delivered to your notifications.', 'success');
      } else {
        // Honest decline from the server (no real integration for this type).
        showNotification(result?.message || 'This task type has no live integration yet — nothing was executed.', 'warning', 8000);
      }
      loadTasks();
    } catch (error) {
      console.error('Error executing task:', error);
      showNotification('The task could not be executed — nothing was sent.', 'error');
    } finally {
      setExecutingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiClient.deleteTask(pendingDelete.id);
      showNotification('Task deleted', 'success');
      setPendingDelete(null);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      showNotification('The task could not be deleted.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (activeEngrams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-light text-white mb-3">No Active AI Engrams Yet</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-6">
          Tasks can only be assigned to AIs that have completed their training (80% readiness). Build an AI's personality by answering 50+ daily questions.
        </p>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <span className="text-sm text-white font-medium">Go to Engrams tab</span>
            </div>
            <p className="text-xs text-gray-400 pl-11">Create or select an AI (like Dante)</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <span className="text-sm text-white font-medium">Answer daily questions</span>
            </div>
            <p className="text-xs text-gray-400 pl-11">Build their personality to 80% readiness</p>
          </div>
          <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <span className="text-sm text-white font-medium">Assign tasks</span>
            </div>
            <p className="text-xs text-gray-400 pl-11">Return here to create and manage AI tasks!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-purple-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-light text-white">AI Task Management</h2>
            </div>
            <p className="text-gray-400">
              Assign tasks to your activated AI engrams. Reminders are delivered to your in-app notifications when run.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Task
          </button>
        </div>

        {/* Engram Selector */}
        <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {activeEngrams.map((engram) => (
            <button
              key={engram.id}
              onClick={() => setSelectedEngram(engram)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg border-2 transition-all ${
                selectedEngram?.id === engram.id
                  ? 'bg-purple-600/20 border-purple-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              {engram.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tasks...</div>
      ) : loadError ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <p className="text-sm text-amber-300">{loadError}</p>
          <button
            onClick={loadTasks}
            className="mt-4 px-6 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200 hover:bg-amber-500/20 transition-all"
          >
            Retry
          </button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl shadow-lg border border-gray-700/50 p-12 text-center">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-light text-white mb-2">No Tasks Yet</h3>
          <p className="text-gray-400 mb-6">Create tasks for {selectedEngram?.name} to execute.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create First Task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((task) => {
            const taskType = task.details?.task_type || 'general';
            const deliverable = taskType === 'reminder' || taskType === 'notification' || taskType === 'health_reminder';
            return (
              <div key={task.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-medium text-white mb-1 break-words">{task.title}</h3>
                    {task.task_description && (
                      <p className="text-sm text-gray-400">{task.task_description}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[task.status] || STATUS_STYLES.pending}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-md bg-gray-700/40 px-2 py-0.5">{TASK_TYPE_LABELS[taskType] || taskType}</span>
                  {task.details?.frequency && (
                    <span className="rounded-md bg-gray-700/40 px-2 py-0.5">{task.details.frequency.replace('_', ' ')}</span>
                  )}
                  <span>{new Date(task.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => executeTask(task)}
                    disabled={executingId === task.id || task.status === 'cancelled'}
                    title={deliverable ? 'Deliver this reminder to your notifications now' : 'This task type has no live integration yet; running it will record an honest failure'}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {executingId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {deliverable ? 'Deliver Now' : 'Run'}
                  </button>
                  <button
                    onClick={() => setPendingDelete(task)}
                    className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all text-sm"
                    aria-label={`Delete task ${task.title}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-lg w-full">
            <h3 className="text-2xl font-light text-white mb-6">Create Task</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Name *</label>
                <input
                  type="text"
                  value={newTask.task_name}
                  onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newTask.task_description}
                  onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as typeof newTask.task_type })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="reminder">Reminder (delivered in-app)</option>
                    <option value="notification">Notification (delivered in-app)</option>
                    <option value="action">Action (no live integration yet)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                  <select
                    value={newTask.frequency}
                    onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as typeof newTask.frequency })}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    <option value="on_demand">On demand</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              {newTask.task_type === 'action' && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Action tasks can be saved as a plan, but EverAfter can't perform real-world actions yet — running one records an honest failure instead of a pretend success.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={creating || !newTask.task_name.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this task?"
        message={pendingDelete ? `"${pendingDelete.title}" will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setPendingDelete(null)}
      />
    </div>
  );
}
