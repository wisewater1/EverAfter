/**
 * BehavioralNudgeEngine — Option 8
 * OCEAN × stress × budget real-time nudges.
 */
import { useState, useEffect } from 'react';
import { Zap, GitBranch, Heart, Wallet, Check, Clock, Loader2 } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

const PRIORITY_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
    immediate: { color: '#ef4444', icon: Zap, label: 'Now' },
    today: { color: '#f59e0b', icon: Clock, label: 'Today' },
    weekly: { color: '#10b981', icon: Check, label: 'This Week' },
};
const SAINT_COLORS: Record<string, string> = { joseph: '#f59e0b', raphael: '#14b8a6', gabriel: '#10b981' };

export default function BehavioralNudgeEngine() {
    const [data, setData] = useState<any>(null);
    const [dismissed, setDismissed] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => { (async () => { setData(await trinitySynapse('behavioral_nudge', {})); setLoading(false); })(); }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Generating nudges…</div>;
    if (!data) return null;

    const nudges = (data.nudges || []).filter((_: any, i: number) => !dismissed.has(i));

    return (
        <div className="rounded-2xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Smart Nudges</span>
                    <span className="text-[10px] text-slate-500">{nudges.length} active</span>
                </div>
            </div>

            <div className="space-y-2">
                {nudges.map((n: any, i: number) => {
                    const cfg = PRIORITY_CONFIG[n.priority] || PRIORITY_CONFIG.weekly;
                    const PIcon = cfg.icon;
                    return (
                        <div key={i} className="p-3 rounded-xl border transition-all" style={{ borderColor: cfg.color + '20', backgroundColor: cfg.color + '05' }}>
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: cfg.color + '20' }}>
                                    <PIcon className="w-3 h-3" style={{ color: cfg.color }} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-xs font-medium text-white">{n.title}</p>
                                        <span className="text-[8px] px-1 py-0.5 rounded font-bold uppercase" style={{ color: cfg.color, backgroundColor: cfg.color + '15' }}>{cfg.label}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-1.5">{n.message}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            {n.sources?.map((s: string) => (
                                                <span key={s} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SAINT_COLORS[s] || '#666' }} />
                                            ))}
                                        </div>
                                        <button onClick={() => setDismissed(prev => new Set([...prev, i]))} className="text-[9px] text-slate-500 hover:text-slate-300 ml-auto">Dismiss</button>
                                        <button className="text-[9px] px-2 py-0.5 rounded font-medium" style={{ color: cfg.color, backgroundColor: cfg.color + '15' }}>{n.action}</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
