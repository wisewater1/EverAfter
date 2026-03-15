import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Database,
    ExternalLink,
    Lock,
    Network,
    RefreshCw,
    Search,
    Server,
    ShieldCheck,
    Smartphone,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    getAnthonyFlowMap,
    triggerLiveScan,
    type AnthonyFlowMapEvidence,
    type AnthonyFlowMapNode,
    type AnthonyFlowMapResponse,
} from '../../lib/michael/security';

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
    mobile_app: { x: 12, y: 48 },
    api_gateway: { x: 34, y: 30 },
    saint_runtime: { x: 58, y: 50 },
    postgres: { x: 84, y: 72 },
    st_michael: { x: 56, y: 80 },
    st_anthony: { x: 82, y: 22 },
};

function getNodeVisuals(node: AnthonyFlowMapNode) {
    const icon =
        node.id === 'mobile_app' ? Smartphone :
        node.id === 'api_gateway' ? Lock :
        node.id === 'saint_runtime' ? Server :
        node.id === 'postgres' ? Database :
        node.id === 'st_michael' ? ShieldCheck :
        Search;

    const tone =
        node.status === 'critical' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_28px_rgba(244,63,94,0.18)]' :
        node.status === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.16)]' :
        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.14)]';

    return { icon, tone };
}

function severityStroke(severity: string) {
    if (severity === 'critical') return '#fb7185';
    if (severity === 'warning') return '#f59e0b';
    return '#22c55e';
}

function edgePath(from: { x: number; y: number }, to: { x: number; y: number }) {
    const midX = (from.x + to.x) / 2;
    const curveLift = Math.abs(to.x - from.x) > 18 ? 10 : 6;
    const controlY = Math.min(from.y, to.y) - curveLift;
    return `M ${from.x} ${from.y} Q ${midX} ${controlY} ${to.x} ${to.y}`;
}

function nodeFilterToken(nodeId: string) {
    if (nodeId === 'st_michael') return 'michael';
    if (nodeId === 'st_anthony') return 'audit';
    if (nodeId === 'postgres') return 'ledger';
    return 'security';
}

