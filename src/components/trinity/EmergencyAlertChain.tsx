/**
 * EmergencyAlertChain — Option 4
 * Raphael triggers -> Gabriel checks funds -> Joseph finds next-of-kin.
 */
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Database,
  GitBranch,
  Heart,
  Loader2,
  Shield,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { API_BASE_URL } from '../../lib/env';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/api-client';
import { financeApi } from '../../lib/gabriel/finance';
import { fetchHealthMetrics, type HealthDataPoint } from '../../lib/raphael/healthDataService';
import {
  getFamilyMembers,
  getRelationships,
  type FamilyMember,
  type Relationship,
} from '../../lib/joseph/genealogy';

type AlertLevel = 'critical' | 'high' | 'moderate' | 'low';

interface EmergencyContactRow {
  contact_name: string;
  relationship: string | null;
  phone_number: string | null;
  email: string | null;
  is_primary: boolean | null;
}

interface SourceSummary {
  recentMetrics: number;
  budgetEnvelopes: number;
  familyContacts: number;
  emergencyContacts: number;
}

interface ChainResponse {
  alert_level: AlertLevel;
  cascade?: Record<string, any>;
  recommended_action?: string;
  generated_at?: string;
}

const ALERT_COLORS: Record<AlertLevel, string> = {
  critical: 'border-rose-500/30 bg-rose-500/5',
  high: 'border-amber-500/30 bg-amber-500/5',
  moderate: 'border-teal-500/30 bg-teal-500/5',
  low: 'border-emerald-500/30 bg-emerald-500/5',
};

const METRIC_LABELS: Record<string, string> = {
  stress_level: 'Stress level',
  heart_rate: 'Heart rate',
  resting_hr: 'Resting heart rate',
  resting_heart_rate: 'Resting heart rate',
  hrv: 'Heart-rate variability',
  heart_rate_variability: 'Heart-rate variability',
  glucose: 'Glucose',
  sleep_duration: 'Sleep duration',
  steps: 'Steps',
  oxygen_saturation: 'Oxygen saturation',
  oxygen_sat: 'Oxygen saturation',
};

