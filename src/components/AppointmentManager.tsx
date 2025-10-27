import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar, Plus, Clock, MapPin, User, CheckCircle, XCircle, Edit,
  Trash2, AlertCircle, Upload, FileText, Image as ImageIcon,
  Sparkles, RefreshCw, Bell, Video, Phone, Download, ExternalLink, X
} from 'lucide-react';
import { uploadFile, formatFileSize } from '../lib/file-storage';

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
  attachment_file_ids?: string[];
  reminder_enabled?: boolean;
  is_virtual?: boolean;
  virtual_meeting_link?: string;
  created_at: string;
}

interface AttachedFile {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
}

export default function AppointmentManager() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewingFiles, setViewingFiles] = useState<string | null>(null);
  const [appointmentFiles, setAppointmentFiles] = useState<Record<string, AttachedFile[]>>({});
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    appointment_type: 'general',
    provider_name: '',
    provider_location: '',
    scheduled_at: '',
    duration_minutes: 30,
    notes: '',
    reminder_enabled: true,
    is_virtual: false,
    virtual_meeting_link: ''
  });

  const appointmentTypes = [
    { value: 'general', label: 'General Checkup', icon: '🩺' },
    { value: 'specialist', label: 'Specialist', icon: '👨‍⚕️' },
    { value: 'dental', label: 'Dental', icon: '🦷' },
    { value: 'vision', label: 'Vision/Eye', icon: '👁️' },
    { value: 'mental_health', label: 'Mental Health', icon: '🧠' },
    { value: 'lab_work', label: 'Lab Work', icon: '🔬' },
    { value: 'physical_therapy', label: 'Physical Therapy', icon: '💪' },
    { value: 'telemedicine', label: 'Telemedicine', icon: '💻' },
    { value: 'vaccination', label: 'Vaccination', icon: '💉' },
    { value: 'surgery', label: 'Surgery', icon: '🏥' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart as any);
      container.addEventListener('touchmove', handleTouchMove as any);
      container.addEventListener('touchend', handleTouchEnd as any);
    }
    return () => {
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart as any);
        container.removeEventListener('touchmove', handleTouchMove as any);
        container.removeEventListener('touchend', handleTouchEnd as any);
      }
    };
  }, [pullDistance]);

  const handleTouchStart = (e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartY.current);
      setPullDistance(Math.min(distance, 100));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60) {
      setIsRefreshing(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      await fetchAppointments();
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);

      // Fetch files for appointments with attachments
      const appointmentsWithFiles = (data || []).filter(a => a.attachment_file_ids?.length > 0);
      for (const appointment of appointmentsWithFiles) {
        await fetchAppointmentFiles(appointment.id, appointment.attachment_file_ids);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointmentFiles = async (appointmentId: string, fileIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('user_files')
        .select('id, file_name, file_size, file_type, storage_path')
        .in('id', fileIds);

      if (error) throw error;
      setAppointmentFiles(prev => ({ ...prev, [appointmentId]: data || [] }));
    } catch (error) {
      console.error('Error fetching appointment files:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.scheduled_at) {
      alert('Please fill in required fields');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFileIds: string[] = [];

      // Upload files if any
      if (attachedFiles.length > 0) {
        for (let i = 0; i < attachedFiles.length; i++) {
          const file = attachedFiles[i];
          try {
            const { file: uploadedFile } = await uploadFile(file, {
              category: 'medical',
              description: `Appointment: ${formData.title}`,
              metadata: {
                appointment_title: formData.title,
                appointment_type: formData.appointment_type,
                provider: formData.provider_name
              }
            });
            uploadedFileIds.push(uploadedFile.id);
            setUploadProgress(((i + 1) / attachedFiles.length) * 100);
          } catch (uploadError) {
            console.error('File upload error:', uploadError);
            throw new Error(`Failed to upload file "${file.name}". Please try again.`);
          }
        }
      }

      if (editingId) {
        const { error } = await supabase
          .from('appointments')
          .update({
            ...formData,
            attachment_file_ids: uploadedFileIds.length > 0 ? uploadedFileIds : null,
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
            status: 'scheduled',
            attachment_file_ids: uploadedFileIds.length > 0 ? uploadedFileIds : null
          }]);

        if (error) throw error;
      }

      setShowCreateModal(false);
      setEditingId(null);
      resetForm();
      fetchAppointments();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save appointment');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      appointment_type: 'general',
      provider_name: '',
      provider_location: '',
      scheduled_at: '',
      duration_minutes: 30,
      notes: '',
      reminder_enabled: true,
      is_virtual: false,
      virtual_meeting_link: ''
    });
    setAttachedFiles([]);
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
      notes: appointment.notes || '',
      reminder_enabled: appointment.reminder_enabled ?? true,
      is_virtual: appointment.is_virtual ?? false,
      virtual_meeting_link: appointment.virtual_meeting_link || ''
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

      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      scheduled: {
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        icon: Clock,
        gradient: 'from-blue-500/20 to-cyan-500/20'
      },
      completed: {
        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: CheckCircle,
        gradient: 'from-emerald-500/20 to-teal-500/20'
      },
      cancelled: {
        color: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: XCircle,
        gradient: 'from-red-500/20 to-pink-500/20'
      },
      rescheduled: {
        color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        icon: AlertCircle,
        gradient: 'from-yellow-500/20 to-orange-500/20'
      }
    };
    return configs[status as keyof typeof configs] || configs.scheduled;
  };

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    const StatusIcon = config.icon;
    return (
      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${config.color}`}>
        <StatusIcon className="w-3.5 h-3.5" />
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

  const getAppointmentTypeIcon = (type: string) => {
    const foundType = appointmentTypes.find(t => t.value === type);
    return foundType?.icon || '📋';
  };

  if (loading) {
    return (
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-800/50">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
          <span className="text-slate-400">Loading appointments...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-4 sm:space-y-6 relative overflow-y-auto" style={{ paddingTop: pullDistance }}>
      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
          style={{ height: pullDistance }}
        >
          <div className={`transform transition-transform ${pullDistance > 60 ? 'rotate-180' : ''}`}>
            <RefreshCw className={`w-6 h-6 text-orange-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-800/50 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Appointments</h2>
            <p className="text-sm sm:text-base text-slate-400">Manage your medical appointments and reminders</p>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              resetForm();
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2.5 text-base font-medium active:scale-[0.97] touch-manipulation focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <Plus className="w-5 h-5" />
            New Appointment
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-blue-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{upcomingAppointments.length}</div>
                <div className="text-xs text-slate-400">Upcoming</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {appointments.filter(a => a.status === 'completed').length}
                </div>
                <div className="text-xs text-slate-400">Completed</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-purple-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {appointments.filter(a => a.is_virtual).length}
                </div>
                <div className="text-xs text-slate-400">Virtual</div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-orange-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200 min-[380px]:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{appointments.length}</div>
                <div className="text-xs text-slate-400">Total</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-400" />
              Upcoming Appointments
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {upcomingAppointments.map((appointment) => {
                const config = getStatusConfig(appointment.status);
                return (
                  <div
                    key={appointment.id}
                    className="group bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-orange-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200"
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0 text-2xl`}>
                            {getAppointmentTypeIcon(appointment.appointment_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <h4 className="text-white font-semibold text-base sm:text-lg">{appointment.title}</h4>
                              {getStatusBadge(appointment.status)}
                              {appointment.is_virtual && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1 w-fit">
                                  <Video className="w-3 h-3" />
                                  Virtual
                                </span>
                              )}
                              {appointment.reminder_enabled && (
                                <Bell className="w-4 h-4 text-yellow-400" title="Reminder enabled" />
                              )}
                            </div>
                            {appointment.description && (
                              <p className="text-slate-400 text-sm mb-3 line-clamp-2">{appointment.description}</p>
                            )}
                            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-slate-500" />
                                <span>{new Date(appointment.scheduled_at).toLocaleString()}</span>
                              </div>
                              {appointment.duration_minutes && (
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4 text-slate-500" />
                                  <span>{appointment.duration_minutes} min</span>
                                </div>
                              )}
                              {appointment.provider_name && (
                                <div className="flex items-center gap-1.5">
                                  <User className="w-4 h-4 text-slate-500" />
                                  <span className="truncate">{appointment.provider_name}</span>
                                </div>
                              )}
                              {appointment.provider_location && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-4 h-4 text-slate-500" />
                                  <span className="truncate">{appointment.provider_location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col gap-2">
                          <button
                            onClick={() => handleEdit(appointment)}
                            className="p-2 min-h-[44px] min-w-[44px] hover:bg-slate-700/50 rounded-lg transition-all touch-manipulation active:scale-95"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-slate-400 hover:text-white" />
                          </button>
                          <button
                            onClick={() => handleDelete(appointment.id)}
                            className="p-2 min-h-[44px] min-w-[44px] hover:bg-red-600/20 rounded-lg transition-all touch-manipulation active:scale-95"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-700/50">
                        {appointment.is_virtual && appointment.virtual_meeting_link && (
                          <a
                            href={appointment.virtual_meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-4 py-2.5 min-h-[44px] bg-purple-600/20 hover:bg-purple-600/30 active:bg-purple-600/40 text-purple-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium touch-manipulation active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Join Meeting
                          </a>
                        )}
                        {appointment.status === 'scheduled' && (
                          <>
                            <button
                              onClick={() => updateStatus(appointment.id, 'completed')}
                              className="flex-1 px-4 py-2.5 min-h-[44px] bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium touch-manipulation active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(appointment.id, 'cancelled')}
                              className="flex-1 px-4 py-2.5 min-h-[44px] bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium touch-manipulation active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        )}
                        {appointment.attachment_file_ids && appointment.attachment_file_ids.length > 0 && (
                          <button
                            onClick={() => setViewingFiles(viewingFiles === appointment.id ? null : appointment.id)}
                            className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] bg-slate-700/50 hover:bg-slate-700/70 text-slate-300 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium touch-manipulation active:scale-[0.98]"
                          >
                            <FileText className="w-4 h-4" />
                            {appointment.attachment_file_ids.length} {appointment.attachment_file_ids.length === 1 ? 'File' : 'Files'}
                          </button>
                        )}
                      </div>

                      {/* File Attachments Preview */}
                      {viewingFiles === appointment.id && appointmentFiles[appointment.id] && (
                        <div className="pt-3 border-t border-slate-700/50">
                          <h5 className="text-sm font-medium text-slate-300 mb-2">Attachments</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {appointmentFiles[appointment.id].map((file) => (
                              <div key={file.id} className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                <div className="text-xl">
                                  {file.file_type.startsWith('image/') ? '🖼️' : '📎'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-white truncate">{file.file_name}</div>
                                  <div className="text-xs text-slate-500">{formatFileSize(file.file_size)}</div>
                                </div>
                                <a
                                  href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${file.storage_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-slate-700/50 rounded transition-colors"
                                  title="Download"
                                >
                                  <Download className="w-4 h-4 text-slate-400" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">Past Appointments</h3>
            <div className="space-y-3">
              {pastAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-slate-900/30 backdrop-blur-xl rounded-xl p-4 sm:p-5 border border-slate-800/30 opacity-75 hover:opacity-100 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 bg-slate-700/50 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">
                        {getAppointmentTypeIcon(appointment.appointment_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <h4 className="text-slate-300 font-medium text-sm sm:text-base">{appointment.title}</h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
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
                      className="p-2 min-h-[44px] min-w-[44px] hover:bg-red-600/20 rounded-lg transition-all touch-manipulation"
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

        {/* Empty State */}
        {appointments.length === 0 && (
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border-2 border-dashed border-slate-700/50 p-8 sm:p-12 md:p-16 text-center min-h-[400px] flex flex-col items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
              <Calendar className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">No appointments scheduled</h3>
            <p className="text-sm sm:text-base text-slate-400 mb-8 max-w-md leading-relaxed">
              Create your first appointment to get started with managing your healthcare schedule.
            </p>
            <button
              onClick={() => {
                setEditingId(null);
                resetForm();
                setShowCreateModal(true);
              }}
              className="px-8 py-4 min-h-[52px] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-3 text-base font-semibold active:scale-[0.97] touch-manipulation focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <Plus className="w-5 h-5" />
              Create Your First Appointment
            </button>
            <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
              <Sparkles className="w-4 h-4" />
              <span>Quick and easy setup</span>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 max-w-3xl w-full my-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">
                {editingId ? 'Edit Appointment' : 'New Appointment'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800/50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Appointment Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Annual Physical Exam"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Appointment Type</label>
                <select
                  value={formData.appointment_type}
                  onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                >
                  {appointmentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Provider/Doctor Name</label>
                  <input
                    type="text"
                    value={formData.provider_name}
                    onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                    placeholder="Dr. Smith"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Location/Address</label>
                  <input
                    type="text"
                    value={formData.provider_location}
                    onChange={(e) => setFormData({ ...formData, provider_location: e.target.value })}
                    placeholder="123 Medical Plaza"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Date & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                    min="15"
                    step="15"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Virtual Meeting */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.is_virtual}
                    onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                    Virtual Appointment (Telemedicine)
                  </span>
                </label>

                {formData.is_virtual && (
                  <input
                    type="url"
                    value={formData.virtual_meeting_link}
                    onChange={(e) => setFormData({ ...formData, virtual_meeting_link: e.target.value })}
                    placeholder="https://meet.example.com/appointment-123"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                )}
              </div>

              {/* Reminder */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.reminder_enabled}
                  onChange={(e) => setFormData({ ...formData, reminder_enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  Enable reminder notifications
                </span>
              </label>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Any additional details about this appointment..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Personal Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Private notes or reminders for yourself..."
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none transition-all"
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Attachments (referrals, insurance cards, etc.)
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl transition-all cursor-pointer group">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-orange-400 transition-colors" />
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      Click to upload files
                    </span>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                    />
                  </label>

                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg group">
                          <div className="text-2xl">
                            {file.type.startsWith('image/') ? '🖼️' : '📎'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">{file.name}</div>
                            <div className="text-xs text-slate-400">{formatFileSize(file.size)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Progress */}
              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Uploading files...</span>
                    <span>{uploadProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingId(null);
                    resetForm();
                  }}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 min-h-[48px] bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !formData.title || !formData.scheduled_at}
                  className="flex-1 px-6 py-3 min-h-[48px] bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {editingId ? 'Update' : 'Create'} Appointment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
