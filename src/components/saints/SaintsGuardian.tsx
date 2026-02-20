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
import { financeApi } from '../../lib/gabriel/finance';

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
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchStatus = async () => {
        try {
            setLoading(true);
            // We can reuse financeApi's fetchWithAuth or create a new client
            // Since we need to hit a new endpoint, we'll use a direct fetch with the token
            // But for simplicity let's assume we can add a method to financeApi or use fetchWithAuth exposed
            // actually, let's just use the fetchWithAuth from finance.ts if we can, or replicate it

            // To be safe and clean, we'll import the auth logic or just assume the financeApi can be extended
            // For this specific widget, I'll extend financeApi in a separate step, but for now let's use a direct fetch
            // assuming we have the token in localStorage or similar? No, Supabase handles it.

            // Let's use the same pattern as finance.ts for now
            const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession());
            const token = session?.access_token;

            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

            const response = await fetch(`${API_BASE}/api/v1/monitoring/status`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                setStatus(data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Monitoring failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

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

    if (!status) return null;

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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-1 p-1 bg-slate-800/50">
                {/* St. Michael - Security */}
                <div className="bg-slate-900 p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="font-medium text-slate-300">St. Michael</span>
                        </div>
                        {getStatusIcon(status.michael.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{status.michael.message}</div>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{ width: status.michael.integrity || '100%' }}
                            />
                        </div>
                        <span className="text-xs font-mono text-blue-400">{status.michael.integrity}</span>
                    </div>
                </div>

                {/* St. Gabriel - Finance */}
                <div className="bg-slate-900 p-4 hover:bg-slate-800/50 transition-colors border-l border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-emerald-400" />
                            <span className="font-medium text-slate-300">St. Gabriel</span>
                        </div>
                        {getStatusIcon(status.gabriel.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{status.gabriel.message}</div>
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="bg-slate-800/50 px-2 py-1 rounded text-slate-400">
                            DB: <span className="text-emerald-400 font-mono">{status.gabriel.metrics.db_latency}</span>
                        </div>
                        <div className="bg-slate-800/50 px-2 py-1 rounded text-slate-400">
                            Orphans: <span className="text-emerald-400 font-mono">{status.gabriel.metrics.uncategorized_tx}</span>
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
                        {getStatusIcon(status.anthony.status)}
                    </div>
                    <div className="text-sm text-slate-400 mb-2 min-h-[40px]">{status.anthony.message}</div>
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                        <span>Errors: {status.anthony.metrics.system_errors}</span>
                        <span>Recovered: {status.anthony.metrics.recovered_items}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
