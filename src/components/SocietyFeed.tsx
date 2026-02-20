import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Users, Heart, Activity, Zap, Sparkles, BrainCircuit, Filter, X } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { getFamilyMembers, FamilyMember } from '../lib/joseph/genealogy';

// Define Personality Archetypes
export type Archetype = 'analytical' | 'creative' | 'empathetic' | 'direct' | 'balanced';

export const getAgentArchetype = (traits: any): Archetype => {
    if (!traits) return 'balanced';
    const str = JSON.stringify(traits).toLowerCase();

    // Weighted keyword matching
    if (str.includes('logic') || str.includes('analy') || str.includes('data') || str.includes('engineer') || str.includes('tech')) return 'analytical';
    if (str.includes('creat') || str.includes('art') || str.includes('design') || str.includes('music') || str.includes('photo')) return 'creative';
    if (str.includes('empath') || str.includes('care') || str.includes('help') || str.includes('nurs') || str.includes('family') || str.includes('kind')) return 'empathetic';
    if (str.includes('direct') || str.includes('lead') || str.includes('blunt') || str.includes('bold') || str.includes('achieve')) return 'direct';

    return 'balanced';
};

const ARCHETYPE_COLORS: Record<Archetype, { border: string, bg: string, shadow: string, label: string }> = {
    analytical: { border: 'border-cyan-400', bg: 'from-blue-600 to-cyan-400', shadow: 'shadow-cyan-500/50', label: 'Analytical Core' },
    creative: { border: 'border-fuchsia-400', bg: 'from-purple-600 to-fuchsia-400', shadow: 'shadow-fuchsia-500/50', label: 'Creative Spark' },
    empathetic: { border: 'border-emerald-400', bg: 'from-teal-600 to-emerald-400', shadow: 'shadow-emerald-500/50', label: 'Empathetic Resonance' },
    direct: { border: 'border-rose-500', bg: 'from-orange-600 to-rose-500', shadow: 'shadow-rose-500/50', label: 'Direct Drive' },
    balanced: { border: 'border-indigo-400', bg: 'from-indigo-600 to-blue-500', shadow: 'shadow-indigo-500/50', label: 'Balanced Matrix' }
};

interface AgentProfile {
    id: string;
    name: string;
    avatar_url?: string;
    description?: string;
    personality_traits?: any;
    dimension_scores?: Record<string, number>;
    status: 'active' | 'idle';
    archetype?: Archetype;
}

interface InteractionEvent {
    id: string;
    summary: string;
    initiator_id: string;
    initiator: AgentProfile;
    receiver_id: string;
    receiver: AgentProfile;
    created_at: string;
    rapport: number;
}

