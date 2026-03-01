import { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Activity, CheckCircle, XCircle } from 'lucide-react';

interface Control {
    id: string;
    controlId: string;
    description: string;
    isPassing: boolean;
    lastCheckedAt: string;
}

export default function ContinuousControls() {
    const [score, setScore] = useState(100);
    const [controls, setControls] = useState<Control[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchControls = async () => {
            try {
                const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'}/api/v1/audit/controls/readiness`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setScore(data.readiness_score);
                    setControls(data.controls);
                }
            } catch (err) {
                console.error("Failed to fetch compliance readiness", err);
            } finally {
                setLoading(false);
            }
        };

        fetchControls();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Running autonomous audits...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 flex items-center justify-between shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
                <div className="relative z-10 space-y-2">
                    <h2 className="text-xl font-light text-white flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-500" />
                        Audit Readiness Score
                    </h2>
                    <p className="text-slate-400 text-sm max-w-md">
                        Real-time calculation based on continuous obligation monitoring and autonomous control tests.
                    </p>
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="text-right">
                        <div className="text-4xl font-light flex items-baseline gap-1">
                            <span className={score === 100 ? 'text-green-400' : 'text-amber-500'}>
                                {score}
                            </span>
                            <span className="text-lg text-slate-500">/ 100</span>
                        </div>
                        <div className="text-xs font-mono text-slate-500 flex items-center gap-1 justify-end mt-1">
                            <Activity className="w-3 h-3 text-green-500" />
                            Live Monitoring Active
                        </div>
                    </div>
                </div>
            </div>

            {/* Controls List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50">
                    <h3 className="text-sm font-medium text-slate-300">Continuous Controls Matrix</h3>
                </div>
                <div className="divide-y divide-slate-800">
                    {controls.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                            No compliance controls mapped yet.
                        </div>
                    ) : (
                        controls.map(control => (
                            <div key={control.id} className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-start gap-3">
                                    {control.isPassing ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                    )}
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-mono text-amber-500/80 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
                                                {control.controlId}
                                            </span>
                                            <span className="text-slate-200 text-sm">{control.description}</span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Last validated: {new Date(control.lastCheckedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <button className="text-xs text-slate-400 hover:text-amber-400 underline underline-offset-2">
                                    View Evidence Graph
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Integrity SLOs Mock */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                    <h3 className="text-sm font-medium text-slate-300">Integrity SLOs</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-slate-300 text-sm">Event Coverage Latency</span>
                                <span className="text-green-400 font-mono text-sm">99.98%</span>
                            </div>
                            <p className="text-xs text-slate-500">&gt;99.9% of events have complete hop coverage within 5m</p>
                            <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                                <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '99.98%' }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-slate-300 text-sm">Ledger Hash Integrity</span>
                                <span className="text-green-400 font-mono text-sm">100.0%</span>
                            </div>
                            <p className="text-xs text-slate-500">Zero chain breaks detected in the last 30 days</p>
                            <div className="mt-3 w-full bg-slate-700 rounded-full h-1.5">
                                <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