export default function DataFlowMap() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [flow, setFlow] = useState<AnthonyFlowMapResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningScan, setRunningScan] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const focus = searchParams.get('focus');

    const loadFlow = async () => {
        try {
            setError(null);
            const response = await getAnthonyFlowMap();
            setFlow(response);
            setSelectedNodeId((current) => {
                if (current && response.nodes.some((node) => node.id === current)) {
                    return current;
                }
                return response.nodes.find((node) => node.status !== 'healthy')?.id ?? response.nodes[0]?.id ?? null;
            });
        } catch (loadError) {
            console.error('Failed to load Anthony flow map:', loadError);
            setError('Anthony could not assemble the latest audit graph from Michael scan evidence.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadFlow();
    }, []);

    const selectedNode = useMemo(
        () => flow?.nodes.find((node) => node.id === selectedNodeId) ?? flow?.nodes[0] ?? null,
        [flow, selectedNodeId]
    );

    const selectedEvidence = useMemo<AnthonyFlowMapEvidence[]>(() => {
        if (!flow || !selectedNode) return [];
        return flow.evidence.filter((item) => selectedNode.evidenceIds.includes(item.id));
    }, [flow, selectedNode]);

    const handleRunScan = async () => {
        try {
            setRunningScan(true);
            setError(null);
            await triggerLiveScan();
            await loadFlow();
        } catch (scanError) {
            console.error('Failed to trigger Michael scan from Anthony flow map:', scanError);
            setError('St. Michael did not complete the full scan. Anthony cannot refresh the audit map yet.');
        } finally {
            setRunningScan(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Anthony is assembling the Michael audit graph...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col gap-4 mb-8">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="space-y-2">
                            <h2 className="text-xl font-light text-white flex items-center gap-2">
                                <Network className="w-5 h-5 text-amber-500" />
                                Dynamic Data Flow Map
                            </h2>
                            <p className="text-slate-400 text-sm max-w-3xl">
                                Generated from St. Michael&apos;s latest gauntlet scan, tracked vulnerabilities, and Anthony&apos;s sealed ledger handoff. Every highlighted path is backed by evidence you can inspect.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => void handleRunScan()}
                                disabled={runningScan}
                                className="px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-2 disabled:opacity-60"
                            >
                                <RefreshCw className={`w-4 h-4 ${runningScan ? 'animate-spin' : ''}`} />
                                {runningScan ? 'Running Michael Scan...' : 'Run St. Michael Scan'}
                            </button>
                            <button
                                onClick={() => navigate('/anthony-dashboard?tab=ledger&filter=anthony_scan_received')}
                                className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Review Audit Ledger
                            </button>
                        </div>
                    </div>

                    {flow && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500">Latest Scan</div>
                                <div className="mt-1 text-sm text-slate-200">{flow.summary.latestScanStatus}</div>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500">Findings</div>
                                <div className="mt-1 text-sm text-amber-400">{flow.summary.findingsCount}</div>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500">Tracked CVEs</div>
                                <div className="mt-1 text-sm text-slate-200">
                                    {flow.summary.vulnerabilitiesCount}
                                    <span className="ml-2 text-rose-400 text-xs">{flow.summary.criticalVulnerabilities} critical</span>
                                </div>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                                <div className="text-[10px] uppercase tracking-widest text-slate-500">Handoff</div>
                                <div className="mt-1 text-sm text-emerald-400">{flow.summary.anthonyHandoffStatus}</div>
                            </div>
                        </div>
                    )}

                    {focus && (
                        <div className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-300">
                            Focused from readiness control: <span className="font-medium">{focus}</span>
                        </div>
                    )}

                    {error && (
                        <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                            {error}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="relative min-h-[640px] lg:min-h-[760px] w-full border border-slate-800/50 rounded-xl bg-slate-950 p-8 lg:p-10 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.08),transparent_55%)] pointer-events-none" />
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            {flow?.edges.map((edge) => {
                                const from = NODE_POSITIONS[edge.from];
                                const to = NODE_POSITIONS[edge.to];
                                if (!from || !to) return null;
                                return (
                                    <path
                                        key={edge.id}
                                        d={edgePath(from, to)}
                                        fill="none"
                                        stroke={severityStroke(edge.severity)}
                                        strokeWidth="0.28"
                                        strokeDasharray="1.2 1.2"
                                        opacity="0.8"
                                    />
                                );
                            })}
                        </svg>

                        {flow?.nodes.map((node) => {
                            const position = NODE_POSITIONS[node.id];
                            if (!position) return null;
                            const { icon: Icon, tone } = getNodeVisuals(node);
                            const isSelected = selectedNodeId === node.id;

                            return (
                                <button
                                    key={node.id}
                                    onClick={() => setSelectedNodeId(node.id)}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 text-center"
                                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                                >
                                    <div className={`w-24 h-24 lg:w-28 lg:h-28 rounded-3xl border flex items-center justify-center ${tone} ${isSelected ? 'ring-2 ring-white/20 scale-105' : ''} transition-transform`}>
                                        <Icon className="w-9 h-9 lg:w-10 lg:h-10" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="text-sm font-mono text-slate-300">{node.label}</div>
                                        <div className={`text-[11px] uppercase tracking-wider ${node.status === 'critical' ? 'text-rose-400' : node.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {node.status}
                                        </div>
                                        <div className="text-[11px] text-slate-500">{node.evidenceCount} evidence items</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden">
                        <div className="p-4 border-b border-slate-800">
                            <div className="text-xs uppercase tracking-widest text-slate-500">Anthony Evidence Panel</div>
                            <div className="mt-2 text-lg text-white">{selectedNode?.label ?? 'No node selected'}</div>
                            <p className="mt-1 text-sm text-slate-400">{selectedNode?.details}</p>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
                                <div>
                                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Evidence count</div>
                                    <div className="text-sm text-slate-200">{selectedEvidence.length}</div>
                                </div>
                                <button
                                    onClick={() => selectedNode && navigate(`/anthony-dashboard?tab=ledger&filter=${encodeURIComponent(nodeFilterToken(selectedNode.id))}`)}
                                    disabled={!selectedNode}
                                    className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
                                >
                                    Open Ledger Evidence
                                </button>
                            </div>

                            <div className="space-y-3 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
                                {selectedEvidence.length === 0 && (
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-4 text-sm text-slate-500">
                                        No evidence is attached to this node yet. Run a fresh Michael scan to generate an updated handoff.
                                    </div>
                                )}

                                {selectedEvidence.slice(0, 6).map((item) => (
                                    <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm text-slate-200">{item.title}</div>
                                            <span className={`text-[10px] uppercase tracking-wider ${
                                                item.severity === 'critical' ? 'text-rose-400' :
                                                item.severity === 'warning' || item.severity === 'high' ? 'text-amber-400' :
                                                'text-emerald-400'
                                            }`}>
                                                {item.severity}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">{item.summary}</p>
                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
                                            <span>{item.type}</span>
                                            {item.provider && <span>{item.provider}</span>}
                                            {item.timestamp && <span>{new Date(item.timestamp).toLocaleString()}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                    <h4 className="text-sm font-medium text-slate-200">Change-triggered Re-attestation Active</h4>
                    <p className="text-xs text-slate-400 mt-1">
                        St. Anthony is not drawing a generic map anymore. This view is rebuilt from Michael scan evidence, vulnerability tracking, and ledger handoff state each time the audit graph refreshes.
                    </p>
                </div>
            </div>
        </div>
    );
}