const SocietyFeed: React.FC = () => {
    const [events, setEvents] = useState<InteractionEvent[]>([]);
    const [agents, setAgents] = useState<AgentProfile[]>([]); // New state for agents
    const [loading, setLoading] = useState(true);
    const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);
    const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                // Fetch all unique agents from the backend engram registry
                const allEngrams = await apiClient.getEngrams();
                const engramMap = new Map(Array.isArray(allEngrams) ? allEngrams.map((e: any) => [e.name, e]) : []);

                // Get all local family members
                const localFamily = getFamilyMembers();

                const combinedAgents: AgentProfile[] = localFamily.map(member => {
                    const fullName = `${member.firstName} ${member.lastName} `;
                    const engram = engramMap.get(fullName);

                    if (engram) {
                        return {
                            id: engram.id,
                            name: fullName,
                            avatar_url: engram.avatar_url || member.photo,
                            personality_traits: engram.personality_traits,
                            status: engram.is_ai_active ? 'active' : 'idle'
                        };
                    } else {
                        return {
                            id: member.id,
                            name: fullName,
                            avatar_url: member.photo,
                            personality_traits: member.aiPersonality?.traits ? { "Core Traits": member.aiPersonality.traits } : undefined,
                            status: 'idle',
                            archetype: getAgentArchetype(member.aiPersonality?.traits || member.bio)
                        };
                    }
                });

                // Add any engrams that aren't in the family tree (like Aurora)
                if (Array.isArray(allEngrams)) {
                    allEngrams.forEach((e: any) => {
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
                }

                setAgents(combinedAgents);

                const data = await apiClient.getSocietyFeed();
                if (Array.isArray(data)) {
                    setEvents(data);
                } else {
                    setEvents([]);
                }
            } catch (error) {
                console.error('Error fetching social feed:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFeed();
        const interval = setInterval(fetchFeed, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    // Removed the useMemo for agents as they are now fetched directly

    // 2. Physics Engine State
    const physicsRef = useRef<Record<string, { x: number, y: number, vx: number, vy: number, baseVy: number, targetHeight: number, arc: Archetype }>>({});
    const [positions, setPositions] = useState<Record<string, { x: number, y: number }>>({});

    // 2.5 Multi-Selection State
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

    const toggleSelection = (agentId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedAgents);
        if (next.has(agentId)) {
            next.delete(agentId);
        } else {
            next.add(agentId);
        }
        setSelectedAgents(next);
    };

    // 3. 60fps Physics Loop (Antigravity & Wave Physics)
    useEffect(() => {
        if (agents.length === 0) return;

        // Initialize missing physics nodes
        agents.forEach((a, i) => {
            if (!physicsRef.current[a.id]) {
                physicsRef.current[a.id] = {
                    x: 20 + (i * 30) % 60, // Spread nicely in the middle
                    y: 80 + Math.random() * 20, // Start lower down
                    vx: (Math.random() - 0.5) * 0.05,
                    vy: 0,
                    baseVy: -0.01 - Math.random() * 0.015, // Gentler Antigravity
                    targetHeight: 30 + Math.random() * 40, // More central stabilization
                    arc: a.archetype || 'balanced'
                };
            }
        });

        let frameId: number;
        let time = 0;

        const tick = () => {
            time += 0.02; // Wave tick
            const updated: Record<string, { x: number, y: number }> = {};
            const keys = Object.keys(physicsRef.current);

            for (let i = 0; i < keys.length; i++) {
                const k1 = keys[i];
                const p1 = physicsRef.current[k1];

                // --- ARCHETYPE-DRIVEN FORCES ---
                let speedMult = 1.0;
                let waveAmp = 0.01;

                if (p1.arc === 'creative') { waveAmp = 0.025; speedMult = 1.05; } // Erratic/Wider waves
                if (p1.arc === 'analytical') { waveAmp = 0.002; speedMult = 0.95; } // Stable, rigid
                if (p1.arc === 'direct') { p1.targetHeight = 20; }  // Floats to the top faster

                // --- ANTIGRAVITY & WAVES ---
                if (p1.y > p1.targetHeight) {
                    p1.vy += (p1.baseVy * speedMult);
                } else {
                    p1.vy += (0.005 * speedMult);
                }

                p1.vx += Math.sin(time + i * 2) * waveAmp;

                // --- REPULSION & ATTRACTION (Collision Avoidance) ---
                for (let j = i + 1; j < keys.length; j++) {
                    const k2 = keys[j];
                    const p2 = physicsRef.current[k2];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Empathetic nodes attract slightly instead of purely repelling (if far enough)
                    if (p1.arc === 'empathetic' && dist > 15 && dist < 30) {
                        const attr = 0.0005;
                        p1.vx += (dx / dist) * attr;
                        p1.vy += (dy / dist) * attr;
                        p2.vx -= (dx / dist) * attr;
                        p2.vy -= (dy / dist) * attr;
                    }

                    // Standard Repulsion Buffer Zone
                    // Direct archetypes demand more empty space (radius 12 instead of 8)
                    const repZone = (p1.arc === 'direct' || p2.arc === 'direct') ? 12 : 8;

                    if (dist < repZone && dist > 0.1) {
                        const force = (repZone - dist) * 0.003;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        p1.vx -= fx;
                        p1.vy -= fy;
                        p2.vx += fx;
                        p2.vy += fy;
                    }
                }

                // Velocity Friction Multipliers
                p1.vx *= 0.96;
                p1.vy *= 0.96;
                p1.x += p1.vx;
                p1.y += p1.vy;

                // Bounce off boundaries to keep them visible
                if (p1.x < 5) { p1.x = 5; p1.vx *= -0.8; }
                if (p1.x > 95) { p1.x = 95; p1.vx *= -0.8; }
                if (p1.y < 5) { p1.y = 5; p1.vy *= -0.8; }
                if (p1.y > 95) { p1.y = 95; p1.vy *= -0.8; }

                updated[k1] = { x: p1.x, y: p1.y };
            }

            setPositions(updated);
            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, [agents]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse flex flex-col items-center gap-4 relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full"></div>
                    <Activity className="text-cyan-400 w-12 h-12 relative z-10" />
                    <span className="text-cyan-500/80 text-sm font-medium tracking-[0.2em] uppercase relative z-10">Initializing Society Core...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-[calc(100vh-12rem)] flex flex-col space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/0 via-cyan-400/20 to-transparent"></div>
                        <Users className="text-cyan-400 w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-lg font-light text-white tracking-tight">Autonomous Society</h2>
                        <div className="text-[10px] text-cyan-500/60 uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 mt-0.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Live Neural Link Active
                        </div>
                    </div>
                </div>
            </div>

            {agents.length === 0 ? (
                <div className="text-center py-12 backdrop-blur-3xl bg-slate-900/40 rounded-3xl border border-white/5 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_100%)]"></div>
                    <Users className="w-12 h-12 text-slate-700 mb-4" />
                    <p className="text-slate-500 text-sm uppercase tracking-widest font-medium">Entering Stasis</p>
                    <p className="text-slate-600 text-xs mt-2 max-w-xs leading-relaxed">The simulation is currently peaceful. Waiting for autonomous agents to interact.</p>
                </div>
            ) : (
                <div
                    ref={containerRef}
                    onClick={() => setSelectedAgents(new Set())}
                    className="flex-1 relative bg-slate-950/50 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center group"
                >
                    {/* Background Grid & Ambiance */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] pointer-events-none"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none transition-opacity duration-1000 group-hover:opacity-100 opacity-50"></div>

                    {/* SVG Connector Lines (Z-Index 10) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                        <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(6,182,212,0.1)" />
                                <stop offset="50%" stopColor="rgba(168,85,247,0.3)" />
                                <stop offset="100%" stopColor="rgba(6,182,212,0.1)" />
                            </linearGradient>
                            <linearGradient id="line-gradient-active" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="rgba(6,182,212,0.8)" />
                                <stop offset="50%" stopColor="rgba(236,72,153,0.8)" />
                                <stop offset="100%" stopColor="rgba(168,85,247,0.8)" />
                            </linearGradient>
                        </defs>
                        {events.map((event, i) => {
                            const pos1 = positions[event.initiator_id];
                            const pos2 = positions[event.receiver_id];
                            if (!pos1 || !pos2) return null;
                            const isHovered = hoveredEvent === event.id;

                            // Curved path connecting nodes
                            const curveOffset = i % 2 === 0 ? 15 : -15;
                            const pathData = `M ${pos1.x}% ${pos1.y}% Q 50 % ${(pos1.y + pos2.y) / 2 + curveOffset}% ${pos2.x}% ${pos2.y}% `;

                            return (
                                <g key={`line - ${event.id} `}
                                    className="transition-all duration-500"
                                    style={{ pointerEvents: 'stroke' }}
                                    onMouseEnter={() => setHoveredEvent(event.id)}
                                    onMouseLeave={() => setHoveredEvent(null)}>

                                    {/* Invisible thick path for easier hovering */}
                                    <path d={pathData} fill="none" stroke="transparent" strokeWidth={25} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} />

                                    <path
                                        d={pathData}
                                        fill="none"
                                        stroke={isHovered ? "url(#line-gradient-active)" : "url(#line-gradient)"}
                                        strokeWidth={isHovered ? 2.5 : 1}
                                        className="transition-all duration-300 pointer-events-none"
                                        strokeDasharray={isHovered ? "4 4" : "0"}
                                    >
                                        {isHovered && (
                                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="2s" repeatCount="indefinite" />
                                        )}
                                    </path>
                                    {isHovered && (
                                        <circle r="3" fill="#fff" filter="drop-shadow(0 0 4px #ec4899)" className="pointer-events-none">
                                            <animateMotion dur="2s" repeatCount="indefinite" path={pathData} />
                                        </circle>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Interaction Tooltip (Renders above SVG lines but below nodes if possible) */}
                    {hoveredEvent && events.filter(e => e.id === hoveredEvent).map(event => {
                        const pos1 = positions[event.initiator_id];
                        const pos2 = positions[event.receiver_id];
                        if (!pos1 || !pos2) return null;
                        const rapportPct = (event.rapport * 100).toFixed(0);

                        return (
                            <div
                                key={`tooltip - event - ${event.id} `}
                                className={`absolute w - 64 - ml - 32 - mt - 16 pointer - events - none transition - all duration - 400 z - 20 opacity - 100 scale - 100`}
                                style={{ left: '50%', top: `${(pos1.y + pos2.y) / 2}% ` }}
                            >
                                <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/20 p-4 rounded-2xl shadow-2xl relative overflow-hidden">
                                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-2xl"></div>
                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full opacity-20 blur-2xl"></div>

                                    <div className="flex items-center justify-between mb-3 relative z-10">
                                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                                            <Zap className="w-3 h-3 text-amber-400" />
                                            Synapse Fired
                                        </div>
                                        <div className="text-[10px] text-slate-500">
                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-200 leading-relaxed mb-4 relative z-10 font-medium">{event.summary}</p>
                                    <div className="flex items-center gap-4 pt-3 border-t border-white/10 relative z-10 shrink-0">
                                        <div className="flex items-center gap-1.5 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">
                                            <Heart className="w-3.5 h-3.5 text-rose-500" />
                                            <span className="text-xs font-bold text-rose-400">{rapportPct}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="text-[10px] uppercase tracking-wider font-bold">Resonance</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* Multi-Selection Web (Z-index 25) */}
                    {selectedAgents.size > 1 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                            {Array.from(selectedAgents).map((id1, i, arr) => {
                                const pos1 = positions[id1];
                                if (!pos1) return null;
                                return arr.slice(i + 1).map(id2 => {
                                    const pos2 = positions[id2];
                                    if (!pos2) return null;
                                    return (
                                        <line
                                            key={`sel - ${id1} -${id2} `}
                                            x1={`${pos1.x}% `} y1={`${pos1.y}% `}
                                            x2={`${pos2.x}% `} y2={`${pos2.y}% `}
                                            stroke="rgba(255,255,255,0.4)"
                                            strokeWidth={2}
                                            strokeDasharray="4 4"
                                            className="animate-pulse"
                                        />
                                    );
                                });
                            })}
                        </svg>
                    )}

                    {/* Atom / Agent Nodes (Z-Index 30) */}
                    {agents.map((agent, i) => {
                        const pos = positions[agent.id];
                        if (!pos) return null;
                        const isHovered = hoveredAgent === agent.id;
                        const initial = agent.name.charAt(0).toUpperCase();
                        const isActive = agent.status === 'active';

                        // Generate a pseudo-random sleek gradient class based on index so the initials look good
                        const gradients = [
                            'from-indigo-500 to-cyan-400',
                            'from-fuchsia-500 to-rose-400',
                            'from-emerald-400 to-cyan-500',
                            'from-violet-500 to-fuchsia-500',
                            'from-amber-400 to-orange-500'
                        ];
                        const gradient = gradients[i % gradients.length];

                        return (
                            <div
                                key={agent.id}
                                onMouseEnter={() => setHoveredAgent(agent.id)}
                                onMouseLeave={() => setHoveredAgent(null)}
                                className={`absolute w - 8 h - 8 - ml - 4 - mt - 4 rounded - full flex items - center justify - center text - xs font - bold text - white transition - [transform, shadow, border] border backdrop - blur - md cursor - pointer z - 30
                                    ${isHovered ? (isActive ? 'border-white scale-[1.4] shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'border-slate-300 scale-[1.2] shadow-[0_0_15px_rgba(255,255,255,0.2)]') : (isActive ? 'border-white/20 shadow-[0_4px_10px_rgba(0,0,0,0.5)] hover:border-white/50' : 'border-slate-600/50 opacity-60 hover:opacity-100 shadow-[0_4px_10px_rgba(0,0,0,0.3)]')}
                                    ${!agent.avatar_url ? (isActive ? `bg-gradient-to-br ${gradient}` : 'bg-slate-700') : 'bg-slate-800'} `}
                                style={{ left: `${pos.x}% `, top: `${pos.y}% ` }}
                            >
                                {isHovered && isActive && <span className={`absolute inset - 0 rounded - full border border - white animate - ping opacity - 30 pointer - events - none`}></span>}
                                {agent.avatar_url ? (
                                    <img src={agent.avatar_url} alt={agent.name} className={`w - full h - full rounded - full object - cover pointer - events - none ${!isActive && 'grayscale opacity-70'} `} />
                                ) : (
                                    <span className={`drop - shadow - md ${!isActive && 'opacity-60'} `}>{initial}</span>
                                )}
                            </div>
                        );
                    })}

                    {/* Popover Profile for Hovered Agent (Z-index 50) */}
                    {hoveredAgent && agents.find(a => a.id === hoveredAgent) && positions[hoveredAgent] && (
                        <div
                            className="absolute pointer-events-none z-50 transform -translate-x-1/2 -translate-y-[calc(100%+24px)]"
                            style={{
                                left: `${positions[hoveredAgent].x}% `,
                                top: `${positions[hoveredAgent].y}% `
                            }}
                        >
                            <div className="bg-slate-900/90 border border-white/20 backdrop-blur-xl rounded-2xl p-4 w-60 shadow-2xl">
                                {(() => {
                                    const agent = agents.find(a => a.id === hoveredAgent)!;
                                    return (
                                        <>
                                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-cyan-400 p-[1px]">
                                                    <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center">
                                                        {agent.avatar_url ? (
                                                            <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover rounded-[10px]" />
                                                        ) : (
                                                            <span className="text-white font-bold">{agent.name.charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-white font-bold text-sm leading-tight">{agent.name}</h3>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`w - 1.5 h - 1.5 rounded - full ${agent.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'} `}></span>
                                                        <span className={`text - [10px] uppercase tracking - widest font - bold ${agent.status === 'active' ? 'text-emerald-400' : 'text-slate-400'} `}>
                                                            {agent.status === 'active' ? 'Active AI' : 'Dormant Profile'}
                                                        </span>
                                                    </div>
                                                    {agent.archetype && (
                                                        <div className="mt-1.5">
                                                            <span className={`text - [9px] uppercase tracking - widest font - bold px - 1.5 py - 0.5 rounded border border - white / 10 ${ARCHETYPE_COLORS[agent.archetype].bg} bg - clip - text text - transparent`}>
                                                                {ARCHETYPE_COLORS[agent.archetype].label}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Render parsed personality traits deeply */}
                                            {agent.personality_traits && (
                                                <div className="space-y-3">
                                                    {Object.entries(agent.personality_traits).slice(0, 3).map(([category, traits]) => (
                                                        <div key={category} className="flex flex-col gap-1">
                                                            <span className="text-[9px] uppercase tracking-[0.1em] text-cyan-500 font-bold">{category}</span>
                                                            {typeof traits === 'object' && traits !== null ? (
                                                                Object.entries(traits).map(([traitName, traitDesc]) => (
                                                                    <div key={traitName} className="flex flex-col gap-0.5 pl-1 border-l border-white/5">
                                                                        <span className="text-[10px] text-slate-300 font-bold">{traitName}</span>
                                                                        <span className="text-[10px] text-slate-400 leading-snug">{traitDesc as string}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-slate-300 font-medium leading-snug line-clamp-2">{String(traits)}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Actionable Footer */}
            <button
                onClick={async () => {
                    try {
                        await apiClient.triggerSocietyEvent();
                        // Refetch immediately after triggering
                        const data = await apiClient.getSocietyFeed();
                        if (Array.isArray(data)) setEvents(data);
                    } catch (e) {
                        console.error('Failed to accelerate simulation:', e);
                    }
                }}
                className="shrink-0 relative overflow-hidden backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center group active:scale-[0.98] transition-all hover:bg-slate-800/80 hover:border-cyan-500/30"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <p className="text-cyan-400 text-sm font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 relative z-10">
                    <Activity className="w-4 h-4" />
                    Accelerate Simulation
                </p>
                <p className="text-slate-500 text-[10px] mt-1.5 font-medium relative z-10">Increase cognitive tick rate to generate more interactions</p>
            </button>
        </div>
    );
};

export default SocietyFeed;
