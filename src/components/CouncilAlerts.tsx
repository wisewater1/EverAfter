import { useState, useEffect } from 'react';
import { AlertCircle, Check, X, ShieldAlert, Calendar, Mail, FileText, Activity } from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface PendingIntercession {
    id: string;
    saint_id: string;
    description: string;
    tool_name: string;
    tool_kwargs: any;
    status: string;
    created_at: string;
}

export default function CouncilAlerts() {
    const [intercessions, setIntercessions] = useState<PendingIntercession[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const loadIntercessions = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getPendingIntercessions();
            setIntercessions(data);
        } catch (error) {
            console.error("Failed to load intercessions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIntercessions();

        // Simple polling for demo purposes (every 30 seconds)
        const interval = setInterval(loadIntercessions, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'deny') => {
        try {
            setProcessingId(id);
            await apiClient.processIntercession(id, action);

            // Remove from list or trigger reload
            setIntercessions(prev => prev.filter(i => i.id !== id));
        } catch (error) {
            console.error(`Failed to ${action} intercession:`, error);
        } finally {
            setProcessingId(null);
        }
    };

    const getSaintDetails = (saintId: string) => {
        switch (saintId.toLowerCase()) {
            case 'joseph': return { name: 'St. Joseph', color: 'text-amber-500', bg: 'bg-amber-500/10' };
            case 'gabriel': return { name: 'St. Gabriel', color: 'text-blue-500', bg: 'bg-blue-500/10' };
            case 'raphael': return { name: 'St. Raphael', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
            case 'michael': return { name: 'St. Michael', color: 'text-rose-500', bg: 'bg-rose-500/10' };
            default: return { name: 'Council Agent', color: 'text-indigo-500', bg: 'bg-indigo-500/10' };
        }
    };

    const getToolIcon = (toolName: string) => {
        if (toolName.includes('calendar')) return <Calendar className="w-4 h-4" />;
        if (toolName.includes('email')) return <Mail className="w-4 h-4" />;
        if (toolName.includes('health') || toolName.includes('activity')) return <Activity className="w-4 h-4" />;
        return <FileText className="w-4 h-4" />;
    };

    if (loading && intercessions.length === 0) {
        return (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex justify-center py-12">
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-slate-600" />
                    <span className="text-sm text-slate-500">Scanning Council Alerts...</span>
                </div>
            </div>
        );
    }

    if (intercessions.length === 0) {
        return (
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex justify-center py-12">
                <div className="flex flex-col items-center gap-2 opacity-50">
                    <ShieldAlert className="w-8 h-8 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-400">All Clear</span>
                    <span className="text-xs text-slate-500">No pending actions require your approval.</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-rose-500/20 rounded-3xl overflow-hidden relative shadow-2xl shadow-rose-500/5">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-500" />

            <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="relative">
                        <AlertCircle className="w-6 h-6 text-rose-400" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                        </span>
                    </div>
                    <div>
                        <h3 className="text-xl font-light text-white">Pending Intercessions</h3>
                        <p className="text-xs text-rose-400/80 font-medium uppercase tracking-widest">Action Required</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {intercessions.map(intercession => {
                        const saint = getSaintDetails(intercession.saint_id);
                        const isProcessing = processingId === intercession.id;

                        return (
                            <div
                                key={intercession.id}
                                className={`bg-white/5 border border-white/10 rounded-2xl p-5 relative overflow-hidden transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:border-white/20'}`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${saint.bg} ${saint.color}`}>
                                        <ShieldAlert className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${saint.color}`}>
                                                {saint.name}
                                            </span>
                                            <span className="text-slate-600">•</span>
                                            <span className="text-[10px] text-slate-500">
                                                {new Date(intercession.created_at).toLocaleString()}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-200 leading-relaxed mb-3">
                                            {intercession.description}
                                        </p>

                                        <div className="flex items-center gap-2 mb-4 bg-black/20 rounded-lg p-2 border border-white/5 inline-flex max-w-full overflow-hidden">
                                            <span className="text-slate-400 shrink-0">
                                                {getToolIcon(intercession.tool_name)}
                                            </span>
                                            <span className="text-xs font-mono text-indigo-300 truncate">
                                                {intercession.tool_name}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
                                    <button
                                        onClick={() => handleAction(intercession.id, 'deny')}
                                        disabled={isProcessing}
                                        className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <X className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(intercession.id, 'approve')}
                                        disabled={isProcessing}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        {isProcessing ? (
                                            <span className="w-4 h-4 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        Approve Action
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
