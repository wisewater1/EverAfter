/**
 * CrossSaintGoalEngine
 * Rich cross-Saint goal creation, review, recalculation, and archive flow.
 */
import { useMemo, useState } from 'react';
import {
    Archive,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    GitBranch,
    Heart,
    Loader2,
    Plus,
    RefreshCw,
    Target,
    Users,
    Wallet,
} from 'lucide-react';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import {
    getStoredTrinityGoals,
    persistTrinityGoal,
    removeStoredTrinityGoal,
    trinitySynapse,
    type TrinityGoal,
    updateStoredTrinityGoal,
} from './trinityApi';

const GOAL_TYPES = [
    { value: 'health', label: 'Health' },
    { value: 'family', label: 'Family' },
    { value: 'finance', label: 'Finance' },
    { value: 'emergency', label: 'Emergency' },
];

const HEALTH_TARGETS = [
    { value: 'wellness_composite', label: 'Wellness composite' },
    { value: 'recovery_score', label: 'Recovery score' },
    { value: 'care_stability', label: 'Care stability' },
    { value: 'stress_load', label: 'Stress load' },
];

const BUDGET_CATEGORIES = ['health', 'elder care', 'family care', 'emergency fund', 'housing'];

const SAINT_AXIS = [
    { saint: 'raphael', icon: Heart, color: '#14b8a6' },
    { saint: 'gabriel', icon: Wallet, color: '#10b981' },
    { saint: 'joseph', icon: GitBranch, color: '#f59e0b' },
] as const;

