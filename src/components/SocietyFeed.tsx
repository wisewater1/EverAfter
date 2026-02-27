import { useEffect, useState, useRef } from 'react';
import { Users, Heart, Activity, Zap, Globe, Share2, MessageSquare, TrendingUp } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { getFamilyMembers } from '../lib/joseph/genealogy';

// Define Personality Archetypes
export type Archetype = 'analytical' | 'creative' | 'empathetic' | 'direct' | 'balanced';

export const getAgentArchetype = (traits: any): Archetype => {
    if (!traits) return 'balanced';
    const str = JSON.stringify(traits).toLowerCase();
    if (str.includes('logic') || str.includes('analy') || str.includes('data') || str.includes('engineer') || str.includes('tech')) return 'analytical';
    if (str.includes('creat') || str.includes('art') || str.includes('design') || str.includes('music') || str.includes('photo')) return 'creative';
    if (str.includes('empath') || str.includes('care') || str.includes('help') || str.includes('nurs') || str.includes('family') || str.includes('kind')) return 'empathetic';
    if (str.includes('direct') || str.includes('lead') || str.includes('blunt') || str.includes('bold') || str.includes('achieve')) return 'direct';
    return 'balanced';
};

const ARCHETYPE_COLORS: Record<Archetype, { border: string, bg: string, shadow: string, label: string, accent: string }> = {
    analytical: { border: 'border-cyan-400', bg: 'from-blue-600 to-cyan-400', shadow: 'shadow-cyan-500/50', label: 'Analytical Core', accent: 'text-cyan-400' },
    creative: { border: 'border-fuchsia-400', bg: 'from-purple-600 to-fuchsia-400', shadow: 'shadow-fuchsia-500/50', label: 'Creative Spark', accent: 'text-fuchsia-400' },
    empathetic: { border: 'border-emerald-400', bg: 'from-teal-600 to-emerald-400', shadow: 'shadow-emerald-500/50', label: 'Empathetic Resonance', accent: 'text-emerald-400' },
    direct: { border: 'border-rose-500', bg: 'from-orange-600 to-rose-500', shadow: 'shadow-rose-500/50', label: 'Direct Drive', accent: 'text-rose-500' },
    balanced: { border: 'border-indigo-400', bg: 'from-indigo-600 to-blue-500', shadow: 'shadow-indigo-500/50', label: 'Balanced Matrix', accent: 'text-indigo-400' }
};

interface AgentProfile {
    id: string;
    name: string;
    avatar_url?: string;
    description?: string;
    personality_traits?: any;
    dimension_scores?: Record<string, number>;
    status: 'active' | 'idle';
    archetype: Archetype;
}

interface InteractionEvent {
    id: string;
    summary: string;
    initiator_id: string;
    initiator: Partial<AgentProfile>;
    receiver_id: string;
    receiver: Partial<AgentProfile>;
    interaction_type?: string;
    created_at: string;
    rapport: number;
}

