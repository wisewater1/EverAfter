import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface Envelope {
    id: string;
    name: string;
    assigned: number;
    activity: number;
    available: number;
    group: string;
}

const MOCK_BUDGET: Envelope[] = [
    { id: '1', name: 'Rent \/ Mortgage', assigned: 2500, activity: -2500, available: 0, group: 'Fixed Expenses' },
    { id: '2', name: 'Utilities', assigned: 300, activity: -150, available: 150, group: 'Fixed Expenses' },
    { id: '3', name: 'Groceries', assigned: 600, activity: -450, available: 150, group: 'Living Expenses' },
    { id: '4', name: 'Dining Out', assigned: 200, activity: -210, available: -10, group: 'Living Expenses' },
    { id: '5', name: 'Transport', assigned: 150, activity: -45, available: 105, group: 'Living Expenses' },
    { id: '6', name: 'Emergency Fund', assigned: 500, activity: 0, available: 12500, group: 'Savings Goals' },
    { id: '7', name: 'Vacation Fund', assigned: 200, activity: 0, available: 1400, group: 'Savings Goals' },
    { id: '8', name: 'Investments', assigned: 1000, activity: -1000, available: 0, group: 'Savings Goals' },
];

export default function BudgetEnvelopes() {
    const [envelopes] = useState<Envelope[]>(MOCK_BUDGET);
    const groups = Array.from(new Set(envelopes.map(e => e.group)));

    return (
        <div className="space-y-8">
            {groups.map(group => (
                <div key={group} className="bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
                    <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{group}</h3>
                        <div className="text-xs text-slate-500 font-mono">
                            Available: ${envelopes.filter(e => e.group === group).reduce((sum, e) => sum + e.available, 0).toLocaleString()}
                        </div>
                    </div>
                    <div>
                        {envelopes.filter(e => e.group === group).map(env => (
                            <div key={env.id} className="flex items-center px-6 py-4 hover:bg-slate-800/30 transition-colors border-b border-slate-800/50 last:border-0 group">
                                <div className="w-1/3 min-w-[200px]">
                                    <div className="font-medium text-slate-200">{env.name}</div>
                                </div>
                                <div className="flex-1 grid grid-cols-3 gap-4 text-right font-mono text-sm">
                                    <div className="text-slate-400">${env.assigned.toLocaleString()}</div>
                                    <div className="text-slate-400">${Math.abs(env.activity).toLocaleString()}</div>
                                    <div className={`font-medium ${env.available < 0 ? 'text-rose-400' : env.available === 0 ? 'text-slate-500' : 'text-emerald-400'}`}>
                                        ${env.available.toLocaleString()}
                                    </div>
                                </div>
                                <div className="w-32 ml-6">
                                    {/* Progress Bar */}
                                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${env.available < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${Math.min(100, Math.abs(env.activity / env.assigned * 100)) || 0}%` }}
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
        </div>
    );
}