export default function CrossSaintGoalEngine() {
    const familyMembers = useMemo(() => getFamilyMembers().filter(member => !member.deathDate), []);
    const [goals, setGoals] = useState<TrinityGoal[]>(() => getStoredTrinityGoals());
    const [showCreate, setShowCreate] = useState(false);
    const [expandedGoalId, setExpandedGoalId] = useState<string | null>(() => getStoredTrinityGoals()[0]?.id || null);
    const [goalName, setGoalName] = useState('');
    const [goalType, setGoalType] = useState('health');
    const [healthMetric, setHealthMetric] = useState('wellness_composite');
    const [targetValue, setTargetValue] = useState(80);
    const [budgetCategory, setBudgetCategory] = useState('health');
    const [monthlyAmount, setMonthlyAmount] = useState(250);
    const [trackedMembers, setTrackedMembers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyGoalId, setBusyGoalId] = useState<string | null>(null);

    const stats = useMemo(() => ({
        total: goals.length,
        onTrack: goals.filter(goal => goal.status === 'on_track').length,
        needsAttention: goals.filter(goal => goal.status === 'needs_attention').length,
    }), [goals]);

    const sortedGoals = useMemo(() => {
        const statusRank = { needs_attention: 0, blocked: 1, on_track: 2 };
        return [...goals].sort((left, right) => {
            const leftRank = statusRank[left.status] ?? 99;
            const rightRank = statusRank[right.status] ?? 99;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return (right.composite_progress || 0) - (left.composite_progress || 0);
        });
    }, [goals]);

    function resetCreateForm() {
        setGoalName('');
        setGoalType('health');
        setHealthMetric('wellness_composite');
        setTargetValue(80);
        setBudgetCategory('health');
        setMonthlyAmount(250);
        setTrackedMembers([]);
    }

    function toggleTrackedMember(memberId: string) {
        setTrackedMembers(current =>
            current.includes(memberId)
                ? current.filter(id => id !== memberId)
                : [...current, memberId]
        );
    }

    async function createGoal() {
        if (!goalName.trim()) return;

        setLoading(true);
        const result = await trinitySynapse<TrinityGoal>('cross_saint_goal', {
            goal_name: goalName.trim(),
            goal_type: goalType,
            health_target: { metric: healthMetric, target_value: targetValue },
            budget_allocation: { category: budgetCategory, monthly_amount: monthlyAmount },
            family_tracking: trackedMembers,
        });

        if (result) {
            const nextGoals = persistTrinityGoal(result);
            setGoals(nextGoals);
            setExpandedGoalId(nextGoals[0]?.id || null);
        }

        resetCreateForm();
        setShowCreate(false);
        setLoading(false);
    }

    async function recalculateGoal(goal: TrinityGoal) {
        setBusyGoalId(goal.id || goal.goal_name);
        const result = await trinitySynapse<TrinityGoal>('cross_saint_goal', {
            goal_name: goal.goal_name,
            goal_type: goal.goal_type,
            health_target: goal.health_target,
            budget_allocation: goal.budget_allocation,
            family_tracking: goal.family_tracking || [],
        });

        if (result) {
            const nextGoals = persistTrinityGoal({ ...goal, ...result, id: goal.id });
            setGoals(nextGoals);
        }
        setBusyGoalId(null);
    }

    function markGoalReviewed(goal: TrinityGoal) {
        if (!goal.id) return;
        const nextGoals = updateStoredTrinityGoal(goal.id, {
            last_reviewed_at: new Date().toISOString(),
            next_review_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        });
        setGoals(nextGoals);
    }

    function archiveGoal(goal: TrinityGoal) {
        if (!goal.id) return;
        const nextGoals = removeStoredTrinityGoal(goal.id);
        setGoals(nextGoals);
        if (expandedGoalId === goal.id) {
            setExpandedGoalId(nextGoals[0]?.id || null);
        }
    }

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-semibold text-white">Cross-Saint Goals</span>
                </div>
                <button
                    onClick={() => setShowCreate(current => !current)}
                    className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20"
                    title="Create cross-Saint goal"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Active</p>
                    <p className="text-lg font-semibold text-white">{stats.total}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-emerald-300/80">On Track</p>
                    <p className="text-lg font-semibold text-emerald-300">{stats.onTrack}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Attention</p>
                    <p className="text-lg font-semibold text-amber-300">{stats.needsAttention}</p>
                </div>
            </div>

            {showCreate && (
                <div className="mb-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Goal name</label>
                            <input
                                value={goalName}
                                onChange={event => setGoalName(event.target.value)}
                                placeholder="Reduce diabetes risk across the household"
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Goal type</label>
                            <select
                                value={goalType}
                                onChange={event => setGoalType(event.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                            >
                                {GOAL_TYPES.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Raphael target</label>
                            <select
                                value={healthMetric}
                                onChange={event => setHealthMetric(event.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                            >
                                {HEALTH_TARGETS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Target value</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={targetValue}
                                onChange={event => setTargetValue(Number(event.target.value || 0))}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Gabriel budget category</label>
                            <select
                                value={budgetCategory}
                                onChange={event => setBudgetCategory(event.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                            >
                                {BUDGET_CATEGORIES.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1.5">Monthly amount</label>
                            <input
                                type="number"
                                min={0}
                                step={25}
                                value={monthlyAmount}
                                onChange={event => setMonthlyAmount(Number(event.target.value || 0))}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Joseph family tracking</div>
                        <div className="flex flex-wrap gap-2">
                            {familyMembers.map(member => {
                                const selected = trackedMembers.includes(member.id);
                                return (
                                    <button
                                        key={member.id}
                                        type="button"
                                        onClick={() => toggleTrackedMember(member.id)}
                                        className={`px-2.5 py-1.5 rounded-lg border text-xs ${selected ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                                    >
                                        {member.firstName} {member.lastName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={createGoal}
                            disabled={loading || !goalName.trim()}
                            className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-medium border border-teal-500/20 hover:bg-teal-500/30 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Goal'}
                        </button>
                        <button
                            onClick={() => {
                                resetCreateForm();
                                setShowCreate(false);
                            }}
                            className="px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:text-slate-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {goals.length === 0 && !showCreate && (
                <div className="text-center py-8">
                    <Target className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No cross-Saint goals yet. Create one to track health, family, and finance together.</p>
                </div>
            )}

            <div className="space-y-3">
                {sortedGoals.map(goal => {
                    const expanded = expandedGoalId === goal.id;
                    const trackedNames = (goal.family_tracking || [])
                        .map(memberId => familyMembers.find(member => member.id === memberId))
                        .filter(Boolean)
                        .map(member => `${member?.firstName} ${member?.lastName}`);

                    return (
                        <div key={goal.id || goal.goal_name} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-white">{goal.goal_name}</span>
                                        <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                                            {goal.goal_type}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400 max-w-3xl">{goal.summary}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${goal.status === 'on_track' ? 'text-emerald-400 bg-emerald-500/10' : goal.status === 'needs_attention' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                        {goal.composite_progress?.toFixed(0)}%
                                    </span>
                                    <button
                                        onClick={() => setExpandedGoalId(expanded ? null : goal.id || null)}
                                        className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/5"
                                        title={expanded ? 'Collapse goal' : 'Expand goal'}
                                    >
                                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                {SAINT_AXIS.map(({ saint, icon: Icon, color }) => {
                                    const axis = goal.axes?.[saint] || { progress: 0, label: saint };
                                    return (
                                        <div key={saint}>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-1">
                                                    <Icon className="w-2.5 h-2.5" style={{ color }} />
                                                    <span className="text-[9px] text-slate-500">{axis.label}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-500">{Math.round(axis.progress)}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-800 rounded-full">
                                                <div className="h-full rounded-full" style={{ width: `${axis.progress}%`, backgroundColor: color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    Review {goal.next_review_at ? new Date(goal.next_review_at).toLocaleDateString() : 'pending'}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {trackedNames.length} tracked
                                </span>
                                {goal.last_reviewed_at && (
                                    <span className="inline-flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Reviewed {new Date(goal.last_reviewed_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            {expanded && (
                                <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Recommendations</div>
                                            <div className="space-y-2">
                                                {(goal.recommendations || []).map(recommendation => (
                                                    <div key={recommendation} className="text-sm text-slate-300 leading-relaxed">
                                                        {recommendation}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Current blockers</div>
                                            {(goal.blockers || []).length > 0 ? (
                                                <div className="space-y-2">
                                                    {(goal.blockers || []).map(blocker => (
                                                        <div key={blocker} className="text-sm text-amber-300 leading-relaxed">
                                                            {blocker}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-emerald-300">No active blockers recorded.</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Raphael target</div>
                                            <div className="text-slate-300">
                                                {goal.health_target?.metric || 'Not set'} @ {goal.health_target?.target_value ?? 'n/a'}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Gabriel budget</div>
                                            <div className="text-slate-300">
                                                {goal.budget_allocation?.category || 'Not set'} / ${goal.budget_allocation?.monthly_amount ?? 0}
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Joseph tracking</div>
                                            <div className="text-slate-300">
                                                {trackedNames.length > 0 ? trackedNames.join(', ') : 'No family members assigned'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => recalculateGoal(goal)}
                                            disabled={busyGoalId === (goal.id || goal.goal_name)}
                                            className="px-3 py-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs hover:bg-teal-500/20 disabled:opacity-50 inline-flex items-center gap-2"
                                        >
                                            {busyGoalId === (goal.id || goal.goal_name)
                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                : <RefreshCw className="w-3 h-3" />}
                                            Recalculate
                                        </button>
                                        <button
                                            onClick={() => markGoalReviewed(goal)}
                                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:text-white inline-flex items-center gap-2"
                                        >
                                            <CheckCircle2 className="w-3 h-3" />
                                            Mark Reviewed
                                        </button>
                                        <button
                                            onClick={() => archiveGoal(goal)}
                                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs hover:bg-rose-500/15 inline-flex items-center gap-2"
                                        >
                                            <Archive className="w-3 h-3" />
                                            Archive
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
