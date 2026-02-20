import { useState, useEffect } from 'react';
import { Shield, Heart, Users, Search, Wallet, User, Activity } from 'lucide-react';

interface Node {
    id: string;
    x: number;
    y: number;
    label: string;
    icon: any;
    color: string;
    role: string;
}

interface Link {
    source: string;
    target: string;
    label?: string;
    color?: string;
    active?: boolean;
}

interface MonitoringStatus {
    status: 'active' | 'warning' | 'error';
    role: string;
    message?: string;
    metrics?: Record<string, any>;
}

interface SystemStatus {
    michael: MonitoringStatus;
    gabriel: MonitoringStatus;
    anthony: MonitoringStatus;
    raphael?: MonitoringStatus;
    joseph?: MonitoringStatus;
}

interface GraphProps {
    data?: SystemStatus | null;
}

export default function SystemRelationshipsGraph({ data }: GraphProps) {
    // console.log("Graph received data:", data); // DEBUG

    // Fallback for debugging/demo if API fails
    const displayData = data || {
        michael: { status: 'active', role: 'Guardian', message: 'System nominal.', metrics: { cpu: '12%', memory: '45%' } },
        gabriel: { status: 'active', role: 'Steward', message: 'Financial streams active.', metrics: { pending_tx: 3 } },
        anthony: { status: 'active', role: 'Seeker', message: 'No lost items.', metrics: { errors: 0 } },
        raphael: { status: 'active', role: 'Healer', message: 'Health checks passed.', metrics: { heart_rate: '72bpm' } },
        joseph: { status: 'active', role: 'Worker', message: 'Family tasks on track.', metrics: { tasks: 5 } }
    };

    // Use displayData instead of data for rendering
    const validData = displayData as SystemStatus;

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [tick, setTick] = useState(0);

    // Animation loop for particles
    useEffect(() => {
        const interval = setInterval(() => setTick(t => (t + 1) % 100), 50);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (id: string, defaultColor: string) => {
        if (!data) return defaultColor;
        const saint = data[id as keyof SystemStatus];
        if (!saint) return defaultColor;

        switch (saint.status) {
            case 'active': return '#10b981'; // Emerald
            case 'warning': return '#f59e0b'; // Amber
            case 'error': return '#f43f5e'; // Rose
            default: return defaultColor;
        }
    };

    const nodes: Node[] = [
        { id: 'user', x: 400, y: 300, label: 'You (User)', icon: User, color: '#f8fafc', role: 'Sovereign' },
        { id: 'michael', x: 400, y: 100, label: 'St. Michael', icon: Shield, color: getStatusColor('michael', '#3b82f6'), role: 'Security & Integrity' },
        { id: 'gabriel', x: 650, y: 200, label: 'St. Gabriel', icon: Wallet, color: getStatusColor('gabriel', '#10b981'), role: 'Finance & Wealth' },
        { id: 'raphael', x: 150, y: 200, label: 'St. Raphael', icon: Heart, color: getStatusColor('raphael', '#ec4899'), role: 'Health & Wellness' },
        { id: 'joseph', x: 200, y: 450, label: 'St. Joseph', icon: Users, color: getStatusColor('joseph', '#f59e0b'), role: 'Family & Tasks' },
        { id: 'anthony', x: 600, y: 450, label: 'St. Anthony', icon: Search, color: getStatusColor('anthony', '#f97316'), role: 'Audit & Recovery' },
    ];

    const links: Link[] = [
        { source: 'michael', target: 'user', label: 'Protects', active: true },
        { source: 'michael', target: 'gabriel', color: '#10b981' },
        { source: 'michael', target: 'raphael', color: '#ec4899' },
        { source: 'michael', target: 'joseph', color: '#f59e0b' },
        { source: 'michael', target: 'anthony', color: '#f97316' },
        { source: 'gabriel', target: 'user', label: 'Advises' },
        { source: 'raphael', target: 'user', label: 'Heals' },
        { source: 'joseph', target: 'user', label: 'Supports' },
        { source: 'anthony', target: 'user', label: 'Guides' },
        { source: 'gabriel', target: 'joseph', label: 'Budgets', active: true },
        { source: 'raphael', target: 'joseph', label: 'Family Health', active: true },
        { source: 'anthony', target: 'michael', label: 'Audits', color: '#3b82f6', active: true },
    ];

    return (
        <div className="w-full h-[500px] bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden relative">
            <div className="absolute top-6 left-6 z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-500" />
                    System Architecture Visualization
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time saint interactions and data flow.</p>
            </div>

            <svg className="w-full h-full" viewBox="0 0 800 600">
                <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                    </marker>
                </defs>

                {/* Links */}
                {links.map((link, i) => {
                    const source = nodes.find(n => n.id === link.source)!;
                    const target = nodes.find(n => n.id === link.target)!;
                    return (
                        <g key={i}>
                            <line
                                x1={source.x}
                                y1={source.y}
                                x2={target.x}
                                y2={target.y}
                                stroke="#1e293b"
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                            />
                            {link.active && (
                                <circle r="3" fill={link.color || source.color}>
                                    <animateMotion
                                        dur="2s"
                                        repeatCount="indefinite"
                                        path={`M${source.x},${source.y} L${target.x},${target.y}`}
                                    />
                                </circle>
                            )}
                        </g>
                    );
                })}

                {/* Nodes */}
                {nodes.map(node => (
                    <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="cursor-pointer transition-all duration-300"
                        style={{ opacity: hoveredNode && hoveredNode !== node.id ? 0.3 : 1 }}
                    >
                        {/* Pulse effect for core/active nodes */}
                        <circle
                            r="30"
                            fill={node.color}
                            fillOpacity="0.1"
                            className="animate-pulse"
                        />
                        <circle
                            r="20"
                            fill="#0f172a"
                            stroke={node.color}
                            strokeWidth="2"
                            filter="url(#glow)"
                        />
                        <foreignObject x="-10" y="-10" width="20" height="20">
                            <div className="flex items-center justify-center w-full h-full text-white">
                                <node.icon size={12} color={node.color} />
                            </div>
                        </foreignObject>

                        <text
                            y="40"
                            textAnchor="middle"
                            fill="white"
                            fontSize="12"
                            fontWeight="500"
                            className="pointer-events-none select-none"
                        >
                            {node.label}
                        </text>
                        <text
                            y="54"
                            textAnchor="middle"
                            fill="#64748b"
                            fontSize="9"
                            className="pointer-events-none select-none uppercase tracking-wide"
                        >
                            {node.role}
                        </text>
                    </g>
                ))}
            </svg>

            {/* Legend / Stats overlay */}
            <div className="absolute bottom-6 right-6 flex gap-4 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                    Archive Active
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    Secure Link
                </div>
            </div>

            {/* Hover Details Panel */}
            {hoveredNode && data && data[hoveredNode as keyof SystemStatus] && (
                <div className="absolute top-6 right-6 z-20 w-64 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-200">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white capitalize">{nodes.find(n => n.id === hoveredNode)?.label}</h4>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${data[hoveredNode as keyof SystemStatus]?.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            data[hoveredNode as keyof SystemStatus]?.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-rose-500/20 text-rose-400'
                            }`}>
                            {data[hoveredNode as keyof SystemStatus]?.status}
                        </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-3 italic">
                        "{data[hoveredNode as keyof SystemStatus]?.message}"
                    </p>

                    <div className="space-y-2">
                        {data[hoveredNode as keyof SystemStatus]?.metrics && Object.entries(data[hoveredNode as keyof SystemStatus].metrics!).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-xs border-b border-white/5 pb-1 last:border-0">
                                <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-sky-400 font-mono">{String(value)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-600 uppercase tracking-widest">
                            Role: {data[hoveredNode as keyof SystemStatus]?.role}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
