import { useState, useEffect } from 'react';
import { Clock, Sparkles, User, X, LineChart, Loader2, Plus, Image as ImageIcon } from 'lucide-react';
import {
    getFamilyEvents, FamilyEvent as FamilyEventType,
    getEventIcon, formatDate, EventType,
    getFamilyMembers, FamilyMember
} from '../../lib/joseph/genealogy';
import SaintChat from '../SaintChat';
import AddEventModal from './AddEventModal';

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
    birth: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    marriage: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
    death: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
    milestone: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
    adoption: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
};

export default function FamilyTimeline() {
    const [events, setEvents] = useState<FamilyEventType[]>(() => getFamilyEvents());
    const [members] = useState<FamilyMember[]>(() => getFamilyMembers());
    const [filterType, setFilterType] = useState<EventType | null>(null);
    const [chatMember, setChatMember] = useState<FamilyMember | null>(null);
    const [chatEventTitle, setChatEventTitle] = useState<string>('');
    const [zoomLevel, setZoomLevel] = useState(1); // 1 = Normal, 0.5 = Zoomed Out

    // Add Event Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Projections
    const [showProjections, setShowProjections] = useState(false);
    const [projectionsLoading, setProjectionsLoading] = useState(false);
    const [projectionEvents, setProjectionEvents] = useState<FamilyEventType[]>([]);

    useEffect(() => {
        async function loadCapsules() {
            try {
                const tokenStr = localStorage.getItem('supabase.auth.token');
                let token = '';
                try {
                    const session = tokenStr ? JSON.parse(tokenStr) : null;
                    token = session?.currentSession?.access_token || '';
                } catch (e) { }

                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';
                const res = await fetch(`${API_BASE}/api/v1/time-capsules`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) return;
                const capsules: any[] = await res.json();

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

    useEffect(() => {
        if (!showProjections) {
            setProjectionEvents([]);
            return;
        }

        async function loadProjections() {
            setProjectionsLoading(true);
            try {
                const tokenStr = localStorage.getItem('supabase.auth.token');
                let token = '';
                try {
                    const session = tokenStr ? JSON.parse(tokenStr) : null;
                    token = session?.currentSession?.access_token || '';
                } catch (e) { }

                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';
                const futureEvents: FamilyEventType[] = [];
                const currentYear = new Date().getFullYear();

                // 1. Fetch WiseGold Wallet
                try {
                    const walletRes = await fetch(`${API_BASE}/api/v1/finance/wisegold/wallet`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    let balance = 1450.50; // Mock base
                    if (walletRes.ok) {
                        const data = await walletRes.json();
                        balance = data.wallet?.balance || balance;
                    }

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
                } catch (e) { }

                // 2. Fetch CausalTwin Health Projections for the primary oldest member
                try {
                    const aliveMembers = members.filter(m => !m.deathDate).sort((a, b) => a.generation - b.generation);
                    if (aliveMembers.length > 0) {
                        const primary = aliveMembers[0];
                        const predRes = await fetch(`${API_BASE}/api/v1/causal-twin/ancestry/predict`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                member_id: primary.id,
                                first_name: primary.firstName,
                                last_name: primary.lastName,
                                traits: primary.aiPersonality?.traits || [],
                                birth_year: primary.birthDate ? parseInt(primary.birthDate.split('-')[0]) : null,
                                occupation: primary.occupation,
                                generation: primary.generation
                            })
                        });

                        if (predRes.ok) {
                            const data = await predRes.json();
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
                    }
                } catch (e) { }

                setProjectionEvents(futureEvents);
            } catch (e) {
                console.error(e);
            }
            setProjectionsLoading(false);
        }

        loadProjections();
    }, [showProjections, members]);

    const allEvents = [...events, ...projectionEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const filteredEvents = filterType ? allEvents.filter(e => e.type === filterType) : allEvents;

    // Group events by decade
    const decades = new Map<string, FamilyEventType[]>();
    filteredEvents.forEach(event => {
        const year = new Date(event.date + 'T00:00:00').getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        if (!decades.has(decade)) decades.set(decade, []);
        decades.get(decade)!.push(event);
    });

    const eventTypes: EventType[] = ['birth', 'marriage', 'death', 'milestone'];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                    onClick={() => setFilterType(null)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${filterType === null
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                >
                    All Events
                </button>
                {eventTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${filterType === type
                            ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        <span>{getEventIcon(type)}</span>
                        {type.charAt(0).toUpperCase() + type.slice(1)}s
                    </button>
                ))}

                <div className="flex-1" />

                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 mr-2"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add Event
                </button>

                <button
                    onClick={() => setShowProjections(!showProjections)}
                    disabled={projectionsLoading}
                    className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${showProjections
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                        : 'bg-slate-900 border-white/5 text-slate-400 hover:bg-slate-800'
                        }`}
                >
                    {projectionsLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <LineChart className="w-3.5 h-3.5" />
                    )}
                    Future Projections
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-white/5 w-fit">
                <span className="text-xs text-slate-400 font-medium">Zoom Level:</span>
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={zoomLevel}
                    onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                    className="w-32 accent-indigo-500 bg-slate-800"
                />
            </div>

            {/* Cinematic Horizontal Timeline */}
            <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 backdrop-blur-xl shadow-2xl">
                {/* Horizontal central line */}
                <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-gradient-to-r from-amber-500/10 via-amber-500/30 to-indigo-500/20 z-0" />

                <div className="overflow-x-auto flex items-center h-[500px] px-24 py-12 snap-x snap-mandatory hide-scrollbar gap-16" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'left center', width: `${100 / zoomLevel}%` }}>
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
                                    const colors = EVENT_COLORS[event.type];
                                    const isTop = index % 2 === 0;
                                    const member = members.find(m => m.id === event.memberId);
                                    const hasAI = member?.aiPersonality?.isActive || member?.engramId;
                                    const isProjection = event.id.startsWith('proj_');

                                    return (
                                        <div key={event.id} className={`shrink-0 w-80 snap-center flex flex-col items-center relative group ${isProjection ? 'opacity-90' : ''} ${isTop ? 'justify-end pb-[260px]' : 'justify-start pt-[260px]'}`}>

                                            {/* Connecting vertical strand */}
                                            <div className={`absolute left-1/2 -translate-x-1/2 w-0.5 ${isTop ? 'bottom-1/2 top-auto h-24 bg-gradient-to-t' : 'top-1/2 bottom-auto h-24 bg-gradient-to-b'} ${isProjection ? 'from-indigo-500/20' : 'from-amber-500/30'} to-transparent z-0 group-hover:h-32 transition-all duration-500`} />

                                            {/* Dot on main horizontal line */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                                                <div className={`w-4 h-4 rounded-full ${colors.dot} ring-4 ring-slate-950 group-hover:ring-slate-800 transition-transform duration-300 ${isProjection ? 'animate-pulse ring-indigo-500/30' : 'group-hover:scale-150'}`} />
                                            </div>

                                            {/* Event Card (Glassmorphism) */}
                                            <div className={`w-full absolute ${isTop ? 'bottom-[55%]' : 'top-[55%]'} bg-slate-900/60 backdrop-blur-md border ${isProjection ? 'border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'border-white/10 shadow-xl'} rounded-2xl p-5 hover:bg-slate-800/80 transition-all duration-300 hover:scale-105 hover:-translate-y-2 group-hover:border-white/20 z-30`}>

                                                {isProjection && (
                                                    <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                                                        <LineChart className="w-16 h-16 text-indigo-400" />
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
