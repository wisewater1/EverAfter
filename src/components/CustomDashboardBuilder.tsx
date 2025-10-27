import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Plus,
  Save,
  X,
  Grid,
  Eye,
  Settings,
  Trash2,
  Copy,
  Share2,
  Star,
  StarOff,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  Loader,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import DashboardViewer from './DashboardViewer';
import DashboardTemplateSelector from './DashboardTemplateSelector';
import WidgetLibrary from './WidgetLibrary';
import DashboardRotationControls from './DashboardRotationControls';

interface Dashboard {
  id: string;
  name: string;
  description: string;
  template_id: string | null;
  theme: string;
  is_favorite: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
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

export default function CustomDashboardBuilder() {
  const { user } = useAuth();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'edit' | 'view'>('list');
  const [rotationConfig, setRotationConfig] = useState<RotationConfig | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [currentRotationIndex, setCurrentRotationIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');

  useEffect(() => {
    if (user) {
      loadDashboards();
      loadRotationConfig();
    }
  }, [user]);

  useEffect(() => {
    let rotationInterval: NodeJS.Timeout;

    if (isRotating && rotationConfig && rotationConfig.dashboard_sequence.length > 0) {
      rotationInterval = setInterval(() => {
        setCurrentRotationIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % rotationConfig.dashboard_sequence.length;
          const nextDashboardId = rotationConfig.dashboard_sequence[nextIndex];
          const nextDashboard = dashboards.find(d => d.id === nextDashboardId);
          if (nextDashboard) {
            setSelectedDashboard(nextDashboard);
            updateDashboardView(nextDashboard.id);
          }
          return nextIndex;
        });
      }, rotationConfig.interval_seconds * 1000);
    }

    return () => {
      if (rotationInterval) clearInterval(rotationInterval);
    };
  }, [isRotating, rotationConfig, dashboards]);

