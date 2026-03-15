import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  FileWarning,
  Pause,
  Pill,
  Play,
  Plus,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import ConfidenceBadge from './ConfidenceBadge';
import SafetyDisclaimer from './SafetyDisclaimer';
import { API_BASE_URL } from '../../lib/env';
import { apiClient } from '../../lib/api-client';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  checkDrugInteractions,
  getDrugRecalls,
  getTopAdverseReactions,
  searchDrugs,
  type DrugInfo,
  type DrugInteraction,
  type DrugRecall,
} from '../../lib/connectors/openfda-service';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${API_BASE_URL}`;
const METRIC_OPTIONS = ['sleep_quality', 'hrv', 'mood', 'energy', 'resting_hr', 'glucose_variability', 'recovery_score'];

const HEALTH_CONDITION_LABELS: Record<string, string> = {
  diabetes_type1: 'Type 1 Diabetes',
  diabetes_type2: 'Type 2 Diabetes',
  heart_disease: 'Heart Disease',
  hypertension: 'High Blood Pressure',
  asthma: 'Asthma',
  arthritis: 'Arthritis',
  anxiety: 'Anxiety',
  depression: 'Depression',
  sleep_apnea: 'Sleep Apnea',
  thyroid: 'Thyroid Condition',
};

const HEALTH_CONDITION_KEYWORDS: Record<string, string[]> = {
  diabetes_type1: ['diabetes', 'blood sugar', 'glucose', 'hypoglycemia', 'hyperglycemia'],
  diabetes_type2: ['diabetes', 'blood sugar', 'glucose', 'hypoglycemia', 'hyperglycemia'],
  heart_disease: ['heart', 'cardiac', 'arrhythmia', 'qt', 'myocardial', 'pulse'],
  hypertension: ['blood pressure', 'hypertension', 'hypotension', 'pressure'],
  asthma: ['asthma', 'bronch', 'respiratory', 'breathing'],
  arthritis: ['arthritis', 'joint', 'inflammation', 'anti-inflammatory'],
  anxiety: ['anxiety', 'agitation', 'panic', 'restless', 'insomnia'],
  depression: ['depression', 'mood', 'serotonin', 'suicid'],
  sleep_apnea: ['sleep', 'sedation', 'respiratory depression', 'breathing'],
  thyroid: ['thyroid', 'tsh', 'hormone'],
};

interface ExperimentResultConfidence {
  score: number;
  level: string;
}

interface ExperimentResult {
  recommendation?: string;
  adherence_rate?: number;
  confidence?: ExperimentResultConfidence;
}

interface ExperimentRecord {
  id: string;
  name: string;
  intervention_a: string;
  intervention_b: string;
  outcome_metrics: string[];
  duration_days: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  adherence_log?: Array<unknown>;
  results?: ExperimentResult;
}

interface ActivePrescription {
  id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  notes?: string | null;
}

interface HealthProfileContext {
  conditions: string[];
  allergies: string[];
}

interface PersonalizedFlag {
  label: string;
  type: 'condition' | 'allergy';
  severity: 'info' | 'warning' | 'critical';
  rationale: string;
}

interface InteractionReviewResult {
  drugA: string;
  drugB: string;
  drugAInfo: DrugInfo | null;
  drugBInfo: DrugInfo | null;
  interactions: DrugInteraction[];
  drugAReactions: Array<{ reaction: string; count: number }>;
  drugBReactions: Array<{ reaction: string; count: number }>;
  drugARecalls: DrugRecall[];
  drugBRecalls: DrugRecall[];
  profileFlags: PersonalizedFlag[];
  severity: 'low' | 'moderate' | 'high';
  summary: string;
}

function normalizeConditionLabel(value: string) {
  return HEALTH_CONDITION_LABELS[value] || value.replace(/_/g, ' ');
}

function buildProfileFlags(
  context: HealthProfileContext,
  interactionText: string,
  drugAInfo: DrugInfo | null,
  drugBInfo: DrugInfo | null
): PersonalizedFlag[] {
  const flags: PersonalizedFlag[] = [];
  const searchableText = [
    interactionText,
    drugAInfo?.warnings,
    drugAInfo?.adverse_reactions,
    drugAInfo?.purpose,
    drugBInfo?.warnings,
    drugBInfo?.adverse_reactions,
    drugBInfo?.purpose,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const condition of context.conditions) {
    const keywords = HEALTH_CONDITION_KEYWORDS[condition] || [condition.toLowerCase()];
    if (keywords.some(keyword => searchableText.includes(keyword.toLowerCase()))) {
      flags.push({
        label: normalizeConditionLabel(condition),
        type: 'condition',
        severity: condition.includes('heart') || condition.includes('diabetes') ? 'critical' : 'warning',
        rationale: `Label warnings or interaction text mention factors related to ${normalizeConditionLabel(condition)}.`,
      });
    }
  }

  const ingredients = [
    ...(drugAInfo?.active_ingredients || []),
    ...(drugBInfo?.active_ingredients || []),
  ].map(value => value.toLowerCase());

  for (const allergy of context.allergies) {
    const normalizedAllergy = allergy.toLowerCase();
    const allergyMentioned = ingredients.some(
      ingredient => ingredient.includes(normalizedAllergy) || normalizedAllergy.includes(ingredient)
    ) || searchableText.includes(normalizedAllergy);

    if (allergyMentioned) {
      flags.push({
        label: allergy,
        type: 'allergy',
        severity: 'critical',
        rationale: `The medication labels or active ingredients reference "${allergy}", which overlaps with your recorded allergy data.`,
      });
    }
  }

  return flags;
}

function getReviewSeverity(
  interactions: DrugInteraction[],
  recalls: DrugRecall[],
  flags: PersonalizedFlag[]
): 'low' | 'moderate' | 'high' {
  if (
    interactions.some(interaction => interaction.severity === 'severe') ||
    recalls.some(recall => String(recall.classification).toUpperCase() === 'CLASS I') ||
    flags.some(flag => flag.severity === 'critical')
  ) {
    return 'high';
  }

  if (
    interactions.some(interaction => interaction.severity === 'moderate') ||
    recalls.length > 0 ||
    flags.length > 0
  ) {
    return 'moderate';
  }

  return 'low';
}

function buildInteractionSummary(
  drugA: string,
  drugB: string,
  interactions: DrugInteraction[],
  flags: PersonalizedFlag[],
  recalls: DrugRecall[]
) {
  if (interactions.length > 0) {
    const strongest = interactions.some(interaction => interaction.severity === 'severe')
      ? 'severe'
      : interactions.some(interaction => interaction.severity === 'moderate')
        ? 'moderate'
        : 'mild';
    return `OpenFDA label data shows a ${strongest} interaction signal between ${drugA} and ${drugB}. Review the label language before treating this combination as safe.`;
  }

  if (flags.length > 0) {
    return `No direct cross-label interaction mention was found for ${drugA} and ${drugB}, but your recorded health profile raises ${flags.length} watchpoint${flags.length === 1 ? '' : 's'} that should be reviewed.`;
  }

  if (recalls.length > 0) {
    return `${drugA} / ${drugB} did not produce a direct interaction match, but recall activity exists for at least one selected medication.`;
  }

  return `No direct interaction mention was found in the available OpenFDA label data for ${drugA} and ${drugB}. This is screening support, not a medical clearance.`;
}

export default function ExperimentLab({ memberId }: { memberId?: string }) {
  const { user } = useAuth();

  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [prescriptions, setPrescriptions] = useState<ActivePrescription[]>([]);
  const [healthProfile, setHealthProfile] = useState<HealthProfileContext>({ conditions: [], allergies: [] });
  const [medicationLoading, setMedicationLoading] = useState(true);
  const [selectedDrugA, setSelectedDrugA] = useState('');
  const [selectedDrugB, setSelectedDrugB] = useState('');
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState('');
  const [interactionReview, setInteractionReview] = useState<InteractionReviewResult | null>(null);

  const [name, setName] = useState('');
  const [intA, setIntA] = useState('');
  const [intB, setIntB] = useState('');
  const [metrics, setMetrics] = useState<string[]>(['sleep_quality', 'mood']);
  const [days, setDays] = useState(14);
  const [createError, setCreateError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadExperiments();
  }, [memberId]);

  useEffect(() => {
    loadMedicationContext();
  }, [user?.id]);

  async function loadExperiments() {
    setLoading(true);
    try {
      const params = memberId ? `?member_id=${memberId}` : '';
      const headers = await apiClient.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      const res = await fetch(`${API_BASE}/api/v1/causal-twin/experiments${params}`, { headers });
      const data = await res.json();
      setExperiments(data.experiments || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  async function loadMedicationContext() {
    if (!user || !supabase) {
      setPrescriptions([]);
      setMedicationLoading(false);
      return;
    }

    setMedicationLoading(true);
    try {
      const [prescriptionRes, profileRes] = await Promise.all([
        supabase
          .from('prescriptions')
          .select('id, medication_name, dosage, frequency, notes')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase
          .from('health_demographics')
          .select('health_conditions, allergies')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (prescriptionRes.error) {
        throw prescriptionRes.error;
      }

      setPrescriptions((prescriptionRes.data || []) as ActivePrescription[]);
      setHealthProfile({
        conditions: Array.isArray(profileRes.data?.health_conditions) ? profileRes.data.health_conditions : [],
        allergies: Array.isArray(profileRes.data?.allergies) ? profileRes.data.allergies : [],
      });
    } catch (error) {
      console.error('Failed to load medication context', error);
      setPrescriptions([]);
      setHealthProfile({ conditions: [], allergies: [] });
    } finally {
      setMedicationLoading(false);
    }
  }

  async function analyzeMedicationCombination() {
    const drugA = selectedDrugA.trim();
    const drugB = selectedDrugB.trim();
    setInteractionError('');
    setInteractionReview(null);

    if (!drugA || !drugB) {
      setInteractionError('Select or enter two medications before running an interaction review.');
      return;
    }

    if (drugA.toLowerCase() === drugB.toLowerCase()) {
      setInteractionError('Choose two different medications for the interaction review.');
      return;
    }

    setInteractionLoading(true);
    try {
      const [drugAInfoResults, drugBInfoResults, interactions, drugAReactions, drugBReactions, drugARecalls, drugBRecalls] = await Promise.all([
        searchDrugs(drugA, 1),
        searchDrugs(drugB, 1),
        checkDrugInteractions(drugA, drugB),
        getTopAdverseReactions(drugA, 5),
        getTopAdverseReactions(drugB, 5),
        getDrugRecalls(drugA, 3),
        getDrugRecalls(drugB, 3),
      ]);

      const drugAInfo = drugAInfoResults[0] || null;
      const drugBInfo = drugBInfoResults[0] || null;
      const interactionText = interactions.map(interaction => interaction.description).join(' ');
      const profileFlags = buildProfileFlags(healthProfile, interactionText, drugAInfo, drugBInfo);
      const combinedRecalls = [...drugARecalls, ...drugBRecalls];

      setInteractionReview({
        drugA,
        drugB,
        drugAInfo,
        drugBInfo,
        interactions,
        drugAReactions,
        drugBReactions,
        drugARecalls,
        drugBRecalls,
        profileFlags,
        severity: getReviewSeverity(interactions, combinedRecalls, profileFlags),
        summary: buildInteractionSummary(drugA, drugB, interactions, profileFlags, combinedRecalls),
      });
    } catch (error) {
      console.error('Medication interaction review failed', error);
      setInteractionError('Failed to review this medication combination right now.');
    } finally {
      setInteractionLoading(false);
    }
  }

  async function createExperiment() {
    setCreateError('');

    if (!name.trim() || !intA.trim() || !intB.trim()) {
      setCreateError('Enter an experiment name and both intervention arms before creating it.');
      return;
    }

    if (metrics.length === 0) {
      setCreateError('Select at least one outcome metric.');
      return;
    }

    setSubmitting(true);
    try {
      const params = memberId ? `?member_id=${memberId}` : '';
      const headers = await apiClient.getAuthHeaders({
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      });
      const res = await fetch(`${API_BASE}/api/v1/causal-twin/experiments${params}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          intervention_a: intA.trim(),
          intervention_b: intB.trim(),
          outcome_metrics: metrics,
          duration_days: days,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error || data.detail) {
        setCreateError(data.error || data.detail || `Failed to create experiment (${res.status})`);
        return;
      }

      setShowCreate(false);
      setName('');
      setIntA('');
      setIntB('');
      await loadExperiments();
    } catch (error) {
      console.error(error);
      setCreateError('Failed to create experiment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function updateExperiment(id: string, action: string) {
    try {
      const headers = await apiClient.getAuthHeaders({
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      });
      await fetch(`${API_BASE}/api/v1/causal-twin/experiments/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ action }),
      });
      await loadExperiments();
    } catch (error) {
      console.error(error);
    }
  }

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <Clock className="w-4 h-4 text-slate-400" />,
    active: <Play className="w-4 h-4 text-emerald-400" />,
    paused: <Pause className="w-4 h-4 text-amber-400" />,
    completed: <CheckCircle className="w-4 h-4 text-teal-400" />,
    cancelled: <XCircle className="w-4 h-4 text-red-400" />,
  };

  const statusColors: Record<string, string> = {
    draft: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    paused: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    completed: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
  };

  return (
    <div className="space-y-6">
      <SafetyDisclaimer compact />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Beaker className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-semibold text-white">Experiment Lab</h3>
          <span className="text-xs text-slate-500">{experiments.length} experiments</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-sm font-medium text-teal-300 transition-all hover:bg-teal-500/20"
        >
          <Plus className="w-4 h-4" />
          New Experiment
        </button>
      </div>

      {showCreate && (
        <div className="rounded-3xl border border-teal-500/10 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
          <h4 className="mb-4 text-sm font-semibold text-teal-300">Design Your Experiment</h4>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Experiment Name</label>
              <input
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="e.g., Late Caffeine vs No Caffeine"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/30 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Intervention A</label>
                <input
                  value={intA}
                  onChange={event => setIntA(event.target.value)}
                  placeholder="e.g., No caffeine after 2pm"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/30 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Intervention B</label>
                <input
                  value={intB}
                  onChange={event => setIntB(event.target.value)}
                  placeholder="e.g., Normal caffeine intake"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-teal-500/30 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs text-slate-500">Outcome Metrics</label>
              <div className="flex flex-wrap gap-2">
                {METRIC_OPTIONS.map(metric => (
                  <button
                    key={metric}
                    onClick={() => setMetrics(prev => prev.includes(metric) ? prev.filter(item => item !== metric) : [...prev, metric])}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      metrics.includes(metric)
                        ? 'border-teal-500/30 bg-teal-500/20 text-teal-300'
                        : 'border-white/5 bg-white/5 text-slate-500'
                    }`}
                  >
                    {metric.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">Duration: {days} days</label>
              <input
                type="range"
                min={3}
                max={90}
                value={days}
                onChange={event => setDays(parseInt(event.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400"
              />
            </div>
            {createError && <p className="text-xs text-red-400">{createError}</p>}
            <button
              onClick={createExperiment}
              disabled={submitting}
              className="w-full rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 py-3 font-semibold text-teal-300 transition-all hover:from-teal-500/30 hover:to-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-amber-500/10 bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-amber-300" />
              <h4 className="text-sm font-semibold text-amber-300">Medication Combination Review</h4>
            </div>
            <p className="max-w-3xl text-xs text-slate-400">
              This adapts drug-interaction discovery ideas into the current app by screening two medications against OpenFDA label data, adverse events, recall notices, and your stored health profile.
            </p>
            <p className="text-[11px] text-amber-200/80">
              Screening support only. Not medical advice, not dosing guidance, and not a substitute for a pharmacist or physician.
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Profile context</div>
            <div className="mt-1 text-xs text-white">
              {healthProfile.conditions.length} condition{healthProfile.conditions.length === 1 ? '' : 's'} • {healthProfile.allergies.length} allerg{healthProfile.allergies.length === 1 ? 'y' : 'ies'}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr,1.1fr,auto]">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Medication A</label>
            <input
              value={selectedDrugA}
              onChange={event => setSelectedDrugA(event.target.value)}
              placeholder="Select a current medication or type any drug"
              list="experiment-lab-medications"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">Medication B</label>
            <input
              value={selectedDrugB}
              onChange={event => setSelectedDrugB(event.target.value)}
              placeholder="Pick a second medication to compare"
              list="experiment-lab-medications"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-amber-500/30 focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={analyzeMedicationCombination}
              disabled={interactionLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition-all hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {interactionLoading ? 'Reviewing...' : 'Review Combination'}
            </button>
          </div>
        </div>

        <datalist id="experiment-lab-medications">
          {prescriptions.map(prescription => (
            <option key={prescription.id} value={prescription.medication_name}>
              {prescription.medication_name}
            </option>
          ))}
        </datalist>

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">Current prescriptions</div>
            {medicationLoading ? (
              <p className="text-xs text-slate-500">Loading current medications...</p>
            ) : prescriptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {prescriptions.map(prescription => (
                  <button
                    key={prescription.id}
                    onClick={() => {
                      if (!selectedDrugA) setSelectedDrugA(prescription.medication_name);
                      else if (!selectedDrugB) setSelectedDrugB(prescription.medication_name);
                      else setSelectedDrugB(prescription.medication_name);
                    }}
                    className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[11px] text-teal-200 transition-colors hover:bg-teal-500/20"
                  >
                    {prescription.medication_name}
                    {prescription.dosage ? ` • ${prescription.dosage}` : ''}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No active prescriptions were found. You can still type any two drug names manually.</p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Health conditions used in screening</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {healthProfile.conditions.length > 0 ? (
                  healthProfile.conditions.map(condition => (
                    <span key={condition} className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200">
                      {normalizeConditionLabel(condition)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No recorded health conditions found in your profile.</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Allergies used in screening</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {healthProfile.allergies.length > 0 ? (
                  healthProfile.allergies.map(allergy => (
                    <span key={allergy} className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No recorded allergies found in your profile.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {interactionError && (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {interactionError}
          </div>
        )}

        {interactionReview && (
          <div className="mt-5 space-y-4">
            <div
              className={`rounded-2xl border px-4 py-4 ${
                interactionReview.severity === 'high'
                  ? 'border-red-500/20 bg-red-500/10'
                  : interactionReview.severity === 'moderate'
                    ? 'border-amber-500/20 bg-amber-500/10'
                    : 'border-emerald-500/20 bg-emerald-500/10'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {interactionReview.severity === 'high' ? (
                      <ShieldAlert className="w-4 h-4 text-red-300" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-300" />
                    )}
                    <span className="text-sm font-semibold text-white">
                      {interactionReview.drugA} + {interactionReview.drugB}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{interactionReview.summary}</p>
                </div>
                <div
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    interactionReview.severity === 'high'
                      ? 'border-red-500/20 bg-red-500/10 text-red-200'
                      : interactionReview.severity === 'moderate'
                        ? 'border-amber-500/20 bg-amber-500/10 text-amber-200'
                        : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                  }`}
                >
                  {interactionReview.severity} signal
                </div>
              </div>
            </div>

            {interactionReview.profileFlags.length > 0 && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                  Personalized watchpoints from your health profile
                </div>
                <div className="space-y-2">
                  {interactionReview.profileFlags.map(flag => (
                    <div
                      key={`${flag.type}-${flag.label}-${flag.rationale}`}
                      className="rounded-xl border border-white/5 bg-black/10 px-3 py-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            flag.severity === 'critical'
                              ? 'bg-red-500/10 text-red-200'
                              : flag.severity === 'warning'
                                ? 'bg-amber-500/10 text-amber-200'
                                : 'bg-teal-500/10 text-teal-200'
                          }`}
                        >
                          {flag.type}
                        </span>
                        <span className="text-sm font-medium text-white">{flag.label}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{flag.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 text-sm font-medium text-white">{interactionReview.drugA}</div>
                <p className="text-xs text-slate-400">
                  {interactionReview.drugAInfo?.purpose || 'No label summary found for this medication in OpenFDA.'}
                </p>
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Top adverse reactions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {interactionReview.drugAReactions.length > 0 ? (
                      interactionReview.drugAReactions.map(reaction => (
                        <span
                          key={`${interactionReview.drugA}-${reaction.reaction}`}
                          className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300"
                        >
                          {reaction.reaction} • {reaction.count}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No aggregated adverse-event data found.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 text-sm font-medium text-white">{interactionReview.drugB}</div>
                <p className="text-xs text-slate-400">
                  {interactionReview.drugBInfo?.purpose || 'No label summary found for this medication in OpenFDA.'}
                </p>
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Top adverse reactions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {interactionReview.drugBReactions.length > 0 ? (
                      interactionReview.drugBReactions.map(reaction => (
                        <span
                          key={`${interactionReview.drugB}-${reaction.reaction}`}
                          className="rounded-full border border-white/5 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-300"
                        >
                          {reaction.reaction} • {reaction.count}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No aggregated adverse-event data found.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <Search className="w-4 h-4 text-teal-300" />
                  Interaction evidence from label data
                </div>
                {interactionReview.interactions.length > 0 ? (
                  <div className="space-y-3">
                    {interactionReview.interactions.map(interaction => (
                      <div
                        key={`${interaction.drug1}-${interaction.drug2}-${interaction.description.slice(0, 48)}`}
                        className="rounded-xl border border-white/5 bg-black/10 px-3 py-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-200">
                          {interaction.severity} interaction mention
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{interaction.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No direct cross-reference interaction mention was found between the selected drugs in the available OpenFDA label text.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                  <FileWarning className="w-4 h-4 text-rose-300" />
                  Recall activity
                </div>
                {[...interactionReview.drugARecalls, ...interactionReview.drugBRecalls].length > 0 ? (
                  <div className="space-y-3">
                    {[...interactionReview.drugARecalls, ...interactionReview.drugBRecalls].map(recall => (
                      <div
                        key={`${recall.recall_number}-${recall.product_description.slice(0, 24)}`}
                        className="rounded-xl border border-white/5 bg-black/10 px-3 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{recall.recall_number || 'Recall notice'}</span>
                          <span className="text-[10px] uppercase tracking-[0.16em] text-rose-300">
                            {recall.classification || recall.status || 'listed'}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">{recall.reason_for_recall || recall.product_description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No recall notices were returned for the selected drugs.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading experiments...</div>
      ) : experiments.length === 0 ? (
        <div className="py-12 text-center">
          <Beaker className="mx-auto mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm text-slate-500">No experiments yet. Create your first A/B test above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {experiments.map(experiment => {
            const isExpanded = expandedId === experiment.id;
            const adhered = experiment.adherence_log?.length || 0;
            const progress = Math.round((adhered / Math.max(experiment.duration_days, 1)) * 100);

            return (
              <div
                key={experiment.id}
                className="overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#1a1a24] to-[#13131a] shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : experiment.id)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <div className="flex items-center gap-3">
                    {statusIcons[experiment.status]}
                    <div>
                      <span className="text-sm font-medium text-white">{experiment.name}</span>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusColors[experiment.status]}`}>
                          {experiment.status}
                        </span>
                        <span className="text-xs text-slate-600">Day {adhered}/{experiment.duration_days}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-2 w-20 rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-3 border-t border-white/5 px-5 pb-5 pt-3">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <span className="text-slate-500">Arm A</span>
                        <p className="mt-1 text-white">{experiment.intervention_a}</p>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <span className="text-slate-500">Arm B</span>
                        <p className="mt-1 text-white">{experiment.intervention_b}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {experiment.outcome_metrics?.map(metric => (
                        <span
                          key={metric}
                          className="rounded-lg border border-teal-500/20 bg-teal-500/10 px-2 py-1 text-[10px] text-teal-300"
                        >
                          {metric.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>

                    {experiment.results && (
                      <div className="rounded-xl border border-teal-500/10 bg-teal-500/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-teal-300">Results</span>
                          {experiment.results.confidence && (
                            <ConfidenceBadge
                              score={experiment.results.confidence.score}
                              level={experiment.results.confidence.level}
                            />
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{experiment.results.recommendation}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Adherence: {Math.round((experiment.results.adherence_rate || 0) * 100)}%
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {experiment.status === 'draft' && (
                        <button
                          onClick={() => updateExperiment(experiment.id, 'start')}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                          <Play className="h-3 w-3" />
                          Start
                        </button>
                      )}
                      {experiment.status === 'active' && (
                        <>
                          <button
                            onClick={() => updateExperiment(experiment.id, 'pause')}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 transition-colors hover:bg-amber-500/20"
                          >
                            <Pause className="h-3 w-3" />
                            Pause
                          </button>
                          <button
                            onClick={() => updateExperiment(experiment.id, 'complete')}
                            className="flex items-center gap-1.5 rounded-lg border border-teal-500/20 bg-teal-500/10 px-3 py-1.5 text-xs text-teal-300 transition-colors hover:bg-teal-500/20"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Complete
                          </button>
                        </>
                      )}
                      {experiment.status === 'paused' && (
                        <button
                          onClick={() => updateExperiment(experiment.id, 'resume')}
                          className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 transition-colors hover:bg-emerald-500/20"
                        >
                          <Play className="h-3 w-3" />
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
