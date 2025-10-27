import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Activity, Thermometer, Droplet, Wind, Scale, X, Check } from 'lucide-react';

interface VitalSign {
  type: string;
  label: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  min?: number;
  max?: number;
  step?: number;
}

const VITAL_SIGNS: VitalSign[] = [
  {
    type: 'heart_rate',
    label: 'Heart Rate',
    unit: 'bpm',
    icon: Heart,
    placeholder: '70',
    min: 40,
    max: 200
  },
  {
    type: 'blood_pressure_systolic',
    label: 'Blood Pressure (Systolic)',
    unit: 'mmHg',
    icon: Activity,
    placeholder: '120',
    min: 70,
    max: 200
  },
  {
    type: 'blood_pressure_diastolic',
    label: 'Blood Pressure (Diastolic)',
    unit: 'mmHg',
    icon: Activity,
    placeholder: '80',
    min: 40,
    max: 130
  },
  {
    type: 'temperature',
    label: 'Body Temperature',
    unit: '°F',
    icon: Thermometer,
    placeholder: '98.6',
    min: 95,
    max: 105,
    step: 0.1
  },
  {
    type: 'oxygen_saturation',
    label: 'Oxygen Saturation',
    unit: '%',
    icon: Wind,
    placeholder: '98',
    min: 70,
    max: 100
  },
  {
    type: 'blood_glucose',
    label: 'Blood Glucose',
    unit: 'mg/dL',
    icon: Droplet,
    placeholder: '100',
    min: 40,
    max: 400
  },
  {
    type: 'weight',
    label: 'Weight',
    unit: 'lbs',
    icon: Scale,
    placeholder: '150',
    min: 50,
    max: 500,
    step: 0.1
  }
];

interface HealthVitalsLoggerProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function HealthVitalsLogger({ onClose, onSuccess }: HealthVitalsLoggerProps) {
  const { user } = useAuth();
  const [selectedVital, setSelectedVital] = useState<VitalSign | null>(null);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedVital || !value || !user) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      alert('Please enter a valid number');
      return;
    }

    if (selectedVital.min !== undefined && numValue < selectedVital.min) {
      alert(`Value must be at least ${selectedVital.min}`);
      return;
    }

    if (selectedVital.max !== undefined && numValue > selectedVital.max) {
      alert(`Value must not exceed ${selectedVital.max}`);
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('health_metrics')
        .insert({
          user_id: user.id,
          metric_type: selectedVital.type,
          metric_value: numValue,
          metric_unit: selectedVital.unit,
          recorded_at: new Date().toISOString(),
          source: 'manual',
          notes: notes || null
        });

      if (error) throw error;

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving vital:', error);
      alert('Failed to save vital sign. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Log Vital Signs</h2>
            <p className="text-slate-400 text-sm">Manually enter your health measurements</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {!selectedVital ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {VITAL_SIGNS.map((vital) => {
              const Icon = vital.icon;
              return (
                <button
                  key={vital.type}
                  onClick={() => setSelectedVital(vital)}
                  className="group bg-slate-800/50 hover:bg-slate-800 rounded-xl p-5 border border-slate-700/50 hover:border-emerald-500/30 transition-all text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium text-sm">{vital.label}</h3>
                      <p className="text-slate-400 text-xs">{vital.unit}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-700/50">
              {(() => {
                const Icon = selectedVital.icon;
                return (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                );
              })()}
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedVital.label}</h3>
                <p className="text-sm text-slate-400">Unit: {selectedVital.unit}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Measurement Value *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={selectedVital.placeholder}
                  min={selectedVital.min}
                  max={selectedVital.max}
                  step={selectedVital.step || 1}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {selectedVital.unit}
                </span>
              </div>
              {(selectedVital.min !== undefined || selectedVital.max !== undefined) && (
                <p className="text-xs text-slate-500 mt-2">
                  Normal range: {selectedVital.min} - {selectedVital.max} {selectedVital.unit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context or symptoms..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-700/50">
              <button
                onClick={() => {
                  setSelectedVital(null);
                  setValue('');
                  setNotes('');
                }}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!value || saving}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Measurement
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
