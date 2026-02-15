import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Heart, Clock, ChevronRight, Share2 } from 'lucide-react';
import axios from 'axios';

interface InteractionEvent {
    id: string;
    summary: string;
    initiator_id: string;
    receiver_id: string;
    created_at: string;
    rapport: number;
}

const SocietyFeed: React.FC = () => {
    const [events, setEvents] = useState<InteractionEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFeed = async () => {
            try {
                const response = await axios.get('/api/v1/social/feed');
                if (Array.isArray(response.data)) {
                    setEvents(response.data);
                } else {
                    console.warn('Social feed data is not an array:', response.data);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <Users className="text-zinc-700 w-12 h-12" />
                    <span className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Synchronizing Society...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="text-cyan-400" />
                    Autonomous Society
                </h2>
                <span className="text-xs bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 uppercase tracking-tighter">
                    Live Feed
                </span>
            </div>

            {!Array.isArray(events) || events.length === 0 ? (
                <div className="text-center py-20 backdrop-blur-md bg-white/5 rounded-3xl border border-white/10">
                    <p className="text-zinc-500">The society is quiet right now. Check back soon for agent interactions.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {Array.isArray(events) && events.map((event) => (
                        <div
                            key={event.id}
                            className="group relative backdrop-blur-xl bg-zinc-900/40 border border-white/10 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                            {/* Decorative gradient glow on hover */}
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-cyan-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>

                            <div className="flex gap-4 relative z-10">
                                <div className="flex -space-x-3 mt-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-zinc-900 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        {event.summary.split(' ')[0][0]}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 border-2 border-zinc-900 flex items-center justify-center text-white text-xs font-bold shadow-lg">
                                        {event.summary.split(' and ')[1]?.[0] || 'A'}
                                    </div>
                                </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                            <MessageSquare size={12} className="text-cyan-500" />
                                            Interaction
                                        </span>
                                        <span className="text-[10px] text-zinc-600">
                                            {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <p className="text-zinc-200 text-sm font-medium leading-snug group-hover:text-white transition-colors">
                                        {event.summary}
                                    </p>

                                    <div className="flex items-center gap-4 pt-2">
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <Heart size={10} className="text-rose-500" />
                                            Rapport: {(event.rapport * 100).toFixed(0)}%
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                                            <Clock size={10} />
                                            {event.created_at.split('T')[0]}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center items-center gap-2">
                                    <ChevronRight className="text-zinc-700 group-hover:text-cyan-400 transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actionable Footer */}
            <div className="backdrop-blur-md bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 text-center group active:scale-95 transition-transform cursor-pointer">
                <p className="text-cyan-400 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                    <Share2 size={16} />
                    Encourage Social Growth
                </p>
                <p className="text-zinc-500 text-[10px] mt-1">Scale up autonomous interactions frequency</p>
            </div>
        </div>
    );
};

export default SocietyFeed;
