import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import type { FamilyMember } from '../../lib/joseph/genealogy';
import { getFamilyMembers } from '../../lib/joseph/genealogy';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

interface HealthDot {
    member_id: string;
    member_name: string;
    wellness_score: number;
    risk_level: 'low' | 'moderate' | 'high';
    colour: string;
    top_risk: Array<{ factor: string }>;
}

interface Props {
    onSelectMember?: (member: FamilyMember) => void;
}

const RISK_LABELS = {
    low: 'Good',
    moderate: 'Watch',
    high: 'At Risk',
};

export default function FamilyHealthHeatmap({ onSelectMember }: Props) {
    const [heatmap, setHeatmap] = useState<HealthDot[]>([]);
    const [loading, setLoading] = useState(true);
    const rawMembers = getFamilyMembers();

    useEffect(() => {
        loadHeatmap();
    }, []);

    async function loadHeatmap() {
        setLoading(true);
        try {
            const payload = rawMembers
                .filter(m => !m.deathDate)   // living only
                .map(m => ({
                    id: m.id,
                    firstName: m.firstName,
                    lastName: m.lastName,
                    traits: m.aiPersonality?.traits || [],
                    occupation: m.occupation,
                    generation: m.generation,
                    birthYear: m.birthDate ? new Date(m.birthDate).getFullYear() : undefined,
                }));

            const res = await fetch(`${API_BASE}/api/v1/causal-twin/ancestry/family-map`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members: payload }),
            });
            const data = await res.json();
            setHeatmap(data.family_map || []);
        } catch (e) {
            console.error('Family heatmap failed:', e);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="text-xs">Analysing family health...</span>
            </div>
        );
    }

    if (heatmap.length === 0) return null;

    const avg = heatmap.reduce((s, d) => s + d.wellness_score, 0) / heatmap.length;
    const avgLevel = avg >= 70 ? 'low' : avg >= 45 ? 'moderate' : 'high';
    const avgColour = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' }[avgLevel];

    return (
        <div className="rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-400" />
                    <span className="text-sm font-semibold text-white">Family Health Heatmap</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: avgColour }} />
                    <span className="text-xs text-slate-400">Family avg: {avg.toFixed(0)}/100</span>
                </div>
            </div>

            {/* Member grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {heatmap.map((dot) => {
                    const member = rawMembers.find(m => m.id === dot.member_id);
                    return (
                        <button
                            key={dot.member_id}
                            onClick={() => member && onSelectMember?.(member)}
                            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group text-left"
                        >
                            {/* Dot */}
                            <div
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-[#1a1a24] transition-transform group-hover:scale-110"
                                style={{ backgroundColor: dot.colour }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-white font-medium truncate">{dot.member_name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span
                                        className="text-[10px] font-bold"
                                        style={{ color: dot.colour }}
                                    >
                                        {RISK_LABELS[dot.risk_level]}
                                    </span>
                                    <span className="text-[10px] text-slate-600">·</span>
                                    <span className="text-[10px] text-slate-600">{dot.wellness_score.toFixed(0)}/100</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                {[
                    { colour: '#10b981', label: 'Low risk' },
                    { colour: '#f59e0b', label: 'Moderate' },
                    { colour: '#ef4444', label: 'High risk' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.colour }} />
                        <span className="text-[10px] text-slate-500">{l.label}</span>
                    </div>
                ))}
                <span className="ml-auto text-[10px] text-slate-600">Click member to predict</span>
            </div>
        </div>
    );
}
