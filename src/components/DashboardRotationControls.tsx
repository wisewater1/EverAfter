import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Play,
  Pause,
  SkipForward,
  Settings,
  X,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Zap,
  Shuffle,
} from 'lucide-react';

interface Dashboard {
  id: string;
  name: string;
}

interface RotationConfig {
  id: string;
  enabled: boolean;
  interval_seconds: number;
  dashboard_sequence: string[];
  current_index: number;
  transition_effect: string;
  pause_on_interaction: boolean;
  smart_rotation: boolean;
}

interface DashboardRotationControlsProps {
  config: RotationConfig;
  dashboards: Dashboard[];
  isRotating: boolean;
  currentIndex: number;
  onToggleRotation: () => void;
  onSkip: () => void;
  onConfigUpdate: () => void;
}

export default function DashboardRotationControls({
  config,
  dashboards,
  isRotating,
  currentIndex,
  onToggleRotation,
  onSkip,
  onConfigUpdate,
}: DashboardRotationControlsProps) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(config.interval_seconds);
  const [pauseOnInteraction, setPauseOnInteraction] = useState(config.pause_on_interaction);
  const [smartRotation, setSmartRotation] = useState(config.smart_rotation);
  const [selectedDashboards, setSelectedDashboards] = useState<string[]>(config.dashboard_sequence);
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    try {
      setSaving(true);

      const { error: updateError } = await supabase
        .from('dashboard_auto_rotation')
        .upsert({
          user_id: user?.id,
          interval_seconds: intervalSeconds,
          dashboard_sequence: selectedDashboards,
          pause_on_interaction: pauseOnInteraction,
          smart_rotation: smartRotation,
          current_index: 0,
        });

      if (updateError) throw updateError;

      setShowSettings(false);
      onConfigUpdate();
    } catch (err: any) {
      console.error('Error saving rotation settings:', err);
    } finally {
      setSaving(false);
    }
  }

  function toggleDashboardInSequence(dashboardId: string) {
    if (selectedDashboards.includes(dashboardId)) {
      setSelectedDashboards(selectedDashboards.filter(id => id !== dashboardId));
    } else {
      setSelectedDashboards([...selectedDashboards, dashboardId]);
    }
  }

  function moveDashboardUp(index: number) {
    if (index === 0) return;
    const newSequence = [...selectedDashboards];
    [newSequence[index - 1], newSequence[index]] = [newSequence[index], newSequence[index - 1]];
    setSelectedDashboards(newSequence);
  }

  function moveDashboardDown(index: number) {
    if (index === selectedDashboards.length - 1) return;
    const newSequence = [...selectedDashboards];
    [newSequence[index], newSequence[index + 1]] = [newSequence[index + 1], newSequence[index]];
    setSelectedDashboards(newSequence);
  }

  const currentDashboard = config.dashboard_sequence.length > 0
    ? dashboards.find(d => d.id === config.dashboard_sequence[currentIndex])
    : null;

  return (
    <div className="mt-4 bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-violet-400" />
          Auto-Rotation
        </h4>
        <div className="flex items-center gap-2">
          {config.dashboard_sequence.length > 0 && (
            <>
              <button
                onClick={onSkip}
                disabled={!isRotating}
                className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 rounded-lg transition-all text-sm flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Skip
              </button>
              <button
                onClick={onToggleRotation}
                className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium flex items-center gap-1.5 ${
                  isRotating
                    ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                    : 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                }`}
              >
                {isRotating ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </>
                )}
              </button>
            </>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg transition-all text-sm flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            Configure
          </button>
        </div>
      </div>

      {config.dashboard_sequence.length > 0 ? (
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span>Every {config.interval_seconds}s</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span>•</span>
            <span>{config.dashboard_sequence.length} dashboard{config.dashboard_sequence.length !== 1 ? 's' : ''}</span>
          </div>
          {isRotating && currentDashboard && (
            <>
              <div className="flex items-center gap-2 text-slate-400">
                <span>•</span>
                <span className="text-violet-300">Now: {currentDashboard.name}</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No dashboards selected for rotation</p>
      )}

      {showSettings && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Rotation Settings</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Configure automatic dashboard rotation
                  </p>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rotation Interval (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  How long to display each dashboard (5-300 seconds)
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Pause on Interaction
                  </label>
                  <button
                    onClick={() => setPauseOnInteraction(!pauseOnInteraction)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      pauseOnInteraction ? 'bg-violet-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        pauseOnInteraction ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Automatically pause rotation when you interact with a dashboard
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300">
                    Smart Rotation
                  </label>
                  <button
                    onClick={() => setSmartRotation(!smartRotation)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      smartRotation ? 'bg-violet-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        smartRotation ? 'translate-x-6' : ''
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  Prioritize dashboards with new data or alerts
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Dashboard Sequence
                </label>

                {selectedDashboards.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {selectedDashboards.map((dashboardId, index) => {
                      const dashboard = dashboards.find(d => d.id === dashboardId);
                      if (!dashboard) return null;

                      return (
                        <div
                          key={dashboardId}
                          className="flex items-center gap-3 bg-slate-800 rounded-lg p-3 border border-slate-700"
                        >
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveDashboardUp(index)}
                              disabled={index === 0}
                              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <GripVertical className="w-4 h-4 text-slate-500" />
                            </button>
                            <button
                              onClick={() => moveDashboardDown(index)}
                              disabled={index === selectedDashboards.length - 1}
                              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <GripVertical className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-violet-400">
                                #{index + 1}
                              </span>
                              <span className="text-sm text-white">{dashboard.name}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleDashboardInSequence(dashboardId)}
                            className="p-1.5 hover:bg-red-900/30 rounded text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-3">Available Dashboards:</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dashboards
                      .filter(d => !selectedDashboards.includes(d.id))
                      .map((dashboard) => (
                        <button
                          key={dashboard.id}
                          onClick={() => toggleDashboardInSequence(dashboard.id)}
                          className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-left text-sm text-slate-300 rounded-lg transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          {dashboard.name}
                        </button>
                      ))}
                  </div>
                  {dashboards.filter(d => !selectedDashboards.includes(d.id)).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">
                      All dashboards added to rotation
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-6">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSettings}
                  disabled={saving || selectedDashboards.length === 0}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
