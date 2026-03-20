import React, { useState, useEffect } from 'react';
import { CheckSquare, Bot, Coins, Shield, Loader2, FileText, Plus, AlertTriangle, ArrowRight } from 'lucide-react';

export type TaskType = 'standard' | 'bounty' | 'mandate' | 'ghost';

export interface AdvancedTask {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    status: 'pending' | 'in_progress' | 'completed';
    assignee?: string;
    rewardWG?: number; // WiseGold Bounty
    aiBrief?: string;  // For Ghost Tasks
}

// Mock initial state for the advanced features
const INITIAL_TASKS: AdvancedTask[] = [
    {
        id: 't1',
        title: 'Research Summer Math Camps for Leo',
        description: 'Find top 3 coding/math camps in Austin for a 12-year-old with pricing.',
        type: 'ghost',
        status: 'pending',
        assignee: 'St. Joseph Sub-Agent'
    },
    {
        id: 't2',
        title: 'Clean the Garage',
        description: 'Organize the tools and sweep the floor.',
        type: 'bounty',
        status: 'pending',
        assignee: 'Leo',
        rewardWG: 50
    },
    {
        id: 't3',
        title: 'Mandatory Unplugged Weekend',
        description: 'Council Consensus: High family stress detected. No screens allowed this Saturday.',
        type: 'mandate',
        status: 'pending'
    },
    {
        id: 't4',
        title: 'Call Grandma',
        description: 'Check in on her after her doctor appointment.',
        type: 'standard',
        status: 'pending'
    }
];

export function AdvancedTasksTab() {
    const [tasks, setTasks] = useState<AdvancedTask[]>(INITIAL_TASKS);
    const [isAgentWorking, setIsAgentWorking] = useState(false);

    // Mock completing a task
    const handleComplete = (id: string, type: TaskType) => {
        if (type === 'ghost') {
            // Simulate agent dispatch
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'in_progress' } : t));
            setIsAgentWorking(true);
            
            setTimeout(() => {
                setTasks(prev => prev.map(t => t.id === id ? { 
                    ...t, 
                    status: 'completed',
                    aiBrief: 'St. Joseph Sub-Agent compiled a 3-page brief on Austin Math Camps. Top pick: "Austin Coding Academy", $450/week. Attached.'
                } : t));
                setIsAgentWorking(false);
            }, 3000);
            return;
        }

        // Standard completion
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-light text-white flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-indigo-400" />
                        Logistics & Legacy
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">Manage standard chores, WiseGold bounties, and autonomous AI agents.</p>
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20">
                    <Plus className="w-4 h-4" /> New Task
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tasks.map(task => (
                    <div 
                        key={task.id} 
                        className={`relative overflow-hidden p-5 rounded-2xl border transition-all ${
                            task.status === 'completed' 
                            ? 'bg-emerald-500/5 border-emerald-500/10' 
                            : task.type === 'mandate' ? 'bg-rose-500/5 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]'
                            : task.type === 'ghost' ? 'bg-indigo-500/5 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]'
                            : task.type === 'bounty' ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
                            : 'bg-white/5 border-white/5 hover:border-white/10'
                        }`}
                    >
                        {/* Status Line */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {task.type === 'ghost' && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30"><Bot className="w-3 h-3" /> Autonomous Ghost Task</span>}
                                {task.type === 'bounty' && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-amber-500/30"><Coins className="w-3 h-3" /> Generational Bounty</span>}
                                {task.type === 'mandate' && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-rose-500/30"><Shield className="w-3 h-3" /> Council Mandate</span>}
                                {task.type === 'standard' && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-slate-700">Standard</span>}
                                
                                {task.status === 'completed' && <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">Completed</span>}
                                {task.status === 'in_progress' && <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold uppercase tracking-wider animate-pulse"><Loader2 className="w-3 h-3 animate-spin" /> Dispatched</span>}
                            </div>
                            
                            {task.rewardWG && task.status !== 'completed' && (
                                <div className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20 shadow-inner">
                                    <Coins className="w-4 h-4" />
                                    <span className="font-bold text-sm">+{task.rewardWG} WG</span>
                                </div>
                            )}
                        </div>

                        {/* Title & Desc */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <h4 className={`text-lg font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</h4>
                                <p className={`text-sm mt-1 ${task.status === 'completed' ? 'text-slate-500' : 'text-slate-400'}`}>{task.description}</p>
                                
                                {task.assignee && task.status !== 'completed' && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                        Assigned to: <span className="font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">{task.assignee}</span>
                                    </div>
                                )}

                                {/* AI Brief Result */}
                                {task.aiBrief && task.status === 'completed' && (
                                    <div className="mt-4 p-4 bg-indigo-950/50 border border-indigo-500/20 rounded-xl space-y-2">
                                        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                            <FileText className="w-4 h-4" /> 
                                            AI Sub-Agent Brief Compiled
                                        </div>
                                        <p className="text-sm text-indigo-200/80 leading-relaxed bg-black/20 p-3 rounded-lg border border-indigo-500/10">
                                            {task.aiBrief}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-start">
                                {task.status === 'pending' && task.type !== 'mandate' && task.type !== 'ghost' && (
                                    <button 
                                        onClick={() => handleComplete(task.id, task.type)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 transition-all shadow-lg"
                                        title="Mark Done"
                                    >
                                        <CheckSquare className="w-5 h-5" />
                                    </button>
                                )}
                                
                                {task.status === 'pending' && task.type === 'ghost' && (
                                    <button 
                                        onClick={() => handleComplete(task.id, task.type)}
                                        className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all shadow-lg text-xs font-bold uppercase tracking-wider group"
                                    >
                                        Dispatch Agent
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}

                                {task.status === 'pending' && task.type === 'mandate' && (
                                    <button 
                                        onClick={() => handleComplete(task.id, task.type)}
                                        className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shadow-lg text-xs font-bold uppercase tracking-wider"
                                    >
                                        Digitally Sign
                                    </button>
                                )}

                                {task.status === 'completed' && (
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <CheckSquare className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {tasks.every(t => t.status === 'completed') && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                    <CheckSquare className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">All tasks and mandates resolved.</p>
                </div>
            )}
        </div>
    );
}
