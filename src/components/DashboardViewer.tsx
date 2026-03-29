import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, AlertCircle, RefreshCw, LayoutDashboard } from 'lucide-react';
import WidgetRenderer from './WidgetRenderer';

interface Widget {
  id: string;
  widget_type: string;
  title: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  config: any;
  data_sources: string[];
  refresh_interval: number;
}

interface DashboardViewerProps {
  dashboardId: string;
  editMode?: boolean;
}

export default function DashboardViewer({ dashboardId, editMode = false }: DashboardViewerProps) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadWidgets();
  }, [dashboardId, refreshTrigger]);

  async function loadWidgets() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('position_y')
        .order('position_x');

      if (fetchError) throw fetchError;
      setWidgets(data || []);
    } catch (err: any) {
      console.error('Error loading widgets:', err);
      setError('Failed to load dashboard widgets');
    } finally {
      setLoading(false);
    }
  }

  async function updateWidgetPosition(widgetId: string, x: number, y: number) {
    try {
      const { error: updateError } = await supabase
        .from('dashboard_widgets')
        .update({ position_x: x, position_y: y })
        .eq('id', widgetId);

      if (updateError) throw updateError;
    } catch (err: any) {
      console.error('Error updating widget position:', err);
    }
  }

  async function updateWidgetSize(widgetId: string, width: number, height: number) {
    try {
      const { error: updateError } = await supabase
        .from('dashboard_widgets')
        .update({ width, height })
        .eq('id', widgetId);

      if (updateError) throw updateError;
    } catch (err: any) {
      console.error('Error updating widget size:', err);
    }
  }

  async function deleteWidget(widgetId: string) {
    if (!confirm('Delete this widget?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId);

      if (deleteError) throw deleteError;
      setWidgets(widgets.filter(w => w.id !== widgetId));
    } catch (err: any) {
      console.error('Error deleting widget:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-400" />
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-lg">Error Loading Dashboard</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-slate-800/50 rounded-2xl p-12 text-center border border-slate-700/50">
          <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No Widgets Yet</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {editMode
              ? 'Add widgets to this dashboard using the "Add Widget" button above'
              : 'This dashboard is empty. Switch to edit mode to add widgets.'}
          </p>
        </div>
      </div>
    );
  }

  const maxY = Math.max(...widgets.map(w => w.position_y + w.height));
  const gridRows = Math.max(maxY, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          {widgets.length} widget{widgets.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-all flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh All
        </button>
      </div>

      <div
        className="relative grid gap-4"
        style={{
          gridTemplateColumns: 'repeat(12, 1fr)',
          gridTemplateRows: `repeat(${gridRows}, 80px)`,
        }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            style={{
              gridColumn: `span ${widget.width}`,
              gridRow: `${widget.position_y + 1} / span ${widget.height}`,
            }}
            className="relative"
          >
            <WidgetRenderer
              widget={widget}
              editMode={editMode}
              onDelete={() => deleteWidget(widget.id)}
              onPositionChange={(x, y) => updateWidgetPosition(widget.id, x, y)}
              onSizeChange={(w, h) => updateWidgetSize(widget.id, w, h)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
