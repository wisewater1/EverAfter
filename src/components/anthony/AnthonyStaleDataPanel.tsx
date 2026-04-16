/**
 * AnthonyStaleDataPanel — St. Anthony's "Finder of Lost Things" DHT integration.
 *
 * St. Anthony surfaces stale, missing, and low-confidence data in the user's
 * Delphi Health Trajectory. He "finds" what is lost: measurements that haven't
 * been updated, data gaps causing uncertainty, and tells the user what to
 * recollect or reconnect to restore trajectory confidence.
 */
import { useState, useEffect } from 'react';
import { Search, AlertTriangle, Clock, CheckCircle, Loader2, RefreshCw, ExternalLink, Database } from 'lucide-react';
import { getDHT, getNextBestMeasurement, getLeadingIndicators } from '../../lib/dhtApi';
import { useNavigate } from 'react-router-dom';

const STALENESS_COLORS: Record<string, string> = {
    fresh: '#10b981',
    aging: '#f59e0b',
    stale: '#ef4444',
    missing: '#6b7280',
};

function classifyStaleness(freshness: number): 'fresh' | 'aging' | 'stale' | 'missing' {
    if (freshness <= 0) return 'missing';
    if (freshness < 3600) return 'fresh';        // < 1 hour
    if (freshness < 86400) return 'aging';       // < 1 day
    return 'stale';                              // > 1 day
}

function formatAge(seconds: number): string {
    if (seconds <= 0) return 'no data';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

interface AnthonyStaleDataPanelProps {
    personId: string;
}

export default function AnthonyStaleDataPanel({ personId }: AnthonyStaleDataPanelProps) {
    const [dht, setDht] = useState<unknown>(null);
    const [nbm, setNbm] = useState<unknown>(null);
    const [indicators, setIndicators] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    async function load(soft = false) {
        if (soft) setRefreshing(true); else setLoading(true);
        const [dhtResp, nbmResp, indResp] = await Promise.all([
            getDHT(personId),
            getNextBestMeasurement(personId),
            getLeadingIndicators(personId),
        ]);
        setDht(dhtResp?.dht || null);
        setNbm(nbmResp?.next_best || null);
        setIndicators(indResp?.indicators || []);
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => { load(); }, [personId]);

    if (loading) return (
        <div className="flex items-center gap-2 p-4 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />St. Anthony scanning for lost data…
        </div>
    );

    const freshnessSeconds = dht?.data_freshness_seconds || 0;
    const obsCount = dht?.observation_count || 0;
    const confidence = dht?.confidence || 0;
    const quality = dht?.data_quality || 'empty';
    const stalenessKey = classifyStaleness(freshnessSeconds);
    const stalenessColor = STALENESS_COLORS[stalenessKey];

    // Build "lost items" list — things Anthony needs to find
    const lostItems: Array<{ label: string; detail: string; severity: string; action?: string }> = [];

    if (stalenessKey === 'stale' || stalenessKey === 'missing') {
        lostItems.push({
            label: 'Trajectory data is stale',
            detail: `Last update: ${formatAge(freshnessSeconds)}. Anthony needs fresh readings to restore accuracy.`,
            severity: 'high',
            action: 'Log a measurement in the Delphi tab',
        });
    }
    if (obsCount < 5) {
        lostItems.push({
            label: 'Insufficient observation history',
            detail: `Only ${obsCount} data point${obsCount !== 1 ? 's' : ''} recorded. Anthony needs at least 5 to establish a trajectory baseline.`,
            severity: 'moderate',
            action: 'Connect a health device or log vitals manually',
        });
    }
    if (confidence < 0.4) {
        lostItems.push({
            label: 'High trajectory uncertainty',
            detail: `Model confidence is ${Math.round(confidence * 100)}%. Anthony cannot locate a reliable signal in the noise.`,
            severity: 'moderate',
            action: nbm ? `Measure ${nbm.label} to reduce uncertainty by ~${nbm.uncertainty_reduction_pct?.toFixed(0)}%` : 'Add key measurements to improve accuracy',
        });
    }

    // Stale leading indicators (no recent delta)
    const staleIndicators = indicators.filter((ind: unknown) => ind.delta_7d === undefined || ind.delta_7d === null);
    if (staleIndicators.length > 0) {
        staleIndicators.forEach((ind: unknown) => {
            lostItems.push({
                label: `Missing: ${ind.label} trend`,
                detail: `No 7-day delta available. Anthony cannot track momentum for this signal.`,
                severity: 'low',
            });
        });
    }

    return (
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/15 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center">
                        <Search className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white">Anthony's Health Recovery Scan</p>
                        <p className="text-[10px] text-slate-500">Finding lost data in your Delphi trajectory</p>
                    </div>
                </div>
                <button onClick={() => load(true)} disabled={refreshing}
                    className="p-1 text-slate-600 hover:text-slate-400 disabled:opacity-40 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="p-5 space-y-4">
                {/* Data quality status bar */}
                <div className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                        <Database className="w-3 h-3 text-slate-500" />
                        <span className="text-slate-500">Data quality:</span>
                        <span className="font-bold capitalize" style={{ color: quality === 'good' ? '#10b981' : quality === 'fair' ? '#f59e0b' : '#6b7280' }}>
                            {quality}
                        </span>
                        <span className="text-slate-600">·</span>
                        <span className="text-slate-500">{obsCount} observations</span>
                        <span className="text-slate-600">·</span>
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span style={{ color: stalenessColor }}>{formatAge(freshnessSeconds)}</span>
                    </div>
                    <button onClick={() => navigate('/health')}
                        className="flex items-center gap-1 text-amber-400 font-bold hover:text-amber-300 transition-colors">
                        <ExternalLink className="w-3 h-3" /> Open Delphi
                    </button>
                </div>

                {/* Lost items */}
                {lostItems.length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-emerald-300">Anthony found nothing missing</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                                Your Delphi trajectory is fresh, well-sampled, and high-confidence. All health data accounted for.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Search className="w-3 h-3" /> {lostItems.length} item{lostItems.length !== 1 ? 's' : ''} found missing
                        </p>
                        {lostItems.map((item, i) => {
                            const sevColor = item.severity === 'high' ? '#ef4444' : item.severity === 'moderate' ? '#f59e0b' : '#6b7280';
                            return (
                                <div key={i} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: sevColor }} />
                                        <span className="text-xs font-semibold text-white">{item.label}</span>
                                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded"
                                            style={{ color: sevColor, backgroundColor: sevColor + '15' }}>
                                            {item.severity}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">{item.detail}</p>
                                    {item.action && (
                                        <p className="text-[10px] text-amber-400/80 font-medium">
                                            🔍 {item.action}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Next best measurement (from DHT) */}
                {nbm && (
                    <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[9px] uppercase tracking-wider text-amber-600 mb-1.5 font-bold">Anthony's Priority Recovery</p>
                        <p className="text-xs font-bold text-white">{nbm.label}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{nbm.reason}</p>
                        <p className="text-[10px] text-amber-400 mt-1.5 font-semibold">
                            -{nbm.uncertainty_reduction_pct?.toFixed(0)}% uncertainty if measured now
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
