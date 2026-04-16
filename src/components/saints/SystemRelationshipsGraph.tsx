import { useState } from 'react';
import { Shield, Heart, Users, Search, Wallet, User, Activity, XCircle } from 'lucide-react';

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

    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [isolatingId, setIsolatingId] = useState<string | null>(null);

    const handleIsolate = async (id: string) => {
        setIsolatingId(id);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsolatingId(null);
        // Deselect or show 'isolated' state if we had a more complex state model
    };

    const getStatusColor = (id: string, defaultColor: string) => {
        if (isolatingId === id) return '#f43f5e'; // Pulse red during isolation
        if (!displayData) return defaultColor;
        const saint = (displayData as any)[id];
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

    const activeDetailId = selectedNode || hoveredNode;
    const activeDisplayNode = nodes.find(n => n.id === activeDetailId);
    const activeStatusData = activeDetailId ? (displayData as any)[activeDetailId] : null;

    return (
        <div className="w-full h-[500px] bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden relative group/graph">
            <div className="absolute top-6 left-6 z-10">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-500" />
                    System Architecture Visualization
                </h3>
                <p className="text-xs text-slate-500 mt-1">Real-time saint interactions and data flow. Click nodes for details.</p>
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
                                stroke={isolatingId === link.source ? '#450a0a' : '#1e293b'}
                                strokeWidth="2"
                                markerEnd="url(#arrowhead)"
                                className="transition-all duration-1000"
                            />
                            {link.active && isolatingId !== link.source && (
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
                {nodes.map(node => {
                    const isSelected = selectedNode === node.id;
                    const isIsolating = isolatingId === node.id;

                    return (
                        <g
                            key={node.id}
                            transform={`translate(${node.x}, ${node.y})`}
                            onMouseEnter={() => setHoveredNode(node.id)}
                            onMouseLeave={() => setHoveredNode(null)}
                            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                            className="cursor-pointer transition-all duration-300"
                            style={{ opacity: activeDetailId && activeDetailId !== node.id ? 0.3 : 1 }}
                        >
                            {/* Pulse effect for core/active nodes */}
                            <circle
                                r={isSelected ? "35" : "30"}
                                fill={node.color}
                                fillOpacity={isIsolating ? "0.4" : "0.1"}
                                className={isIsolating ? "animate-ping" : "animate-pulse"}
                            />
                            <circle
                                r="20"
                                fill="#0f172a"
                                stroke={node.color}
                                strokeWidth={isSelected ? "3" : "2"}
                                filter="url(#glow)"
                                className="transition-all duration-300"
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
                                fontSize={isSelected ? "14" : "12"}
                                fontWeight="500"
                                className="pointer-events-none select-none transition-all"
                            >
                                {node.label}
                            </text>
                            <text
                                y={isSelected ? "56" : "54"}
                                textAnchor="middle"
                                fill="#64748b"
                                fontSize="9"
                                className="pointer-events-none select-none uppercase tracking-wide transition-all"
                            >
                                {node.role}
                            </text>
                        </g>
                    );
                })}
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

            {/* Detail Panel */}
            {activeDetailId && activeStatusData && activeDisplayNode && (
                <div className="absolute top-6 right-6 z-20 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-bold text-white capitalize">{activeDisplayNode.label}</h4>
                            <span className="text-[10px] text-slate-500 uppercase tracking-tight">{activeDisplayNode.role}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${activeStatusData.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                            activeStatusData.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-rose-500/20 text-rose-400'
                            }`}>
                            {activeStatusData.status}
                        </span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 mb-4">
                        <p className="text-[11px] text-slate-300 leading-relaxed italic">
                            "{activeStatusData.message}"
                        </p>
                    </div>

                    <div className="space-y-2 mb-6">
                        {activeStatusData.metrics && Object.entries(activeStatusData.metrics as Record<string, any>).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-xs border-b border-white/5 pb-1 last:border-0 hover:bg-white/[0.02] px-1 rounded transition-colors">
                                <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-sky-400 font-mono font-bold">{String(value)}</span>
                            </div>
                        ))}
                    </div>

                    {activeDetailId !== 'user' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleIsolate(activeDetailId);
                                }}
                                disabled={!!isolatingId && isolatingId !== activeDetailId}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isolatingId === activeDetailId
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-rose-500/20'
                                    }`}
                            >
                                {isolatingId === activeDetailId ? 'Containment Active' : 'Isolate Node'}
                            </button>
                            {selectedNode && (
                                <button
                                    onClick={() => setSelectedNode(null)}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-white/5 transition-colors"
                                >
                                    <XCircle size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
