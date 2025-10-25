import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, Play, Trash2, Calendar } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { supabase } from '../lib/supabase';

interface Task {
  id: string;
  task_name: string;
  task_description: string;
  task_type: string;
  frequency: string;
  is_active: boolean;
  last_executed: string | null;
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

export default function EngramTaskManager({ engrams, userId }: EngramTaskManagerProps) {
  const [selectedEngram, setSelectedEngram] = useState<Engram | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
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
        const formattedEngrams = data.map(ai => ({
          id: ai.id,
          name: ai.name,
          is_ai_active: ai.training_status === 'ready'
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
    try {
      const tasksData = await apiClient.listTasks(selectedEngram.id);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading tasks:', error);
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
    if (!selectedEngram || !newTask.task_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await apiClient.createTask(selectedEngram.id, newTask);
      setShowCreateModal(false);
      setNewTask({ task_name: '', task_description: '', task_type: 'reminder', frequency: 'on_demand' });
      loadTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const executeTask = async (taskId: string) => {
    try {
      await apiClient.executeTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error executing task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await apiClient.deleteTask(taskId);
      loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (activeEngrams.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-12 backdrop-blur-sm text-center">
        <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-2xl font-light text-white mb-3">No Active AI Engrams Yet</h3>
        <p className="text-gray-400 max-w-md mx-auto mb-4">
          Tasks can only be assigned to AIs that have completed their training.
        </p>
        <p className="text-gray-500 max-w-md mx-auto text-sm">
          Go to Custom Engrams, select an AI (like Dante or Jamal), then answer daily questions to build their personality. Once trained, they'll appear here and can be given custom tasks!
        </p>
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
              Assign tasks to your activated AI engrams.
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
          {tasks.map((task) => (
            <div key={task.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl border border-gray-700/50 p-6 backdrop-blur-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">{task.task_name}</h3>
                  <p className="text-sm text-gray-400">{task.task_description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => executeTask(task.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Execute
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="px-4 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-600/30 transition-all text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                <textarea
                  value={newTask.task_description}
                  onChange={(e) => setNewTask({ ...newTask, task_description: e.target.value })}
                  rows={3}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium"
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
