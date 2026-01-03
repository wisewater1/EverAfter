import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  User,
  Scale,
  Ruler,
  Heart,
  Target,
  Activity,
  ArrowRight,
  ArrowLeft,
  Loader2,
  X,
  Plus,
} from 'lucide-react';

interface HealthProfileData {
  dateOfBirth?: string;
  gender?: string;
  weightKg?: number;
  heightCm?: number;
  healthConditions: string[];
  allergies: string[];
  healthGoals: string[];
  activityLevel?: string;
}

interface HealthProfileStepProps {
  data: HealthProfileData;
  onUpdate: (data: HealthProfileData) => void;
  onNext: () => void;
  onBack: () => void;
  saving: boolean;
  userId: string;
}

const HEALTH_CONDITIONS = [
  { id: 'diabetes_type1', label: 'Type 1 Diabetes' },
  { id: 'diabetes_type2', label: 'Type 2 Diabetes' },
  { id: 'heart_disease', label: 'Heart Disease' },
  { id: 'hypertension', label: 'High Blood Pressure' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'arthritis', label: 'Arthritis' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'depression', label: 'Depression' },
  { id: 'sleep_apnea', label: 'Sleep Apnea' },
  { id: 'thyroid', label: 'Thyroid Condition' },
];

const HEALTH_GOALS = [
  { id: 'lose_weight', label: 'Lose Weight', icon: Scale },
  { id: 'gain_muscle', label: 'Build Muscle', icon: Activity },
  { id: 'sleep_better', label: 'Sleep Better', icon: Activity },
  { id: 'reduce_stress', label: 'Reduce Stress', icon: Heart },
  { id: 'improve_cardio', label: 'Improve Cardio', icon: Activity },
  { id: 'eat_healthier', label: 'Eat Healthier', icon: Target },
  { id: 'manage_condition', label: 'Manage Condition', icon: Heart },
  { id: 'more_energy', label: 'More Energy', icon: Activity },
];

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { id: 'lightly_active', label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { id: 'moderately_active', label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { id: 'very_active', label: 'Very Active', description: 'Hard exercise 6-7 days/week' },
  { id: 'extremely_active', label: 'Extremely Active', description: 'Very hard exercise, physical job' },
];

export default function HealthProfileStep({
  data,
  onUpdate,
  onNext,
  onBack,
  saving,
  userId,
}: HealthProfileStepProps) {
  const [localData, setLocalData] = useState<HealthProfileData>(data);
  const [newAllergy, setNewAllergy] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = <K extends keyof HealthProfileData>(
    field: K,
    value: HealthProfileData[K]
  ) => {
    const updated = { ...localData, [field]: value };
    setLocalData(updated);
    onUpdate(updated);
  };

  const toggleCondition = (conditionId: string) => {
    const conditions = localData.healthConditions.includes(conditionId)
      ? localData.healthConditions.filter((c) => c !== conditionId)
      : [...localData.healthConditions, conditionId];
    updateField('healthConditions', conditions);
  };

  const toggleGoal = (goalId: string) => {
    const goals = localData.healthGoals.includes(goalId)
      ? localData.healthGoals.filter((g) => g !== goalId)
      : [...localData.healthGoals, goalId];
    updateField('healthGoals', goals);
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !localData.allergies.includes(newAllergy.trim())) {
      updateField('allergies', [...localData.allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (allergy: string) => {
    updateField(
      'allergies',
      localData.allergies.filter((a) => a !== allergy)
    );
  };

  const validateAndSave = async () => {
    const newErrors: Record<string, string> = {};

    // Optional validation - these fields are not required
    if (localData.weightKg && (localData.weightKg < 20 || localData.weightKg > 300)) {
      newErrors.weight = 'Please enter a valid weight';
    }
    if (localData.heightCm && (localData.heightCm < 50 || localData.heightCm > 250)) {
      newErrors.height = 'Please enter a valid height';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setSavingProfile(true);
    try {
      // Save to database
      const { error } = await supabase.from('health_demographics').upsert(
        {
          user_id: userId,
          date_of_birth: localData.dateOfBirth || null,
          gender: localData.gender || null,
          weight_kg: localData.weightKg || null,
          height_cm: localData.heightCm || null,
          health_conditions: localData.healthConditions,
          allergies: localData.allergies,
          health_goals: localData.healthGoals,
          activity_level: localData.activityLevel || null,
        },
        { onConflict: 'user_id' }
      );

      if (error) throw error;

      onNext();
    } catch (error) {
      console.error('Error saving health profile:', error);
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-600 to-pink-600 rounded-xl flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Health Profile</h2>
        <p className="text-gray-400 text-sm">
          Help St. Raphael understand your health needs. All fields are optional.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date of Birth</label>
            <input
              type="date"
              value={localData.dateOfBirth || ''}
              onChange={(e) => updateField('dateOfBirth', e.target.value)}
              className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Gender</label>
            <select
              value={localData.gender || ''}
              onChange={(e) => updateField('gender', e.target.value)}
              className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Physical Measurements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Weight (kg)</label>
            <input
              type="number"
              value={localData.weightKg || ''}
              onChange={(e) => updateField('weightKg', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., 70"
              className={`w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                errors.weight ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.weight && <p className="text-red-400 text-xs mt-1">{errors.weight}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Height (cm)</label>
            <input
              type="number"
              value={localData.heightCm || ''}
              onChange={(e) => updateField('heightCm', parseFloat(e.target.value) || undefined)}
              placeholder="e.g., 175"
              className={`w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                errors.height ? 'ring-2 ring-red-500' : ''
              }`}
            />
            {errors.height && <p className="text-red-400 text-xs mt-1">{errors.height}</p>}
          </div>
        </div>

        {/* Health Conditions */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Health Conditions (select any that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {HEALTH_CONDITIONS.map((condition) => (
              <button
                key={condition.id}
                onClick={() => toggleCondition(condition.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  localData.healthConditions.includes(condition.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {condition.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Allergies</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {localData.allergies.map((allergy) => (
              <span
                key={allergy}
                className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-full text-sm flex items-center gap-1"
              >
                {allergy}
                <button onClick={() => removeAllergy(allergy)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
              placeholder="Add allergy..."
              className="flex-1 bg-gray-700/50 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              onClick={addAllergy}
              className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Health Goals */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">
            Health Goals (what do you want to improve?)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HEALTH_GOALS.map((goal) => (
              <button
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`p-3 rounded-lg text-sm text-center transition-all ${
                  localData.healthGoals.includes(goal.id)
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                {goal.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Level */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Activity Level</label>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => updateField('activityLevel', level.id)}
                className={`w-full p-3 rounded-lg text-left transition-all ${
                  localData.activityLevel === level.id
                    ? 'bg-indigo-600/30 border-2 border-indigo-500 text-white'
                    : 'bg-gray-700/30 border border-gray-600/50 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <span className="font-medium">{level.label}</span>
                <span className="text-sm text-gray-400 ml-2">— {level.description}</span>
              </button>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
            {errors.submit}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onBack}
          disabled={saving || savingProfile}
          className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={validateAndSave}
          disabled={saving || savingProfile}
          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {savingProfile ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
