import { useState, useEffect } from 'react';
import { Activity, Server, Shield, Heart, Users, Search, Code, ChevronRight } from 'lucide-react';
import { subscribeToSaintEvents, SaintEventEnvelope } from '../../lib/saintBridge';

const MOCK_EVENTS: SaintEventEnvelope[] = [
    {
        id: '1',
        source: 'michael',
        target: 'raphael',
        topic: 'security/scan_complete',
        payload: { target: 'Health Module', status: 'secure' },
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        confidence: 1.0
    },
    {
        id: '2',
        source: 'raphael',
        target: 'joseph',
        topic: 'health/update',
        payload: { user: 'wisea', metric: 'heart_rate', value: 72 },
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        confidence: 0.95
    },
    {
        id: '3',
        source: 'system',
        target: 'broadcast',
        topic: 'system/startup',
        payload: { version: '2.1.0', environment: 'production' },
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        confidence: 1.0
    },
];

export default function EventStream() {
    const [events, setEvents] = useState<SaintEventEnvelope[]>(MOCK_EVENTS);
    const [selectedEvent, setSelectedEvent] = useState<SaintEventEnvelope | null>(MOCK_EVENTS[0]);

    useEffect(() => {
        const unsubscribe = subscribeToSaintEvents((event) => {
            setEvents(prev => [event, ...prev.slice(0, 49)]); // Keep last 50
        });
        return () => unsubscribe();
    }, []);

    const getIcon = (source: string) => {
        switch (source) {
            case 'michael': return Shield;
            case 'raphael': return Heart;
            case 'joseph': return Users;
            case 'anthony': return Search;
            default: return Server;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Event List */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        Live Stream
                    </h2>
                    <span className="text-xs text-slate-500 font-mono">{events.length} Events</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {events.map((event, idx) => {
                        const Icon = getIcon(event.source);
                        const isSelected = selectedEvent === event;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedEvent(event)}
                                className={`w-full text-left p-4 border-b border-slate-800/50 transition-colors flex items-start gap-3 ${isSelected ? 'bg-amber-500/10 border-amber-500/20' : 'hover:bg-slate-800/30'}`}
                            >
                                <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                                            {event.topic}
                                        </span>
                                        <span className="text-slate-600 text-[10px] uppercase font-bold text-right ml-2 opacity-60">
                                            {(event.confidence * 100).toFixed(0)}% CONF
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-600 font-mono mt-1">
                                        <span>{new Date(event.timestamp || Date.now()).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 truncate font-mono mt-1">
                                        {event.source} &rarr; {event.target}
                                    </div>
                                </div>
                                {isSelected && <ChevronRight className="w-4 h-4 text-amber-500 self-center" />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Event Detail */}
            <div className="lg:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col shadow-2xl relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {selectedEvent ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-slate-900/30 backdrop-blur-sm z-10">
                            <div className="flex items-center gap-4 mb-4">
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium uppercase tracking-wider">
                                    {selectedEvent.topic}
                                </span>
                                <span className="text-slate-500 text-xs font-mono">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                            </div>
                            <h3 className="text-2xl font-light text-white mb-1">Event Payload</h3>
                            <p className="text-slate-400 text-sm">
                                Captured at <span className="text-slate-300">{new Date(selectedEvent.timestamp || Date.now()).toLocaleString()}</span>
                            </p>
                        </div>
                        <div className="flex-1 overflow-auto bg-[#0d1117] p-6 relative z-10">
                            <pre className="font-mono text-sm text-green-400 leading-relaxed">
                                {JSON.stringify(selectedEvent, null, 2)}
                            </pre>
                        </div>
                        <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 z-10">
                            <div className="flex items-center gap-2">
                                <Code className="w-3 h-3" />
                                <span>Raw JSON Format</span>
                            </div>
                            <span>{new TextEncoder().encode(JSON.stringify(selectedEvent)).length} bytes</span>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500 z-10">
                        <div className="text-center">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Select an event to view details</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
