import { useState } from 'react';
import { Network, Database, Server, Smartphone, Lock, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DataFlowMap() {
    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-2 mb-8">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <Network className="w-5 h-5 text-amber-500" />
                        Dynamic Data Flow Map
                    </h2>
                    <p className="text-slate-400 text-sm max-w-2xl">
                        Automatically generated ePHI flow map highlighting every hop, system, and boundary where sensitive data is created, received, maintained, or transmitted.
                    </p>
                </div>

                <div className="relative h-[400px] w-full border border-slate-800/50 rounded-xl bg-slate-950 flex items-center justify-center p-8 overflow-hidden">
                    {/* Simulated Graph/Nodes */}

                    {/* Source Node */}
                    <div className="absolute left-8 top-1/3 flex flex-col items-center gap-2 transform -translate-y-1/2">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center relative glow">
                            <Smartphone className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Mobile App</span>
                    </div>

                    {/* API Gateway */}
                    <div className="absolute left-1/3 top-1/2 flex flex-col items-center gap-2 transform -translate-y-1/2 -translate-x-1/2">
                        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                            <Lock className="w-8 h-8 text-amber-500" />
                        </div>
                        <span className="text-xs text-slate-400 font-mono text-center">API Gateway<br /><span className="text-[10px] text-green-400">Validated</span></span>
                    </div>

                    {/* Processing Node */}
                    <div className="absolute right-1/3 top-1/3 flex flex-col items-center gap-2 transform -translate-y-1/2">
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center relative">
                            <Server className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Saint Runtime</span>
                    </div>

                    {/* Database Node */}
                    <div className="absolute right-8 top-1/2 flex flex-col items-center gap-2 transform -translate-y-1/2">
                        <div className="w-16 h-16 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-center relative">
                            <Database className="w-6 h-6 text-green-400" />
                        </div>
                        <span className="text-xs text-slate-400 font-mono">Postgres</span>
                    </div>

                    {/* Connection Lines (SVG) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                        <defs>
                            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.5" />
                            </linearGradient>
                            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.5" />
                            </linearGradient>
                            <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
                            </linearGradient>
                        </defs>

                        {/* Mobile to API */}
                        <path d="M 120 133 Q 200 133 260 200" fill="none" stroke="url(#grad1)" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_20s_linear_infinite]" />

                        {/* API to Processing */}
                        <path d="M 340 200 Q 450 133 580 133" fill="none" stroke="url(#grad2)" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_20s_linear_infinite]" />

                        {/* API to DB */}
                        <path d="M 340 220 Q 500 250 780 200" fill="none" stroke="url(#grad3)" strokeWidth="2" strokeDasharray="5,5" className="animate-[dash_20s_linear_infinite]" />
                    </svg>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                    <h4 className="text-sm font-medium text-slate-200">Change-triggered Re-attestation Active</h4>
                    <p className="text-xs text-slate-400 mt-1">If a new service is added or data routing changes, St. Anthony will flag the data map and update the evidence pack automatically.</p>
                </div>
            </div>
        </div>
    );
}
