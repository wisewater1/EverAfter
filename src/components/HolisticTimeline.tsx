import React, { useState, useEffect } from 'react';
import { Activity, DollarSign, Heart, Users, Calendar, Brain, Shield, Sparkles } from 'lucide-react';

interface TimelineEvent {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    saint_id: string;
    importance: number;
}

export default function HolisticTimeline() {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchNeuralGraph() {
            try {
                const token = localStorage.getItem('token');
                const headers: Record<string, string> = {};
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch('http://localhost:8001/api/v1/saints/memory/dump', {
                    headers
                });

                if (!res.ok) throw new Error('Failed to fetch Akashic records');

                const data = await res.json();

                // Filter and map out Neural Graph Events
                const globalEvents: TimelineEvent[] = data
                    .map((item: any) => ({
                        id: item.id,
                        type: item.metadata?.type || 'observation',
                        title: getEventTitle(item.metadata?.type || 'observation', item.metadata?.saint_id),
                        description: item.content || item.metadata?.description || '',
                        timestamp: item.timestamp,
                        saint_id: item.metadata?.saint_id || 'unknown',
                        importance: item.metadata?.importance || 1.0,
                    }))
                    .filter((e: TimelineEvent) =>
                        ['health_event', 'finance_event', 'life_event', 'career_event'].includes(e.type)
                    );

                // Sort newest first
                globalEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                setEvents(globalEvents);
            } catch (err) {
                console.error('Error fetching Neural Graph:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchNeuralGraph();
    }, []);

    const getEventTitle = (type: string, saintId: string) => {
        switch (type) {
            case 'health_event': return 'Health Insight';
            case 'finance_event': return 'Financial Event';
            case 'life_event': return 'Family Milestone';
            case 'career_event': return 'Professional Update';
            default: return 'Observation';
        }
    };

    const getEventIcon = (type: string) => {
        switch (type) {
            case 'health_event': return <Heart className="w-5 h-5 text-rose-400" />;
            case 'finance_event': return <DollarSign className="w-5 h-5 text-emerald-400" />;
            case 'life_event': return <Users className="w-5 h-5 text-indigo-400" />;
            case 'career_event': return <Brain className="w-5 h-5 text-amber-400" />;
            default: return <Activity className="w-5 h-5 text-slate-400" />;
        }
    };

    const getEventColor = (type: string) => {
        switch (type) {
            case 'health_event': return 'border-rose-500/30 bg-rose-500/10';
            case 'finance_event': return 'border-emerald-500/30 bg-emerald-500/10';
            case 'life_event': return 'border-indigo-500/30 bg-indigo-500/10';
            case 'career_event': return 'border-amber-500/30 bg-amber-500/10';
            default: return 'border-slate-500/30 bg-slate-500/10';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-xl">
                <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-300">The Neural Graph is quiet</h3>
                <p className="text-slate-500 text-sm mt-1">Cross-domain intersections will appear here once significant events occur.</p>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Holistic Timeline</h2>
                    <p className="text-sm text-slate-400">Cross-domain insights from the Neural Graph</p>
                </div>
            </div>

            <div className="relative border-l border-slate-800 ml-5 space-y-8 pl-8">
                {events.map((event, idx) => (
                    <div key={event.id || idx} className="relative">
                        {/* Timeline Dot */}
                        <div className={`absolute -left-[41px] w-9 h-9 rounded-full border-2 border-slate-950 flex items-center justify-center ${getEventColor(event.type)} z-10`}>
                            {getEventIcon(event.type)}
                        </div>

                        {/* Event Card */}
                        <div className={`bg-slate-800/30 border ${getEventColor(event.type).split(' ')[0]} rounded-xl p-4 sm:p-5 hover:bg-slate-800/50 transition-colors`}>
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <h4 className="text-white font-medium flex items-center gap-2">
                                    {event.title}
                                    {event.importance >= 8 && (
                                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-bold uppercase tracking-wider">
                                            Critical
                                        </span>
                                    )}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(event.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
