import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { X, Brain, Info, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { getMemberById } from '../../lib/joseph/genealogy';
import {
    buildRadarDataFromScores,
    formatTraitLabel,
    readStoredPersonalityProfile,
    toLongTraitScores,
} from '../../lib/joseph/personalityProfiles';

interface PersonalityRadarProps {
    memberId: string;
    memberName: string;
    onClose: () => void;
}

function getLevel(score: number) {
    if (score >= 65) return 'high';
    if (score <= 35) return 'low';
    return 'medium';
}

function buildFallbackProfile(memberId: string, memberName: string) {
    const member = getMemberById(memberId);
    const scores = member?.aiPersonality?.scores ? toLongTraitScores(member.aiPersonality.scores) : null;

    if (!scores) return null;

    const traitDetails = Object.fromEntries(
        Object.entries(scores).map(([trait, score]) => [
            trait,
            {
                score,
                level: getLevel(score),
                description: 'Derived from the saved Joseph OCEAN questionnaire results.',
                facets: {},
            },
        ]),
    );

    return {
        member_id: memberId,
        member_name: memberName,
        scores,
        trait_details: traitDetails,
        traits: member?.aiPersonality?.traits || [],
        communication_style: member?.aiPersonality?.communicationStyle || '',
        radar_data: buildRadarDataFromScores(scores),
        confidence: 80,
    };
}

export default function PersonalityRadar({ memberId, memberName, onClose }: PersonalityRadarProps) {
    const [data, setData] = useState<unknown>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTrait, setActiveTrait] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = async () => {
        setLoading(true);
        setError(null);

        const remoteProfile = await apiClient.getPersonalityQuizProfile(memberId);
        const storedProfile = readStoredPersonalityProfile(memberId);
        const fallbackProfile = buildFallbackProfile(memberId, memberName);
        const profile = remoteProfile ?? storedProfile ?? fallbackProfile;

        if (!profile) {
            setData(null);
            setError('No question-based personality profile found. Complete the Joseph questionnaire first.');
            setLoading(false);
            return;
        }

        const scores = toLongTraitScores(profile.scores || {});
        const normalizedProfile = {
            ...profile,
            member_name: profile.member_name || memberName,
            scores,
            radar_data: Array.isArray(profile.radar_data) && profile.radar_data.length > 0
                ? profile.radar_data
                : buildRadarDataFromScores(scores),
            trait_details: profile.trait_details || Object.fromEntries(
                Object.entries(scores).map(([trait, score]) => [
                    trait,
                    {
                        score,
                        level: getLevel(score),
                        description: 'Derived from the saved Joseph OCEAN questionnaire results.',
                        facets: {},
                    },
                ]),
            ),
            confidence: profile.confidence
                ?? (profile.answered && profile.total_questions
                    ? Math.min(99, Math.round((profile.answered / profile.total_questions) * 100))
                    : 85),
        };

        setData(normalizedProfile);
        setLoading(false);
    };

    useEffect(() => {
        void loadProfile();
    }, [memberId]);

    const radarData = useMemo(() => {
        if (!data) return [];
        return data.radar_data || buildRadarDataFromScores(data.scores || {});
    }, [data]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <Brain className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Question-Based Personality Analysis</h2>
                                <p className="text-sm text-slate-400">OCEAN profile for {memberName}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => void loadProfile()}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 disabled:opacity-50 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                    {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {loading ? (
                        <div className="col-span-2 py-20 flex flex-col items-center text-slate-500">
                            <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                            <p className="text-sm font-medium text-slate-300">Loading saved Joseph questionnaire profile...</p>
                        </div>
                    ) : !data ? (
                        <div className="col-span-2 py-10 flex flex-col items-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <Brain className="w-12 h-12 opacity-20 mb-4" />
                            <p className="text-sm">This family member does not have a saved questionnaire profile yet.</p>
                            <p className="mt-2 text-xs text-slate-600">Start the OCEAN quiz to generate the graph and behavioral profile.</p>
                        </div>
                    ) : (
                        <>
                            <div className="h-64 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="#334155" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Personality"
                                            dataKey="A"
                                            stroke="#818cf8"
                                            strokeWidth={2}
                                            fill="#818cf8"
                                            fillOpacity={0.3}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                                            itemStyle={{ color: '#818cf8' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                                <div className="absolute top-0 right-0 bg-slate-800/50 px-2 py-1 rounded text-xs text-slate-400 border border-slate-700">
                                    Confidence: {data.confidence}%
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Trait Breakdown
                                </h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                                    {Object.entries(data.trait_details || {}).map(([trait, detail]: [string, unknown]) => (
                                        <div
                                            key={trait}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeTrait === trait ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                            onClick={() => setActiveTrait(trait === activeTrait ? null : trait)}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-200">{formatTraitLabel(trait)}</span>
                                                <span className="text-xs font-bold text-indigo-400">{Math.round(detail.score)}/100</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full" style={{ width: `${detail.score}%` }} />
                                            </div>

                                            {activeTrait === trait && (
                                                <div className="mt-3 text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800 space-y-2">
                                                    {detail.description && <p>{detail.description}</p>}
                                                    {detail.facets && Object.keys(detail.facets).length > 0 && (
                                                        <div className="space-y-1">
                                                            {Object.entries(detail.facets).map(([facetKey, facet]: [string, unknown]) => (
                                                                <div key={facetKey} className="flex items-center justify-between gap-3">
                                                                    <span>{facet.label || formatTraitLabel(facetKey)}</span>
                                                                    <span className="text-indigo-300">{Math.round(facet.score)}/100</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {data.communication_style && (
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                        <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Communication Style</p>
                                        <p className="text-xs text-slate-300">{data.communication_style}</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
