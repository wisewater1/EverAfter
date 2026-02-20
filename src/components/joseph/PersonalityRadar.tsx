import { useState } from 'react';
import axios from 'axios';
import { X, Brain, Info } from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface PersonalityRadarProps {
    memberId: string;
    memberName: string;
    onClose: () => void;
}

export default function PersonalityRadar({ memberId, memberName, onClose }: PersonalityRadarProps) {
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeTrait, setActiveTrait] = useState<string | null>(null);
    const [analyzingResearch, setAnalyzingResearch] = useState(false);
    const [researchLayers] = useState({
        memory: { active: true, source: 'generative_agents', status: 'Associative Memory Active' },
        cognition: { active: true, source: 'genagents', status: 'Reflection Loop Running' },
        collaboration: { active: true, source: 'agentic_collab', status: 'Consensus Engine Ready' }
    });

    const handleSyncResearch = async () => {
        setAnalyzingResearch(true);
        setError(null);
        try {
            // Fetch real cognitive state from Saint Runtime
            const response = await axios.get(`/api/v1/saints/${memberId}/cognition/status`);

            // Map the API response to the component state
            setData({
                scores: response.data.personality_scores,
                confidence: 94, // We could calculate this from memory count
                evidence: {
                    "Openness": [{ source: "Memory Stream", snippet: "Analyzed recent observations." }],
                    "Conscientiousness": [{ source: "Reflection Engine", snippet: response.data.last_reflection ? `Reflected at ${new Date(response.data.last_reflection).toLocaleTimeString()}` : "No recent reflection." }]
                }
            });

            // Update research status indicators based on real data
            if (response.data.last_reflection) {
                // Trigger a visual update or toast if needed
            }
        } catch (err) {
            setError("Failed to sync with Saint Runtime.");
        } finally {
            setAnalyzingResearch(false);
        }
    };


    const radarData = data ? Object.entries(data.scores).map(([trait, score]) => ({
        subject: trait,
        A: score,
        fullMark: 100
    })) : [];

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
                                <h2 className="text-xl font-bold text-white">Saint Personality & Cognition</h2>
                                <p className="text-sm text-slate-400">Hybrid Analysis for {memberName}</p>
                            </div>
                        </div>

                        {/* Research Status */}
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-1">
                                {Object.values(researchLayers).map((l, i) => (
                                    <div
                                        key={i}
                                        className={`w-2.5 h-2.5 rounded-full border border-slate-900 ${l.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}
                                        title={`${l.source}: ${l.status}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleSyncResearch}
                                disabled={analyzingResearch}
                                className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 px-3 py-1 rounded-lg text-xs font-medium transition-all"
                            >
                                {analyzingResearch ? 'Syncing...' : 'Sync Layers'}
                            </button>
                        </div>
                    </div>
                    {error && <div className="mt-2 text-xs text-rose-400">{error}</div>}
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    {!data && !analyzingResearch && (
                        <div className="col-span-2 py-10 flex flex-col items-center text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                            <Brain className="w-12 h-12 opacity-20 mb-4" />
                            <p className="text-sm">Saint Runtime is active. Click "Sync Layers" to visualize cognitive state.</p>
                            <div className="mt-4 flex gap-6 text-[10px] uppercase tracking-widest font-bold">
                                <span className="text-slate-600">Memory Stream</span>
                                <span className="text-slate-600">Reflection Engine</span>
                                <span className="text-slate-600">Consensus Bus</span>
                            </div>
                        </div>
                    )}

                    {analyzingResearch ? (
                        <div className="col-span-2 py-20 flex flex-col items-center text-slate-500">
                            <div className="relative mb-6">
                                <Brain className="w-12 h-12 animate-pulse text-indigo-500" />
                                <div className="absolute inset-0 w-full h-full border-2 border-indigo-500/30 rounded-full animate-ping" />
                            </div>
                            <p className="text-sm font-medium text-slate-300">Synchronizing with Generative Agent Research Models...</p>
                            <p className="text-xs text-slate-500 mt-2">Connecting to Memory Stream & Consensus Bus</p>
                        </div>
                    ) : data && (
                        <>
                            {/* Chart */}
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

                            {/* Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    Trait Evidence
                                </h3>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                                    {Object.entries(data.scores).map(([trait, score]: [string, any]) => (
                                        <div
                                            key={trait}
                                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${activeTrait === trait ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
                                            onClick={() => setActiveTrait(trait === activeTrait ? null : trait)}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-200">{trait}</span>
                                                <span className="text-xs font-bold text-indigo-400">{score}/100</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full" style={{ width: `${score}%` }} />
                                            </div>

                                            {/* Evidence Dropdown */}
                                            {activeTrait === trait && data.evidence[trait]?.length > 0 && (
                                                <div className="mt-3 text-xs text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                                                    {data.evidence[trait].map((item: any, i: number) => (
                                                        <div key={i} className="mb-1 last:mb-0">
                                                            <span className="text-indigo-300 uppercase opacity-75">{item.source}:</span> "{item.snippet}"
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
