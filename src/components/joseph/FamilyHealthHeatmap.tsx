import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import type { FamilyMember } from '../../lib/joseph/genealogy';
import { getFamilyMembers } from '../../lib/joseph/genealogy';
import { apiClient } from '../../lib/api-client';
import { requestBackendJson } from '../../lib/backend-request';

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
        void loadHeatmap();
    }, []);

    async function loadHeatmap() {
        setLoading(true);

        try {
            const payload = rawMembers
                .filter((member) => !member.deathDate)
                .map((member) => ({
                    id: member.id,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    traits: member.aiPersonality?.traits || [],
                    occupation: member.occupation,
                    generation: member.generation,
                    birthYear: member.birthDate ? new Date(member.birthDate).getFullYear() : undefined,
                }));

            const consentMap = Object.fromEntries(payload.map((member) => [member.id, true]));
            const jsonHeaders = await apiClient.getAuthHeaders({
                'Content-Type': 'application/json',
                'Bypass-Tunnel-Reminder': 'true',
            });
            const authHeaders = await apiClient.getAuthHeaders({
                'Bypass-Tunnel-Reminder': 'true',
            });

            let usedPrediction = false;

            try {
                const predData = await requestBackendJson<unknown>(
                    '/api/v1/health-predictions/predict-family',
                    {
                        method: 'POST',
                        headers: jsonHeaders,
                        body: JSON.stringify({ members: payload, consent_map: consentMap }),
                    },
                    'Unable to load Joseph family predictions',
                );

                const dots: HealthDot[] = (predData.member_predictions || [])
                    .filter((memberPrediction: unknown) => memberPrediction.consent_granted && memberPrediction.prediction)
                    .map((memberPrediction: unknown) => {
                        const prediction = memberPrediction.prediction;
                        const riskColors: Record<string, string> = {
                            low: '#10b981',
                            moderate: '#f59e0b',
                            high: '#ef4444',
                            critical: '#dc2626',
                        };

                        return {
                            member_id: memberPrediction.member_id,
                            member_name: memberPrediction.member_name,
                            wellness_score: Math.max(0, 100 - (prediction.predicted_value || 50)),
                            risk_level: prediction.risk_level || 'moderate',
                            colour: riskColors[prediction.risk_level] || '#f59e0b',
                            top_risk: (prediction.risk_factors || []).slice(0, 2),
                        };
                    });

                if (dots.length > 0) {
                    setHeatmap(dots);
                    usedPrediction = true;
                }
            } catch {
                // Prediction API unavailable. Fall through to the ancestry endpoint.
            }

            if (!usedPrediction) {
                const data = await requestBackendJson<unknown>(
                    '/api/v1/causal-twin/ancestry/family-map',
                    { headers: authHeaders },
                    'Unable to load Joseph family risk map',
                );
                setHeatmap(data.family_map || []);
            }
        } catch (error) {
            console.error('Family heatmap failed:', error);
            setHeatmap([]);
        } finally {
            setLoading(false);
        }
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

    const avg = heatmap.reduce((sum, dot) => sum + dot.wellness_score, 0) / heatmap.length;
    const avgLevel = avg >= 70 ? 'low' : avg >= 45 ? 'moderate' : 'high';
    const avgColour = { low: '#10b981', moderate: '#f59e0b', high: '#ef4444' }[avgLevel];

    return (
        <div className="rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 p-5 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28]">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {heatmap.map((dot) => {
                    const member = rawMembers.find((entry) => entry.id === dot.member_id);

                    return (
                        <button
                            key={dot.member_id}
                            onClick={() => member && onSelectMember?.(member)}
                            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group text-left"
                        >
                            <div
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-2 ring-offset-[#1a1a24] transition-transform group-hover:scale-110"
                                style={{ backgroundColor: dot.colour }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-white font-medium truncate">{dot.member_name}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className="text-[10px] font-bold" style={{ color: dot.colour }}>
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

            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                {[
                    { colour: '#10b981', label: 'Low risk' },
                    { colour: '#f59e0b', label: 'Moderate' },
                    { colour: '#ef4444', label: 'High risk' },
                ].map((legend) => (
                    <div key={legend.label} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: legend.colour }} />
                        <span className="text-[10px] text-slate-500">{legend.label}</span>
                    </div>
                ))}
                <span className="ml-auto text-[10px] text-slate-600">Click member to predict</span>
            </div>
        </div>
    );
}
