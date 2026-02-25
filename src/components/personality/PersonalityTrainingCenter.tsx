import { useState, useEffect } from 'react';
import { Brain, Upload, Sparkles, Activity, Users, RefreshCw } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { apiClient } from '../../lib/api-client';
import { getFamilyMembers } from '../../lib/joseph/genealogy';

interface Trait {
    subject: string;
    A: number;
    fullMark: number;
}

interface EngramListing {
    id: string;
    name: string;
    description: string;
    ai_readiness_score: number;
    is_family: boolean;
    engram: any;
}

interface PersonalityTrainingCenterProps {
    targetEngramId?: string | null;
}

export default function PersonalityTrainingCenter({ targetEngramId }: PersonalityTrainingCenterProps) {
    const [engrams, setEngrams] = useState<EngramListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [vignette, setVignette] = useState('');
    const [isTraining, setIsTraining] = useState(false);
    const [traits, setTraits] = useState<Trait[]>([]);
    const [mentor, setMentor] = useState('raphael');

    useEffect(() => {
        fetchEngrams();
    }, []);

    useEffect(() => {
        if (targetEngramId) {
            setSelectedId(targetEngramId);
        }
    }, [targetEngramId, engrams]);

    const fetchEngrams = async () => {
        console.log("TrainingCenter: fetchEngrams starting...");
        setLoading(true);
        try {
            // 1. Get local family members immediately
            const localFamily = getFamilyMembers();
            console.log("TrainingCenter: localFamily found:", localFamily.length);
            const localDefaults: EngramListing[] = localFamily.map(member => {
                const fullName = `${member.firstName} ${member.lastName}`;
                return {
                    id: member.id,
                    name: fullName,
                    description: member.bio || '',
                    ai_readiness_score: 0,
                    is_family: true,
                    engram: null
                };
            });

            // Set initial state from local data
            setEngrams(localDefaults);
            setLoading(false);

            // 2. Try to fetch backend engrams
            try {
                const backendEngrams = await apiClient.getEngrams();
                const engramMap = new Map((backendEngrams || []).map((e: any) => [e.name, e]));

                const combined: EngramListing[] = localFamily.map(member => {
                    const fullName = `${member.firstName} ${member.lastName}`;
                    const engram = engramMap.get(fullName) as any;
                    return {
                        id: engram?.id || member.id,
                        name: fullName,
                        description: engram?.description || member.bio || '',
                        ai_readiness_score: engram?.total_questions_answered || 0,
                        is_family: true,
                        engram: engram
                    };
                });

                // Add non-family engrams
                (backendEngrams || []).forEach((e: any) => {
                    if (!combined.find(c => c.name === e.name)) {
                        combined.push({
                            id: e.id,
                            name: e.name,
                            description: e.description,
                            ai_readiness_score: (e as any).total_questions_answered || 50,
                            is_family: false,
                            engram: e
                        });
                    }
                });

                setEngrams(combined);

                // 3. Auto-sync if needed
                const unsynced = localFamily.filter(m => !engramMap.has(`${m.firstName} ${m.lastName}`));
                if (unsynced.length > 0) {
                    console.log("TrainingCenter: Auto-syncing family members...");
                    const idMapping = await apiClient.batchSyncEngrams(localFamily);

                    setEngrams((prev: EngramListing[]) => prev.map((p: EngramListing) => {
                        // Check if we have a new ID from the mapping
                        const localId = localFamily.find(m => `${m.firstName} ${m.lastName}` === p.name)?.id;
                        const backendId = localId ? idMapping[localId] : null;

                        if (backendId) {
                            console.log(`TrainingCenter: Mapped ${p.name} to ${backendId}`);
                            return { ...p, id: backendId };
                        }
                        return p;
                    }));

                    // Optional: one more refresh to get full engram objects (scores etc)
                    const refreshed = await apiClient.getEngrams();
                    setEngrams((prev: EngramListing[]) => prev.map((p: EngramListing) => {
                        const match = refreshed.find((r: any) => r.name === p.name);
                        return match ? { ...p, id: match.id, engram: match, ai_readiness_score: match.total_questions_answered || 0 } : p;
                    }));
                }
            } catch (err) {
                console.warn("Backend engrams unreachable, using local data only:", err);
            }
        } catch (error) {
            console.error("Critical failure in Training Center initialization:", error);
        } finally {
            setLoading(false);
        }
    };

    const isBackendId = (id: string | null) => {
        if (!id) return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    const handleAnalyze = async () => {
        if (!selectedId || !isBackendId(selectedId)) {
            alert(`Engram '${engrams.find(e => e.id === selectedId)?.name}' is not yet synced with the OASIS backend. \n\nPlease click 'Re-Sync OASIS' or restart your backend server if this persists.`);
            return;
        }
        setIsTraining(true);
        try {
            const data = await apiClient.analyzePersonality(selectedId);
            // Transform traits for Radar Chart
            const chartData = (data.traits || []).map((t: any) => ({
                subject: t.name,
                A: (t.value || 0) * 100,
                fullMark: 100
            }));
            setTraits(chartData);
        } catch (err) {
            console.error(err);
        } finally {
            setIsTraining(false);
        }
    };

    const startMentorship = async () => {
        if (!selectedId || !isBackendId(selectedId)) {
            alert(`Mentorship requires a synced backend identity. '${engrams.find(e => e.id === selectedId)?.name}' is currently in local mode. \n\nPlease restart backends and use 'Re-Sync OASIS'.`);
            return;
        }
        setIsTraining(true);
        try {
            await apiClient.startMentorship(selectedId, mentor);
            alert(`Mentorship with ${mentor} started in the background.`);
        } catch (err) {
            console.error(err);
            alert("Mentorship failed. Backend might be unreachable.");
        } finally {
            setIsTraining(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-amber-100 p-8 font-serif">
            <div className="max-w-6xl mx-auto space-y-12">
                <header className="space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-amber-200 to-amber-600">
                                Personality training center
                            </h1>
                            <p className="text-amber-300/60">Evolve your engrams through memories, analysis, and council mentorship.</p>
                        </div>
                        <button
                            onClick={fetchEngrams}
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-sm hover:bg-amber-500/20 transition-colors flex items-center gap-2 group"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            {loading ? "Syncing..." : "Re-Sync OASIS"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Engram Selector */}
                    <div className="space-y-6">
                        <label className="text-sm uppercase tracking-widest text-amber-500 font-bold">Select engram</label>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {loading && engrams.length === 0 ? (
                                <div className="p-8 text-center animate-pulse">
                                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-500/20" />
                                    <p className="text-xs text-amber-500/40 uppercase font-bold">Scanning Engrams...</p>
                                </div>
                            ) : engrams.length > 0 ? (
                                engrams.map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => setSelectedId(e.id)}
                                        className={`w-full p-4 rounded-xl border text-left transition-all ${selectedId === e.id ? 'bg-amber-900/20 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'bg-white/5 border-white/10 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <p className="font-bold text-amber-200">{e.name}</p>
                                        <p className="text-xs text-amber-400/40 uppercase tracking-tighter mt-1">Readiness: {e.ai_readiness_score}%</p>
                                    </button>
                                ))
                            ) : (
                                <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-40">
                                    <p className="text-sm">No engrams found.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Training Lab */}
                    <div className="lg:col-span-2 space-y-8">
                        {selectedId ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {/* Path 2: Bulk Ingestion */}
                                <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Upload className="w-5 h-5 text-amber-500" />
                                            Knowledge Ingestion
                                        </h3>
                                        <span className="text-[10px] uppercase tracking-widest text-amber-500/40">Path 2</span>
                                    </div>
                                    <textarea
                                        className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-amber-100 focus:outline-none focus:border-amber-500/50"
                                        placeholder="Paste a memory, story, or diary entry to train this agent..."
                                        value={vignette}
                                        onChange={(e) => setVignette(e.target.value)}
                                    />
                                    <button
                                        onClick={async () => {
                                            if (!vignette || !selectedId) return;
                                            if (!isBackendId(selectedId)) {
                                                alert("Engram sync in progress. Please wait a moment.");
                                                return;
                                            }
                                            setIsTraining(true);
                                            try {
                                                await apiClient.ingestVignette(selectedId, vignette);
                                                setVignette('');
                                                alert("Vignette ingested successfully!");
                                            } catch (error) {
                                                console.error("Vignette Error:", error);
                                                alert("Failed to ingest vignette. Check backend connection.");
                                            } finally {
                                                setIsTraining(false);
                                            }
                                        }}
                                        disabled={isTraining || !vignette}
                                        className="px-6 py-2 bg-amber-600 text-black font-bold rounded-lg hover:bg-amber-500 disabled:opacity-50 transition-colors text-sm"
                                    >
                                        {isTraining ? 'Ingesting...' : 'Ingest Vignette'}
                                    </button>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Path 3: Trait Radar */}
                                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <Activity className="w-5 h-5 text-amber-500" />
                                                Trait Evolution
                                            </h3>
                                            <span className="text-[10px] uppercase tracking-widest text-amber-500/40">Path 3</span>
                                        </div>
                                        <div className="h-64 flex items-center justify-center">
                                            {traits.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={traits}>
                                                        <PolarGrid stroke="#451a03" />
                                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#d97706', fontSize: 10 }} />
                                                        <Radar
                                                            name="Personality"
                                                            dataKey="A"
                                                            stroke="#f59e0b"
                                                            fill="#f59e0b"
                                                            fillOpacity={0.6}
                                                        />
                                                    </RadarChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="text-center text-amber-500/20 italic text-sm">Run analysis to see radar</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleAnalyze}
                                            disabled={isTraining}
                                            className="w-full py-3 border border-amber-500/30 rounded-xl text-amber-500 hover:bg-amber-500/10 transition-all font-bold tracking-widest text-xs uppercase"
                                        >
                                            {isTraining ? 'Analyzing...' : 'Run Analysis Loop'}
                                        </button>
                                    </section>

                                    {/* Path 4: Council Mirroring */}
                                    <section className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <Users className="w-5 h-5 text-amber-500" />
                                                Council Mirroring
                                            </h3>
                                            <span className="text-[10px] uppercase tracking-widest text-amber-500/40">Path 4</span>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] uppercase tracking-widest text-amber-500/60 block">Assign Mentor Saint</label>
                                            <select
                                                value={mentor}
                                                onChange={(e) => setMentor(e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-amber-100 text-sm focus:outline-none"
                                            >
                                                <option value="raphael">St. Raphael (Empathy/Health)</option>
                                                <option value="michael">St. Michael (Protection/Integrity)</option>
                                                <option value="joseph">St. Joseph (Legacy/Discretion)</option>
                                            </select>
                                            <p className="text-xs text-amber-400/40 italic">
                                                The mentor will run background "Coaching Sessions" with your engram to instill core virtues.
                                            </p>
                                        </div>
                                        <button
                                            onClick={startMentorship}
                                            disabled={isTraining}
                                            className="w-full py-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-200 hover:bg-amber-500/30 transition-all font-bold tracking-widest text-xs uppercase flex items-center justify-center gap-2"
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            Start Mentorship
                                        </button>
                                    </section>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl opacity-30">
                                <Brain className="w-16 h-16 mb-4" />
                                <p>Select an engram to begin training</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
