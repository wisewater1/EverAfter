import { useState } from 'react';
import { FileText, CheckCircle, Clock, Plus, Filter, Download } from 'lucide-react';

interface LedgerItem {
    id: string;
    description: string;
    category: 'data' | 'memory' | 'security' | 'financial';
    status: 'restored' | 'searching' | 'verified' | 'archived';
    date: string;
    value: string; // e.g., "High Importance" or actual value
}

const MOCK_LEDGER: LedgerItem[] = [
    { id: '1', description: 'Recovered 3 deleted contacts', category: 'data', status: 'restored', date: '2023-10-24', value: 'Medium' },
    { id: '2', description: 'Deep Memory Scan: Sector 7', category: 'memory', status: 'verified', date: '2023-10-23', value: 'High' },
    { id: '3', description: 'Lost Connection Logtrace', category: 'security', status: 'searching', date: '2023-10-24', value: 'Low' },
    { id: '4', description: 'Orphaned File Link Cleanup', category: 'data', status: 'restored', date: '2023-10-22', value: 'Low' },
    { id: '5', description: 'Legacy Vault Integrity Check', category: 'security', status: 'verified', date: '2023-10-21', value: 'Critical' },
];

export default function LostFoundLedger() {
    const [items, setItems] = useState<LedgerItem[]>(MOCK_LEDGER);

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-medium text-slate-200">Transaction Ledger</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                        {items.length} Items
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Filter className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                        <Download className="w-4 h-4" />
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-amber-900/20">
                        <Plus className="w-4 h-4" />
                        Report Lost Item
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-800/50">
                {items.map((item) => (
                    <div key={item.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group cursor-pointer">
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.status === 'restored' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                item.status === 'searching' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    item.status === 'verified' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                        'bg-slate-700/10 border-slate-700/20 text-slate-400'
                                }`}>
                                {item.status === 'restored' && <CheckCircle className="w-5 h-5" />}
                                {item.status === 'searching' && <Clock className="w-5 h-5 animate-pulse" />}
                                {item.status === 'verified' && <FileText className="w-5 h-5" />}
                                {item.status === 'archived' && <CheckCircle className="w-5 h-5 text-slate-500" />}
                            </div>
                            <div>
                                <h3 className="text-slate-200 font-medium">{item.description}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">{item.date}</span>
                                    <span className="text-xs text-slate-600">•</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">{item.category}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className={`text-sm font-medium ${item.value === 'Critical' ? 'text-rose-400' :
                                    item.value === 'High' ? 'text-amber-400' :
                                        'text-slate-400'
                                    }`}>
                                    {item.value}
                                </span>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Impact</p>
                            </div>
                            <div className="w-24 text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'restored' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    item.status === 'searching' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                        item.status === 'verified' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                            'bg-slate-700/30 text-slate-400 border border-slate-700/30'
                                    }`}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {/* Footer / Pagination */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center text-xs text-slate-500">
                Showing {items.length} most recent ledger entries
            </div>
        </div>
    );
}
