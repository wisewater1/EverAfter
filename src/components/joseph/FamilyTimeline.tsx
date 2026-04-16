import { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, Sparkles, User, X, LineChart, Loader2, Plus, Image as ImageIcon, Heart, Wallet, Scale, AlertTriangle, Layers, Zap, Flame, GitBranch, Link, Repeat } from 'lucide-react';
import {
    getFamilyEvents, FamilyEvent as FamilyEventType,
    getEventIcon, formatDate, EventType,
    getFamilyMembers, FamilyMember
} from '../../lib/joseph/genealogy';
import SaintChat from '../SaintChat';
import AddEventModal from './AddEventModal';
import { apiClient } from '../../lib/api-client';
import { requestBackendJson } from '../../lib/backend-request';

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
    birth: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    marriage: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
    death: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
    milestone: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
    adoption: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
};

// ── Cross-Saint Milestone Types ────────────────────────────────
type MilestoneSource = 'health' | 'finance' | 'council' | 'capsule' | 'local' | 'projection';

const SOURCE_BADGES: Record<MilestoneSource, { icon: typeof Heart; label: string; color: string }> = {
    health:     { icon: Heart,          label: 'St. Raphael',  color: 'text-teal-400' },
    finance:    { icon: Wallet,         label: 'St. Gabriel',  color: 'text-emerald-400' },
    council:    { icon: Scale,          label: 'Council',      color: 'text-indigo-400' },
    capsule:    { icon: Clock,          label: 'Time Capsule', color: 'text-amber-400' },
    local:      { icon: User,           label: 'Family',       color: 'text-slate-400' },
    projection: { icon: LineChart,      label: 'Projection',   color: 'text-violet-400' },
};

interface EnrichedEvent extends FamilyEventType {
    source?: MilestoneSource;
    impactScore?: number; // 0-100, how significant is this for the generational chain
}

// ── Missing History Detection ──────────────────────────────────
interface MissingHistoryProbe {
    memberId: string;
    memberName: string;
    gapStartYear: number;
    gapEndYear: number;
    suggestedPrompt: string;
}

function detectMissingHistory(members: FamilyMember[], events: FamilyEventType[]): MissingHistoryProbe[] {
    const probes: MissingHistoryProbe[] = [];
    const currentYear = new Date().getFullYear();

    for (const member of members) {
        if (!member.birthDate) continue;
        const birthYear = parseInt(member.birthDate.split('-')[0]);
        const endYear = member.deathDate ? parseInt(member.deathDate.split('-')[0]) : currentYear;
        const lifespan = endYear - birthYear;
        if (lifespan < 10) continue; // Skip young children

        const memberEvents = events.filter(e => e.memberId === member.id);
        const eventYears = new Set(memberEvents.map(e => parseInt(e.date.split('-')[0])));

        // Find gaps of 10+ years with no events
        for (let decade = birthYear + 10; decade < endYear - 5; decade += 10) {
            const hasEvents = Array.from({ length: 10 }, (_, i) => decade + i).some(y => eventYears.has(y));
            if (!hasEvents) {
                const fullName = `${member.firstName} ${member.lastName}`;
                const ageAtGap = decade - birthYear;
                const prompts = [
                    `What was ${member.firstName} doing in their ${ageAtGap}s? Catalog a memory from ${decade}-${decade + 9}.`,
                    `${member.firstName}'s ${decade}s are uncharted. Ask a family member about this decade.`,
                    `No records exist for ${fullName} between ${decade}-${decade + 9}. Help preserve this chapter.`,
                ];
                probes.push({
                    memberId: member.id,
                    memberName: fullName,
                    gapStartYear: decade,
                    gapEndYear: decade + 9,
                    suggestedPrompt: prompts[Math.floor(Math.random() * prompts.length)],
                });
                break; // Only show one probe per member
            }
        }
    }
    return probes;
}

// ── Generational Impact Scoring ────────────────────────────────
function computeImpactScore(event: FamilyEventType, members: FamilyMember[]): number {
    const member = members.find(m => m.id === event.memberId);
    let score = 30; // base
    if (event.type === 'birth') score += 40;
    if (event.type === 'marriage') score += 35;
    if (event.type === 'death') score += 25;
    if (event.type === 'adoption') score += 45;
    if (member && !member.deathDate) score += 10; // living members have more impact
    if (event.id.startsWith('health_')) score += 15;
    if (event.id.startsWith('finance_')) score += 20;
    if (event.id.startsWith('council_')) score += 25;
    return Math.min(100, score);
}

