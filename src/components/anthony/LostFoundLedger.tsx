import { useEffect, useMemo, useState } from 'react';
import { FileText, CheckCircle, Clock, Filter, Download, Shield, Search } from 'lucide-react';
import { downloadAnthonyLedgerExport, getAnthonyLedger, type AuditLedgerEntry } from '../../lib/michael/security';

interface LedgerItem {
    id: string;
    description: string;
    category: 'data' | 'memory' | 'security' | 'financial';
    status: 'restored' | 'searching' | 'verified' | 'archived';
    date: string;
    value: string;
    raw: AuditLedgerEntry;
}

const FALLBACK_LEDGER: LedgerItem[] = [
    {
        id: 'fallback-1',
        description: 'Awaiting live audit handoff from St. Michael',
        category: 'security',
        status: 'searching',
        date: new Date().toISOString(),
        value: 'Pending',
        raw: { id: 'fallback-1', action: 'audit/anthony_waiting_for_scan', ts: new Date().toISOString() },
    },
];

function mapLedgerCategory(action: string): LedgerItem['category'] {
    if (action.includes('finance')) return 'financial';
    if (action.includes('memory') || action.includes('engram')) return 'memory';
    if (action.includes('data')) return 'data';
    return 'security';
}

function mapLedgerStatus(action: string): LedgerItem['status'] {
    if (action.includes('received') || action.includes('completed') || action.includes('verified')) return 'verified';
    if (action.includes('searching') || action.includes('pending')) return 'searching';
    if (action.includes('restored') || action.includes('recovered')) return 'restored';
    return 'archived';
}

function mapLedgerValue(entry: AuditLedgerEntry) {
    const findingsCount = entry.metadata?.findings_count;
    if (typeof findingsCount === 'number' && findingsCount > 0) {
        return findingsCount >= 3 ? 'Critical' : 'High';
    }

    const integrity = entry.metadata?.system_integrity;
    if (typeof integrity === 'number') {
        return `${integrity}%`;
    }

    return 'Verified';
}

function formatLedgerDescription(entry: AuditLedgerEntry) {
    if (entry.action === 'security/michael_full_scan_completed') {
        return 'St. Michael full application gauntlet completed';
    }
    if (entry.action === 'audit/anthony_scan_received') {
        return 'St. Anthony received St. Michael scan for auditing';
    }

    return entry.action.replaceAll('_', ' ').replaceAll('/', ' / ');
}

function toLedgerItem(entry: AuditLedgerEntry): LedgerItem {
    return {
        id: entry.id,
        description: formatLedgerDescription(entry),
        category: mapLedgerCategory(entry.action),
        status: mapLedgerStatus(entry.action),
        date: entry.ts || new Date().toISOString(),
        value: mapLedgerValue(entry),
        raw: entry,
    };
}

interface LostFoundLedgerProps {
    filterToken?: string;
}

