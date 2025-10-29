import React, { useState, useEffect } from 'react';
import { RotateCw, Activity, TrendingUp, CheckCircle, AlertTriangle, Smartphone, Monitor } from 'lucide-react';
import ConnectionRotationConfig from './ConnectionRotationConfig';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface OrientationState {
  type: 'portrait' | 'landscape';
  angle: number;
  isSupported: boolean;
}

interface RotationStats {
  total_rotations: number;
  successful_rotations: number;
  failed_rotations: number;
  last_rotation: string | null;
  next_scheduled: string | null;
}

export default function ConnectionRotationOverview() {
  const { user } = useAuth();
  const [orientation, setOrientation] = useState<OrientationState>({
    type: 'portrait',
    angle: 0,
    isSupported: false,
  });
  const [stats, setStats] = useState<RotationStats>({
    total_rotations: 0,
    successful_rotations: 0,
    failed_rotations: 0,
    last_rotation: null,
    next_scheduled: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      const angle = (window.screen as any).orientation?.angle || 0;

      setOrientation({
        type: isLandscape ? 'landscape' : 'portrait',
        angle,
        isSupported: 'orientation' in window.screen,
      });
    };

    checkOrientation();

    const handleOrientationChange = () => {
      checkOrientation();
      console.log('Orientation changed:', {
        type: window.matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait',
        angle: (window.screen as any).orientation?.angle || 0,
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const landscapeQuery = window.matchMedia('(orientation: landscape)');
    landscapeQuery.addEventListener('change', handleOrientationChange);

    window.addEventListener('resize', handleOrientationChange);

    if ('orientation' in window.screen) {
      window.screen.orientation.addEventListener('change', handleOrientationChange);
    }

    return () => {
      landscapeQuery.removeEventListener('change', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
      if ('orientation' in window.screen) {
        window.screen.orientation.removeEventListener('change', handleOrientationChange);
      }
    };
  }, []);

  useEffect(() => {
    loadRotationStats();
  }, [user]);

  async function loadRotationStats() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('connection_rotation_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const logs = data || [];
      const successful = logs.filter(log => log.status === 'success').length;
      const failed = logs.filter(log => log.status === 'failed').length;
      const lastRotation = logs[0]?.created_at || null;

      const { data: configData } = await supabase
        .from('connection_rotation_config')
        .select('rotation_interval, enabled')
        .eq('user_id', user.id)
        .maybeSingle();

      let nextScheduled = null;
      if (configData?.enabled && lastRotation) {
        const lastDate = new Date(lastRotation);
        const intervalMap: Record<string, number> = {
          'hourly': 60,
          'every_6_hours': 360,
          'daily': 1440,
          'weekly': 10080,
        };
        const intervalMinutes = intervalMap[configData.rotation_interval] || 360;
        nextScheduled = new Date(lastDate.getTime() + intervalMinutes * 60000).toISOString();
      }

      setStats({
        total_rotations: logs.length,
        successful_rotations: successful,
        failed_rotations: failed,
        last_rotation: lastRotation,
        next_scheduled: nextScheduled,
      });
    } catch (error) {
      console.error('Error loading rotation stats:', error);
    } finally {
      setLoading(false);
    }
  }

  const successRate = stats.total_rotations > 0
    ? Math.round((stats.successful_rotations / stats.total_rotations) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Orientation Debug Panel (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            {orientation.type === 'portrait' ? (
              <Smartphone className="w-5 h-5 text-purple-400" />
            ) : (
              <Monitor className="w-5 h-5 text-purple-400" />
            )}
            <h4 className="text-sm font-semibold text-purple-300">
              Device Orientation: {orientation.type.toUpperCase()}
            </h4>
          </div>
          <div className="text-xs text-purple-200/70 space-y-1">
            <div>Angle: {orientation.angle}°</div>
            <div>Screen: {window.innerWidth}x{window.innerHeight}px</div>
            <div>Orientation API: {orientation.isSupported ? 'Supported' : 'Not Supported'}</div>
          </div>
        </div>
      )}

      {/* Overview Stats Grid */}
      <div className={`grid gap-4 ${
        orientation.type === 'landscape'
          ? 'grid-cols-4'
          : 'grid-cols-2'
      }`}>
        {/* Total Rotations */}
        <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <RotateCw className="w-5 h-5 text-blue-400" />
            <span className="text-3xl font-bold text-white tabular-nums">
              {stats.total_rotations}
            </span>
          </div>
          <div className="text-sm text-blue-200">Total Rotations</div>
        </div>

        {/* Success Rate */}
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-3xl font-bold text-white tabular-nums">
              {successRate}%
            </span>
          </div>
          <div className="text-sm text-green-200">Success Rate</div>
        </div>

        {/* Active Status */}
        <div className={`bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20 ${
          orientation.type === 'portrait' ? 'col-span-2' : ''
        }`}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-2xl font-bold text-white">
              {stats.next_scheduled ? 'Scheduled' : 'Inactive'}
            </span>
          </div>
          <div className="text-sm text-purple-200">
            {stats.next_scheduled ? (
              <>Next: {new Date(stats.next_scheduled).toLocaleString()}</>
            ) : (
              'Enable rotation to start'
            )}
          </div>
        </div>

        {/* Failed Count */}
        {stats.failed_rotations > 0 && (
          <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-4 border border-orange-500/20">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="text-3xl font-bold text-white tabular-nums">
                {stats.failed_rotations}
              </span>
            </div>
            <div className="text-sm text-orange-200">Failed Attempts</div>
          </div>
        )}
      </div>

      {/* Recent Activity Timeline */}
      {!loading && stats.last_rotation && (
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h4 className="text-sm font-semibold text-slate-300">Recent Activity</h4>
          </div>
          <div className="text-xs text-slate-400">
            Last rotation: {new Date(stats.last_rotation).toLocaleString()}
          </div>
        </div>
      )}

      {/* Rotation Configuration Panel */}
      <ConnectionRotationConfig />

      {/* Responsive Layout Info */}
      <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-1">Auto-Rotation Optimized</p>
            <p className="text-blue-200/70">
              This interface automatically adapts to {orientation.type} orientation.
              {orientation.type === 'landscape' && ' Landscape mode shows expanded grid layout.'}
              {orientation.type === 'portrait' && ' Portrait mode shows compact stacked layout.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
