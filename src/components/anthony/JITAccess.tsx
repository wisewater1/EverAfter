import { useState } from 'react';
import { Key, Clock, ShieldAlert, Check, X } from 'lucide-react';

export default function JITAccess() {
    const [requests, setRequests] = useState([
        { id: 'jit-001', user: 'system_admin', resource: 'Production Database', reason: 'Emergency fix in user engrams', status: 'APPROVED', timeRemaining: '45m' },
        { id: 'jit-002', user: 'auditor_external', resource: 'Audit Ledger DB', reason: 'Annual review sampling', status: 'PENDING', timeRemaining: null },
        { id: 'jit-003', user: 'dev_ops_1', resource: 'Backend Redis Cache', reason: 'Cache clearing post-deployment', status: 'EXPIRED', timeRemaining: '0m' },
    ]);

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl overflow-hidden relative">
                <div className="relative z-10 space-y-2 mb-6">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-amber-500" />
                        Just-In-Time Access
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        Evidence-grade least privilege. Temporary, auto-expiring access paths strictly logged in the verifier ledger.
                    </p>
                </div>

                <div className="flex gap-4 mb-6">
                    <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium text-sm rounded-lg transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                        <Key className="w-4 h-4" />
                        Request Temporary Access
                    </button>
                    <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-lg transition-colors border border-slate-700">
                        View Access Ledger
                    </button>
                </div>

                <div className="bg-[#0d1117] rounded-xl border border-slate-800/50 overflow-hidden">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                        <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-emerald-500" />
                            Active & Pending Requests
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                        {requests.map((req) => (
                            <div key={req.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-slate-200">{req.resource}</span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider ${req.status === 'APPROVED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                req.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        <span className="text-slate-400">{req.user}</span> &mdash; {req.reason}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {req.status === 'APPROVED' && (
                                        <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                                            <Clock className="w-3 h-3" />
                                            {req.timeRemaining}
                                        </div>
                                    )}
                                    {req.status === 'PENDING' && (
                                        <div className="flex gap-2">
                                            <button className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded border border-green-500/20 transition-colors" title="Approve">
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded border border-red-500/20 transition-colors" title="Reject">
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
