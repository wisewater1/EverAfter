import { useState, useEffect } from 'react';
import { Activity, Server, Database, Clock, AlertTriangle, CheckCircle2, Cpu, Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { buildApiUrl } from '../../lib/env';

interface MetricPoint {
    time: string;
    value: number;
}

interface SystemMetrics {
    uptime_seconds: number;
    resources: {
        cpu_current: number;
        memory_current: number;
        disk_usage: number;
    };
    throughput: {
        total_requests: number;
        error_rate: number;
        error_count: number;
    };
    history: {
        cpu: MetricPoint[];
        memory: MetricPoint[];
    };
}

export default function SystemMonitorDashboard() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchMetrics = async () => {
        try {
            const { data: { session } } = await import('../../lib/supabase').then(m => m.supabase.auth.getSession());
            const token = session?.access_token;
            const response = await fetch(buildApiUrl('/api/v1/monitoring/metrics'), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (response.ok) {
                const data = await response.json();
                // Process history to friendly time format
                if (data.history) {
                    data.history.cpu = data.history.cpu.map((p: any) => ({
                        ...p,
                        time: new Date(p.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }));
                    data.history.memory = data.history.memory.map((p: any) => ({
                        ...p,
                        time: new Date(p.time).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }));
                }
                setMetrics(data);
                setLastUpdated(new Date());
            }
        } catch (err) {
            console.error("Failed to fetch metrics", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    if (loading && !metrics) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-500">
                <Activity className="w-8 h-8 animate-spin text-emerald-500 mr-2" />
                Initializing System Monitor...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-mono">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/50 px-4 py-3 backdrop-blur-md sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-emerald-500" />
                        <div>
                            <h1 className="text-lg font-bold text-slate-100 tracking-tight">System Monitor</h1>
                            <p className="text-xs text-slate-500">
                                <span className="sm:hidden">Live telemetry</span>
                                <span className="hidden sm:inline">Real-time Telemetry</span>
                            </p>
                        </div>
                    </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm sm:gap-6">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <span className="text-slate-300">Uptime: {metrics ? formatUptime(metrics.uptime_seconds) : '--'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-emerald-400">System Nominal</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs uppercase tracking-wider">CPU Load</span>
                            <Cpu className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{metrics?.resources.cpu_current.toFixed(1)}%</div>
                        <div className="h-1 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${metrics?.resources.cpu_current}%` }} />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs uppercase tracking-wider">Memory</span>
                            <Server className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="text-2xl font-bold text-white">{metrics?.resources.memory_current.toFixed(1)}%</div>
                        <div className="h-1 w-full bg-slate-800 mt-3 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${metrics?.resources.memory_current}%` }} />
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs uppercase tracking-wider">Requests</span>
                            <Zap className="w-4 h-4 text-amber-400" />
                        </div>
                        <div className="text-xl font-bold text-white sm:text-2xl">{metrics?.throughput.total_requests.toLocaleString()}</div>
                        <p className="text-xs text-slate-500 mt-1">Total served</p>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-xs uppercase tracking-wider">Error Rate</span>
                            <AlertTriangle className={`w-4 h-4 ${metrics && metrics.throughput.error_rate > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                        </div>
                        <div className={`text-xl font-bold sm:text-2xl ${metrics && metrics.throughput.error_rate > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {metrics?.throughput.error_rate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{metrics?.throughput.error_count} errors</p>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CPU History */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-400" />
                            CPU Utilization History
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics?.history.cpu}>
                                    <defs>
                                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }}
                                        itemStyle={{ color: '#60a5fa' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCpu)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Memory History */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h3 className="text-sm font-semibold text-slate-300 mb-6 flex items-center gap-2">
                            <Server className="w-4 h-4 text-purple-400" />
                            Memory Usage History
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={metrics?.history.memory}>
                                    <defs>
                                        <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={12} tickMargin={10} />
                                    <YAxis stroke="#475569" fontSize={12} domain={[0, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#e2e8f0' }}
                                        itemStyle={{ color: '#c084fc' }}
                                    />
                                    <Area type="monotone" dataKey="value" stroke="#a855f7" fillOpacity={1} fill="url(#colorMem)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Logs / Events placeholder */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        Recent System Events
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 text-sm p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <span className="text-xs font-mono text-slate-500">{new Date().toLocaleTimeString()}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-slate-300">System Monitor Initialized</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm p-2 bg-slate-900/50 rounded border border-slate-800/50">
                            <span className="text-xs font-mono text-slate-500">{new Date(Date.now() - 5000).toLocaleTimeString()}</span>
                            <Zap className="w-4 h-4 text-blue-500" />
                            <span className="text-slate-300">Metrics Collection Started</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
