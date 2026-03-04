/**
 * EmergencyAlertChain — Option 4
 * Raphael triggers → Gabriel checks funds → Joseph finds next-of-kin.
 */
import { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Wallet, GitBranch, Shield, Loader2 } from 'lucide-react';
import { trinitySynapse } from './trinityApi';

export default function EmergencyAlertChain() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const d = await trinitySynapse('emergency_alert', {});
            setData(d);
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="flex items-center gap-2 text-xs text-slate-500 p-4"><Loader2 className="w-4 h-4 animate-spin" />Checking emergency chain…</div>;
    if (!data) return null;

    const cascade = data.cascade || {};
    const steps = [
        { key: 'raphael', icon: Heart, color: '#14b8a6', label: 'St. Raphael — Health Signal', data: cascade.raphael },
        { key: 'gabriel', icon: Wallet, color: '#10b981', label: 'St. Gabriel — Emergency Fund', data: cascade.gabriel },
        { key: 'joseph', icon: GitBranch, color: '#f59e0b', label: 'St. Joseph — Next-of-Kin', data: cascade.joseph },
    ];

    const alertColors: Record<string, string> = { critical: 'border-rose-500/30 bg-rose-500/5', high: 'border-amber-500/30 bg-amber-500/5', moderate: 'border-teal-500/30 bg-teal-500/5' };

    return (
        <div className={`rounded-2xl border p-5 ${alertColors[data.alert_level] || alertColors.moderate}`}>
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className={`w-4 h-4 ${data.alert_level === 'critical' ? 'text-rose-400' : data.alert_level === 'high' ? 'text-amber-400' : 'text-teal-400'}`} />
                <span className="text-sm font-semibold text-white">Emergency Alert Chain</span>
                <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded ${data.alert_level === 'critical' ? 'text-rose-400 bg-rose-500/20' : data.alert_level === 'high' ? 'text-amber-400 bg-amber-500/20' : 'text-teal-400 bg-teal-500/20'}`}>
                    {data.alert_level}
                </span>
            </div>

            <div className="space-y-3">
                {steps.map(({ key, icon: Icon, color, label, data: stepData }) => (
                    <div key={key} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + '15' }}>
                            <Icon className="w-3 h-3" style={{ color }} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color }}>{label}</p>
                            <p className="text-xs text-slate-400">{stepData?.message || 'Waiting…'}</p>
                            {key === 'joseph' && stepData?.next_of_kin?.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                    {stepData.next_of_kin.map((kin: any, i: number) => (
                                        <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/10">{kin.name} ({kin.relationship})</span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="text-[10px] text-slate-600">Step {stepData?.step}</span>
                    </div>
                ))}
            </div>

            <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                    <p className="text-xs text-slate-400">{data.recommended_action}</p>
                </div>
            </div>
        </div>
    );
}
