import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Target, Plus, TrendingUp, CheckCircle } from 'lucide-react';

interface HealthGoal {
  id: string;
  goal_type: string;
  goal_title: string;
  goal_description: string;
  target_value: number;
  current_value: number;
  target_unit: string;
  start_date: string;
  target_date: string;
  status: string;
  priority: string;
}

export default function HealthGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<HealthGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    goal_type: 'steps',
    goal_title: '',
    goal_description: '',
    target_value: 10000,
    target_unit: 'steps',
    start_date: new Date().toISOString().split('T')[0],
    target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium'
  });

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('health_goals')
        .select('*')
        .eq('status', 'active')
        .order('priority', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const addGoal = async () => {
    if (!newGoal.goal_title || !newGoal.target_value) {
      alert('Please fill in goal title and target value');
      return;
    }

    try {
      const { error } = await supabase
        .from('health_goals')
        .insert([{
          user_id: user?.id,
          ...newGoal,
          current_value: 0,
          status: 'active'
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNewGoal({
        goal_type: 'steps',
        goal_title: '',
        goal_description: '',
        target_value: 10000,
        target_unit: 'steps',
        start_date: new Date().toISOString().split('T')[0],
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'medium'
      });
      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      alert('Failed to add goal');
    }
  };

  const updateProgress = async (goalId: string, newValue: number) => {
    try {
      const { error } = await supabase
        .from('health_goals')
        .update({ current_value: newValue })
        .eq('id', goalId);

      if (error) throw error;
      fetchGoals();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const completeGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('health_goals')
        .update({ status: 'completed' })
        .eq('id', goalId);

      if (error) throw error;
      fetchGoals();
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-500/30 bg-red-500/10';
      case 'medium': return 'border-yellow-500/30 bg-yellow-500/10';
      default: return 'border-blue-500/30 bg-blue-500/10';
    }
  };

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading goals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Health Goals</h2>
            <p className="text-gray-400 text-sm">Set and track your health objectives</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        <div className="space-y-4">
          {goals.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Target className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No active goals. Set your first health goal to get started!</p>
            </div>
          ) : (
            goals.map((goal) => {
              const progress = getProgressPercentage(goal.current_value, goal.target_value);
              return (
                <div
                  key={goal.id}
                  className={`rounded-xl p-5 border ${getPriorityColor(goal.priority)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-5 h-5 text-blue-400" />
                        <h3 className="text-white font-semibold text-lg">{goal.goal_title}</h3>
                      </div>
                      {goal.goal_description && (
                        <p className="text-gray-400 text-sm mb-2">{goal.goal_description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>Start: {new Date(goal.start_date).toLocaleDateString()}</span>
                        <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                        <span className="capitalize text-yellow-400">{goal.priority} priority</span>
                      </div>
                    </div>
                    {progress >= 100 && (
                      <button
                        onClick={() => completeGoal(goal.id)}
                        className="ml-3 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all flex items-center gap-1 text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">
                        {goal.current_value.toLocaleString()} / {goal.target_value.toLocaleString()} {goal.target_unit}
                      </span>
                      <span className="text-sm font-semibold text-blue-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                    <input
                      type="number"
                      placeholder="Update progress..."
                      className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = parseFloat((e.target as HTMLInputElement).value);
                          if (!isNaN(value)) {
                            updateProgress(goal.id, value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      onClick={(e) => {
                        const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                        const value = parseFloat(input.value);
                        if (!isNaN(value)) {
                          updateProgress(goal.id, value);
                          input.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all text-sm flex items-center gap-1"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Update
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-light text-white mb-6">New Health Goal</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Goal Title *</label>
                <input
                  type="text"
                  value={newGoal.goal_title}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_title: e.target.value })}
                  placeholder="e.g., Walk 10,000 steps daily"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newGoal.goal_description}
                  onChange={(e) => setNewGoal({ ...newGoal, goal_description: e.target.value })}
                  placeholder="Why this goal is important to you..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Value *</label>
                  <input
                    type="number"
                    value={newGoal.target_value}
                    onChange={(e) => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Unit</label>
                  <input
                    type="text"
                    value={newGoal.target_unit}
                    onChange={(e) => setNewGoal({ ...newGoal, target_unit: e.target.value })}
                    placeholder="steps, lbs, hours..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newGoal.start_date}
                    onChange={(e) => setNewGoal({ ...newGoal, start_date: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Target Date</label>
                  <input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                <select
                  value={newGoal.priority}
                  onChange={(e) => setNewGoal({ ...newGoal, priority: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addGoal}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
