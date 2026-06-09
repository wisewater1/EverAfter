/**
 * ElderCareCoordination — Option 7
 * Elder member care planning across all 3 Saints.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  CalendarClock,
  HeartHandshake,
  Loader2,
  ShieldAlert,
  Users,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { financeApi } from '../../lib/gabriel/finance';
import {
  getFamilyMembers,
  getRelationships,
  type FamilyMember,
  type Relationship,
} from '../../lib/joseph/genealogy';
import { trinitySynapse } from './trinityApi';

interface EmergencyContactRow {
  contact_name: string;
  relationship: string | null;
  phone_number: string | null;
  email: string | null;
  is_primary: boolean | null;
}

interface ElderPlan {
  member_id: string;
  name: string;
  age: number;
  conditions: string[];
  health_trajectory: string;
  risk_level: string;
  risk_score: number;
  estimated_monthly_cost: number;
  current_budget: number;
  coverage_ratio: number;
  coverage_status: 'funded' | 'underfunded' | 'critical';
  care_type: 'independent' | 'assisted' | 'nursing';
}

interface ElderCarePayload {
  elder_members: ElderPlan[];
  total_elders: number;
  total_monthly_cost: number;
  total_budget_allocated: number;
  family_coverage_gap: number;
  overall_status: 'adequate' | 'attention_needed';
  generated_at?: string;
}

interface EnrichedElderPlan extends ElderPlan {
  supportNetwork: Array<{ name: string; relationship: string }>;
  supportCount: number;
  riskSource: 'family_record_baseline' | 'family_conditions';
  recommendedActions: string[];
  reviewCadence: string;
}

function getAge(member: FamilyMember) {
  const birthDate = member.birthDate;
  if (!birthDate) return null;

  const birth = new Date(`${String(birthDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

function extractConditions(member: FamilyMember) {
  const infoConditions = Array.isArray(member.infoStack)
    ? member.infoStack
        .filter(entry => entry.category === 'health')
        .map(entry => entry.label || entry.value)
        .filter(Boolean)
    : [];

  if (infoConditions.length > 0) {
    return infoConditions.slice(0, 4);
  }

  const bio = String(member.bio || '').toLowerCase();
  const derived: string[] = [];
  if (bio.includes('nurse')) derived.push('Medication and care coordination');
  if (bio.includes('war')) derived.push('Mobility and historical trauma review');
  if (bio.includes('retired')) derived.push('Preventive screening cadence');
  if (bio.includes('community') || bio.includes('church')) derived.push('Strong social support');
  return derived.slice(0, 4);
}

function normalizeFamilyMembers(members: FamilyMember[]) {
  return members.map(member => ({
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    birthYear: member.birthDate ? Number(String(member.birthDate).slice(0, 4)) : undefined,
    deathDate: member.deathDate,
    conditions: extractConditions(member),
  }));
}

function deriveMetricsByMember(members: FamilyMember[]) {
  return Object.fromEntries(
    members
      .map(member => {
        const age = getAge(member);
        if (!age || age < 65) return null;

        const conditions = extractConditions(member);
        const riskBaseline = Math.max(24, Math.min(92, 22 + (age - 60) * 1.8 + conditions.length * 10));
        return [
          member.id,
          [
            {
              metric_type: 'care_risk_baseline',
              value: Number(riskBaseline.toFixed(1)),
              timestamp: new Date().toISOString(),
              source: 'family_record_baseline',
            },
          ],
        ] as const;
      })
      .filter(Boolean) as Array<readonly [string, Array<Record<string, unknown>>]>
  );
}

function canonicalRelationship(raw: string | null | undefined): string {
  const value = String(raw || '').trim().toLowerCase();
  if (/(wife|husband|spouse)/.test(value)) return 'spouse';
  if (/(partner|fiance|fiancé)/.test(value)) return 'partner';
  if (/(mother|father|mom|mum|dad|parent)/.test(value)) return 'parent';
  if (/(son|daughter|child)/.test(value)) return 'child';
  if (/(brother|sister|sibling)/.test(value)) return 'sibling';
  return value || 'contact';
}

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return { firstName: trimmed, lastName: '' };
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts.slice(-1).join(' '),
  };
}

function getSupportNetwork(
  elder: ElderPlan,
  members: FamilyMember[],
  relationships: Relationship[],
  emergencyContacts: EmergencyContactRow[]
) {
  const byId = new Map(members.map(member => [member.id, member]));
  const network: Array<{ name: string; relationship: string }> = [];

  relationships.forEach(rel => {
    if (rel.type === 'spouse' && (rel.fromId === elder.member_id || rel.toId === elder.member_id)) {
      const counterpartId = rel.fromId === elder.member_id ? rel.toId : rel.fromId;
      const counterpart = byId.get(counterpartId);
      if (counterpart && !counterpart.deathDate) {
        network.push({ name: `${counterpart.firstName} ${counterpart.lastName}`.trim(), relationship: 'spouse' });
      }
    }

    if (rel.type === 'parent' && rel.fromId === elder.member_id) {
      const child = byId.get(rel.toId);
      if (child && !child.deathDate) {
        network.push({ name: `${child.firstName} ${child.lastName}`.trim(), relationship: 'child' });
      }
    }

    if (rel.type === 'sibling' && (rel.fromId === elder.member_id || rel.toId === elder.member_id)) {
      const siblingId = rel.fromId === elder.member_id ? rel.toId : rel.fromId;
      const sibling = byId.get(siblingId);
      if (sibling && !sibling.deathDate) {
        network.push({ name: `${sibling.firstName} ${sibling.lastName}`.trim(), relationship: 'sibling' });
      }
    }
  });

  emergencyContacts.forEach(contact => {
    network.push({
      name: contact.contact_name,
      relationship: canonicalRelationship(contact.relationship),
    });
  });

  return network.filter(
    (entry, index, all) =>
      all.findIndex(
        candidate =>
          candidate.name.toLowerCase() === entry.name.toLowerCase() &&
          candidate.relationship === entry.relationship
      ) === index
  );
}

function buildRecommendedActions(elder: ElderPlan, supportCount: number, familyCoverageGap: number) {
  const actions: string[] = [];

  if (elder.risk_level === 'critical' || elder.care_type === 'nursing') {
    actions.push('Escalate to a high-touch nursing care review and confirm medication oversight.');
  } else if (elder.risk_level === 'high') {
    actions.push('Schedule a Raphael review cadence and validate current support routines this week.');
  } else {
    actions.push('Keep independent living support documented and review care conditions monthly.');
  }

  if (elder.coverage_status !== 'funded') {
    actions.push(`Increase Gabriel elder-care funding by at least $${Math.max(250, familyCoverageGap || elder.estimated_monthly_cost - elder.current_budget).toLocaleString()} per month.`);
  }

  if (supportCount < 2) {
    actions.push('Joseph needs at least two named kin owners for transport, check-ins, and appointment follow-up.');
  } else {
    actions.push('Keep the support network explicit: transportation, medication, and household check-ins should each have an owner.');
  }

  return actions.slice(0, 3);
}

function statusClasses(status: string) {
  if (status === 'funded') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (status === 'underfunded') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
}

function riskClasses(level: string) {
  if (level === 'critical') return 'text-rose-400 bg-rose-500/10';
  if (level === 'high') return 'text-amber-400 bg-amber-500/10';
  if (level === 'moderate') return 'text-yellow-300 bg-yellow-500/10';
  return 'text-emerald-400 bg-emerald-500/10';
}

function planningWindowMembers(members: FamilyMember[]) {
  return members
    .map(member => ({ member, age: getAge(member) }))
    .filter(entry => entry.age !== null && entry.age >= 55 && entry.age < 65 && !entry.member.deathDate)
    .sort((left, right) => (right.age || 0) - (left.age || 0));
}

async function loadEmergencyContacts(userId: string) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('contact_name, relationship, phone_number, email, is_primary')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('contact_name', { ascending: true });

  if (error) throw error;
  return (data || []) as EmergencyContactRow[];
}

export default function ElderCareCoordination() {
  const navigate = useNavigate();
  const [data, setData] = useState<ElderCarePayload | null>(null);
  const [planningMembers, setPlanningMembers] = useState<Array<{ member: FamilyMember; age: number | null }>>([]);
  const [enrichedElders, setEnrichedElders] = useState<EnrichedElderPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadElderCare = async () => {
      setLoading(true);
      setError(null);

      try {
        const familyMembers = getFamilyMembers();
        const normalizedMembers = normalizeFamilyMembers(familyMembers);
        const [budgetResult, contactsResult] = await Promise.allSettled([
          financeApi.getBudget(),
          loadEmergencyContacts((await supabase.auth.getUser()).data.user?.id || ''),
        ]);

        const budgetEnvelopes = budgetResult.status === 'fulfilled' ? budgetResult.value : [];
        const emergencyContacts = contactsResult.status === 'fulfilled' ? contactsResult.value : [];
        const monthlyIncome = Math.max(
          budgetEnvelopes.reduce((sum, env) => sum + Number(env.assigned || 0), 0) * 1.4,
          0
        );

        const elderData = await trinitySynapse<ElderCarePayload>('elder_care', {
          family_members: normalizedMembers,
          metrics_by_member: deriveMetricsByMember(familyMembers),
          budget_envelopes: budgetEnvelopes,
          monthly_income: monthlyIncome,
        });

        const payload = elderData || {
          elder_members: [],
          total_elders: 0,
          total_monthly_cost: 0,
          total_budget_allocated: 0,
          family_coverage_gap: 0,
          overall_status: 'adequate',
        };

        const relationships = getRelationships();
        const enriched = (payload.elder_members || []).map(elder => {
          const supportNetwork = getSupportNetwork(elder, familyMembers, relationships, emergencyContacts);
          return {
            ...elder,
            supportNetwork,
            supportCount: supportNetwork.length,
            riskSource: extractConditions(
              familyMembers.find(member => member.id === elder.member_id) || ({} as FamilyMember)
            ).length > 0
              ? 'family_conditions'
              : 'family_record_baseline',
            reviewCadence:
              elder.risk_level === 'critical'
                ? '48-hour review'
                : elder.risk_level === 'high'
                  ? 'weekly review'
                  : 'monthly review',
            recommendedActions: buildRecommendedActions(
              elder,
              supportNetwork.length,
              payload.family_coverage_gap
            ),
          } satisfies EnrichedElderPlan;
        });

        if (mounted) {
          setData(payload);
          setPlanningMembers(planningWindowMembers(familyMembers));
          setEnrichedElders(enriched);
        }
      } catch (loadErr) {
        if (mounted) {
          setError(loadErr instanceof Error ? loadErr.message : 'Unable to load elder care coordination.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadElderCare();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 p-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analyzing elder care needs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-sm font-semibold text-white">Elder Care Coordination</span>
        </div>
        <p className="text-xs text-rose-200">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const hasElders = enrichedElders.length > 0;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Elder Care Coordination</span>
            <span className="text-[10px] text-slate-500">
              {data.total_elders} elder{data.total_elders !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 max-w-3xl">
            Trinity coordinates Raphael care risk, Gabriel budget readiness, and Joseph support coverage into a single elder-care plan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/health-dashboard')}
            className="px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-200 hover:bg-white/[0.03] transition-colors"
          >
            Open Raphael
          </button>
          <button
            onClick={() => navigate('/finance-dashboard')}
            className="px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-200 hover:bg-white/[0.03] transition-colors"
          >
            Open Gabriel
          </button>
          <button
            onClick={() => navigate('/family-dashboard')}
            className="px-3 py-2 rounded-xl border border-white/10 text-xs text-slate-200 hover:bg-white/[0.03] transition-colors"
          >
            Open Joseph
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Active Elders</p>
          <p className="text-2xl font-semibold text-white">{data.total_elders}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {planningMembers.length} approaching elder-care planning age
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Projected Care Cost</p>
          <p className="text-2xl font-semibold text-white">${Math.round(data.total_monthly_cost).toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Monthly household elder-care exposure</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Gabriel Coverage</p>
          <p className="text-2xl font-semibold text-white">${Math.round(data.total_budget_allocated).toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {data.family_coverage_gap > 0
              ? `$${Math.round(data.family_coverage_gap).toLocaleString()} still uncovered`
              : 'Household coverage is on pace'}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Coordination Status</p>
          <p className={`text-2xl font-semibold ${data.overall_status === 'adequate' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {data.overall_status === 'adequate' ? 'Adequate' : 'Attention'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Latest Trinity review</p>
        </div>
      </div>

      {hasElders ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-medium text-white">Raphael Care Risk</h3>
              </div>
              <p className="text-xs text-slate-400">
                {enrichedElders.filter(elder => elder.risk_level === 'high' || elder.risk_level === 'critical').length} elder(s) need elevated health review.
              </p>
              <div className="mt-4 space-y-2">
                {enrichedElders.slice(0, 3).map(elder => (
                  <div key={`risk-${elder.member_id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{elder.name}</span>
                    <span className={`px-2 py-1 rounded-full ${riskClasses(elder.risk_level)}`}>{elder.risk_level}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium text-white">Gabriel Funding</h3>
              </div>
              <p className="text-xs text-slate-400">
                Elder-care funding covers {data.total_monthly_cost > 0 ? Math.round((data.total_budget_allocated / data.total_monthly_cost) * 100) : 0}% of projected monthly demand.
              </p>
              <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full ${data.family_coverage_gap > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, data.total_monthly_cost > 0 ? (data.total_budget_allocated / data.total_monthly_cost) * 100 : 100)}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {data.family_coverage_gap > 0
                  ? `Raise Gabriel coverage by $${Math.round(data.family_coverage_gap).toLocaleString()} per month to close the current care gap.`
                  : 'Current coverage meets Trinity’s elder-care target threshold.'}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <HeartHandshake className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-medium text-white">Joseph Support Network</h3>
              </div>
              <p className="text-xs text-slate-400">
                Average kin/support coverage: {enrichedElders.length > 0 ? (enrichedElders.reduce((sum, elder) => sum + elder.supportCount, 0) / enrichedElders.length).toFixed(1) : '0'} contact(s) per elder.
              </p>
              <div className="mt-4 space-y-2">
                {enrichedElders.slice(0, 3).map(elder => (
                  <div key={`support-${elder.member_id}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{elder.name}</span>
                    <span className={`px-2 py-1 rounded-full ${elder.supportCount >= 2 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                      {elder.supportCount} support contact{elder.supportCount === 1 ? '' : 's'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {enrichedElders.map(elder => (
              <div key={elder.member_id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-medium text-white">{elder.name}</h3>
                      <span className="text-xs text-slate-500">Age {elder.age}</span>
                      <span className={`text-[10px] px-2 py-1 rounded-full border ${statusClasses(elder.coverage_status)}`}>
                        {elder.coverage_status}
                      </span>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${riskClasses(elder.risk_level)}`}>
                        {elder.risk_level}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {elder.care_type} care · {elder.health_trajectory} trajectory · {elder.reviewCadence}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {elder.conditions.length > 0 ? (
                        elder.conditions.map(condition => (
                          <span key={`${elder.member_id}-${condition}`} className="text-[10px] px-2 py-1 rounded-full border border-rose-500/20 bg-rose-500/10 text-rose-300">
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/[0.03] text-slate-400">
                          No explicit conditions recorded
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center min-w-[280px]">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <p className="text-sm font-semibold text-white">${elder.estimated_monthly_cost.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">Est. care cost</p>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <p className="text-sm font-semibold text-white">${elder.current_budget.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-500">Budgeted</p>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                      <p className="text-sm font-semibold text-white">{Math.round(elder.coverage_ratio * 100)}%</p>
                      <p className="text-[10px] text-slate-500">Coverage</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white">Support Network</p>
                      <span className="text-[10px] text-slate-500">{elder.supportCount} linked contact{elder.supportCount === 1 ? '' : 's'}</span>
                    </div>
                    {elder.supportNetwork.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {elder.supportNetwork.map(person => (
                          <span key={`${elder.member_id}-${person.name}-${person.relationship}`} className="text-[10px] px-2 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">
                            {person.name} ({person.relationship})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Joseph does not have a named kin network for this elder yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-white">Trinity Action Queue</p>
                      <span className="text-[10px] text-slate-500 capitalize">{elder.riskSource.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="space-y-2">
                      {elder.recommendedActions.map(action => (
                        <div key={`${elder.member_id}-${action}`} className="flex items-start gap-2 text-xs text-slate-300">
                          <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
          <div className="rounded-xl border border-white/5 bg-black/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-medium text-white">Planning Window</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              No active family members aged 65+ are currently in the tree. Trinity switches into runway planning mode so Joseph, Raphael, and Gabriel can prepare before care demand turns urgent.
            </p>

            {planningMembers.length > 0 ? (
              <div className="space-y-3">
                {planningMembers.map(({ member, age }) => (
                  <div key={member.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{member.firstName} {member.lastName}</p>
                        <p className="text-[11px] text-slate-500">Age {age} · approaching elder-care planning threshold</p>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-300">
                        Prepare now
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No family members are currently inside the 55–64 planning window.</p>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-5">
            <h3 className="text-sm font-medium text-white mb-3">Recommended Setup</h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
                <span>Give Gabriel a dedicated elder-care envelope before care costs arrive.</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
                <span>Add emergency contacts and named Joseph kin owners so Anthony and Trinity can escalate correctly.</span>
              </div>
              <div className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-slate-500 shrink-0" />
                <span>Capture Raphael baseline health history for older family members before a crisis window opens.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
