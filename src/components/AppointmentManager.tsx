import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, Clock, MapPin, User, CheckCircle, XCircle, Edit, Trash2, AlertCircle } from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  description: string;
  appointment_type: string;
  provider_name: string;
  provider_location: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string;
  created_at: string;
}

export default function AppointmentManager() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    appointment_type: 'general',
    provider_name: '',
    provider_location: '',
    scheduled_at: '',
    duration_minutes: 30,
    notes: ''
  });

  const appointmentTypes = [
    { value: 'general', label: 'General Checkup' },
    { value: 'specialist', label: 'Specialist Consultation' },
    { value: 'dental', label: 'Dental' },
    { value: 'vision', label: 'Vision/Eye Care' },
    { value: 'mental_health', label: 'Mental Health' },
    { value: 'lab_work', label: 'Lab Work' },
    { value: 'physical_therapy', label: 'Physical Therapy' },
    { value: 'telemedicine', label: 'Telemedicine' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.scheduled_at) {
      alert('Please fill in required fields');
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([{
            user_id: user?.id,
            ...formData,
            status: 'scheduled'
          }]);

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        appointment_type: 'general',
        provider_name: '',
        provider_location: '',
        scheduled_at: '',
        duration_minutes: 30,
        notes: ''
      });
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert('Failed to save appointment');
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingId(appointment.id);
    setFormData({
      title: appointment.title,
      description: appointment.description || '',
      appointment_type: appointment.appointment_type || 'general',
      provider_name: appointment.provider_name || '',
      provider_location: appointment.provider_location || '',
      scheduled_at: appointment.scheduled_at,
      duration_minutes: appointment.duration_minutes || 30,
      notes: appointment.notes || ''
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Failed to delete appointment');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      scheduled: { color: 'bg-blue-900/30 text-blue-400 border-blue-500/30', icon: Clock },
      completed: { color: 'bg-green-900/30 text-green-400 border-green-500/30', icon: CheckCircle },
      cancelled: { color: 'bg-red-900/30 text-red-400 border-red-500/30', icon: XCircle },
      rescheduled: { color: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30', icon: AlertCircle }
    };
    const config = configs[status as keyof typeof configs] || configs.scheduled;
    const StatusIcon = config.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.color}`}>
        <StatusIcon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const upcomingAppointments = appointments.filter(a =>
    a.status === 'scheduled' && new Date(a.scheduled_at) >= new Date()
  );
  const pastAppointments = appointments.filter(a =>
    a.status !== 'scheduled' || new Date(a.scheduled_at) < new Date()
  );

  if (loading) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50">
        <div className="text-white">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Appointments</h2>
            <p className="text-gray-400 text-xs sm:text-sm">Manage your medical appointments and reminders</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                title: '',
                description: '',
                appointment_type: 'general',
                provider_name: '',
                provider_location: '',
                scheduled_at: '',
                duration_minutes: 30,
                notes: ''
              });
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
        </div>

        {upcomingAppointments.length > 0 && (
          <div className="mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Upcoming Appointments</h3>
            <div className="space-y-2 sm:space-y-3">
              {upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-gray-900/50 rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-700/50 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                          <h4 className="text-white font-semibold text-sm sm:text-base">{appointment.title}</h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        {appointment.description && (
                          <p className="text-gray-400 text-xs sm:text-sm mb-2">{appointment.description}</p>
                        )}
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="truncate">{new Date(appointment.scheduled_at).toLocaleString()}</span>
                          </div>
                          {appointment.provider_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="truncate">{appointment.provider_name}</span>
                            </div>
                          )}
                          {appointment.provider_location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="truncate">{appointment.provider_location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center gap-2 sm:ml-4">
                      <button
                        onClick={() => handleEdit(appointment)}
                        className="flex-1 sm:flex-none p-2 hover:bg-gray-700/50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(appointment.id)}
                        className="flex-1 sm:flex-none p-2 hover:bg-red-600/20 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                  {appointment.status === 'scheduled' && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700/50">
                      <button
                        onClick={() => updateStatus(appointment.id, 'completed')}
                        className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded text-xs transition-all"
                      >
                        Mark Complete
                      </button>
                      <button
                        onClick={() => updateStatus(appointment.id, 'cancelled')}
                        className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pastAppointments.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Past Appointments</h3>
            <div className="space-y-3">
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-gray-900/30 rounded-xl p-5 border border-gray-700/30 opacity-75"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-300 font-medium">{appointment.title}</h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(appointment.scheduled_at).toLocaleString()}
                          </div>
                          {appointment.provider_name && (
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {appointment.provider_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(appointment.id)}
                      className="p-2 hover:bg-red-600/20 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {appointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No appointments scheduled</p>
            <p className="text-gray-500 text-sm">Create your first appointment to get started</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Edit Appointment' : 'New Appointment'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Physical Exam"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <select
                  value={formData.appointment_type}
                  onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Provider Name</label>
                  <input
                    type="text"
                    value={formData.provider_name}
                    onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                    placeholder="Dr. Smith"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.provider_location}
                    onChange={(e) => setFormData({ ...formData, provider_location: e.target.value })}
                    placeholder="123 Medical Plaza"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                    min="15"
                    step="15"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any additional details..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Personal notes or reminders..."
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg font-medium"
                >
                  {editingId ? 'Update' : 'Create'} Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