const SocietyFeed: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'agora' | 'clusters' | 'council'>('agora');
    const [events, setEvents] = useState<InteractionEvent[]>([]);
    const [agents, setAgents] = useState<AgentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

    // Button loading states
    const [isSeeding, setIsSeeding] = useState(false);
    const [isPropagating, setIsPropagating] = useState(false);
    const [isAccelerating, setIsAccelerating] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Physics Engine State
    const physicsRef = useRef<Record<string, { x: number, y: number, vx: number, vy: number, baseVy: number, targetHeight: number, arc: Archetype }>>({});
    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});

    const refreshData = async () => {
        try {
            const [engrams, , feedData] = await Promise.all([
                apiClient.getEngrams(),
                apiClient.getSocialClusters(),
                apiClient.getSocietyFeed()
            ]);

            const localFamily = getFamilyMembers();
            const engramMap = new Map((engrams || []).map((e: any) => [e.name, e]));

            const combinedAgents: AgentProfile[] = localFamily.map(member => {
                const fullName = `${member.firstName} ${member.lastName}`;
                const engram = engramMap.get(fullName) as any;
                const traits = engram?.personality_traits || member.aiPersonality?.traits;
                return {
                    id: engram?.id || member.id,
                    name: fullName,
                    avatar_url: engram?.avatar_url || member.photo,
                    personality_traits: traits,
                    status: engram?.is_ai_active ? 'active' : 'idle',
                    archetype: getAgentArchetype(traits || member.bio)
                } as AgentProfile;
            });

            // Add non-family engrams
            (engrams || []).forEach((e: any) => {
                if (!combinedAgents.find(a => a.name === e.name)) {
                    combinedAgents.push({
                        id: e.id,
                        name: e.name,
                        avatar_url: e.avatar_url,
                        personality_traits: e.personality_traits,
                        status: e.is_ai_active ? 'active' : 'idle',
                        archetype: getAgentArchetype(e.personality_traits || e.description)
                    });
                }
            });

            setAgents(combinedAgents);
            setEvents(feedData || []);
        } catch (error) {
            console.error('Error fetching society data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 30000);
        return () => clearInterval(interval);
    }, []);

    // 60fps Physics Loop (Antigravity & Cluster Magnetism)
    useEffect(() => {
        if (agents.length === 0) return;

        agents.forEach((a, i) => {
            if (!physicsRef.current[a.id]) {
                physicsRef.current[a.id] = {
                    x: 20 + (i * 30) % 60,
                    y: 80 + Math.random() * 20,
                    vx: (Math.random() - 0.5) * 0.05,
                    vy: 0,
                    baseVy: -0.01 - Math.random() * 0.015,
                    targetHeight: 30 + Math.random() * 40,
                    arc: a.archetype
                };
            }
        });

        let frameId: number;
        let time = 0;

        const tick = () => {
            time += 0.02;
            const updated: Record<string, { x: number, y: number }> = {};
            const keys = Object.keys(physicsRef.current);

            // Cluster Centers (normalized % coordinates)
            const clusterCenters: Record<string, { x: number, y: number }> = {
                analytical: { x: 25, y: 25 },
                creative: { x: 75, y: 25 },
                empathetic: { x: 25, y: 75 },
                direct: { x: 75, y: 75 },
                balanced: { x: 50, y: 50 }
            };

            for (let i = 0; i < keys.length; i++) {
                const k1 = keys[i];
                const p1 = physicsRef.current[k1];
                const archetype = p1.arc;

                // --- CLUSTER MAGNETISM (Only in Clusters mode) ---
                if (activeTab === 'clusters') {
                    const center = clusterCenters[archetype] || clusterCenters.balanced;
                    const dx = center.x - p1.x;
                    const dy = center.y - p1.y;
                    p1.vx += dx * 0.0015;
                    p1.vy += dy * 0.0015;
                } else if (activeTab === 'council') {
                    // Council pull: All hover around center
                    const dx = 50 - p1.x;
                    const dy = 50 - p1.y;
                    p1.vx += dx * 0.001;
                    p1.vy += dy * 0.001;
                } else {
                    // Agora Tab: Standard Antigravity
                    if (p1.y > p1.targetHeight) {
                        p1.vy += p1.baseVy;
                    } else {
                        p1.vy += 0.005;
                    }
                    p1.vx += Math.sin(time + i * 2) * 0.01;
                }

                // Repulsion
                for (let j = i + 1; j < keys.length; j++) {
                    const k2 = keys[j];
                    const p2 = physicsRef.current[k2];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const repZone = (activeTab === 'clusters') ? 6 : 10;

                    if (dist < repZone && dist > 0.1) {
                        const force = (repZone - dist) * 0.004;
                        p1.vx -= (dx / dist) * force;
                        p1.vy -= (dy / dist) * force;
                        p2.vx += (dx / dist) * force;
                        p2.vy += (dy / dist) * force;
                    }
                }

                p1.vx *= 0.95;
                p1.vy *= 0.95;
                p1.x += p1.vx;
                p1.y += p1.vy;

                // Clamp
                p1.x = Math.max(5, Math.min(95, p1.x));
                p1.y = Math.max(5, Math.min(95, p1.y));

                updated[k1] = { x: p1.x, y: p1.y };
            }

            setPositions(updated);
            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [agents, activeTab]);

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-4 relative">
                <Activity className="text-cyan-400 w-12 h-12" />
                <span className="text-cyan-500/80 text-sm font-medium tracking-[0.2em] uppercase">Engaging OASIS Social Engine...</span>
            </div>
        </div>
    );

    return (
        <div className="w-full h-[calc(100vh-12rem)] flex flex-col space-y-4 relative">
            {/* Error Notification */}
            {errorMsg && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-500/90 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 backdrop-blur border border-rose-400/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                    <span>{errorMsg}</span>
                    <button onClick={() => setErrorMsg(null)} className="ml-2 opacity-70 hover:opacity-100">×</button>
                </div>
            )}

            {/* Header / Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <Globe className="text-cyan-400 w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-light text-white tracking-tight">Ancestral Agora</h2>
                        <div className="text-[10px] text-cyan-500/60 uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Unified Social Ecosystem
                        </div>
                    </div>
                </div>

                <div className="flex p-1 bg-slate-900/50 rounded-xl border border-white/10">
                    {[
                        { id: 'agora', label: 'Global Feed', icon: Share2 },
                        { id: 'clusters', label: 'Clusters', icon: Users },
                        { id: 'council', label: 'Deliberations', icon: MessageSquare }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white'}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Simulation View */}
            <div className="flex-1 min-h-0 md:flex gap-4">
                {/* Left: Force Directed Graph */}
                <div className="flex-1 relative bg-slate-950/50 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl group">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none"></div>

                    {/* Cluster Background Labels */}
                    {activeTab === 'clusters' && (
                        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-10 pointer-events-none">
                            {['Analytical', 'Creative', 'Empathetic', 'Direct'].map((label) => (
                                <div key={label} className="flex items-center justify-center text-4xl font-black uppercase tracking-widest text-white/50">{label}</div>
                            ))}
                        </div>
                    )}

                    {/* Connection Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                        {events.slice(0, 15).map((event) => {
                            const pos1 = positions[event.initiator_id];
                            const pos2 = positions[event.receiver_id];
                            if (!pos1 || !pos2) return null;
                            const isPropagation = event.interaction_type === 'vignette_propagation';
                            return (
                                <path
                                    key={event.id}
                                    d={`M ${pos1.x}% ${pos1.y}% Q 50% 50% ${pos2.x}% ${pos2.y}%`}
                                    fill="none"
                                    stroke={isPropagation ? 'rgba(234, 179, 8, 0.4)' : 'rgba(6, 182, 212, 0.15)'}
                                    strokeWidth={isPropagation ? 3 : 1}
                                    strokeDasharray={isPropagation ? "5 5" : "0"}
                                    className={isPropagation ? 'animate-[dash_2s_linear_infinite]' : ''}
                                />
                            );
                        })}
                    </svg>

                    {/* Agent Nodes */}
                    {agents.map((agent) => {
                        const pos = positions[agent.id];
                        if (!pos) return null;
                        const colors = ARCHETYPE_COLORS[agent.archetype];
                        const isHovered = hoveredAgent === agent.id;

                        return (
                            <div
                                key={agent.id}
                                onMouseEnter={() => setHoveredAgent(agent.id)}
                                onMouseLeave={() => setHoveredAgent(null)}
                                className={`absolute w-10 h-10 -ml-5 -mt-5 rounded-full border-2 p-0.5 cursor-pointer transition-all duration-300 z-30 shadow-2xl ${colors.border} ${isHovered ? 'scale-125 z-40' : 'scale-100 opacity-80'}`}
                                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            >
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                                    {agent.avatar_url ? (
                                        <img src={agent.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-white text-xs font-bold">{agent.name.charAt(0)}</span>
                                    )}
                                </div>
                                {isHovered && (
                                    <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-slate-900/90 border border-white/20 rounded-lg backdrop-blur-md shadow-2xl z-50">
                                        <div className="text-[10px] font-bold text-white leading-tight">{agent.name}</div>
                                        <div className={`text-[8px] uppercase tracking-tighter ${colors.accent}`}>{colors.label}</div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Insights & Controls */}
                <div className="w-full md:w-80 max-w-full overflow-hidden flex flex-col space-y-4 shrink-0">
                    {/* Activity Feed Mini Card */}
                    <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center gap-2 mb-3 text-cyan-400">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Neural Trends</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {events.length > 0 ? (
                                events.map((event) => (
                                    <div key={event.id} className="p-3 bg-white/5 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Zap className={`w-3 h-3 ${event.interaction_type === 'vignette_propagation' ? 'text-amber-400' : 'text-cyan-400'}`} />
                                            <span className="text-[9px] text-slate-400 font-bold uppercase transition-colors group-hover:text-cyan-300">
                                                {event.interaction_type?.replace('_', ' ') || 'Casual Observation'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-relaxed font-medium">{event.summary}</p>
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="text-[8px] text-slate-500">{new Date(event.created_at).toLocaleTimeString()}</span>
                                            <div className="flex items-center gap-1">
                                                <Heart className="w-2.5 h-2.5 text-rose-500" />
                                                <span className="text-[9px] text-rose-400">{(event.rapport * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                                    <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">Agora is currently silent.</p>
                                    <button
                                        onClick={async () => {
                                            if (isSeeding) return;
                                            setIsSeeding(true);
                                            setErrorMsg(null);
                                            try {
                                                await apiClient.boostSociety(5);
                                                await refreshData();
                                            } catch (error: any) {
                                                console.error("Failed to boost society:", error);
                                                setErrorMsg(error.message || "Simulation failed. Are there enough active agents in the database?");
                                            } finally {
                                                setIsSeeding(false);
                                            }
                                        }}
                                        disabled={isSeeding}
                                        className="mt-4 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 text-cyan-400 border border-cyan-500/20 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tighter flex items-center gap-2"
                                    >
                                        {isSeeding ? <div className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" /> : null}
                                        {isSeeding ? 'Simulating...' : 'Seed simulation'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Container (Side-by-side on mobile, stacked on desktop) */}
                    <div className="flex flex-row md:flex-col gap-2 md:gap-4 w-full overflow-x-auto pb-2 custom-scrollbar shrink-0">
                        {/* Propagation Trigger */}
                        <button
                            onClick={async () => {
                                if (isPropagating || agents.length < 2) {
                                    if (agents.length < 2) setErrorMsg("Need at least 2 agents in the society to propagate legacies.");
                                    return;
                                }
                                setIsPropagating(true);
                                setErrorMsg(null);
                                try {
                                    const initiator = agents.find(a => a.status === 'active') || agents[0];
                                    if (initiator) {
                                        await apiClient.triggerLegacyPropagation(initiator.id, "Family traditions are the glue of our legacy.");
                                        await refreshData();
                                    }
                                } catch (error: any) {
                                    console.error("Propagation Error:", error);
                                    setErrorMsg(error.message || "Failed to trigger propagation vignette.");
                                } finally {
                                    setIsPropagating(false);
                                }
                            }}
                            disabled={isPropagating || agents.length < 2}
                            className="bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 p-2 sm:p-4 rounded-2xl text-center group transition-all flex-1 min-w-[140px] whitespace-nowrap sm:whitespace-normal"
                        >
                            {isPropagating ? (
                                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                            ) : (
                                <Share2 className="w-5 h-5 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                            )}
                            <div className="text-xs font-bold text-amber-500 tracking-tight uppercase leading-tight">Propagate Legacy</div>
                            <div className="text-[9px] text-amber-500/60 mt-1 uppercase font-black leading-tight">Trigger Viral Vignette</div>
                        </button>

                        <button
                            onClick={async () => {
                                if (isAccelerating) return;
                                setIsAccelerating(true);
                                setErrorMsg(null);
                                try {
                                    await apiClient.triggerSocietyEvent();
                                    await refreshData();
                                } catch (error: any) {
                                    console.error("Event trigger error:", error);
                                    setErrorMsg(error.message || "Failed to trigger society event. Not enough active engrams?");
                                } finally {
                                    setIsAccelerating(false);
                                }
                            }}
                            disabled={isAccelerating}
                            className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 disabled:opacity-50 p-2 sm:p-4 rounded-2xl text-center group transition-all flex-1 min-w-[140px] whitespace-nowrap sm:whitespace-normal"
                        >
                            {isAccelerating ? (
                                <div className="w-5 h-5 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-2" />
                            ) : (
                                <Activity className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
                            )}
                            <div className="text-xs font-bold text-cyan-400 tracking-tight uppercase leading-tight">Accelerate Simulation</div>
                            <div className="text-[9px] text-cyan-500/60 mt-1 uppercase font-black leading-tight">Tick rate: 1.5hz</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocietyFeed;
