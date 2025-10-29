import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  Mail,
  Download,
  TrendingUp,
  Activity,
  Bell,
  Shield,
  ArrowLeft,
  Eye,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  newUsersToday: number;
  totalConnections: number;
  pendingNotifications: number;
}

interface UserData {
  user_id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  location: string | null;
  interests: string[];
  skills: string[];
  created_at: string;
  last_active_at: string;
  connection_count: number;
}

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  metadata: any;
  is_read: boolean;
  created_at: string;
}

export default function AdminPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    newUsersToday: 0,
    totalConnections: 0,
    pendingNotifications: 0,
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'notifications' | 'activity'>('users');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users_for_admin');

      if (usersError) throw usersError;

      setUsers(usersData || []);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newToday = (usersData || []).filter((u: UserData) =>
        new Date(u.created_at) >= today
      ).length;

      const { data: connectionsData } = await supabase
        .from('user_connections')
        .select('id')
        .eq('status', 'accepted');

      const { data: notificationsData } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      setNotifications(notificationsData || []);

      setStats({
        totalUsers: (usersData || []).length,
        newUsersToday: newToday,
        totalConnections: (connectionsData || []).length,
        pendingNotifications: (notificationsData || []).filter((n: Notification) => !n.is_read).length,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportUsers = () => {
    const csv = [
      ['Email', 'Full Name', 'Phone', 'Location', 'Interests', 'Skills', 'Joined', 'Last Active', 'Connections'].join(','),
      ...users.map(user =>
        [
          user.email,
          user.full_name,
          user.phone_number || '',
          user.location || '',
          user.interests.join('; '),
          user.skills.join('; '),
          new Date(user.created_at).toLocaleDateString(),
          new Date(user.last_active_at).toLocaleDateString(),
          user.connection_count,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      loadAdminData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">Admin Portal</h1>
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-slate-400">User management and analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAdminData}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-white rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {activeTab === 'users' && (
              <button
                onClick={exportUsers}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Users
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers.toString()}
            color="from-sky-500/20 to-blue-500/20"
          />
          <StatCard
            icon={TrendingUp}
            label="New Today"
            value={stats.newUsersToday.toString()}
            color="from-emerald-500/20 to-teal-500/20"
          />
          <StatCard
            icon={Activity}
            label="Total Connections"
            value={stats.totalConnections.toString()}
            color="from-amber-500/20 to-orange-500/20"
          />
          <StatCard
            icon={Bell}
            label="Pending Notifications"
            value={stats.pendingNotifications.toString()}
            color="from-purple-500/20 to-indigo-500/20"
          />
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'notifications'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            Notifications ({notifications.length})
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">User</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Interests</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Connections</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-white font-medium">{user.full_name}</p>
                        {user.phone_number && (
                          <p className="text-slate-400 text-sm">{user.phone_number}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{user.email}</td>
                      <td className="px-6 py-4 text-slate-300">{user.location || '-'}</td>
                      <td className="px-6 py-4">
                        {user.interests.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.interests.slice(0, 2).map((interest, idx) => (
                              <span key={idx} className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded">
                                {interest}
                              </span>
                            ))}
                            {user.interests.length > 2 && (
                              <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
                                +{user.interests.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{user.connection_count}</td>
                      <td className="px-6 py-4 text-slate-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 rounded-2xl border transition-all ${
                    notification.is_read
                      ? 'bg-slate-800/20 border-slate-700/50'
                      : 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{notification.title}</h3>
                        <p className="text-slate-400 text-sm">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-all"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                  <p className="text-slate-300 mb-4">{notification.message}</p>
                  {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                    <div className="p-4 bg-slate-900/50 rounded-xl">
                      <p className="text-slate-400 text-sm font-medium mb-2">User Details:</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {notification.metadata.email && (
                          <div>
                            <span className="text-slate-500">Email:</span>
                            <span className="text-white ml-2">{notification.metadata.email}</span>
                          </div>
                        )}
                        {notification.metadata.location && (
                          <div>
                            <span className="text-slate-500">Location:</span>
                            <span className="text-white ml-2">{notification.metadata.location}</span>
                          </div>
                        )}
                        {notification.metadata.interests && notification.metadata.interests.length > 0 && (
                          <div className="col-span-2">
                            <span className="text-slate-500">Interests:</span>
                            <span className="text-white ml-2">{notification.metadata.interests.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${color} border border-white/10`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-8 h-8 text-white" />
      </div>
      <p className="text-3xl font-light text-white mb-1">{value}</p>
      <p className="text-slate-300 text-sm">{label}</p>
    </div>
  );
}
