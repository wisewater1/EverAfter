import { useState } from 'react';
import { Search, Filter, ArrowDownUp } from 'lucide-react';

interface Transaction {
    id: string;
    date: string;
    payee: string;
    category: string;
    memo?: string;
    amount: number; // Negative for expense, positive for income
    cleared: boolean;
}

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: '1', date: '2023-11-15', payee: 'Starbucks', category: 'Dining Out', amount: -12.50, cleared: true },
    { id: '2', date: '2023-11-15', payee: 'Uber', category: 'Transport', amount: -24.00, cleared: true },
    { id: '3', date: '2023-11-14', payee: 'Whole Foods', category: 'Groceries', amount: -142.89, cleared: true },
    { id: '4', date: '2023-11-14', payee: 'Employer Inc', category: 'Income', amount: 3200.00, cleared: true },
    { id: '5', date: '2023-11-13', payee: 'Netflix', category: 'Subscriptions', amount: -15.99, cleared: true },
    { id: '6', date: '2023-11-12', payee: 'Amazon AWS', category: 'Business', amount: -64.20, cleared: false },
    { id: '7', date: '2023-11-10', payee: 'Shell Station', category: 'Transport', amount: -45.00, cleared: true },
];

export default function TransactionLedger() {
    const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

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
                {transactions.map(tx => (
                    <div key={tx.id} className="grid grid-cols-12 gap-4 px-6 py-3 hover:bg-slate-800/30 transition-colors items-center group cursor-default">
                        <div className="col-span-2 text-slate-400">{tx.date}</div>
                        <div className="col-span-3 font-medium text-slate-200">{tx.payee}</div>
                        <div className="col-span-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs border border-slate-700">
                                {tx.category}
                            </span>
                        </div>
                        <div className="col-span-2 text-slate-500 text-xs italic">{tx.memo}</div>
                        <div className={`col-span-2 text-right font-mono font-medium ${tx.amount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
