/**
 * CrossSaintGoalEngine — Option 2
 * Goals that live across all 3 Saints simultaneously.
 */
import { useState, useEffect } from 'react';
import { Target, GitBranch, Heart, Wallet, Plus, Loader2 } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function CrossSaintGoalEngine() {
    const [goals, setGoals] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [goalName, setGoalName] = useState('');
    const [loading, setLoading] = useState(false);

    async function createGoal() {
        if (!goalName.trim()) return;
        setLoading(true);
        const d = await trinitySynapse('cross_saint_goal', {
            goal_name: goalName,
            goal_type: 'health',
            health_target: { metric: 'wellness_composite', target_value: 80 },
            budget_allocation: { category: 'health', monthly_amount: 150 },
            family_tracking: [],
        });
        if (d) setGoals(prev => [...prev, d]);
        setGoalName('');
        setShowCreate(false);
        setLoading(false);
    }

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-semibold text-white">Cross-Saint Goals</span>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20">
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {showCreate && (
                <div className="mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <input value={goalName} onChange={e => setGoalName(e.target.value)} placeholder="Goal name (e.g., Reduce T2D risk)" className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none" />
                    <div className="flex gap-2">
                        <button onClick={createGoal} disabled={loading} className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-400 text-xs font-medium border border-teal-500/20 hover:bg-teal-500/30 disabled:opacity-50">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Goal'}
                        </button>
                        <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg text-slate-500 text-xs hover:text-slate-300">Cancel</button>
                    </div>
                </div>
            )}

            {goals.length === 0 && !showCreate && (
                <div className="text-center py-8">
                    <Target className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No cross-Saint goals yet. Create one to track progress across health, finance, and family.</p>
                </div>
            )}

            <div className="space-y-3">
                {goals.map((g, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-white">{g.goal_name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${g.status === 'on_track' ? 'text-emerald-400 bg-emerald-500/10' : g.status === 'needs_attention' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {g.composite_progress?.toFixed(0)}%
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { saint: 'raphael', icon: Heart, color: '#14b8a6' },
                                { saint: 'gabriel', icon: Wallet, color: '#10b981' },
                                { saint: 'joseph', icon: GitBranch, color: '#f59e0b' },
                            ].map(({ saint, icon: Icon, color }) => {
                                const axis = g.axes?.[saint] || { progress: 0, label: saint };
                                return (
                                    <div key={saint}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <Icon className="w-2.5 h-2.5" style={{ color }} />
                                            <span className="text-[9px] text-slate-500">{axis.label}</span>
                                        </div>
                                        <div className="h-1 bg-slate-800 rounded-full"><div className="h-full rounded-full" style={{ width: `${axis.progress}%`, backgroundColor: color }} /></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
