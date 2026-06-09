import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Heart,
  Loader2,
  Shield,
  Users,
  Wallet,
} from 'lucide-react';
import { trinitySynapse } from './trinityApi';

type InheritanceCardStatus = 'ready' | 'needs_attention' | 'missing';

interface InheritanceData {
  member_id: string;
  member_name: string;
  urgency: 'high' | 'moderate' | 'low';
  prognosis: {
    risk_level: string;
    trajectory: string;
    active_conditions: string[];
  };
  estate: {
    total_value: number;
    distribution_ready: boolean;
    asset_count?: number;
    ready_label?: string;
  };
  heir_plan: {
    heirs: Array<{
      name: string;
      relationship: string;
      member_id: string;
      share_percent: number;
      generation?: number;
      path_summary?: string;
    }>;
    no_heirs_designated?: boolean;
  };
  pedigree_continuity: {
    summary: string;
    generations_covered: number;
    family_records: number;
    documented_heirs: number;
    source_backed_members: number;
    source_coverage_percent: number;
    next_of_kin_confidence: number;
    continuity_gaps: string[];
    highlighted_paths: Array<{
      name: string;
      relationship: string;
      member_id: string;
      share_percent: number;
      path_summary?: string;
    }>;
  };
  hereditary_signals: {
    disclaimer: string;
    signals: Array<{
      condition: string;
      pattern: string;
      confidence_score: number;
      confidence_label: string;
      generations_covered: number;
      affected_members: Array<{
        id: string;
        name: string;
        relationship: string;
      }>;
      explanation: string;
      recommended_actions: string[];
    }>;
  };
  continuity_automation: {
    summary: string;
    automation_readiness: string;
    release_mode: string;
    notification_contacts: number;
    executor_count: number;
    directive_status: string;
    heartbeat_status: string;
    triggers: Array<{
      label: string;
      status: string;
      detail: string;
    }>;
    next_actions: string[];
  };
  estate_assets: Array<{
    label: string;
    category: string;
    value: number;
    status: string;
    notes: string;
  }>;
  readiness_checklist: Array<{
    label: string;
    status: InheritanceCardStatus;
    detail: string;
  }>;
  action_items: string[];
  source_notes: string[];
}

function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}

function getUrgencyTone(value: string) {
  if (value === 'high') {
    return {
      badge: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
      panel: 'border-rose-500/10 bg-rose-500/[0.03]',
    };
  }
  if (value === 'moderate') {
    return {
      badge: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
      panel: 'border-amber-500/10 bg-amber-500/[0.03]',
    };
  }
  return {
    badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    panel: 'border-emerald-500/10 bg-emerald-500/[0.03]',
  };
}

function getChecklistTone(status: InheritanceCardStatus) {
  if (status === 'ready') {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
      text: 'text-emerald-300',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    };
  }
  if (status === 'needs_attention') {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
      text: 'text-amber-300',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    };
  }
  return {
    icon: <AlertTriangle className="h-4 w-4 text-rose-400" />,
    text: 'text-rose-300',
    badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  };
}