function canonicalRelationship(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim().toLowerCase();
  if (!value) return null;
  if (/(wife|husband|spouse)/.test(value)) return 'spouse';
  if (/(partner|fiance|fiancé)/.test(value)) return 'partner';
  if (/(mother|father|mom|mum|dad|parent)/.test(value)) return 'parent';
  if (/(son|daughter|child)/.test(value)) return 'child';
  if (/(brother|sister|sibling)/.test(value)) return 'sibling';
  return null;
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length <= 1) {
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

function getPrimaryFamilyMember(members: FamilyMember[]) {
  const livingMembers = members.filter(member => !member.deathDate);
  return (
    livingMembers.find(member => member.generation === 0) ||
    livingMembers[0] ||
    members.find(member => member.generation === 0) ||
    members[0] ||
    null
  );
}

function getImmediateKinMembers(
  primary: FamilyMember | null,
  members: FamilyMember[],
  relationships: Relationship[]
) {
  if (!primary) return [];

  const byId = new Map(members.map(member => [member.id, member]));
  const kin: Array<{
    id: string;
    firstName: string;
    lastName: string;
    relationship: string;
    phone_number?: string | null;
    email?: string | null;
  }> = [];

  relationships.forEach(rel => {
    if (rel.type === 'spouse' && (rel.fromId === primary.id || rel.toId === primary.id)) {
      const counterpartId = rel.fromId === primary.id ? rel.toId : rel.fromId;
      const counterpart = byId.get(counterpartId);
      if (counterpart) {
        kin.push({
          id: counterpart.id,
          firstName: counterpart.firstName,
          lastName: counterpart.lastName,
          relationship: 'spouse',
        });
      }
    }

    if (rel.type === 'parent' && rel.toId === primary.id) {
      const parent = byId.get(rel.fromId);
      if (parent) {
        kin.push({
          id: parent.id,
          firstName: parent.firstName,
          lastName: parent.lastName,
          relationship: 'parent',
        });
      }
    }

    if (rel.type === 'parent' && rel.fromId === primary.id) {
      const child = byId.get(rel.toId);
      if (child) {
        kin.push({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          relationship: 'child',
        });
      }
    }

    if (rel.type === 'sibling' && (rel.fromId === primary.id || rel.toId === primary.id)) {
      const siblingId = rel.fromId === primary.id ? rel.toId : rel.fromId;
      const sibling = byId.get(siblingId);
      if (sibling) {
        kin.push({
          id: sibling.id,
          firstName: sibling.firstName,
          lastName: sibling.lastName,
          relationship: 'sibling',
        });
      }
    }
  });

  return kin.filter(
    (entry, index, all) =>
      all.findIndex(
        candidate => candidate.id === entry.id && candidate.relationship === entry.relationship
      ) === index
  );
}

function metricSeverity(metric: HealthDataPoint) {
  const type = metric.metric_type;
  const value = Number(metric.value || 0);

  switch (type) {
    case 'stress_level':
      return Math.min(100, value * 10);
    case 'heart_rate':
    case 'resting_hr':
    case 'resting_heart_rate':
      return Math.max(0, Math.min(100, (value - 60) * 2));
    case 'hrv':
    case 'heart_rate_variability':
      return Math.max(0, Math.min(100, (60 - value) * 2));
    case 'glucose':
      return Math.max(0, Math.min(100, (value - 80) * 2));
    case 'sleep_duration':
      return Math.max(0, Math.min(100, (8 - value) * 20));
    case 'steps':
      return Math.max(0, Math.min(100, (8000 - value) / 80));
    case 'oxygen_saturation':
    case 'oxygen_sat':
      return Math.max(0, Math.min(100, (100 - value) * 10));
    default:
      return 0;
  }
}

function normalizeMetricForAlert(metric: HealthDataPoint) {
  const type = metric.metric_type;
  const rawValue = Number(metric.value || 0);

  if (type === 'stress_level') {
    return {
      criticalMetric: 'stress_level',
      criticalValue: Math.round(rawValue * 10),
      detail: `${rawValue}/10`,
    };
  }

  return {
    criticalMetric: type,
    criticalValue: rawValue,
    detail: `${rawValue} ${metric.unit || ''}`.trim(),
  };
}

async function loadEmergencyContacts(userId: string) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('contact_name, relationship, phone_number, email, is_primary')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('contact_name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []) as EmergencyContactRow[];
}

export default function EmergencyAlertChain() {
  const { user } = useAuth();
  const [data, setData] = useState<ChainResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceSummary, setSourceSummary] = useState<SourceSummary | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadChain = async () => {
      setLoading(true);
      setError(null);

      try {
        const [budgetResult, healthResult, contactsResult] = await Promise.allSettled([
          financeApi.getBudget(),
          user?.id ? fetchHealthMetrics(user.id, 14) : Promise.resolve([]),
          user?.id ? loadEmergencyContacts(user.id) : Promise.resolve([]),
        ]);

        const budgetEnvelopes = budgetResult.status === 'fulfilled' ? budgetResult.value : [];
        const healthMetrics = healthResult.status === 'fulfilled' ? healthResult.value : [];
        const emergencyContacts = contactsResult.status === 'fulfilled' ? contactsResult.value : [];

        const members = getFamilyMembers();
        const primaryMember = getPrimaryFamilyMember(members);
        const familyKin = getImmediateKinMembers(primaryMember, members, getRelationships());
        const directContacts = emergencyContacts
          .map(contact => {
            const relationship = canonicalRelationship(contact.relationship);
            if (!relationship) return null;

            const { firstName, lastName } = splitName(contact.contact_name || 'Emergency Contact');
            return {
              id: `${contact.contact_name}-${relationship}`,
              firstName,
              lastName,
              relationship,
              phone_number: contact.phone_number,
              email: contact.email,
            };
          })
          .filter(Boolean) as Array<{
          id: string;
          firstName: string;
          lastName: string;
          relationship: string;
          phone_number?: string | null;
          email?: string | null;
        }>;

        const familyMembers = [...directContacts, ...familyKin].filter((entry, index, all) => {
          const key = `${entry.firstName}-${entry.lastName}-${entry.relationship}`.toLowerCase();
          return (
            all.findIndex(candidate => {
              const candidateKey = `${candidate.firstName}-${candidate.lastName}-${candidate.relationship}`.toLowerCase();
              return candidateKey === key;
            }) === index
          );
        });

        setSourceSummary({
          recentMetrics: healthMetrics.length,
          budgetEnvelopes: budgetEnvelopes.length,
          familyContacts: familyKin.length,
          emergencyContacts: emergencyContacts.length,
        });

        const rankedMetric = [...healthMetrics].sort((a, b) => {
          const severityDelta = metricSeverity(b) - metricSeverity(a);
          if (severityDelta !== 0) return severityDelta;
          return new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime();
        })[0];

        if (!rankedMetric) {
          throw new Error(
            'No recent health metrics were found, so Raphael cannot trigger a live emergency chain.'
          );
        }

        const normalized = normalizeMetricForAlert(rankedMetric);
        const headers = await apiClient.getAuthHeaders({
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
        });

        const response = await fetch(`${API_BASE_URL}/api/v1/trinity/synapse`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'emergency_alert',
            member_id: primaryMember?.id || user?.id || 'user',
            critical_metric: normalized.criticalMetric,
            critical_value: normalized.criticalValue,
            metrics_history: healthMetrics.map(metric => ({
              metric_type: metric.metric_type,
              value: metric.value,
              timestamp: metric.recorded_at,
              unit: metric.unit,
              source: metric.source,
            })),
            budget_envelopes: budgetEnvelopes,
            family_members: familyMembers,
          }),
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(detail || `Failed to load emergency alert chain (${response.status})`);
        }

        const chainData = (await response.json()) as ChainResponse;

        if (chainData?.cascade?.raphael) {
          chainData.cascade.raphael.message = `${METRIC_LABELS[normalized.criticalMetric] || normalized.criticalMetric} at ${normalized.detail} — risk level: ${chainData.cascade.raphael.risk_level}`;
        }

        if (mounted) {
          setData(chainData);
        }
      } catch (loadError) {
        if (mounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to build the live emergency chain right now.'
          );
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadChain();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking live emergency chain...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-semibold text-white">Emergency Alert Chain</span>
        </div>
        <p className="text-xs text-rose-200">{error}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
          <Database className="w-3.5 h-3.5" />
          <span>This panel now requires live Raphael, Gabriel, and Joseph inputs. It will not fall back to mock alert data.</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const cascade = data.cascade || {};
  const steps = [
    { key: 'raphael', icon: Heart, color: '#14b8a6', label: 'St. Raphael — Health Signal', data: cascade.raphael },
    { key: 'gabriel', icon: Wallet, color: '#10b981', label: 'St. Gabriel — Emergency Fund', data: cascade.gabriel },
    { key: 'joseph', icon: GitBranch, color: '#f59e0b', label: 'St. Joseph — Next-of-Kin', data: cascade.joseph },
  ];

  return (
    <div className={`rounded-2xl border p-5 ${ALERT_COLORS[data.alert_level] || ALERT_COLORS.moderate}`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className={`w-4 h-4 ${data.alert_level === 'critical' ? 'text-rose-400' : data.alert_level === 'high' ? 'text-amber-400' : data.alert_level === 'low' ? 'text-emerald-400' : 'text-teal-400'}`} />
        <span className="text-sm font-semibold text-white">Emergency Alert Chain</span>
        <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded ${data.alert_level === 'critical' ? 'text-rose-400 bg-rose-500/20' : data.alert_level === 'high' ? 'text-amber-400 bg-amber-500/20' : data.alert_level === 'low' ? 'text-emerald-400 bg-emerald-500/20' : 'text-teal-400 bg-teal-500/20'}`}>
          {data.alert_level}
        </span>
      </div>

      {sourceSummary && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
            <Database className="w-3 h-3" />
            Raphael metrics: {sourceSummary.recentMetrics}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
            <Wallet className="w-3 h-3" />
            Gabriel envelopes: {sourceSummary.budgetEnvelopes}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
            <GitBranch className="w-3 h-3" />
            Joseph kin: {sourceSummary.familyContacts} + {sourceSummary.emergencyContacts} emergency contacts
          </span>
        </div>
      )}

      <div className="space-y-3">
        {steps.map(({ key, icon: Icon, color, label, data: stepData }) => (
          <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="w-3 h-3" style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color }}>
                {label}
              </p>
              <p className="text-xs text-slate-400">{stepData?.message || 'Waiting...'}</p>
              {key === 'joseph' && stepData?.next_of_kin?.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {stepData.next_of_kin.map((kin: any, index: number) => (
                    <span
                      key={`${kin.name}-${kin.relationship}-${index}`}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/10"
                    >
                      {kin.name} ({kin.relationship})
                    </span>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-600">Step {stepData?.step}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-xs text-slate-400">{data.recommended_action}</p>
        </div>
      </div>
    </div>
  );
}
