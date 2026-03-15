import { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Key, ShieldAlert, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    approveJITAccessRequest,
    createJITAccessRequest,
    getJITAccessRequests,
    rejectJITAccessRequest,
    type JITAccessRequestRecord,
} from '../../lib/michael/security';

const DEFAULT_FORM = {
    targetResource: 'Production Database',
    reason: '',
    durationMinutes: 60,
};

function formatTimeRemaining(minutes: number) {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

export default function JITAccess() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<JITAccessRequestRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [showRequestForm, setShowRequestForm] = useState(false);
    const [form, setForm] = useState(DEFAULT_FORM);
    const [error, setError] = useState<string | null>(null);
    const trimmedTargetResource = form.targetResource.trim();
    const trimmedReason = form.reason.trim();
    const canSubmit = trimmedTargetResource.length > 0 && trimmedReason.length > 0;

    const loadRequests = async () => {
        try {
            setError(null);
            const data = await getJITAccessRequests();
            setRequests(data);
        } catch (loadError) {
            console.error('Failed to load JIT access requests:', loadError);
            setError('Unable to load JIT access requests right now.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadRequests();
        const interval = window.setInterval(() => {
            void loadRequests();
        }, 20000);
        return () => window.clearInterval(interval);
    }, []);

    const pendingCount = useMemo(
        () => requests.filter((request) => request.status === 'PENDING').length,
        [requests]
    );

    const handleCreateRequest = async () => {
        if (!trimmedTargetResource && !trimmedReason) {
            setError('Enter a target resource and a reason.');
            return;
        }

        if (!trimmedTargetResource) {
            setError('Target resource is required.');
            return;
        }

        if (!trimmedReason) {
            setError('Reason is required.');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await createJITAccessRequest({
                ...form,
                targetResource: trimmedTargetResource,
                reason: trimmedReason,
            });
            setForm(DEFAULT_FORM);
            setShowRequestForm(false);
            await loadRequests();
        } catch (createError) {
            console.error('Failed to create JIT request:', createError);
            setError('St. Anthony could not create that temporary access request.');
        } finally {
            setSaving(false);
        }
    };

    const handleDecision = async (requestId: string, decision: 'approve' | 'reject') => {
        try {
            setActioningId(requestId);
            setError(null);
            if (decision === 'approve') {
                await approveJITAccessRequest(requestId);
            } else {
                await rejectJITAccessRequest(requestId);
            }
            await loadRequests();
        } catch (decisionError) {
            console.error(`Failed to ${decision} JIT request:`, decisionError);
            setError(`Unable to ${decision} this request right now.`);
        } finally {
            setActioningId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl overflow-hidden relative">
                <div className="relative z-10 space-y-2 mb-6">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-500" />
                        Just-In-Time Access
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        Evidence-grade least privilege. Temporary, auto-expiring access paths are sealed into Anthony&apos;s verifier ledger and reviewable from the audit stream.
                    </p>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                    <button
                        onClick={() => {
                            setError(null);
                            setShowRequestForm((current) => !current);
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                        <Key className="w-4 h-4" />
                        {showRequestForm ? 'Hide Request Form' : 'Request Temporary Access'}
                    </button>
                    <button
                        onClick={() => navigate('/anthony-dashboard?tab=ledger&filter=jit_access')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors border border-slate-700"
                    >
                        View Access Ledger
                    </button>
                    <div className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950/70 text-xs text-slate-400">
                        Pending approvals: <span className="text-amber-400 font-medium">{pendingCount}</span>
                    </div>
                </div>

                {showRequestForm && (
                    <div className="mb-6 rounded-xl border border-slate-800 bg-[#0d1117] p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-wider text-slate-500">Target Resource</span>
                                <input
                                    value={form.targetResource}
                                    onChange={(event) => {
                                        setError(null);
                                        setForm((current) => ({ ...current, targetResource: event.target.value }));
                                    }}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs uppercase tracking-wider text-slate-500">Duration</span>
                                <select
                                    value={form.durationMinutes}
                                    onChange={(event) => setForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                                >
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>1 hour</option>
                                    <option value={180}>3 hours</option>
                                    <option value={480}>8 hours</option>
                                </select>
                            </label>
                            <div className="flex items-end">
                                <button
                                    onClick={handleCreateRequest}
                                    disabled={saving || !canSubmit}
                                    className="w-full rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 border border-emerald-500/30 px-3 py-2 text-sm font-medium transition-colors"
                                >
                                    {saving ? 'Submitting...' : canSubmit ? 'Submit Request' : 'Enter Reason to Submit'}
                                </button>
                            </div>
                        </div>
                        <label className="space-y-2 block">
                            <span className="text-xs uppercase tracking-wider text-slate-500">Reason</span>
                            <textarea
                                value={form.reason}
                                onChange={(event) => {
                                    setError(null);
                                    setForm((current) => ({ ...current, reason: event.target.value }));
                                }}
                                rows={3}
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500 resize-none"
                                placeholder="Explain why this temporary access path is required."
                            />
                        </label>
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 flex items-center justify-between gap-3">
                        <span className="text-sm text-rose-300">{error}</span>
                        <button
                            onClick={() => {
                                setLoading(true);
                                void loadRequests();
                            }}
                            className="px-3 py-1.5 rounded-md border border-rose-400/30 bg-rose-500/10 text-xs text-rose-200 hover:bg-rose-500/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="bg-[#0d1117] rounded-xl border border-slate-800/50 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-emerald-500" />
                            Active & Pending Requests
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {loading && (
                            <div className="p-6 text-sm text-slate-500 text-center">
                                Anthony is reading the access ledger...
                            </div>
                        )}

                        {!loading && requests.length === 0 && (
                            <div className="p-6 text-sm text-slate-500 text-center">
                                No JIT access requests recorded yet.
                            </div>
                        )}

                        {!loading && requests.map((request) => (
                            <div key={request.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-200">{request.targetResource}</span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                            request.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            request.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                            request.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                        }`}>
                                            {request.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <span className="text-slate-400">{request.userId}</span> - {request.reason}
                                    </div>
                                    <div className="text-[11px] text-slate-600">
                                        Created {new Date(request.createdAt).toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {(request.status === 'APPROVED' || request.status === 'PENDING') && (
                                        <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                            <Clock className="w-3 h-3" />
                                            {formatTimeRemaining(request.timeRemainingMinutes)}
                                        </div>
                                    )}
                                    {request.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => void handleDecision(request.id, 'approve')}
                                                disabled={actioningId === request.id}
                                                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded border border-green-500/20 transition-colors disabled:opacity-50"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => void handleDecision(request.id, 'reject')}
                                                disabled={actioningId === request.id}
                                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 transition-colors disabled:opacity-50"
                                                title="Reject"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