export default function InheritanceDirective() {
  const navigate = useNavigate();
  const [data, setData] = useState<InheritanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const result = await trinitySynapse<InheritanceData>('inheritance_directive', {});
      if (mounted) {
        setData(result);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#171722] p-4 text-xs text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Building Trinity inheritance workspace...
      </div>
    );
  }

  if (!data) return null;

  const urgencyTone = getUrgencyTone(data.urgency);

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-5 ${urgencyTone.panel}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span className="text-base font-semibold text-white">Inheritance and Continuity Directive</span>
            </div>
            <p className="max-w-3xl text-sm text-slate-400">
              Trinity is combining Joseph family graph coverage, Raphael health trajectory, Gabriel estate posture,
              and legacy-release readiness into one inheritance workspace.
            </p>
          </div>
          <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${urgencyTone.badge}`}>
            {data.urgency} urgency
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-teal-500/10 bg-teal-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-teal-300">
              <Heart className="h-3.5 w-3.5" />
              Health prognosis
            </div>
            <div className="text-sm text-slate-300">Risk: <span className="font-medium text-white">{data.prognosis.risk_level}</span></div>
            <div className="mt-1 text-sm text-slate-300">Trajectory: <span className="font-medium text-white">{data.prognosis.trajectory}</span></div>
            {data.prognosis.active_conditions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {data.prognosis.active_conditions.map((condition) => (
                  <span key={condition} className="rounded-full bg-teal-500/10 px-2 py-1 text-[10px] text-teal-300">
                    {condition}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <Wallet className="h-3.5 w-3.5" />
              Estate summary
            </div>
            <div className="text-lg font-semibold text-white">{formatMoney(data.estate.total_value)}</div>
            <div className="mt-1 text-sm text-slate-300">
              Ready state: <span className={data.estate.distribution_ready ? 'text-emerald-300' : 'text-amber-300'}>{data.estate.ready_label || (data.estate.distribution_ready ? 'Structured' : 'Needs work')}</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">{data.estate.asset_count || data.estate_assets.length} estate buckets mapped</div>
          </div>

          <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <GitBranch className="h-3.5 w-3.5" />
              Heir plan
            </div>
            <div className="text-lg font-semibold text-white">{data.heir_plan.heirs.length}</div>
            <div className="mt-1 text-sm text-slate-300">Documented heirs / executors</div>
            <div className="mt-2 text-xs text-slate-500">
              Next-of-kin confidence {data.pedigree_continuity.next_of_kin_confidence}%
            </div>
          </div>

          <div className="rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              <Shield className="h-3.5 w-3.5" />
              Continuity automation
            </div>
            <div className="text-sm text-slate-300">Mode: <span className="font-medium text-white">{data.continuity_automation.release_mode}</span></div>
            <div className="mt-1 text-sm text-slate-300">Directive: <span className="font-medium text-white">{data.continuity_automation.directive_status}</span></div>
            <div className="mt-2 text-xs text-slate-500">
              {data.continuity_automation.executor_count} executor candidate(s) / {data.continuity_automation.notification_contacts} notification contacts
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/family-dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Open Joseph Family Tree
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/finance-dashboard')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Open Gabriel Treasury
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/legacy-vault')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            Open Legacy Vault
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Pedigree continuity</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">{data.pedigree_continuity.summary}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Generations</div>
              <div className="mt-2 text-xl font-semibold text-white">{data.pedigree_continuity.generations_covered}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Family records</div>
              <div className="mt-2 text-xl font-semibold text-white">{data.pedigree_continuity.family_records}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Source coverage</div>
              <div className="mt-2 text-xl font-semibold text-white">{data.pedigree_continuity.source_coverage_percent}%</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Mapped heirs</div>
              <div className="mt-2 text-xl font-semibold text-white">{data.pedigree_continuity.documented_heirs}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Highlighted paths</div>
              <div className="mt-3 space-y-3">
                {data.pedigree_continuity.highlighted_paths.length > 0 ? data.pedigree_continuity.highlighted_paths.map((path) => (
                  <div key={path.member_id} className="rounded-lg border border-white/5 bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{path.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{path.relationship}</div>
                      </div>
                      <div className="text-xs font-medium text-amber-300">{path.share_percent}%</div>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">{path.path_summary || 'Family path available'}</div>
                  </div>
                )) : (
                  <div className="rounded-lg border border-rose-500/10 bg-rose-500/5 p-3 text-sm text-rose-300">
                    No documented heir paths were found in the current family graph.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Continuity gaps</div>
              <div className="mt-3 space-y-2">
                {data.pedigree_continuity.continuity_gaps.length > 0 ? data.pedigree_continuity.continuity_gaps.map((gap) => (
                  <div key={gap} className="flex items-start gap-2 rounded-lg border border-amber-500/10 bg-amber-500/5 p-3 text-sm text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>{gap}</span>
                  </div>
                )) : (
                  <div className="flex items-start gap-2 rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-3 text-sm text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Pedigree continuity is currently well covered for the known family graph.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-400" />
            <span className="text-sm font-semibold text-white">Hereditary pattern signals</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">{data.hereditary_signals.disclaimer}</p>

          <div className="mt-4 space-y-3">
            {data.hereditary_signals.signals.length > 0 ? data.hereditary_signals.signals.map((signal) => (
              <div key={signal.condition} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{signal.condition}</div>
                    <div className="mt-1 text-xs text-slate-400">{signal.pattern}</div>
                  </div>
                  <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    {signal.confidence_label} {signal.confidence_score}%
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-400">{signal.explanation}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {signal.affected_members.map((member) => (
                    <span key={member.id} className="rounded-full bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                      {member.name} - {member.relationship}
                    </span>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {signal.recommended_actions.map((action) => (
                    <div key={action} className="flex items-start gap-2 text-xs text-slate-500">
                      <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-cyan-400" />
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                No repeated family-pattern signals are currently inferred from the recorded conditions and genealogy.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white">Continuity automation</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">{data.continuity_automation.summary}</p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Automation state</div>
              <div className="mt-2 text-lg font-semibold text-white">{data.continuity_automation.automation_readiness}</div>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Heartbeat posture</div>
              <div className="mt-2 text-lg font-semibold text-white">{data.continuity_automation.heartbeat_status}</div>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data.continuity_automation.triggers.map((trigger) => (
              <div key={trigger.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">{trigger.label}</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {trigger.status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="mt-2 text-sm text-slate-400">{trigger.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Next actions</div>
            <div className="mt-3 space-y-2">
              {data.continuity_automation.next_actions.map((action) => (
                <div key={action} className="flex items-start gap-2 text-sm text-slate-300">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Estate asset register</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.estate_assets.map((asset) => (
                <div key={asset.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-white">{asset.label}</div>
                      <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">{asset.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-white">{formatMoney(asset.value)}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">{asset.status}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{asset.notes}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-semibold text-white">Readiness checklist</span>
            </div>
            <div className="mt-4 space-y-3">
              {data.readiness_checklist.map((item) => {
                const tone = getChecklistTone(item.status);
                return (
                  <div key={item.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        {tone.icon}
                        <div>
                          <div className="text-sm font-medium text-white">{item.label}</div>
                          <div className="mt-1 text-sm text-slate-400">{item.detail}</div>
                        </div>
                      </div>
                      <div className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
                        {item.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Action items</span>
          </div>
          <div className="mt-4 space-y-2">
            {data.action_items.map((action) => (
              <div key={action} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm text-slate-300">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#171722] p-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Source notes</span>
          </div>
          <div className="mt-4 space-y-3">
            {data.source_notes.map((note) => (
              <div key={note} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-400">
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