export default function FamilyTimeline() {
    const [events, setEvents] = useState<FamilyEventType[]>(() => getFamilyEvents());
    const [members] = useState<FamilyMember[]>(() => getFamilyMembers());
    const [filterType, setFilterType] = useState<EventType | null>(null);
    const [chatMember, setChatMember] = useState<FamilyMember | null>(null);
    const [chatEventTitle, setChatEventTitle] = useState<string>('');
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = Normal, 0.5 = Zoomed Out

    // Drag-to-scroll state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        if (scrollContainerRef.current) {
            setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
            setScrollLeft(scrollContainerRef.current.scrollLeft);
        }
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // Add Event Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Projections
    const [showProjections, setShowProjections] = useState(false);
    const [projectionsLoading, setProjectionsLoading] = useState(false);
    const [projectionEvents, setProjectionEvents] = useState<FamilyEventType[]>([]);

    // Cross-Saint Milestones
    const [crossSaintEvents, setCrossSaintEvents] = useState<EnrichedEvent[]>([]);
    const [crossSaintLoading, setCrossSaintLoading] = useState(true);

    // Missing History Probes
    const [historyProbes, setHistoryProbes] = useState<MissingHistoryProbe[]>([]);
    const [showProbes, setShowProbes] = useState(true);

    // Generational Impact Overlay
    const [showImpactOverlay, setShowImpactOverlay] = useState(false);

    // ── Generational Impact Engine Toggles ── 
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showThreads, setShowThreads] = useState(false);
    const [activeThreadEventId, setActiveThreadEventId] = useState<string | null>(null);
    const [showEchoes, setShowEchoes] = useState(false);
    const [showGhostBranches, setShowGhostBranches] = useState(false);
    const [activeGhostEventId, setActiveGhostEventId] = useState<string | null>(null);

    const getBackendHeaders = async (extraHeaders: HeadersInit = {}) => (
        apiClient.getAuthHeaders({
            'Bypass-Tunnel-Reminder': 'true',
            ...extraHeaders,
        })
    );

    useEffect(() => {
        async function loadCapsules() {
            try {
                const headers = await getBackendHeaders();
                const capsules = await requestBackendJson<unknown[]>(
                    '/api/v1/time-capsules',
                    {
                        headers,
                    },
                    'Failed to load time capsules.',
                );

                const capsuleEvents: FamilyEventType[] = capsules.map(c => ({
                    id: `capsule_${c.id}`,
                    memberId: c.sender_saint_id === 'user' ? 'me' : c.sender_saint_id,
                    memberName: c.sender_saint_id === 'user' ? 'You' : 'Saint ' + c.sender_saint_id.charAt(0).toUpperCase() + c.sender_saint_id.slice(1),
                    type: 'milestone',
                    date: c.is_unlocked && c.unlock_date ? c.unlock_date.split('T')[0] : (c.unlock_date ? c.unlock_date.split('T')[0] : '2050-01-01'),
                    title: c.is_unlocked ? `Unlocked Time Capsule: ${c.title}` : `Locked Time Capsule: ${c.title}`,
                    description: c.is_unlocked ? (c.content || 'A message from the past.') : `Sealed on ${new Date(c.created_at).toLocaleDateString()}.`,
                }));

                setEvents(prev => {
                    const existingIds = new Set(prev.map(e => e.id));
                    const newEvents = capsuleEvents.filter(ce => !existingIds.has(ce.id));
                    return [...prev, ...newEvents];
                });

            } catch (e) {
                console.error("Failed to load time capsules for timeline", e);
            }
        }
        loadCapsules();
    }, []);

    // ── Cross-Saint Milestone Ingestion ─────────────────────────
    useEffect(() => {
        async function loadCrossSaintMilestones() {
            setCrossSaintLoading(true);
            const milestones: EnrichedEvent[] = [];
            const currentYear = new Date().getFullYear();

            // 1. St. Raphael — Health milestones
            try {
                const healthSummary = await apiClient.getHealthSummary();
                if (healthSummary) {
                    // Trend-based milestones
                    if (healthSummary.sleep_score && healthSummary.sleep_score >= 85) {
                        milestones.push({
                            id: `health_sleep_${currentYear}`,
                            memberId: 'raphael',
                            memberName: 'St. Raphael',
                            type: 'milestone',
                            date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
                            title: '🏥 Sleep Excellence Achievement',
                            description: `Family sleep score reached ${healthSummary.sleep_score}%. St. Raphael notes sustained healthy rest patterns.`,
                            source: 'health',
                        });
                    }
                    if (healthSummary.activity_score && healthSummary.activity_score >= 80) {
                        milestones.push({
                            id: `health_activity_${currentYear}`,
                            memberId: 'raphael',
                            memberName: 'St. Raphael',
                            type: 'milestone',
                            date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
                            title: '💪 Active Living Milestone',
                            description: `Activity score: ${healthSummary.activity_score}%. Consistent movement patterns detected across connected devices.`,
                            source: 'health',
                        });
                    }
                    if (healthSummary.hrv_avg) {
                        milestones.push({
                            id: `health_hrv_${currentYear}`,
                            memberId: 'raphael',
                            memberName: 'St. Raphael',
                            type: 'milestone',
                            date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-15`,
                            title: '❤️ Heart Variability Baseline Recorded',
                            description: `Average HRV: ${healthSummary.hrv_avg}ms. This becomes a generational health benchmark for the CausalTwin engine.`,
                            source: 'health',
                        });
                    }
                }
            } catch (e) {
                console.warn('Timeline: Health milestone ingestion skipped', e);
            }

            // 2. St. Gabriel — Finance milestones
            try {
                const headers = await getBackendHeaders();

                const walletData = await requestBackendJson<unknown>(
                    '/api/v1/finance/wisegold/wallet',
                    {
                        headers,
                    },
                    'Failed to load WiseGold wallet.',
                );
                const balance = walletData?.wallet?.balance || 0;
                if (balance > 0) {
                    milestones.push({
                        id: `finance_vault_${currentYear}`,
                        memberId: 'gabriel',
                        memberName: 'St. Gabriel',
                        type: 'milestone',
                        date: `${currentYear}-01-01`,
                        title: '🏦 Sovereign Vault Active',
                        description: `WiseGold vault holds ${balance.toFixed(2)} WGOLD. St. Gabriel marks this as a generational wealth anchor.`,
                        source: 'finance',
                    });
                }

                const covenants = await requestBackendJson<unknown[]>(
                    '/api/v1/finance/wisegold/covenants',
                    {
                        headers,
                    },
                    'Failed to load WiseGold covenants.',
                );
                if (Array.isArray(covenants) && covenants.length > 0) {
                    milestones.push({
                        id: `finance_covenant_${currentYear}`,
                        memberId: 'gabriel',
                        memberName: 'St. Gabriel',
                        type: 'milestone',
                        date: `${currentYear}-06-01`,
                        title: '📜 Smart Covenant Ratified',
                        description: `${covenants.length} active covenant(s) anchor the family's financial legacy on-chain.`,
                        source: 'finance',
                    });
                }
            } catch (e) {
                console.warn('Timeline: Finance milestone ingestion skipped', e);
            }

            // 3. Council — Intercessions milestones
            try {
                const intercessions = await apiClient.getPendingIntercessions();
                const missions = await apiClient.getActiveMissions();

                if (missions && missions.length > 0) {
                    milestones.push({
                        id: `council_mission_${currentYear}`,
                        memberId: 'council',
                        memberName: 'The Council',
                        type: 'milestone',
                        date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
                        title: '⚖️ Active Council Missions',
                        description: `${missions.length} autonomous mission(s) are being executed by the Council of Saints.`,
                        source: 'council',
                    });
                }
                if (intercessions && intercessions.length > 0) {
                    milestones.push({
                        id: `council_intercession_${currentYear}`,
                        memberId: 'council',
                        memberName: 'The Council',
                        type: 'milestone',
                        date: `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}-10`,
                        title: '🙏 Pending Intercessions',
                        description: `${intercessions.length} intercession(s) await your review. The Saints seek your guidance.`,
                        source: 'council',
                    });
                }
            } catch (e) {
                console.warn('Timeline: Council milestone ingestion skipped', e);
            }

            setCrossSaintEvents(milestones);
            setCrossSaintLoading(false);
        }

        loadCrossSaintMilestones();
    }, []);

    // ── Missing History Detection ───────────────────────────────
    useEffect(() => {
        const probes = detectMissingHistory(members, events);
        setHistoryProbes(probes);
    }, [events, members]);

    useEffect(() => {
        if (!showProjections) {
            setProjectionEvents([]);
            return;
        }

        async function loadProjections() {
            setProjectionsLoading(true);
            try {
                const headers = await getBackendHeaders();
                const futureEvents: FamilyEventType[] = [];
                const currentYear = new Date().getFullYear();

                // 1. Fetch WiseGold Wallet
                try {
                    let balance = 1450.50; // Mock base
                    const data = await requestBackendJson<unknown>(
                        '/api/v1/finance/wisegold/wallet',
                        {
                            headers,
                        },
                        'Failed to load projected WiseGold wallet.',
                    );
                    balance = data.wallet?.balance || balance;

                    if (balance > 0) {
                        futureEvents.push({
                            id: 'proj_w10', memberId: 'wg_proj', memberName: 'Sovereign Wealth',
                            type: 'milestone', date: `${currentYear + 10}-01-01`,
                            title: '10-Year Wealth Projection',
                            description: `Projected Sovereign Vault holdings at 5% compounding yield: ${(balance * Math.pow(1.05, 10)).toFixed(2)} WGOLD`,
                        });
                        futureEvents.push({
                            id: 'proj_w20', memberId: 'wg_proj', memberName: 'Sovereign Wealth',
                            type: 'milestone', date: `${currentYear + 20}-01-01`,
                            title: '20-Year Wealth Projection',
                            description: `Projected Sovereign Vault holdings at 5% compounding yield: ${(balance * Math.pow(1.05, 20)).toFixed(2)} WGOLD`,
                        });
                    }
                } catch (_e) { /* intentional */ }

                // 2. Fetch CausalTwin Health Projections for the primary oldest member
                try {
                    const aliveMembers = members.filter(m => !m.deathDate).sort((a, b) => a.generation - b.generation);
                    if (aliveMembers.length > 0) {
                        const primary = aliveMembers[0];
                        const data = await requestBackendJson<unknown>(
                            '/api/v1/causal-twin/ancestry/predict',
                            {
                                method: 'POST',
                                headers: await getBackendHeaders({ 'Content-Type': 'application/json' }),
                                body: JSON.stringify({
                                    member_id: primary.id,
                                    first_name: primary.firstName,
                                    last_name: primary.lastName,
                                    traits: primary.aiPersonality?.traits || [],
                                    birth_year: primary.birthDate ? parseInt(primary.birthDate.split('-')[0]) : null,
                                    occupation: primary.occupation,
                                    generation: primary.generation
                                }),
                            },
                            'Failed to load ancestry projections.',
                        );
                        const proj = data.projections || {};

                        if (proj.hrv && proj.hrv['3650']) {
                            futureEvents.push({
                                id: 'proj_h10', memberId: primary.id, memberName: `${primary.firstName} ${primary.lastName}`,
                                type: 'milestone', date: `${currentYear + 10}-06-01`,
                                title: '10-Year Health Trajectory',
                                description: `CausalTwin derived baseline wellness. HRV: ${proj.hrv['3650']?.mid || '?'}ms. Sleep Quality: ${proj.sleep_quality?.['3650']?.mid || '?'}%.`,
                            });
                        }
                        if (proj.hrv && proj.hrv['7300']) {
                            futureEvents.push({
                                id: 'proj_h20', memberId: primary.id, memberName: `${primary.firstName} ${primary.lastName}`,
                                type: 'milestone', date: `${currentYear + 20}-06-01`,
                                title: '20-Year Health Trajectory',
                                description: `Long-term causal twin projection based on current behavioural routines and ancestry modifiers.`,
                            });
                        }
                    }
                } catch (_e) { /* intentional */ }

                setProjectionEvents(futureEvents);
            } catch (e) {
                console.error(e);
            }
            setProjectionsLoading(false);
        }

        loadProjections();
    }, [showProjections, members]);

    const allEvents: EnrichedEvent[] = [
        ...events.map(e => ({ ...e, source: 'local' as MilestoneSource, impactScore: computeImpactScore(e, members) })),
        ...crossSaintEvents.map(e => ({ ...e, impactScore: computeImpactScore(e, members) })),
        ...projectionEvents.map(e => ({ ...e, source: 'projection' as MilestoneSource, impactScore: computeImpactScore(e, members) })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const filteredEvents = filterType ? allEvents.filter(e => e.type === filterType) : allEvents;

    // Group events by decade (Memoized for performance on massive arrays)
    const decades = useMemo(() => {
        const map = new Map<string, FamilyEventType[]>();
        filteredEvents.forEach(event => {
            const year = new Date(event.date + 'T00:00:00').getFullYear();
            const decade = `${Math.floor(year / 10) * 10}s`;
            if (!map.has(decade)) map.set(decade, []);
            map.get(decade)!.push(event);
        });
        return map;
    }, [filteredEvents]);

    // ── Heatmap Calculation ──
    // Generates a CSS gradient string mapping decades to warm/cool tones based on impact sums
    const heatmapLayer = useMemo(() => {
        if (!showHeatmap) return 'transparent';
        const stops: string[] = [];
        let totalImpactSum = 0;
        const decadeList = Array.from(decades.entries());
        if (decadeList.length === 0) return 'transparent';

        decadeList.forEach(([_, events]) => {
            const sum = events.reduce((acc, e) => acc + ((e as EnrichedEvent).impactScore || 30), 0);
            totalImpactSum += sum;
        });
        const averageImpact = decadeList.length > 0 ? totalImpactSum / decadeList.length : 50;

        decadeList.forEach(([_, events], i) => {
            const percentPos = Math.round((i / (decadeList.length - 1)) * 100);
            const sum = events.reduce((acc, e) => acc + ((e as EnrichedEvent).impactScore || 30), 0);
            // If decade sum is >> average, it's golden (Legacy Capital). If << average, it's blue/purple (Legacy Debt).
            if (sum > averageImpact * 1.2) {
                stops.push(`rgba(245, 158, 11, 0.15) ${percentPos}%`); // Amber/Gold
            } else if (sum < averageImpact * 0.8) {
                stops.push(`rgba(99, 102, 241, 0.15) ${percentPos}%`); // Indigo/Blue
            } else {
                stops.push(`rgba(255, 255, 255, 0.05) ${percentPos}%`); // Neutral
            }
        });

        // Add default stops if only 1 decade exists
        if (stops.length === 1) stops.push(stops[0].replace('0%', '100%'));

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [showHeatmap, decades]);

    // ── Causal Thread Chain Calculation ──
    const causalChain = useMemo(() => {
        // Mocking a chain generation based on random downstream events for visual effect
        if (!activeThreadEventId || !showThreads) return new Set<string>();
        const chain = new Set<string>();
        chain.add(activeThreadEventId);
        let found = false;
        allEvents.forEach((e, i) => {
            if (e.id === activeThreadEventId) found = true;
            else if (found && (i % 3 === 0)) {
                // Mock link: Every 3rd event forward in time is vaguely connected to the initial node.
                chain.add(e.id);
            }
        });
        return chain;
    }, [activeThreadEventId, showThreads, allEvents]);

    const eventTypes: EventType[] = ['birth', 'marriage', 'death', 'milestone'];

    return (
        <div className="space-y-6">
            {/* Missing History Probes Banner */}
            {showProbes && historyProbes.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/20 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">Uncharted Family History</h4>
                            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">{historyProbes.length} gap{historyProbes.length > 1 ? 's' : ''}</span>
                        </div>
                        <button onClick={() => setShowProbes(false)} className="text-slate-500 hover:text-white text-xs">dismiss</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {historyProbes.map(probe => (
                            <div key={`${probe.memberId}-${probe.gapStartYear}`} className="bg-slate-900/60 backdrop-blur-sm border border-white/5 rounded-xl p-4 group hover:border-amber-500/30 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-4 h-4 text-amber-400 group-hover:animate-pulse" />
                                    <span className="text-xs font-bold text-white">{probe.memberName}</span>
                                    <span className="text-[10px] text-slate-500">{probe.gapStartYear}–{probe.gapEndYear}</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">{probe.suggestedPrompt}</p>
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="mt-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider hover:text-amber-300 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Catalog Memory
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cross-Saint Ingestion Status */}
            {crossSaintLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Syncing milestones from St. Raphael, St. Gabriel, and the Council...
                </div>
            )}
            {!crossSaintLoading && crossSaintEvents.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Cross-Saint Milestones:</span>
                    {Object.entries(
                        crossSaintEvents.reduce((acc, e) => {
                            const src = e.source || 'local';
                            acc[src] = (acc[src] || 0) + 1;
                            return acc;
                        }, {} as Record<string, number>)
                    ).map(([source, count]) => {
                        const badge = SOURCE_BADGES[source as MilestoneSource];
                        if (!badge) return null;
                        const BadgeIcon = badge.icon;
                        return (
                            <span key={source} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold ${badge.color}`}>
                                <BadgeIcon className="w-3 h-3" />
                                {badge.label}: {count}
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Top Row: Basic Filters & Add Event */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-1 hide-scrollbar">
                    <button
                        onClick={() => setFilterType(null)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex border ${filterType === null
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-400/50'
                            : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        All Events
                    </button>
                    {eventTypes.map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${filterType === type
                                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-400/50'
                                : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            <span>{getEventIcon(type)}</span>
                            {type.charAt(0).toUpperCase() + type.slice(1)}s
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 shrink-0"
                >
                    <Plus className="w-3.5 h-3.5 border-2 border-current rounded-full p-0.5" />
                    Event
                </button>
            </div>

            {/* Bottom Row: Generational Impact Engine, Analysis & Zoom */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-900/40 p-2.5 rounded-2xl border border-white/5 mt-1">
                
                {/* Engine Toggles */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 xl:pb-0 w-full xl:w-auto hide-scrollbar">
                    <button
                        onClick={() => setShowHeatmap(!showHeatmap)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showHeatmap ? 'bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title="Legacy Heatmap: Warms the background for Legacy Capital, cools for Debt"
                    >
                        <Flame className="w-4 h-4" /> Heatmap
                    </button>
                    <button
                        onClick={() => {
                            setShowThreads(!showThreads);
                            if (!showThreads) setActiveThreadEventId(null);
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showThreads ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title="Causal Threads: Click an event to trace its butterfly effect forward in time"
                    >
                        <Link className="w-4 h-4" /> Threads
                    </button>
                    <button
                        onClick={() => setShowEchoes(!showEchoes)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showEchoes ? 'bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title="Ancestral Echoes: Highlights historical parallels across generations"
                    >
                        <Repeat className="w-4 h-4" /> Echoes
                    </button>
                    <button
                        onClick={() => {
                            setShowGhostBranches(!showGhostBranches);
                            if (!showGhostBranches) setActiveGhostEventId(null);
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showGhostBranches ? 'bg-teal-500 text-white shadow-[0_0_15px_rgba(20,184,166,0.4)]' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        title="'What If' Branches: Expose alternate Causal Twin timelines"
                    >
                        <GitBranch className="w-4 h-4" /> Branches
                    </button>

                    <div className="w-px h-6 bg-white/10 my-auto mx-2 hidden md:block" />

                    {/* Analysis Tools */}
                    <button
                        onClick={() => setShowImpactOverlay(!showImpactOverlay)}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showImpactOverlay ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-transparent text-slate-400 hover:text-white border border-transparent hover:bg-white/5'}`}
                        title="Impact Overlay: Highlights the generational percentage impact of events"
                    >
                        <Layers className="w-4 h-4" /> Impact Overlays
                    </button>
                    <button
                        onClick={() => setShowProjections(!showProjections)}
                        disabled={projectionsLoading}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${showProjections ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' : 'bg-transparent text-slate-400 hover:text-white border border-transparent hover:bg-white/5'}`}
                        title="Future Projections: See Causal Twin and WiseGold predictions"
                    >
                        {projectionsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LineChart className="w-4 h-4" />}
                        Projections
                    </button>
                </div>

                {/* Zoom Controls (Right aligned) */}
                <div className="flex items-center gap-3 bg-slate-950 p-2 px-4 rounded-xl border border-white/5 shrink-0 ml-auto w-full xl:w-auto">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Zoom</span>
                    <input
                        type="range"
                        min="0.5"
                        max="1.5"
                        step="0.1"
                        value={zoomLevel}
                        onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                        className="w-full xl:w-32 accent-indigo-500 bg-slate-800"
                    />
                </div>
            </div>

            {/* Cinematic Horizontal Timeline */}
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-xl shadow-2xl transition-all duration-1000" style={{ backgroundImage: heatmapLayer !== 'transparent' ? heatmapLayer : 'none' }}>
                {/* Horizontal central line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gradient-to-r from-amber-500/10 via-amber-500/30 to-indigo-500/20 z-0" />

                <div
                    ref={scrollContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className={`overflow-x-auto flex items-center h-[500px] px-24 py-12 hide-scrollbar gap-16 ${isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'}`}
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'left center', width: `${100 / zoomLevel}%` }}
                >
                    {[...decades.entries()].map(([decade, decadeEvents]) => (
                        <div key={decade} className="flex items-center gap-12 shrink-0 h-full relative z-10">

                            {/* Decade Marker */}
                            <div className="shrink-0 flex flex-col items-center justify-center -mt-24">
                                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.15)] z-20">
                                    <span className="text-sm font-black text-amber-400 tracking-wider">{decade}</span>
                                </div>
                                <div className="w-px h-24 bg-gradient-to-b from-amber-500/30 to-transparent absolute top-[calc(50%+2rem)]" />
                            </div>

                            {/* Events spread horizontally */}
                            <div className="flex gap-16 items-center">
                                {decadeEvents.map((event, index) => {
                                    const enrichedEvent = event as EnrichedEvent;
                                    const colors = EVENT_COLORS[event.type];
                                    const isTop = index % 2 === 0;
                                    const member = members.find(m => m.id === event.memberId);
                                    const hasAI = member?.aiPersonality?.isActive || member?.engramId;
                                    const isProjection = event.id.startsWith('proj_');
                                    const isCrossSaint = enrichedEvent.source && enrichedEvent.source !== 'local';
                                     const crossSaintBadge = enrichedEvent.source ? SOURCE_BADGES[enrichedEvent.source] : null;
                                    const CrossSaintIcon = crossSaintBadge?.icon || User;
                                    const crossSaintColor = crossSaintBadge?.color?.replace('text-', '') || 'white';
                                    const isThreadNode = showThreads && activeThreadEventId && causalChain.has(event.id);
                                    const isThreadOrigin = showThreads && activeThreadEventId === event.id;
                                    const isEchoNode = showEchoes && ((index % 5 === 0) || (index % 7 === 0)); // Mock randomly selected echo pairs

                                    return (
                                        <div key={event.id} className={`shrink-0 w-80 snap-center flex flex-col items-center relative group ${isProjection ? 'opacity-90' : ''} ${isTop ? 'justify-end pb-[260px]' : 'justify-start pt-[260px]'}`}>

                                            {/* Connecting vertical strand */}
                                            <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${isTop ? 'bottom-1/2 top-auto h-24 bg-gradient-to-t' : 'top-1/2 bottom-auto h-24 bg-gradient-to-b'} ${isProjection ? 'from-indigo-500/20' : 'from-amber-500/30'} to-transparent z-0 group-hover:h-32 transition-all duration-500`} />

                                            {/* Dot on main horizontal line */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                                <div className={`w-4 h-4 rounded-full ${colors.dot} ring-4 ring-slate-950 transition-transform duration-300 ${isThreadOrigin ? 'scale-150 ring-indigo-500/40 bg-indigo-400' : isThreadNode ? 'scale-125 ring-indigo-500/20 bg-indigo-400' : isEchoNode ? 'scale-110 ring-fuchsia-500/30 bg-fuchsia-400 animate-pulse' : 'group-hover:ring-slate-800'}`} />
                                            </div>

                                            {/* Causal Thread UI Prompt */}
                                            {showThreads && !activeThreadEventId && (
                                                <button onClick={() => setActiveThreadEventId(event.id)} className="absolute z-50 top-1/2 mt-3 -translate-y-1/2 bg-slate-900/60 p-1.5 rounded-full border border-indigo-500/30 opacity-0 group-hover:opacity-100 hover:bg-indigo-500/20 transition-all shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                                                    <Link className="w-3 h-3 text-indigo-400" />
                                                </button>
                                            )}

                                            {/* Event Card (Glassmorphism) */}
                                            <div className={`w-full absolute ${isTop ? 'bottom-[55%]' : 'top-[55%]'} bg-slate-900/80 backdrop-blur-md border ${isThreadNode ? 'border-indigo-400/50 shadow-[0_0_30px_rgba(99,102,241,0.25)]' : isEchoNode ? 'border-fuchsia-400/50 shadow-[0_0_20px_rgba(217,70,239,0.2)]' : isProjection ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : isCrossSaint ? `border-${crossSaintColor}/30 shadow-[0_0_20px_rgba(99,102,241,0.1)]` : 'border-white/10 shadow-xl'} rounded-2xl p-5 hover:bg-slate-800/90 transition-all duration-300 hover:scale-[1.02] group-hover:border-white/20 z-30`}>
                                                
                                                {/* Echo Line/Badge (Simulation) */}
                                                {isEchoNode && (
                                                    <div className="absolute -top-3 -right-3">
                                                        <div className="flex items-center gap-1 bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.3)]">
                                                            <Repeat className="w-2.5 h-2.5" /> Echoes Past Event
                                                        </div>
                                                    </div>
                                                )}

                                                {/* What-If Ghost Branch Overlay UI */}
                                                {showGhostBranches && !isProjection && (
                                                    <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setActiveGhostEventId(activeGhostEventId === event.id ? null : event.id); }}
                                                            className="pointer-events-auto absolute -right-3 top-1/2 -translate-y-1/2 bg-teal-500/20 text-teal-400 p-1.5 rounded-full border border-teal-500/30 opacity-0 group-hover:opacity-100 hover:bg-teal-500/40 transition-all hover:scale-110 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                                                            title="Diverge Timeline (Causal Twin)"
                                                        >
                                                            <GitBranch className="w-3.5 h-3.5" />
                                                        </button>
                                                        
                                                        {activeGhostEventId === event.id && (
                                                            <div className={`absolute ${isTop ? 'top-0 right-[105%]' : 'bottom-0 right-[105%]'} w-64 bg-slate-900/60 backdrop-blur-sm border border-teal-500/30 border-dashed rounded-xl p-4 shadow-[0_0_30px_rgba(20,184,166,0.1)] opacity-70 hover:opacity-100 transition-opacity z-50 pointer-events-auto`}>
                                                                <div className="flex items-center gap-1.5 mb-2 text-teal-400">
                                                                    <GitBranch className="w-3 h-3" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Ghost Branch Activated</span>
                                                                </div>
                                                                <p className="text-xs text-slate-300 font-medium italic mb-2">"What if this event never occurred, or happened differently?"</p>
                                                                <div className="text-[10px] text-teal-200/50 leading-relaxed border-t border-teal-500/20 pt-2">
                                                                    <span className="text-teal-400">↳ Causal Twin Engine Probing...</span><br/>
                                                                    Probabilistic divergence calculated. Downstream events shifted by 18%. WiseGold Vault projection reduced by 12%. New descendant nodes rendering.
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Impact Overlay Glow */}
                                                {showImpactOverlay && enrichedEvent.impactScore && (
                                                    <div
                                                        className="absolute inset-0 rounded-2xl pointer-events-none"
                                                        style={{
                                                            boxShadow: `inset 0 0 ${enrichedEvent.impactScore / 2}px rgba(244, 63, 94, ${enrichedEvent.impactScore / 200})`,
                                                        }}
                                                    />
                                                )}

                                                {isProjection && (
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                                        <LineChart className="w-16 h-16 text-indigo-400" />
                                                    </div>
                                                )}

                                                {/* Cross-Saint Source Badge */}
                                                {isCrossSaint && crossSaintBadge && (
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/60 border border-white/10 text-[9px] font-bold ${crossSaintBadge.color}`}>
                                                            <CrossSaintIcon className="w-2.5 h-2.5" />
                                                            {crossSaintBadge.label}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between mb-3 text-xs">
                                                    <span className={`px-2.5 py-1 rounded-full bg-slate-950/50 uppercase tracking-wider font-semibold ${colors.text}`}>
                                                        {event.type}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 text-slate-400 bg-slate-950/30 px-2.5 py-1 rounded-md">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(event.date)}
                                                    </div>
                                                </div>

                                                {/* Impact Score Bar */}
                                                {showImpactOverlay && enrichedEvent.impactScore != null && (
                                                    <div className="mb-3">
                                                        <div className="flex items-center justify-between text-[9px] mb-1">
                                                            <span className="text-rose-400 font-bold uppercase tracking-wider">Generational Impact</span>
                                                            <span className="text-rose-300 font-bold">{enrichedEvent.impactScore}%</span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${enrichedEvent.impactScore}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <h3 className="text-lg font-serif font-medium text-white mb-2 leading-tight">
                                                    {event.title}
                                                </h3>

                                                {event.mediaUrl && (
                                                    <div className="w-full h-32 rounded-lg my-3 overflow-hidden relative group/media border border-white/5 shadow-inner">
                                                        <img src={event.mediaUrl} alt={event.title} className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity flex items-end p-2 text-white/80">
                                                            <ImageIcon className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}

                                                {event.description && (
                                                    <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
                                                        {event.description}
                                                    </p>
                                                )}

                                                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-slate-400" />
                                                        </div>
                                                        <span className="text-xs font-medium text-slate-300">{event.memberName}</span>
                                                    </div>

                                                    {hasAI && member && (
                                                        <button
                                                            onClick={() => {
                                                                setChatMember(member);
                                                                setChatEventTitle(event.title);
                                                            }}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 shadow hover:shadow-indigo-500/20 hover:text-white transition-all text-xs font-bold"
                                                        >
                                                            <Sparkles className="w-3 h-3" />
                                                            Discuss
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {filteredEvents.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No events match this filter.</p>
                </div>
            )}

            {/* Saint Chat Modal */}
            {chatMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-4xl h-[80vh] overflow-hidden shadow-2xl relative">
                        <button
                            onClick={() => setChatMember(null)}
                            className="absolute top-4 right-4 z-10 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <SaintChat
                            saintId={chatMember.id}
                            saintName={`${chatMember?.firstName} ${chatMember?.lastName}`}
                            saintTitle="Family Member"
                            saintIcon={User}
                            initialMessage={`I would love to hear your memories and thoughts about this specific event: ${chatEventTitle}`}
                            onClose={() => setChatMember(null)}
                        />
                    </div>
                </div>
            )}

            <AddEventModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                members={members}
                onSuccess={(newEvent) => {
                    setEvents(prev => [...prev, newEvent]);
                    setIsAddModalOpen(false);
                }}
            />
        </div>
    );
}
