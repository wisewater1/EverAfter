import { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface MissionStep {
    step_id: string;
    assignee: string;
    task: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    output?: string;
}

interface Mission {
    mission_id: string;
    title: string;
    objective: string;
    status: 'active' | 'completed' | 'failed';
    initiator: string;
    steps: MissionStep[];
}

export default function MissionBoard() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMissions = async () => {
        try {
            const data = await apiClient.getActiveMissions();
            // Ensure data is array
            setMissions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch missions", error);
            setMissions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMissions();
        const interval = setInterval(fetchMissions, 5000); // 5s polling for prototype
        return () => clearInterval(interval);
    }, []);

    const activeMissions = missions;

    if (loading && activeMissions.length === 0) {
        return <div className="p-4 text-slate-500 text-xs">Loading mission board...</div>;
    }

    if (activeMissions.length === 0) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-5 h-5 text-slate-500" />
                </div>
                <h3 className="text-slate-300 font-medium mb-1">Mission Board Empty</h3>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                    Enable active coordination to see agents collaborating on shared tasks.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {activeMissions.map((mission) => (
                <div key={mission.mission_id} className="bg-slate-900/80 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-500/10 to-transparent border-b border-indigo-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-indigo-500/20 rounded text-indigo-400">
                                <Target className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-indigo-200 font-medium text-sm">{mission.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="uppercase tracking-wider">INITIATOR: {mission.initiator}</span>
                                    <span>•</span>
                                    <span>{mission.status.toUpperCase()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 font-mono">
                            {mission.mission_id.slice(0, 8)}
                        </div>
                    </div>

                    {/* Objective */}
                    <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                        <p className="text-xs text-slate-400 italic">"{mission.objective}"</p>
                    </div>

                    {/* Steps */}
                    <div className="p-3 space-y-2">
                        {mission.steps.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-2">No steps planned yet.</p>
                        ) : (
                            mission.steps.map((step) => (
                                <div key={step.step_id} className="flex items-start gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                                    <div className="mt-0.5">
                                        {step.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                                        {step.status === 'in_progress' && <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
                                        {step.status === 'pending' && <Circle className="w-3.5 h-3.5 text-slate-600" />}
                                        {step.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-xs text-slate-300">{step.task}</span>
                                            <span className="text-[9px] uppercase tracking-wider text-slate-500 bg-slate-800 px-1.5 rounded">
                                                {step.assignee}
                                            </span>
                                        </div>
                                        {step.output && (
                                            <div className="mt-1 text-[10px] text-slate-400 bg-black/20 p-1.5 rounded font-mono border-l-2 border-emerald-500/50">
                                                {step.output}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