export default function LostFoundLedger({ filterToken }: LostFoundLedgerProps) {
    const [items, setItems] = useState<LedgerItem[]>(FALLBACK_LEDGER);
    const [loading, setLoading] = useState(true);
    const [localFilter, setLocalFilter] = useState<'all' | 'security' | 'jit' | 'michael'>('all');
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        let mounted = true;

        const loadLedger = async () => {
            setLoading(true);
            try {
                const entries = await getAnthonyLedger(50);
                if (!mounted) return;

                const mapped = entries
                    .map(toLedgerItem)
                    .filter((item) =>
                        item.raw.provider === 'st_anthony' ||
                        item.raw.provider === 'st_michael' ||
                        item.description.toLowerCase().includes('audit') ||
                        item.description.toLowerCase().includes('scan')
                    );

                setItems(mapped.length > 0 ? mapped : FALLBACK_LEDGER);
            } catch (error) {
                console.error('Failed to load Anthony ledger:', error);
                if (mounted) {
                    setItems(FALLBACK_LEDGER);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        void loadLedger();
        const interval = window.setInterval(loadLedger, 20000);
        return () => {
            mounted = false;
            window.clearInterval(interval);
        };
    }, []);

    const filteredItems = useMemo(() => {
        let nextItems = items;

        if (filterToken) {
            const normalizedToken = filterToken.toLowerCase();
            nextItems = nextItems.filter((item) =>
                item.description.toLowerCase().includes(normalizedToken) ||
                item.raw.action.toLowerCase().includes(normalizedToken) ||
                item.raw.id.toLowerCase().includes(normalizedToken)
            );
        }

        if (localFilter === 'security') {
            nextItems = nextItems.filter((item) => item.category === 'security');
        } else if (localFilter === 'jit') {
            nextItems = nextItems.filter((item) => item.raw.action.toLowerCase().includes('jit_access'));
        } else if (localFilter === 'michael') {
            nextItems = nextItems.filter((item) => item.raw.provider === 'st_michael');
        }

        return nextItems;
    }, [filterToken, items, localFilter]);

    const visibleItems = filteredItems;

    const cycleFilter = () => {
        setLocalFilter((current) => {
            if (current === 'all') return 'security';
            if (current === 'security') return 'jit';
            if (current === 'jit') return 'michael';
            return 'all';
        });
    };

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const blob = await downloadAnthonyLedgerExport();
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `anthony-ledger-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download Anthony ledger export:', error);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-medium text-slate-200">Transaction Ledger</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-medium border border-slate-700">
                        {visibleItems.length} Items
                    </span>
                    {filterToken && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                            Filter: {filterToken}
                        </span>
                    )}
                    {localFilter !== 'all' && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 text-xs font-medium border border-sky-500/20">
                            View: {localFilter}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={cycleFilter}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                        title={`Cycle filter (current: ${localFilter})`}
                    >
                        <Filter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Download ledger proof package"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="divide-y divide-slate-800/50">
                {loading && (
                    <div className="p-8 text-center text-slate-500 text-sm">
                        St. Anthony is verifying the latest ledger proofs...
                    </div>
                )}

                {!loading && visibleItems.map((item) => (
                    <div
                        key={item.id}
                        className={`p-4 hover:bg-slate-800/30 transition-colors flex items-center justify-between group ${filterToken && (
                            item.description.toLowerCase().includes(filterToken.toLowerCase()) ||
                            item.raw.action.toLowerCase().includes(filterToken.toLowerCase())
                        ) ? 'bg-amber-500/5' : ''}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${item.status === 'restored' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                item.status === 'searching' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                    item.status === 'verified' ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' :
                                        'bg-slate-700/10 border-slate-700/20 text-slate-400'
                                }`}>
                                {item.status === 'restored' && <CheckCircle className="w-5 h-5" />}
                                {item.status === 'searching' && <Clock className="w-5 h-5 animate-pulse" />}
                                {item.status === 'verified' && <Shield className="w-5 h-5" />}
                                {item.status === 'archived' && <FileText className="w-5 h-5 text-slate-500" />}
                            </div>
                            <div>
                                <h3 className="text-slate-200 font-medium">{item.description}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</span>
                                    <span className="text-xs text-slate-600">•</span>
                                    <span className="text-xs text-slate-400 uppercase tracking-wider">{item.category}</span>
                                    {item.raw.provider && (
                                        <>
                                            <span className="text-xs text-slate-600">•</span>
                                            <span className="text-xs text-amber-400 uppercase tracking-wider">{item.raw.provider}</span>
                                        </>
                                    )}
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
                            <div className="w-28 text-right">
                                <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'restored' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
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

                {!loading && visibleItems.length === 0 && (
                    <div className="p-8 text-center text-slate-500">
                        <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No Anthony ledger entries match that filter.</p>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 text-center text-xs text-slate-500">
                Showing {visibleItems.length} most recent ledger entries
            </div>
        </div>
    );
}
