import { useEffect, useState } from 'react';
import { Loader2, MoreHorizontal } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { isAuthFailureMessage } from '../../lib/auth-session';
import CategoryManager from './CategoryManager';
import { BudgetEnvelope, financeApi } from '../../lib/gabriel/finance';

export default function BudgetEnvelopes() {
    const { loading: authLoading, session, isDemoMode } = useAuth();
    const [envelopes, setEnvelopes] = useState<BudgetEnvelope[]>(() => financeApi.getCachedBudget());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [degradedMode, setDegradedMode] = useState(false);
    const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

    useEffect(() => {
        if (authLoading || isDemoMode || !session?.access_token) {
            setLoading(false);
            return;
        }
        void loadBudget();
    }, [authLoading, isDemoMode, session?.access_token]);

    async function loadBudget() {
        setLoading(true);
        setDegradedMode(false);

        const liveRequest = financeApi.getBudget();

        try {
            const timeoutResult = await Promise.race([
                liveRequest.then((data) => ({ kind: 'data' as const, data })),
                new Promise<{ kind: 'timeout' }>((resolve) => {
                    window.setTimeout(() => resolve({ kind: 'timeout' }), 4500);
                }),
            ]);

            if (timeoutResult.kind === 'timeout') {
                const cached = financeApi.getCachedBudget();
                setEnvelopes(cached);
                setDegradedMode(true);
                setError(
                    cached.length > 0
                        ? 'Live budget sync is taking longer than expected. Showing the last known envelope snapshot.'
                        : 'Live budget sync is taking longer than expected. Recovery mode is active until Gabriel reconnects.'
                );
                setLoading(false);

                try {
                    const recovered = await liveRequest;
                    setEnvelopes(recovered);
                    setError(null);
                    setDegradedMode(false);
                } catch (err: any) {
                    console.error('Budget recovery fetch failed:', err);
                    setEnvelopes(financeApi.getCachedBudget());
                    setDegradedMode(true);
                    const message = err?.message || 'Failed to load budget envelopes';
                    setError(isAuthFailureMessage(message) ? null : message);
                }
                return;
            }

            setEnvelopes(timeoutResult.data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load budget:', err);
            setEnvelopes(financeApi.getCachedBudget());
            setDegradedMode(true);
            const message = err?.message || 'Failed to load budget envelopes';
            setError(isAuthFailureMessage(message) ? null : message);
        } finally {
            setLoading(false);
        }
    }

    const groupedEnvelopes = envelopes.reduce((groups, envelope) => {
        const group = envelope.group || 'Uncategorized';
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(envelope);
        return groups;
    }, {} as Record<string, BudgetEnvelope[]>);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800/50 bg-slate-900/50 p-4">
                <div>
                    <h2 className="text-lg font-semibold text-white">Monthly Budget</h2>
                    <p className="text-sm text-slate-500">Assign your income to envelopes</p>
                </div>
                <button
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-700"
                >
                    Manage Categories
                </button>
            </div>

            {error && (
                <div className={`rounded-xl border p-4 text-sm ${degradedMode ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-rose-500/20 bg-rose-500/10 text-rose-400'}`}>
                    <strong>{degradedMode ? 'Recovery mode:' : 'API error:'}</strong> {error}
                    {error.includes('401') && (
                        <p className="mt-1 text-xs text-rose-300/60">Your session may have expired. Try logging out and back in.</p>
                    )}
                </div>
            )}

            {loading && (
                <div className="flex items-center gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                        {envelopes.length > 0
                            ? 'Refreshing live finance data. Showing the last known envelope snapshot while Gabriel reconnects.'
                            : 'Connecting to live finance data. The envelope view will fail open if the backend stays slow.'}
                    </span>
                </div>
            )}

            {Object.entries(groupedEnvelopes).map(([groupName, groupEnvelopes]) => (
                <div key={groupName} className="overflow-hidden rounded-2xl border border-slate-800/50 bg-slate-900/50">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-6 py-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">{groupName}</h3>
                        <div className="font-mono text-xs text-slate-500">
                            Available: ${groupEnvelopes.reduce((sum, envelope) => sum + envelope.available, 0).toLocaleString()}
                        </div>
                    </div>
                    <div>
                        {groupEnvelopes.map((envelope) => (
                            <div key={envelope.id} className="group flex items-center border-b border-slate-800/50 px-6 py-4 transition-colors last:border-0 hover:bg-slate-800/30">
                                <div className="w-1/3 min-w-[200px]">
                                    <div className="font-medium text-slate-200">{envelope.category_name}</div>
                                </div>
                                <div className="grid flex-1 grid-cols-3 gap-4 text-right font-mono text-sm">
                                    <div className="text-right">
                                        <input
                                            type="number"
                                            className="w-24 border-b border-transparent bg-transparent text-right text-slate-400 transition-colors focus:border-emerald-500 focus:text-white focus:outline-none"
                                            defaultValue={envelope.assigned}
                                            onBlur={(event) => {
                                                const value = parseFloat(event.target.value);
                                                if (!Number.isNaN(value) && value !== envelope.assigned) {
                                                    void financeApi.updateEnvelope(envelope.id, value).then(() => loadBudget());
                                                }
                                            }}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.currentTarget.blur();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="text-rose-400">${Math.abs(envelope.activity).toLocaleString()}</div>
                                    <div className={`font-medium ${envelope.available < 0 ? 'text-rose-400' : envelope.available === 0 ? 'text-slate-500' : 'text-emerald-400'}`}>
                                        ${envelope.available.toLocaleString()}
                                    </div>
                                </div>
                                <div className="ml-6 w-32">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                                        <div
                                            className={`h-full rounded-full ${envelope.available < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, Math.abs(envelope.activity / (envelope.assigned || 1) * 100)) || 0}%` }}
                                        />
                                    </div>
                                </div>
                                <button className="ml-4 p-1 text-slate-600 opacity-0 transition-all hover:text-white group-hover:opacity-100">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {envelopes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-14 text-center text-slate-400">
                    <p className="text-sm font-medium text-slate-200">
                        {loading
                            ? 'Loading finance data...'
                            : degradedMode
                                ? 'Gabriel is online in degraded mode.'
                                : 'No budget envelopes found yet.'}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                        {loading
                            ? 'Live budget data is still loading. If the backend remains unavailable, this panel will stay usable instead of hanging.'
                            : degradedMode
                            ? 'Live finance data is unavailable, so the center pane is falling open with an empty envelope view instead of hanging.'
                            : 'Add a category to start budgeting.'}
                    </p>
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
