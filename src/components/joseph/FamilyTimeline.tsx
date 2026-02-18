import { useState } from 'react';
import { Clock } from 'lucide-react';
import {
    getFamilyEvents, FamilyEvent as FamilyEventType,
    getEventIcon, formatDate, EventType
} from '../../lib/joseph/genealogy';

const EVENT_COLORS: Record<EventType, { bg: string; border: string; text: string; dot: string }> = {
    birth: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    marriage: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
    death: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', dot: 'bg-slate-400' },
    milestone: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
    adoption: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
};

export default function FamilyTimeline() {
    const [events] = useState<FamilyEventType[]>(() => getFamilyEvents());
    const [filterType, setFilterType] = useState<EventType | null>(null);

    const filteredEvents = filterType ? events.filter(e => e.type === filterType) : events;

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
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Central vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/40 via-amber-500/20 to-transparent" />

                <div className="space-y-8">
                    {[...decades.entries()].map(([decade, decadeEvents]) => (
                        <div key={decade}>
                            {/* Decade label */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <span className="text-xs font-bold text-amber-400">{decade}</span>
                                </div>
                                <div className="flex-1 h-px bg-amber-500/10" />
                            </div>

                            {/* Events in decade */}
                            <div className="space-y-3 ml-2">
                                {decadeEvents.map(event => {
                                    const colors = EVENT_COLORS[event.type];
                                    return (
                                        <div key={event.id} className="flex items-start gap-4 group">
                                            {/* Dot on timeline */}
                                            <div className="relative flex items-center justify-center w-8 shrink-0 pt-1">
                                                <div className={`w-3 h-3 rounded-full ${colors.dot} ring-4 ring-slate-950 group-hover:ring-slate-900 transition-all group-hover:scale-125`} />
                                            </div>

                                            {/* Event card */}
                                            <div className={`flex-1 ${colors.bg} border ${colors.border} rounded-xl p-4 transition-all duration-200 hover:scale-[1.01] hover:shadow-lg`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-base">{getEventIcon(event.type)}</span>
                                                            <span className={`text-sm font-medium ${colors.text}`}>
                                                                {event.title}
                                                            </span>
                                                        </div>
                                                        {event.description && (
                                                            <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 shrink-0 bg-white/5 px-2 py-1 rounded">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {formatDate(event.date)}
                                                    </div>
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
        </div>
    );
}
