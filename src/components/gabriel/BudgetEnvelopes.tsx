import { useState, useEffect } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';
import { financeApi, BudgetEnvelope } from '../../lib/gabriel/finance';
import CategoryManager from './CategoryManager';

export default function BudgetEnvelopes() {
    const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    useEffect(() => {
        loadBudget();
    }, []);

    async function loadBudget() {
        try {
            setLoading(true);
            const data = await financeApi.getBudget();
            setEnvelopes(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load budget:', err);
            setError(err?.message || 'Failed to load budget envelopes');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    // Group envelopes by 'group' property
    const groupedEnvelopes = envelopes.reduce((groups, env) => {
        const group = env.group;
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(env);
        return groups;
    }, {} as Record<string, BudgetEnvelope[]>);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50">
                <div>
                    <h2 className="text-lg font-semibold text-white">Monthly Budget</h2>
                    <p className="text-sm text-slate-500">Assign your income to envelopes</p>
                </div>
                <button
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700 hover:border-slate-600"
                >
                    Manage Categories
                </button>
            </div>

            {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-sm">
                    <strong>⚠ API Error:</strong> {error}
                    {error.includes('401') && (
                        <p className="text-xs text-rose-300/60 mt-1">Your session may have expired. Try logging out and back in.</p>
                    )}
                </div>
            )}

            {Object.entries(groupedEnvelopes).map(([groupName, groupEnvelopes]) => (
                <div key={groupName} className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
                    <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{groupName}</h3>
                        <div className="text-xs text-slate-500 font-mono">
                            Available: ${groupEnvelopes.reduce((sum, e) => sum + e.available, 0).toLocaleString()}
                        </div>
                    </div>
                    <div>
                        {groupEnvelopes.map(env => (
                            <div key={env.id} className="flex items-center px-6 py-4 hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0 group">
                                <div className="w-1/3 min-w-[200px]">
                                    <div className="font-medium text-slate-200">{env.category_name}</div>
                                </div>
                                <div className="flex-1 grid grid-cols-3 gap-4 text-right font-mono text-sm">
                                    <div className="text-right">
                                        <input
                                            type="number"
                                            className="w-24 bg-transparent text-right text-slate-400 focus:text-white focus:outline-none border-b border-transparent focus:border-emerald-500 transition-colors"
                                            defaultValue={env.assigned}
                                            onBlur={(e) => {
                                                const val = parseFloat(e.target.value);
                                                if (!isNaN(val) && val !== env.assigned) {
                                                    financeApi.updateEnvelope(env.id, val).then(() => loadBudget());
                                                }
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="text-slate-400 text-rose-400">${Math.abs(env.activity).toLocaleString()}</div>
                                    <div className={`font-medium ${env.available < 0 ? 'text-rose-400' : env.available === 0 ? 'text-slate-500' : 'text-emerald-400'}`}>
                                        ${env.available.toLocaleString()}
                                    </div>
                                </div>
                                <div className="w-32 ml-6">
                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${env.available < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            // Simple progress calculation: spending / assigned
                                            style={{ width: `${Math.min(100, Math.abs(env.activity / (env.assigned || 1) * 100)) || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <button className="ml-4 p-1 text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {envelopes.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    No budget envelopes found. Add a category to start budgeting.
                </div>
            )}

            <CategoryManager
                isOpen={isCategoryManagerOpen}
                onClose={() => setIsCategoryManagerOpen(false)}
                onUpdate={loadBudget}
            />
        </div>
    );
}
