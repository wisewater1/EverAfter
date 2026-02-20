import { useState, useEffect } from 'react';
import { Search, Filter, ArrowDownUp, Loader2, Plus } from 'lucide-react';
import { financeApi, Transaction } from '../../lib/gabriel/finance';
import AddTransactionModal from './AddTransactionModal';

export default function TransactionLedger() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    async function loadTransactions() {
        try {
            setLoading(true);
            const data = await financeApi.getTransactions(50);
            setTransactions(data);
            setError(null);
        } catch (err: any) {
            console.error('Failed to load transactions:', err);
            setError(err?.message || 'Failed to load transaction ledger');
        } finally {
            setLoading(false);
        }
    }

    if (loading && transactions.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden text-sm">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors">
                        <Filter className="w-4 h-4" />
                        Filter
                    </button>
                    <button className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors">
                        <ArrowDownUp className="w-4 h-4" />
                        Sort
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium ml-2 shadow-lg shadow-emerald-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Date</div>
                <div className="col-span-3">Payee</div>
                <div className="col-span-3">Category</div>
                <div className="col-span-2">Memo</div>
                <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-800/50">
                {error && (
                    <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-sm">
                        <strong>⚠ API Error:</strong> {error}
                        {error.includes('401') && (
                            <p className="text-xs text-rose-300/60 mt-1">This usually means your session expired. Try logging out and back in.</p>
                        )}
                    </div>
                )}
                {transactions.map(tx => (
                    <div key={tx.id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors items-center group cursor-default">
                        <div className="col-span-2 text-slate-400">{new Date(tx.date).toLocaleDateString()}</div>
                        <div className="col-span-3 font-medium text-slate-200">{tx.payee}</div>
                        <div className="col-span-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs border border-slate-700">
                                {tx.category ? (tx.category as any).name : 'Uncategorized'}
                            </span>
                        </div>
                        <div className="col-span-2 text-slate-500 text-xs italic">{tx.description}</div>
                        <div className={`col-span-2 text-right font-mono font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                ))}
                {transactions.length === 0 && (
                    <div className="py-12 text-center text-slate-500">
                        No transactions found.
                    </div>
                )}
            </div>

            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onTransactionAdded={() => {
                    loadTransactions();
                }}
            />
        </div>
    );
}
