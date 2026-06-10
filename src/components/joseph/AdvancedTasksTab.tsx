import React, { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckSquare, Coins, FileText, Loader2, Plus, Shield } from 'lucide-react';

import { apiClient } from '../../lib/api-client';
import type { FamilyTask } from '../../types/database.types';

export type TaskType = 'standard' | 'bounty' | 'mandate' | 'ghost';

export interface AdvancedTask {
    id: string;
    title: string;
    description: string;
    type: TaskType;
    status: 'pending' | 'in_progress' | 'completed';
    assignee?: string;
    rewardWG?: number;
    aiBrief?: string;
}

const DEFAULT_NEW_TASK = {
    title: '',
    description: '',
    type: 'standard' as TaskType,
    assignee: '',
    rewardWG: '',
};

function mapTask(task: FamilyTask): AdvancedTask {
    return {
        id: task.id,
        title: task.title || task.action,
        description: task.description || 'No description yet.',
        type: (task.type || 'standard') as TaskType,
        status: task.status,
        assignee: task.assignee || task.assignedTo,
        rewardWG: task.rewardWG,
        aiBrief: task.aiBrief,
    };
}

export function AdvancedTasksTab() {
    const [tasks, setTasks] = useState<AdvancedTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [showComposer, setShowComposer] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newTask, setNewTask] = useState(DEFAULT_NEW_TASK);

    const loadTasks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiClient.getFamilyTasks('');
            setTasks(data.map(mapTask));
        } catch (loadError) {
            console.error('Failed to load advanced tasks', loadError);
            setError(loadError instanceof Error ? loadError.message : 'Failed to load tasks.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadTasks();
    }, []);

    const patchTask = (task: AdvancedTask) => {
        setTasks((prev) => prev.map((entry) => (entry.id === task.id ? task : entry)));
    };

    const handleCreateTask = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newTask.title.trim()) {
            setError('Task title is required.');
            return;
        }

        setSaving(true);
        setError(null);
        try {
            const created = await apiClient.createFamilyTask({
                title: newTask.title.trim(),
                description: newTask.description.trim(),
                type: newTask.type,
                assignee: newTask.assignee.trim() || undefined,
                rewardWG: newTask.rewardWG ? Number(newTask.rewardWG) : undefined,
            });
            setTasks((prev) => [mapTask(created), ...prev]);
            setNewTask(DEFAULT_NEW_TASK);
            setShowComposer(false);
        } catch (saveError) {
            console.error('Failed to create advanced task', saveError);
            setError(saveError instanceof Error ? saveError.message : 'Failed to create task.');
        } finally {
            setSaving(false);
        }
    };

    const handleComplete = async (task: AdvancedTask) => {
        setActiveTaskId(task.id);
        setError(null);
        try {
            if (task.type === 'ghost') {
                patchTask({ ...task, status: 'in_progress' });
                const updated = await apiClient.dispatchFamilyTask(task.id);
                patchTask(mapTask(updated));
                return;
            }

            if (task.type === 'mandate') {
                const updated = await apiClient.updateFamilyTask(task.id, { status: 'completed' });
                patchTask(mapTask(updated));
                return;
            }

            await apiClient.completeTask(task.id);
            patchTask({ ...task, status: 'completed' });
        } catch (completeError) {
            console.error('Failed to update advanced task', completeError);
            setError(completeError instanceof Error ? completeError.message : 'Failed to update task.');
            patchTask(task);
        } finally {
            setActiveTaskId(null);
        }
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

                <button
                    onClick={() => setShowComposer((prev) => !prev)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 transition-colors text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/20"
                >
                    <Plus className="w-4 h-4" /> New Task
                </button>
            </div>

            {showComposer && (
                <form onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                    <input
                        value={newTask.title}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Task title"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <select
                        value={newTask.type}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, type: event.target.value as TaskType }))}
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                    >
                        <option value="standard">Standard</option>
                        <option value="bounty">Bounty</option>
                        <option value="mandate">Mandate</option>
                        <option value="ghost">Ghost</option>
                    </select>
                    <textarea
                        value={newTask.description}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, description: event.target.value }))}
                        placeholder="Task description"
                        className="md:col-span-2 rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <input
                        value={newTask.assignee}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, assignee: event.target.value }))}
                        placeholder="Assignee"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <input
                        value={newTask.rewardWG}
                        onChange={(event) => setNewTask((prev) => ({ ...prev, rewardWG: event.target.value }))}
                        placeholder="Reward WG"
                        type="number"
                        min="0"
                        className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                    />
                    <button
                        type="submit"
                        disabled={saving}
                        className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Save Task
                    </button>
                </form>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading && (
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/5 bg-white/5 px-6 py-8 text-sm text-slate-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading family tasks from the backend...
                    </div>
                )}

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

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <h4 className={`text-lg font-medium ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>{task.title}</h4>
                                <p className={`text-sm mt-1 ${task.status === 'completed' ? 'text-slate-500' : 'text-slate-400'}`}>{task.description}</p>

                                {task.assignee && task.status !== 'completed' && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                        Assigned to: <span className="font-medium text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md">{task.assignee}</span>
                                    </div>
                                )}

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

                            <div className="flex items-start">
                                {task.status === 'pending' && task.type !== 'mandate' && task.type !== 'ghost' && (
                                    <button
                                        onClick={() => void handleComplete(task)}
                                        disabled={activeTaskId === task.id}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 transition-all shadow-lg"
                                        title="Mark Done"
                                    >
                                        {activeTaskId === task.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckSquare className="w-5 h-5" />}
                                    </button>
                                )}

                                {task.status === 'pending' && task.type === 'ghost' && (
                                    <button
                                        onClick={() => void handleComplete(task)}
                                        disabled={activeTaskId === task.id}
                                        className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 transition-all shadow-lg text-xs font-bold uppercase tracking-wider group"
                                    >
                                        {activeTaskId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispatch Agent'}
                                        {activeTaskId !== task.id && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                )}

                                {task.status === 'pending' && task.type === 'mandate' && (
                                    <button
                                        onClick={() => void handleComplete(task)}
                                        disabled={activeTaskId === task.id}
                                        className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all shadow-lg text-xs font-bold uppercase tracking-wider"
                                    >
                                        {activeTaskId === task.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Digitally Sign'}
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

            {!loading && tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                    <CheckSquare className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">No backend tasks yet. Create the first family task.</p>
                </div>
            )}

            {!loading && tasks.length > 0 && tasks.every(task => task.status === 'completed') && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-3 border border-white/5 border-dashed rounded-2xl bg-white/5">
                    <CheckSquare className="w-8 h-8 opacity-50" />
                    <p className="text-sm font-medium">All tasks and mandates resolved.</p>
                </div>
            )}
        </div>
    );
}
