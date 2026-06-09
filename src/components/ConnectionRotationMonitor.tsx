import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Loader,
} from 'lucide-react';

interface SyncQueueItem {
  id: string;
  provider: string;
  priority: number;
  status: string;
  sync_type: string;
  scheduled_for: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

interface RotationSchedule {
  id: string;
  provider: string;
  status: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  next_scheduled_at: string | null;
  attempt_count: number;
}

interface ConnectionEvent {
  id: string;
  provider: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

export default function ConnectionRotationMonitor() {
  const { user } = useAuth();
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [schedule, setSchedule] = useState<RotationSchedule[]>([]);
  const [recentEvents, setRecentEvents] = useState<ConnectionEvent[]>([]);
  const [stats, setStats] = useState({
    total_syncs: 0,
    successful: 0,
    failed: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      // Set up real-time subscriptions
      const queueSubscription = supabase
        .channel('sync-queue-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connection_sync_queue',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadSyncQueue();
          }
        )
        .subscribe();

      const scheduleSubscription = supabase
        .channel('schedule-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'connection_rotation_schedule',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadSchedule();
          }
        )
        .subscribe();

      return () => {
        queueSubscription.unsubscribe();
        scheduleSubscription.unsubscribe();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadSyncQueue(), loadSchedule(), loadRecentEvents(), loadStats()]);
    setLoading(false);
  }

  async function loadSyncQueue() {
    try {
      const { data, error } = await supabase
        .from('connection_sync_queue')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSyncQueue(data || []);
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  async function loadSchedule() {
    try {
      const { data, error } = await supabase
        .from('connection_rotation_schedule')
        .select('*')
        .eq('user_id', user?.id)
        .order('scheduled_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  }

  async function loadRecentEvents() {
    try {
      const { data, error } = await supabase
        .from('connection_events')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  }

  async function loadStats() {
    try {
      const { data, error } = await supabase
        .from('connection_sync_queue')
        .select('status')
        .eq('user_id', user?.id);

      if (error) throw error;

      const stats = {
        total_syncs: data?.length || 0,
        successful: data?.filter((s) => s.status === 'completed').length || 0,
        failed: data?.filter((s) => s.status === 'failed').length || 0,
        pending: data?.filter((s) => s.status === 'pending').length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'pending':
      case 'scheduled':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-900/30 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-900/30 text-red-400 border-red-500/30';
      case 'running':
      case 'processing':
        return 'bg-blue-900/30 text-blue-400 border-blue-500/30';
      case 'pending':
      case 'scheduled':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-900/30 text-gray-400 border-gray-500/30';
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'sync_completed':
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      case 'sync_failed':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  const successRate = stats.total_syncs > 0 ? (stats.successful / stats.total_syncs) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-xl p-5 border border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-300">Total</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total_syncs}</div>
          <div className="text-sm text-blue-300 mt-1">Total Syncs</div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-xl p-5 border border-green-500/30">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-xs text-green-300">{successRate.toFixed(1)}%</span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.successful}</div>
          <div className="text-sm text-green-300 mt-1">Successful</div>
        </div>

        <div className="bg-gradient-to-br from-red-900/30 to-red-800/30 rounded-xl p-5 border border-red-500/30">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-xs text-red-300">
              {stats.total_syncs > 0 ? ((stats.failed / stats.total_syncs) * 100).toFixed(1) : 0}%
            </span>
          </div>
          <div className="text-3xl font-bold text-white">{stats.failed}</div>
          <div className="text-sm text-red-300 mt-1">Failed</div>
        </div>

        <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-xl p-5 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-yellow-300 hover:text-yellow-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="text-3xl font-bold text-white">{stats.pending}</div>
          <div className="text-sm text-yellow-300 mt-1">Pending</div>
        </div>
      </div>

      {/* Sync Queue */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-white">Sync Queue</h3>
          </div>
        </div>

        {syncQueue.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No syncs in queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {syncQueue.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(item.status)}
                      <span className="text-white font-semibold capitalize">
                        {item.provider}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Priority: {item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>Type: {item.sync_type}</span>
                      <span>
                        Scheduled: {new Date(item.scheduled_for).toLocaleString()}
                      </span>
                      {item.completed_at && (
                        <span>
                          Completed: {new Date(item.completed_at).toLocaleString()}
                        </span>
                      )}
                    </div>
                    {item.error_message && (
                      <div className="mt-2 text-sm text-red-400 bg-red-900/20 rounded px-2 py-1">
                        {item.error_message}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rotation Schedule */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6 text-green-400" />
          <h3 className="text-xl font-bold text-white">Rotation Schedule</h3>
        </div>

        {schedule.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No scheduled rotations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {schedule.map((item) => (
              <div
                key={item.id}
                className="bg-white/5 rounded-lg p-4 border border-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(item.status)}
                      <span className="text-white font-semibold capitalize">
                        {item.provider}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                      {item.attempt_count > 0 && (
                        <span className="text-xs text-yellow-400">
                          Attempt {item.attempt_count}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      Scheduled: {new Date(item.scheduled_at).toLocaleString()}
                    </div>
                    {item.next_scheduled_at && (
                      <div className="text-sm text-green-400 mt-1">
                        Next: {new Date(item.next_scheduled_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-purple-400" />
          <h3 className="text-xl font-bold text-white">Recent Events</h3>
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No recent events</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-3 py-2 px-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
              >
                {getEventIcon(event.event_type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm capitalize">{event.provider}</span>
                    <span className="text-gray-400 text-xs">•</span>
                    <span className="text-gray-400 text-xs">
                      {event.event_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(event.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