  async function loadDashboards() {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('custom_health_dashboards')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_favorite', { ascending: false })
        .order('last_viewed_at', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;
      setDashboards(data || []);
    } catch (err: any) {
      console.error('Error loading dashboards:', err);
      setError('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  }

  async function loadRotationConfig() {
    try {
      const { data, error: fetchError } = await supabase
        .from('dashboard_auto_rotation')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      setRotationConfig(data);
      if (data && data.enabled) {
        setIsRotating(true);
        setCurrentRotationIndex(data.current_index || 0);
      }
    } catch (err: any) {
      console.error('Error loading rotation config:', err);
    }
  }

  async function createDashboard(templateId?: string) {
    if (!newDashboardName.trim()) {
      setError('Dashboard name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: insertError } = await supabase
        .from('custom_health_dashboards')
        .insert({
          user_id: user?.id,
          name: newDashboardName,
          description: newDashboardDescription,
          template_id: templateId || null,
          theme: 'default',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (templateId) {
        await createWidgetsFromTemplate(data.id, templateId);
      }

      setDashboards([data, ...dashboards]);
      setNewDashboardName('');
      setNewDashboardDescription('');
      setShowCreateModal(false);
      setSelectedDashboard(data);
      setViewMode('edit');
    } catch (err: any) {
      console.error('Error creating dashboard:', err);
      setError('Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function createWidgetsFromTemplate(dashboardId: string, templateId: string) {
    try {
      const { data: template, error: templateError } = await supabase
        .from('dashboard_templates')
        .select('default_widgets')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const widgets = (template.default_widgets as any[]) || [];
      const widgetInserts = widgets.map((widget: any) => ({
        dashboard_id: dashboardId,
        widget_type: widget.type,
        title: widget.title,
        position_x: widget.position?.x || 0,
        position_y: widget.position?.y || 0,
        width: widget.position?.w || 4,
        height: widget.position?.h || 4,
        config: widget.config || {},
        data_sources: [],
      }));

      const { error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .insert(widgetInserts);

      if (widgetsError) throw widgetsError;
    } catch (err: any) {
      console.error('Error creating widgets from template:', err);
    }
  }

  async function deleteDashboard(id: string) {
    if (!confirm('Delete this dashboard? This action cannot be undone.')) return;

    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('custom_health_dashboards')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setDashboards(dashboards.filter(d => d.id !== id));
      if (selectedDashboard?.id === id) {
        setSelectedDashboard(null);
        setViewMode('list');
      }
    } catch (err: any) {
      console.error('Error deleting dashboard:', err);
      setError('Failed to delete dashboard');
    }
  }

  async function duplicateDashboard(dashboard: Dashboard) {
    try {
      setError(null);
      const { data: newDashboard, error: insertError } = await supabase
        .from('custom_health_dashboards')
        .insert({
          user_id: user?.id,
          name: `${dashboard.name} (Copy)`,
          description: dashboard.description,
          template_id: dashboard.template_id,
          theme: dashboard.theme,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: widgets } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboard.id);

      if (widgets && widgets.length > 0) {
        const newWidgets = widgets.map(w => ({
          dashboard_id: newDashboard.id,
          widget_type: w.widget_type,
          title: w.title,
          position_x: w.position_x,
          position_y: w.position_y,
          width: w.width,
          height: w.height,
          config: w.config,
          data_sources: w.data_sources,
          refresh_interval: w.refresh_interval,
        }));

        await supabase.from('dashboard_widgets').insert(newWidgets);
      }

      await loadDashboards();
    } catch (err: any) {
      console.error('Error duplicating dashboard:', err);
      setError('Failed to duplicate dashboard');
    }
  }

  async function toggleFavorite(dashboard: Dashboard) {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('custom_health_dashboards')
        .update({ is_favorite: !dashboard.is_favorite })
        .eq('id', dashboard.id);

      if (updateError) throw updateError;
      await loadDashboards();
    } catch (err: any) {
      console.error('Error toggling favorite:', err);
      setError('Failed to update favorite status');
    }
  }

  async function updateDashboardView(dashboardId: string) {
    try {
      await supabase
        .from('custom_health_dashboards')
        .update({
          last_viewed_at: new Date().toISOString(),
          view_count: supabase.sql`view_count + 1`,
        })
        .eq('id', dashboardId);
    } catch (err: any) {
      console.error('Error updating view count:', err);
    }
  }

  function handleViewDashboard(dashboard: Dashboard) {
    setSelectedDashboard(dashboard);
    setViewMode('view');
    updateDashboardView(dashboard.id);
    if (isRotating && rotationConfig?.pause_on_interaction) {
      setIsRotating(false);
    }
  }

  function handleEditDashboard(dashboard: Dashboard) {
    setSelectedDashboard(dashboard);
    setViewMode('edit');
    if (isRotating) setIsRotating(false);
  }

  async function toggleRotation() {
    if (!rotationConfig || rotationConfig.dashboard_sequence.length === 0) {
      setError('Please configure rotation settings first');
      return;
    }

    const newRotatingState = !isRotating;
    setIsRotating(newRotatingState);

    if (newRotatingState) {
      const firstDashboardId = rotationConfig.dashboard_sequence[currentRotationIndex];
      const firstDashboard = dashboards.find(d => d.id === firstDashboardId);
      if (firstDashboard) {
        setSelectedDashboard(firstDashboard);
        setViewMode('view');
      }
    }

    try {
      await supabase
        .from('dashboard_auto_rotation')
        .update({ enabled: newRotatingState, current_index: currentRotationIndex })
        .eq('user_id', user?.id);
    } catch (err: any) {
      console.error('Error updating rotation state:', err);
    }
  }

  function skipToNext() {
    if (!rotationConfig || rotationConfig.dashboard_sequence.length === 0) return;

    const nextIndex = (currentRotationIndex + 1) % rotationConfig.dashboard_sequence.length;
    setCurrentRotationIndex(nextIndex);

    const nextDashboardId = rotationConfig.dashboard_sequence[nextIndex];
    const nextDashboard = dashboards.find(d => d.id === nextDashboardId);
    if (nextDashboard) {
      setSelectedDashboard(nextDashboard);
      updateDashboardView(nextDashboard.id);
    }
  }

  if (viewMode === 'view' && selectedDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedDashboard(null);
                  if (isRotating) setIsRotating(false);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-white">{selectedDashboard.name}</h2>
                {selectedDashboard.description && (
                  <p className="text-sm text-slate-400">{selectedDashboard.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {rotationConfig && rotationConfig.dashboard_sequence.length > 0 && (
                <>
                  <button
                    onClick={toggleRotation}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      isRotating
                        ? 'bg-red-600/20 text-red-300 hover:bg-red-600/30'
                        : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                    }`}
                  >
                    {isRotating ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause Rotation
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Rotation
                      </>
                    )}
                  </button>
                  {isRotating && (
                    <button
                      onClick={skipToNext}
                      className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2"
                    >
                      <SkipForward className="w-4 h-4" />
                      Skip
                    </button>
                  )}
                </>
              )}
              <button
                onClick={() => handleEditDashboard(selectedDashboard)}
                className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>

        <DashboardViewer dashboardId={selectedDashboard.id} />
      </div>
    );
  }

  if (viewMode === 'edit' && selectedDashboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedDashboard(null);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h2 className="text-lg font-bold text-white">Edit: {selectedDashboard.name}</h2>
                <p className="text-sm text-slate-400">Drag widgets to reposition, resize, or configure</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWidgetLibrary(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </button>
              <button
                onClick={() => handleViewDashboard(selectedDashboard)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>
        </div>

        <DashboardViewer dashboardId={selectedDashboard.id} editMode={true} />

        {showWidgetLibrary && (
          <WidgetLibrary
            dashboardId={selectedDashboard.id}
            onClose={() => setShowWidgetLibrary(false)}
            onWidgetAdded={() => {
              setShowWidgetLibrary(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-violet-900/20 via-fuchsia-900/20 to-pink-900/20 border border-violet-500/30 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                Custom Health Plugin Builder
                <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
              </h3>
              <p className="text-violet-200 text-sm">
                Build custom dashboards combining multiple data sources
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 rounded-lg transition-all flex items-center gap-2"
            >
              <Grid className="w-4 h-4" />
              Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:via-fuchsia-500 hover:to-pink-500 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              Create Dashboard
            </button>
          </div>
        </div>

        {rotationConfig && dashboards.length > 0 && (
          <DashboardRotationControls
            config={rotationConfig}
            dashboards={dashboards}
            isRotating={isRotating}
            currentIndex={currentRotationIndex}
            onToggleRotation={toggleRotation}
            onSkip={skipToNext}
            onConfigUpdate={loadRotationConfig}
          />
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-400" />
          <p className="text-slate-400">Loading dashboards...</p>
        </div>
      ) : dashboards.length === 0 ? (
        <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-slate-700/50">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No Dashboards Yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Get started by creating a new dashboard from scratch or choose from our pre-built templates
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowTemplateSelector(true)}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Grid className="w-5 h-5" />
              Browse Templates
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create from Scratch
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-white mb-1 truncate">{dashboard.name}</h4>
                  {dashboard.description && (
                    <p className="text-sm text-slate-400 line-clamp-2">{dashboard.description}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleFavorite(dashboard)}
                  className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
                >
                  {dashboard.is_favorite ? (
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ) : (
                    <StarOff className="w-5 h-5 text-slate-500" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
                <span>Views: {dashboard.view_count}</span>
                {dashboard.last_viewed_at && (
                  <span>Last: {new Date(dashboard.last_viewed_at).toLocaleDateString()}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDashboard(dashboard)}
                  className="flex-1 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View
                </button>
                <button
                  onClick={() => handleEditDashboard(dashboard)}
                  className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => duplicateDashboard(dashboard)}
                  className="p-2 bg-slate-700/50 hover:bg-slate-700 text-slate-400 rounded-lg transition-all"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteDashboard(dashboard.id)}
                  className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showTemplateSelector && (
        <DashboardTemplateSelector
          onSelectTemplate={(templateId) => {
            setShowTemplateSelector(false);
            setShowCreateModal(true);
          }}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-lg w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Create New Dashboard</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="My Custom Dashboard"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                  placeholder="Describe what this dashboard tracks..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDashboardName('');
                  setNewDashboardDescription('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => createDashboard()}
                disabled={!newDashboardName.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
