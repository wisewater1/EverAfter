import { useState, useEffect } from 'react';
import {
    Shield,
    Activity,
    Search,
    RefreshCcw,
    CheckCircle2,
    AlertTriangle,
    XCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { requestBackendJson } from '../../lib/backend-request';
import { buildAccessTokenHeaders, isAuthFailureMessage } from '../../lib/auth-session';

interface MonitoringStatus {
    role: string;
    status: 'active' | 'warning' | 'error';
    integrity?: string;
    message: string;
    metrics: Record<string, string | number>;
}

interface SystemStatus {
    michael: MonitoringStatus;
    gabriel: MonitoringStatus;
    anthony: MonitoringStatus;
    timestamp: string;
}

export default function SaintsGuardian() {
    const { loading: authLoading, session } = useAuth();
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = async () => {
        if (authLoading || !session?.access_token) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const headers = await buildAccessTokenHeaders();
            const data = await requestBackendJson<SystemStatus>(
                '/api/v1/monitoring/status',
                {
                    method: 'GET',
                    headers,
                },
                'Unable to load Saints API guardian status.'
            );
            setStatus(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Monitoring failed", err);
            const message = err instanceof Error ? err.message : 'Unable to load Saints API guardian status.';
            setError(
                isAuthFailureMessage(message)
                    ? 'Your session is not ready yet. Live saint monitoring will resume automatically.'
                    : message
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (authLoading || !session?.access_token) {
            return;
        }

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [authLoading, session?.access_token]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'error': return <XCircle className="w-5 h-5 text-rose-400" />;
            default: return <Activity className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
            case 'error': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
            default: return 'bg-slate-800 border-slate-700 text-slate-400';
        }
    };

    const resolvedStatus: SystemStatus = status ?? {
        michael: {
            role: 'security',
            status: 'warning',
            integrity: '0%',
            message: 'Live monitoring unavailable. Using degraded status mode.',
            metrics: {},
        },
        gabriel: {
            role: 'finance',
            status: 'warning',
            message: 'Finance monitoring is temporarily unavailable.',
            metrics: {},
        },
        anthony: {
            role: 'audit',
            status: 'warning',
            message: 'Audit monitoring is temporarily unavailable.',
            metrics: {},
        },
        timestamp: lastUpdated.toISOString(),
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-200">Saints API Guardian</h3>
                        <p className="text-xs text-slate-500">Autonomous System Monitoring</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                    </span>
                    <button
                        onClick={fetchStatus}
                        className="hover:text-slate-300 transition-colors"
                        disabled={loading}
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    Recovery mode: {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 p-1 bg-slate-800/50">
                {/* St. Michael - Security */}
                <div className="bg-slate-900 p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-slate-300">St. Michael</span>
                        </div>
                        {getStatusIcon(resolvedStatus.michael.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{resolvedStatus.michael.message}</div>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: resolvedStatus.michael.integrity || '100%' }}
                            />
                        </div>
                        <span className="text-xs font-mono text-blue-400">{resolvedStatus.michael.integrity}</span>
                    </div>
                </div>

                {/* St. Gabriel - Finance */}
                <div className="bg-slate-900 p-4 hover:bg-slate-800/50 transition-colors border-l border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium text-slate-300">St. Gabriel</span>
                        </div>
                        {getStatusIcon(resolvedStatus.gabriel.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{resolvedStatus.gabriel.message}</div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="bg-slate-800/50 px-2 py-1 rounded text-slate-400">
                            DB: <span className="text-emerald-400 font-mono">{resolvedStatus.gabriel.metrics.db_latency ?? 'degraded'}</span>
                        </div>
                        <div className="bg-slate-800/50 px-2 py-1 rounded text-slate-400">
                            Orphans: <span className="text-emerald-400 font-mono">{resolvedStatus.gabriel.metrics.uncategorized_tx ?? 'unknown'}</span>
                        </div>
                    </div>
                </div>

                {/* St. Anthony - Lost/Found */}
                <div className="bg-slate-900 p-4 hover:bg-slate-800/50 transition-colors border-l border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Search className="w-4 h-4 text-amber-400" />
                            <span className="font-medium text-slate-300">St. Anthony</span>
                        </div>
                        {getStatusIcon(resolvedStatus.anthony.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{resolvedStatus.anthony.message}</div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>Errors: {resolvedStatus.anthony.metrics.system_errors ?? 'unknown'}</span>
                        <span>Recovered: {resolvedStatus.anthony.metrics.recovered_items ?? 'unknown'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
