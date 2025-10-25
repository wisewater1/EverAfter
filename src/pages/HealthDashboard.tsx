import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Activity, Heart, Moon, Footprints, Calendar, Pill, Plus, TrendingUp, AlertCircle } from 'lucide-react';

interface HealthMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  metric_unit: string;
  recorded_at: string;
}

interface Appointment {
  id: string;
  title: string;
  scheduled_at: string;
  provider_name: string;
  status: string;
}

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  refills_remaining: number;
  is_active: boolean;
}

export default function HealthDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchHealthData();
    }
  }, [user]);

  const fetchHealthData = async () => {
    try {
      const [metricsRes, appointmentsRes, prescriptionsRes] = await Promise.all([
        supabase
          .from('health_metrics')
          .select('*')
          .order('recorded_at', { ascending: false })
          .limit(10),
        supabase
          .from('appointments')
          .select('*')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5),
        supabase
          .from('prescriptions')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data);
      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
      if (prescriptionsRes.data) setPrescriptions(prescriptionsRes.data);
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'steps':
        return <Footprints className="w-5 h-5" />;
      case 'heart_rate':
        return <Heart className="w-5 h-5" />;
      case 'sleep':
        return <Moon className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading health data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Health Dashboard</h1>
            <p className="text-purple-200">Track your health metrics, appointments, and medications</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Recent Metrics</h2>
              <TrendingUp className="w-6 h-6 text-purple-300" />
            </div>
            {metrics.length === 0 ? (
              <p className="text-purple-200 text-sm">No metrics recorded yet</p>
            ) : (
              <div className="space-y-3">
                {metrics.slice(0, 5).map((metric) => (
                  <div key={metric.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="text-purple-300">{getMetricIcon(metric.metric_type)}</div>
                      <div>
                        <p className="text-white font-medium capitalize">{metric.metric_type.replace('_', ' ')}</p>
                        <p className="text-purple-200 text-xs">{formatDate(metric.recorded_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{metric.metric_value}</p>
                      <p className="text-purple-200 text-xs">{metric.metric_unit}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Upcoming Appointments</h2>
              <Calendar className="w-6 h-6 text-blue-300" />
            </div>
            {appointments.length === 0 ? (
              <p className="text-purple-200 text-sm">No upcoming appointments</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white font-medium">{appointment.title}</p>
                    <p className="text-purple-200 text-sm">{appointment.provider_name}</p>
                    <p className="text-blue-300 text-xs mt-1">{formatDate(appointment.scheduled_at)}</p>
                  </div>
                ))}
              </div>
            )}
            <button className="w-full mt-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors flex items-center justify-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Appointment</span>
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Active Prescriptions</h2>
              <Pill className="w-6 h-6 text-green-300" />
            </div>
            {prescriptions.length === 0 ? (
              <p className="text-purple-200 text-sm">No active prescriptions</p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((prescription) => (
                  <div key={prescription.id} className="p-3 bg-white/5 rounded-lg">
                    <p className="text-white font-medium">{prescription.medication_name}</p>
                    <p className="text-purple-200 text-sm">{prescription.dosage} - {prescription.frequency}</p>
                    {prescription.refills_remaining <= 1 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3 h-3 text-yellow-400" />
                        <p className="text-yellow-400 text-xs">Low refills: {prescription.refills_remaining}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button className="w-full mt-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors flex items-center justify-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Prescription</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Health Insights</h2>
            <p className="text-purple-200 mb-4">
              Connect with St. Raphael AI for personalized health insights and recommendations based on your data.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-all font-medium"
            >
              Talk to Raphael
            </button>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Health Connections</h2>
            <p className="text-purple-200 mb-4">
              Connect your health services to automatically sync data from Apple Health, Google Fit, and more.
            </p>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium">
              Manage Connections
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
