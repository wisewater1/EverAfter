import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Pill, Plus, Check, X, Clock, AlertTriangle, Calendar, Bell } from 'lucide-react';

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
    frequency: 'daily',
    prescribing_doctor: '',
    start_date: new Date().toISOString().split('T')[0],
    refills_remaining: 0,
    notes: ''
  });

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

    try {
      const { error } = await supabase
        .from('prescriptions')
        .insert([{
          user_id: user?.id,
          ...newMedication,
          is_active: true
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setNewMedication({
        medication_name: '',
        dosage: '',
        frequency: 'daily',
        prescribing_doctor: '',
        start_date: new Date().toISOString().split('T')[0],
        refills_remaining: 0,
        notes: ''
      });
      fetchMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      alert('Failed to add medication');
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

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="text-white">Loading medications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Medication Tracker</h2>
            <p className="text-purple-300 text-sm">Track your daily medications and adherence</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Medication
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <Pill className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-2xl font-bold text-white">{prescriptions.length}</p>
            <p className="text-purple-300 text-sm">Active Medications</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <Check className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{getAdherenceRate()}%</p>
            <p className="text-purple-300 text-sm">Adherence Rate Today</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <AlertTriangle className="w-6 h-6 text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-white">
              {prescriptions.filter(p => p.refills_remaining <= 1).length}
            </p>
            <p className="text-purple-300 text-sm">Low Refills</p>
          </div>
        </div>

        <div className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
              <Pill className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No active medications. Add your first medication to start tracking.</p>
            </div>
          ) : (
            prescriptions.map((prescription) => (
              <div
                key={prescription.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-green-500/30 transition-all"
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

                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  {isLoggedToday(prescription.id) ? (
                    <div className="px-4 py-2 bg-green-900/30 text-green-400 rounded-lg flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4" />
                      Logged today
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => logMedication(prescription.id, 'taken')}
                        className="flex-1 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Taken
                      </button>
                      <button
                        onClick={() => logMedication(prescription.id, 'missed')}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all flex items-center gap-2 text-sm"
                      >
                        <X className="w-4 h-4" />
                        Missed
                      </button>
                      <button
                        onClick={() => logMedication(prescription.id, 'skipped')}
                        className="px-4 py-2 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 rounded-lg transition-all flex items-center gap-2 text-sm"
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-light text-white mb-6">Add Medication</h3>

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
                <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                <textarea
                  value={newMedication.notes}
                  onChange={(e) => setNewMedication({ ...newMedication, notes: e.target.value })}
                  placeholder="Any special instructions..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addMedication}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                Add Medication
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
