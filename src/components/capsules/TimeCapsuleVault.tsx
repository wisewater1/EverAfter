import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Lock, Unlock, Mail, Plus, Clock,
    Calendar, Sparkles, Send, X, Loader
} from 'lucide-react';

interface TimeCapsule {
    id: string;
    title: string;
    sender_saint_id: string;
    is_unlocked: boolean;
    unlock_date: string | null;
    created_at: string;
    content?: string;
    media_url?: string;
}

export default function TimeCapsuleVault() {
    const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Form State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [targetSaint, setTargetSaint] = useState('user');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        fetchCapsules();
    }, []);

    const fetchCapsules = async () => {
        try {
            const res = await axios.get('/api/v1/time-capsules');
            setCapsules(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await axios.post('/api/v1/time-capsules', {
                title: newTitle,
                content: newContent,
                unlock_condition: targetDate, // Simplification for prototype
                sender_saint_id: targetSaint
                // unlock_date would be parsed here in real app
            });
            setShowCreateModal(false);
            fetchCapsules();
            // Reset form
            setNewTitle('');
            setNewContent('');
        } catch (error) {
            console.error("Failed to create capsule", error);
        }
    };

    const handleGenerate = async () => {
        if (!targetSaint || targetSaint === 'user') return;
        setIsGenerating(true);
        try {
            const res = await axios.post('/api/v1/time-capsules/generate-letter', null, {
                params: {
                    saint_id: targetSaint,
                    topic: "Advice for the future",
                    target_date: targetDate || "5 years"
                }
            });
            setNewTitle(res.data.title);
            setNewContent(res.data.content);
        } catch (error) {
            console.error("Generation failed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleUnlock = async (id: string) => {
        try {
            await axios.post(`/api/v1/time-capsules/${id}/unlock`);
            fetchCapsules(); // Refresh to see unlocked content
        } catch (error) {
            alert("This capsule cannot be unlocked yet.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl opacity-20"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10 space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium tracking-wide uppercase mb-3">
                            <Clock className="w-3 h-3" />
                            Epistolary Time-Capsules
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-200 via-white to-amber-200 bg-clip-text text-transparent">
                            The Legacy Vault
                        </h1>
                        <p className="text-slate-400 mt-2 max-w-xl">
                            Send messages across time. Preserve wisdom, secrets, and love for your future self or descendants.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Create Capsule
                    </button>
                </div>

                {/* Capsules Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader className="w-10 h-10 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {capsules.map(capsule => (
                            <div
                                key={capsule.id}
                                className={`
                                    relative p-6 rounded-2xl border transition-all duration-300 group
                                    ${capsule.is_unlocked
                                        ? 'bg-slate-900/60 border-amber-500/30 hover:border-amber-500/50'
                                        : 'bg-slate-950/40 border-slate-800 hover:border-indigo-500/30'
                                    }
                                `}
                            >
                                {/* Status Icon */}
                                <div className="absolute top-6 right-6">
                                    {capsule.is_unlocked ? (
                                        <Unlock className="w-5 h-5 text-amber-400" />
                                    ) : (
                                        <Lock className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition" />
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${capsule.is_unlocked ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                                        <Mail className="w-6 h-6" />
                                    </div>

                                    <div>
                                        <h3 className={`font-serif font-medium text-lg ${capsule.is_unlocked ? 'text-amber-100' : 'text-slate-200'}`}>
                                            {capsule.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                            From: {capsule.sender_saint_id}
                                        </p>
                                    </div>

                                    {capsule.is_unlocked ? (
                                        <div className="prose prose-invert prose-sm max-h-40 overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-lg border border-white/5">
                                            <p className="whitespace-pre-wrap text-slate-300">{capsule.content}</p>
                                        </div>
                                    ) : (
                                        <div className="h-24 flex items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30">
                                            <div className="flex flex-col items-center gap-2 text-slate-600">
                                                <Clock className="w-5 h-5" />
                                                <span className="text-sm">Locked until {capsule.unlock_date ? new Date(capsule.unlock_date).toLocaleDateString() : 'Conditions Met'}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Bar */}
                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                                        <span>{new Date(capsule.created_at).toLocaleDateString()}</span>
                                        {!capsule.is_unlocked && (
                                            <button
                                                onClick={() => handleUnlock(capsule.id)}
                                                className="text-indigo-400 hover:text-indigo-300 font-medium transition"
                                            >
                                                Check Unlock
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Creation Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl relative">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-400" />
                                Create Time Capsule
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Author / Persona</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        value={targetSaint}
                                        onChange={(e) => setTargetSaint(e.target.value)}
                                    >
                                        <option value="user">Me (Direct Message)</option>
                                        <option value="joseph">St. Joseph (Family Guardian)</option>
                                        <option value="michael">St. Michael (Protector)</option>
                                        <option value="raphael">St. Raphael (Healer)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="E.g., For my daughter's wedding..."
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Unlock Condition</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="E.g., 2030, or 'Financial Crisis'"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="block text-sm font-medium text-slate-400">Message Content</label>
                                        {targetSaint !== 'user' && (
                                            <button
                                                onClick={handleGenerate}
                                                disabled={isGenerating}
                                                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                            >
                                                {isGenerating ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                Generate with AI
                                            </button>
                                        )}
                                    </div>
                                    <textarea
                                        className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                        placeholder="Write your message here..."
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                    />
                                </div>

                                <button
                                    onClick={handleCreate}
                                    className="w-full py-3 mt-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium shadow-lg transition-all"
                                >
                                    Seal Capsule
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
