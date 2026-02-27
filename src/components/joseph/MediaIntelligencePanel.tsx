import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Upload, FileText, Image, Video, Shield, Check, X, Edit3,
    Trash2, Plus, Lock, Unlock, ChevronDown, Sparkles, Eye
} from 'lucide-react';
import { getFamilyMembers, updateFamilyMember } from '../../lib/joseph/genealogy';
import type { FamilyMember, InfoStackEntry } from '../../lib/joseph/genealogy';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

/* ── Types ──────────────────────────────────────────────────────── */

interface ExtractedInsight {
    id: string;
    category: string;
    label: string;
    value: string;
    confidence: number;
    source_snippet: string;
    source_media_type: string;
    approved: boolean;
}

interface ExtractionResult {
    member_id: string;
    member_name: string;
    media_type: string;
    raw_summary: string;
    insights: ExtractedInsight[];
}

/* ── Category styling ───────────────────────────────────────────── */

const CATEGORY_STYLE: Record<string, { icon: string; color: string; bg: string }> = {
    trait: { icon: '🧬', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    date: { icon: '📅', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    occupation: { icon: '💼', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    health: { icon: '❤️', color: 'text-rose-400', bg: 'bg-rose-500/10' },
    milestone: { icon: '⭐', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    relationship: { icon: '👥', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    location: { icon: '📍', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    interest: { icon: '🎯', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    quote: { icon: '💬', color: 'text-teal-400', bg: 'bg-teal-500/10' },
    appearance: { icon: '👤', color: 'text-pink-400', bg: 'bg-pink-500/10' },
    other: { icon: '📎', color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

/* ═══════════════════════════════════════════════════════════════ */

export default function MediaIntelligencePanel() {
    const members = getFamilyMembers();
    const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
    const [showMemberPicker, setShowMemberPicker] = useState(false);

    // Permissions
    const [permsGranted, setPermsGranted] = useState(false);

    // Upload
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Extraction
    const [extracting, setExtracting] = useState(false);
    const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
    const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

    // Info stack
    const [infoStack, setInfoStack] = useState<InfoStackEntry[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [addingManual, setAddingManual] = useState(false);
    const [manualCategory, setManualCategory] = useState('other');
    const [manualLabel, setManualLabel] = useState('');
    const [manualValue, setManualValue] = useState('');

    // Tab
    const [tab, setTab] = useState<'upload' | 'stack'>('upload');

    /* ── Load member info stack ────────────────────────────────── */

    const loadInfoStack = useCallback(async (memberId: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/media-intelligence/info-stack/${memberId}`);
            if (res.ok) {
                const data = await res.json();
                setInfoStack(data.entries || []);
            }
        } catch {
            // Use local data as fallback
            const member = members.find(m => m.id === memberId);
            setInfoStack(member?.infoStack || []);
        }
    }, [members]);

    useEffect(() => {
        if (selectedMember) {
            loadInfoStack(selectedMember.id);
            setPermsGranted(selectedMember.mediaPermissions?.allowAIProcessing || false);
        }
    }, [selectedMember, loadInfoStack]);

    /* ── File upload + extraction ──────────────────────────────── */

    const handleFiles = async (files: FileList | null) => {
        if (!files || files.length === 0 || !selectedMember) return;
        const file = files[0];

        // Determine media type
        let mediaType = 'text';
        if (file.type.startsWith('image/')) mediaType = 'image';
        else if (file.type.startsWith('video/')) mediaType = 'video';
        else if (file.type.includes('pdf') || file.type.includes('document')) mediaType = 'document';

        setUploading(true);

        // Read file content
        const content = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            if (mediaType === 'text' || mediaType === 'document') {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsText(file);
            } else {
                reader.onload = () => {
                    const b64 = (reader.result as string).split(',')[1] || '';
                    resolve(b64);
                };
                reader.readAsDataURL(file);
            }
        });

        // Upload
        try {
            await fetch(`${API_BASE}/api/v1/media-intelligence/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    member_id: selectedMember.id,
                    media_type: mediaType,
                    filename: file.name,
                    content,
                    permissions_granted: permsGranted,
                }),
            });
        } catch (err) {
            console.error('Upload failed:', err);
        }
        setUploading(false);

        // Auto-extract if permissions granted
        if (permsGranted) {
            setExtracting(true);
            try {
                const res = await fetch(`${API_BASE}/api/v1/media-intelligence/extract`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        member_id: selectedMember.id,
                        member_name: `${selectedMember.firstName} ${selectedMember.lastName}`,
                        media_type: mediaType,
                        content,
                        filename: file.name,
                    }),
                });
                if (res.ok) {
                    const result = await res.json();
                    setExtraction(result);
                    setApprovedIds(new Set());
                }
            } catch (err) {
                console.error('Extraction failed:', err);
            }
            setExtracting(false);
        }
    };

    /* ── Approve / reject insights ────────────────────────────── */

    const toggleApproval = (id: string) => {
        setApprovedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const approveAll = () => {
        if (!extraction) return;
        setApprovedIds(new Set(extraction.insights.map(i => i.id)));
    };

    const commitApproved = async () => {
        if (!extraction || !selectedMember) return;
        const approved = extraction.insights
            .filter(i => approvedIds.has(i.id))
            .map(i => ({ ...i, approved: true, source: 'ai_extracted' }));

        if (approved.length === 0) return;

        try {
            const res = await fetch(`${API_BASE}/api/v1/media-intelligence/info-stack/${selectedMember.id}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ insights: approved }),
            });
            if (res.ok) {
                await loadInfoStack(selectedMember.id);
                setExtraction(null);
                setApprovedIds(new Set());
                setTab('stack');
            }
        } catch (err) {
            console.error('Commit failed:', err);
        }
    };

    /* ── Edit / delete info stack entries ──────────────────────── */

    const startEdit = (entry: InfoStackEntry) => {
        setEditingId(entry.id);
        setEditValue(entry.value);
    };

    const saveEdit = async (entryId: string) => {
        if (!selectedMember) return;
        const entry = infoStack.find(e => e.id === entryId);
        if (!entry) return;

        try {
            await fetch(`${API_BASE}/api/v1/media-intelligence/info-stack/${selectedMember.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    entries: [{ ...entry, value: editValue }],
                    deleted_ids: [],
                }),
            });
            await loadInfoStack(selectedMember.id);
        } catch {
            // Update locally
            setInfoStack(prev => prev.map(e => e.id === entryId ? { ...e, value: editValue } : e));
        }
        setEditingId(null);
    };

    const deleteEntry = async (entryId: string) => {
        if (!selectedMember) return;
        try {
            await fetch(`${API_BASE}/api/v1/media-intelligence/info-stack/${selectedMember.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entries: [], deleted_ids: [entryId] }),
            });
            await loadInfoStack(selectedMember.id);
        } catch {
            setInfoStack(prev => prev.filter(e => e.id !== entryId));
        }
    };

    const addManualEntry = async () => {
        if (!selectedMember || !manualValue.trim()) return;
        const newEntry = {
            id: `m_${Date.now()}`,
            category: manualCategory,
            label: manualLabel || manualCategory,
            value: manualValue,
            source: 'manual',
            confidence: 1.0,
            approved: true,
        };

        try {
            await fetch(`${API_BASE}/api/v1/media-intelligence/info-stack/${selectedMember.id}/commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ insights: [newEntry] }),
            });
            await loadInfoStack(selectedMember.id);
        } catch {
            setInfoStack(prev => [...prev, newEntry as any]);
        }

        setAddingManual(false);
        setManualValue('');
        setManualLabel('');
    };

    /* ── Permissions toggle ───────────────────────────────────── */

    const togglePermissions = async () => {
        if (!selectedMember) return;
        const newVal = !permsGranted;
        setPermsGranted(newVal);

        // Update local
        updateFamilyMember(selectedMember.id, {
            mediaPermissions: {
                allowAIProcessing: newVal,
                allowImageAnalysis: newVal,
                allowVideoAnalysis: newVal,
                allowTextAnalysis: newVal,
                grantedAt: newVal ? new Date().toISOString() : undefined,
            },
        });

        // Update backend
        try {
            await fetch(`${API_BASE}/api/v1/media-intelligence/permissions/${selectedMember.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    allow_ai_processing: newVal,
                    allow_image_analysis: newVal,
                    allow_video_analysis: newVal,
                    allow_text_analysis: newVal,
                }),
            });
        } catch { /* best effort */ }
    };

    /* ── Drop handlers ────────────────────────────────────────── */

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    /* ── Render ────────────────────────────────────────────────── */

    return (
        <div className="rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <h2 className="text-base font-semibold text-white">Media Intelligence</h2>
                    </div>

                    {/* Member selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMemberPicker(!showMemberPicker)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition text-sm"
                        >
                            <span className="text-white">
                                {selectedMember ? `${selectedMember.firstName} ${selectedMember.lastName}` : 'Select member…'}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        {showMemberPicker && (
                            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
                                {members.filter(m => !m.deathDate).map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => { setSelectedMember(m); setShowMemberPicker(false); setExtraction(null); }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition ${selectedMember?.id === m.id ? 'text-amber-400' : 'text-white'}`}
                                    >
                                        {m.firstName} {m.lastName}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Permissions + Tabs */}
                {selectedMember && (
                    <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                            <button
                                onClick={() => setTab('upload')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${tab === 'upload' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-white'}`}
                            >
                                Upload & Extract
                            </button>
                            <button
                                onClick={() => setTab('stack')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${tab === 'stack' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-white'}`}
                            >
                                Info Stack ({infoStack.length})
                            </button>
                        </div>

                        <button
                            onClick={togglePermissions}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition border ${permsGranted
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}
                        >
                            <Shield className="w-3 h-3" />
                            {permsGranted ? 'AI Access Granted' : 'AI Access Denied'}
                        </button>
                    </div>
                )}
            </div>

            {/* Body */}
            {!selectedMember ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                    Select a family member to upload media and manage their information stack.
                </div>
            ) : tab === 'upload' ? (
                <div className="p-5 space-y-4">
                    {/* Drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver
                                ? 'border-amber-400 bg-amber-500/5'
                                : 'border-white/10 hover:border-white/20 bg-white/[0.01]'
                            }`}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*,video/*,.txt,.pdf,.doc,.docx"
                            className="hidden"
                            onChange={e => handleFiles(e.target.files)}
                        />
                        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-amber-400' : 'text-slate-600'}`} />
                        <p className="text-sm text-white font-medium">
                            {uploading ? 'Uploading…' : extracting ? 'AI Extracting…' : 'Drop files here or click to browse'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Images, videos, text files — AI will extract insights about {selectedMember.firstName}
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-3">
                            <span className="flex items-center gap-1 text-[10px] text-slate-600"><Image className="w-3 h-3" /> Images</span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-600"><Video className="w-3 h-3" /> Videos</span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-600"><FileText className="w-3 h-3" /> Text</span>
                        </div>
                    </div>

                    {!permsGranted && (
                        <div className="bg-rose-500/[0.05] border border-rose-500/10 rounded-xl p-3">
                            <p className="text-xs text-rose-300">
                                <Shield className="w-3 h-3 inline mr-1" />
                                AI processing disabled for {selectedMember.firstName}. Enable "AI Access" to allow extraction.
                            </p>
                        </div>
                    )}

                    {/* Extraction results */}
                    {extraction && extraction.insights.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-semibold text-white">AI Extracted Insights</span>
                                    <span className="text-[10px] text-slate-500">{extraction.insights.length} found</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={approveAll} className="text-[10px] text-emerald-400 hover:underline">
                                        Approve All
                                    </button>
                                    <button onClick={commitApproved} disabled={approvedIds.size === 0} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${approvedIds.size > 0 ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/5 text-slate-600'}`}>
                                        Commit {approvedIds.size} →
                                    </button>
                                </div>
                            </div>

                            <p className="text-[11px] text-slate-500 italic">{extraction.raw_summary}</p>

                            <div className="space-y-1.5">
                                {extraction.insights.map(insight => {
                                    const style = CATEGORY_STYLE[insight.category] || CATEGORY_STYLE.other;
                                    const isApproved = approvedIds.has(insight.id);
                                    return (
                                        <div
                                            key={insight.id}
                                            onClick={() => toggleApproval(insight.id)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border ${isApproved
                                                    ? 'bg-emerald-500/[0.05] border-emerald-500/20'
                                                    : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isApproved ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
                                                {isApproved ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="text-[10px]">{style.icon}</span>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[9px] uppercase tracking-wider font-medium ${style.color}`}>{insight.category}</span>
                                                    <span className="text-[9px] text-slate-600">{(insight.confidence * 100).toFixed(0)}%</span>
                                                </div>
                                                <p className="text-xs text-white truncate">{insight.value}</p>
                                                {insight.source_snippet && (
                                                    <p className="text-[10px] text-slate-600 truncate mt-0.5">"{insight.source_snippet}"</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {extraction && extraction.insights.length === 0 && (
                        <div className="text-center text-sm text-slate-500 py-4">
                            No insights extracted. Try uploading a text file with more detail about {selectedMember.firstName}.
                        </div>
                    )}
                </div>
            ) : (
                /* ── Info Stack tab ──────────────────────────────── */
                <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-white">{selectedMember.firstName}'s Information Stack</span>
                        <button
                            onClick={() => setAddingManual(true)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-[10px] font-medium hover:bg-amber-500/20 transition"
                        >
                            <Plus className="w-3 h-3" /> Add Entry
                        </button>
                    </div>

                    {/* Add manual entry inline */}
                    {addingManual && (
                        <div className="bg-white/[0.02] border border-white/10 rounded-xl p-3 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={manualCategory}
                                    onChange={e => setManualCategory(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white"
                                >
                                    {Object.keys(CATEGORY_STYLE).map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <input
                                    placeholder="Label (optional)"
                                    value={manualLabel}
                                    onChange={e => setManualLabel(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white placeholder:text-slate-600"
                                />
                            </div>
                            <textarea
                                placeholder="Enter information…"
                                value={manualValue}
                                onChange={e => setManualValue(e.target.value)}
                                rows={2}
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white placeholder:text-slate-600 resize-none"
                            />
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setAddingManual(false)} className="text-[10px] text-slate-500 hover:text-white">Cancel</button>
                                <button onClick={addManualEntry} className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-medium hover:bg-amber-500/30">Save</button>
                            </div>
                        </div>
                    )}

                    {/* Entries list */}
                    {infoStack.length === 0 ? (
                        <div className="text-center text-sm text-slate-500 py-8">
                            No information yet. Upload media or add entries manually.
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {infoStack.map(entry => {
                                const style = CATEGORY_STYLE[entry.category] || CATEGORY_STYLE.other;
                                const isEditing = editingId === entry.id;
                                return (
                                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition group">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                                            <span className="text-xs">{style.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className={`text-[9px] uppercase tracking-wider font-medium ${style.color}`}>
                                                    {entry.label || entry.category}
                                                </span>
                                                <span className="text-[9px] text-slate-700">
                                                    {entry.source === 'ai_extracted' ? '🤖 AI' : entry.source === 'imported' ? '📥 Import' : '✏️ Manual'}
                                                </span>
                                                {entry.confidence < 1 && (
                                                    <span className="text-[9px] text-slate-700">{(entry.confidence * 100).toFixed(0)}%</span>
                                                )}
                                            </div>
                                            {isEditing ? (
                                                <div className="flex gap-1.5 mt-1">
                                                    <input
                                                        value={editValue}
                                                        onChange={e => setEditValue(e.target.value)}
                                                        className="flex-1 bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-xs text-white"
                                                        autoFocus
                                                        onKeyDown={e => e.key === 'Enter' && saveEdit(entry.id)}
                                                    />
                                                    <button onClick={() => saveEdit(entry.id)} className="p-1 rounded bg-emerald-500/20 text-emerald-400"><Check className="w-3 h-3" /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-1 rounded bg-white/5 text-slate-500"><X className="w-3 h-3" /></button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-300">{entry.value}</p>
                                            )}
                                        </div>
                                        {!isEditing && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                <button onClick={() => startEdit(entry)} className="p-1 rounded hover:bg-white/5 text-slate-600 hover:text-white"><Edit3 className="w-3 h-3" /></button>
                                                <button onClick={() => deleteEntry(entry.id)} className="p-1 rounded hover:bg-rose-500/10 text-slate-600 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                                                <button className="p-1 rounded hover:bg-white/5 text-slate-600 hover:text-white" title={entry.locked ? 'Unlock' : 'Lock'}>
                                                    {entry.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
