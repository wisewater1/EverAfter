import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pill, Plus, Check, X, Clock, AlertTriangle, Upload, FileText, Image as ImageIcon, Trash2, RefreshCw, Sparkles } from 'lucide-react';
import { uploadFile, formatFileSize } from '../lib/file-storage';

interface Prescription {
  id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribing_doctor: string;
  start_date: string;
  end_date: string;
  refills_remaining: number;
  is_active: boolean;
  notes: string;
  prescription_image_url?: string;
  attachment_file_ids?: string[];
}

interface MedicationLog {
  id: string;
  prescription_id: string;
  taken_at: string;
  status: 'taken' | 'missed' | 'skipped';
  notes: string;
}

export default function MedicationTracker() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedication, setNewMedication] = useState({
    medication_name: '',
    dosage: '',
    frequency: 'once_daily',
    prescribing_doctor: '',
    start_date: new Date().toISOString().split('T')[0],
    refills_remaining: 0,
    notes: ''
  });
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMedications();
      fetchLogs();
    }
  }, [user]);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('medication_logs')
        .select('*')
        .gte('taken_at', today.toISOString())
        .order('taken_at', { ascending: false });

      if (error && error.code !== 'PGRST116') throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const addMedication = async () => {
    if (!newMedication.medication_name || !newMedication.dosage) {
      alert('Please fill in medication name and dosage');
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
              description: `Prescription for ${newMedication.medication_name}`,
              metadata: {
                medication_name: newMedication.medication_name,
                dosage: newMedication.dosage
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

      const { error } = await supabase
        .from('prescriptions')
        .insert([{
          user_id: user?.id,
          ...newMedication,
          is_active: true,
          attachment_file_ids: uploadedFileIds.length > 0 ? uploadedFileIds : null
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNewMedication({
        medication_name: '',
        dosage: '',
        frequency: 'once_daily',
        prescribing_doctor: '',
        start_date: new Date().toISOString().split('T')[0],
        refills_remaining: 0,
        notes: ''
      });
      setAttachedFiles([]);
      fetchMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      alert(error instanceof Error ? error.message : 'Failed to add medication');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const logMedication = async (prescriptionId: string, status: 'taken' | 'missed' | 'skipped') => {
    try {
      const { error } = await supabase
        .from('medication_logs')
        .insert([{
          user_id: user?.id,
          prescription_id: prescriptionId,
          taken_at: new Date().toISOString(),
          status,
          notes: ''
        }]);

      if (error) throw error;
      fetchLogs();
    } catch (error) {
      console.error('Error logging medication:', error);
    }
  };

  const getAdherenceRate = () => {
    if (logs.length === 0) return 0;
    const taken = logs.filter(log => log.status === 'taken').length;
    return Math.round((taken / logs.length) * 100);
  };

  const isLoggedToday = (prescriptionId: string) => {
    return logs.some(log => log.prescription_id === prescriptionId);
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
      await Promise.all([fetchMedications(), fetchLogs()]);
      setIsRefreshing(false);
    }
    setPullDistance(0);
  };

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

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading medications...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 relative overflow-y-auto" style={{ paddingTop: pullDistance }}>
      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 z-10"
          style={{ height: pullDistance }}
        >
          <div className={`transform transition-transform ${pullDistance > 60 ? 'rotate-180' : ''}`}>
            <RefreshCw className={`w-6 h-6 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          </div>
        </div>
      )}

      <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-4 sm:p-6 lg:p-8 border border-slate-800/50 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Medication Tracker</h2>
            <p className="text-sm sm:text-base text-slate-400">Track your daily medications and adherence</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 min-h-[48px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 text-base font-medium active:scale-[0.97] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <Plus className="w-5 h-5" />
            Add Medication
          </button>
        </div>

        <div className="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-800/50 hover:border-slate-700/50 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200 cursor-pointer active:scale-[0.98] touch-manipulation group min-h-[140px] flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center flex-shrink-0">
                <Pill className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{prescriptions.length}</div>
                <div className="text-sm sm:text-base text-slate-400">Active Medications</div>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-800/50 hover:border-slate-700/50 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200 cursor-pointer active:scale-[0.98] touch-manipulation group min-h-[140px] flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{getAdherenceRate()}%</div>
                <div className="text-sm sm:text-base text-slate-400">Adherence Rate Today</div>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
            </div>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-800/50 hover:border-slate-700/50 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200 cursor-pointer active:scale-[0.98] touch-manipulation group min-h-[140px] flex flex-col justify-center min-[380px]:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {prescriptions.filter(p => p.refills_remaining <= 1).length}
                </div>
                <div className="text-sm sm:text-base text-slate-400">Low Refills</div>
              </div>
            </div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent" />
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {prescriptions.length === 0 ? (
            <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl border-2 border-dashed border-slate-700/50 p-8 sm:p-12 md:p-16 text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-800/50 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
                <Pill className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-white mb-3">No active medications</h3>
              <p className="text-sm sm:text-base text-slate-400 mb-8 max-w-md leading-relaxed">
                Add your first medication to start tracking adherence, set reminders, and never miss a dose.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-8 py-4 min-h-[52px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-3 text-base font-semibold active:scale-[0.97] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <Plus className="w-5 h-5" />
                Add Your First Medication
              </button>
              <div className="mt-8 flex items-center gap-2 text-xs text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span>Takes less than 30 seconds</span>
              </div>
            </div>
          ) : (
            prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-800/50 hover:border-emerald-500/30 hover:shadow-xl hover:shadow-slate-900/20 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">{prescription.medication_name}</h3>
                    <p className="text-purple-300 text-sm mb-2">{prescription.dosage} • {prescription.frequency}</p>
                    {prescription.prescribing_doctor && (
                      <p className="text-gray-400 text-xs">Dr. {prescription.prescribing_doctor}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {prescription.refills_remaining <= 1 && (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {prescription.refills_remaining} refill{prescription.refills_remaining !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-3 border-t border-slate-700/50">
                  {isLoggedToday(prescription.id) ? (
                    <div className="px-4 py-3 min-h-[48px] bg-emerald-900/30 text-emerald-400 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base font-medium">
                      <Check className="w-4 h-4" />
                      Logged today
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => logMedication(prescription.id, 'taken')}
                        className="flex-1 px-4 py-3 min-h-[48px] bg-emerald-600/20 hover:bg-emerald-600/30 active:bg-emerald-600/40 text-emerald-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base font-medium active:scale-[0.98] touch-manipulation focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <Check className="w-4 h-4" />
                        Taken
                      </button>
                      <button
                        onClick={() => logMedication(prescription.id, 'missed')}
                        className="px-4 py-3 min-h-[48px] bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 text-red-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98] touch-manipulation focus:outline-none focus:ring-2 focus:ring-red-500/50"
                      >
                        <X className="w-4 h-4" />
                        Missed
                      </button>
                      <button
                        onClick={() => logMedication(prescription.id, 'skipped')}
                        className="px-4 py-3 min-h-[48px] bg-slate-600/20 hover:bg-slate-600/30 active:bg-slate-600/40 text-slate-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98] touch-manipulation focus:outline-none focus:ring-2 focus:ring-slate-500/50"
                      >
                        <Clock className="w-4 h-4" />
                        Skip
                      </button>
                    </>
                  )}
                </div>

                {prescription.notes && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-gray-400 text-xs">{prescription.notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 max-w-2xl w-full my-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl sm:text-2xl font-semibold text-white">Add Medication</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAttachedFiles([]);
                }}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800/50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Medication Name *</label>
                <input
                  type="text"
                  value={newMedication.medication_name}
                  onChange={(e) => setNewMedication({ ...newMedication, medication_name: e.target.value })}
                  placeholder="e.g., Lisinopril"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Dosage *</label>
                  <input
                    type="text"
                    value={newMedication.dosage}
                    onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                    placeholder="e.g., 10mg"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Frequency</label>
                  <select
                    value={newMedication.frequency}
                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    <option value="once_daily">Once daily</option>
                    <option value="twice_daily">Twice daily</option>
                    <option value="three_times_daily">Three times daily</option>
                    <option value="as_needed">As needed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Prescribing Doctor</label>
                <input
                  type="text"
                  value={newMedication.prescribing_doctor}
                  onChange={(e) => setNewMedication({ ...newMedication, prescribing_doctor: e.target.value })}
                  placeholder="Dr. Smith"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={newMedication.start_date}
                    onChange={(e) => setNewMedication({ ...newMedication, start_date: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Refills Remaining</label>
                  <input
                    type="number"
                    value={newMedication.refills_remaining}
                    onChange={(e) => setNewMedication({ ...newMedication, refills_remaining: parseInt(e.target.value) })}
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea
                  value={newMedication.notes}
                  onChange={(e) => setNewMedication({ ...newMedication, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Attachments (prescription images, etc.)
                </label>
                <div className="space-y-3">
                  <label className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 border-2 border-dashed border-slate-700 hover:border-slate-600 rounded-xl transition-all cursor-pointer group">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
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

                  {/* Attached Files List */}
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
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAttachedFiles([]);
                }}
                disabled={uploading}
                className="flex-1 px-6 py-3 min-h-[48px] bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-all active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={addMedication}
                disabled={uploading || !newMedication.medication_name || !newMedication.dosage}
                className="flex-1 px-6 py-3 min-h-[48px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Add Medication
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
