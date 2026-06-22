import { useCallback, useEffect, useState } from 'react';
import { Mic, Square, Trash2, Volume2, Sparkles, Info, Loader2, ExternalLink } from 'lucide-react';
import { useAudioRecorder } from './useAudioRecorder';
import {
    voiceStoreSupported,
    putVoiceClip,
    listVoiceClips,
    deleteVoiceClip,
    type VoiceClip,
} from '../../lib/voice/voiceClipStore';

interface Props {
    familyMemberId: string;
    familyMemberName: string;
}

/**
 * Keyless voice pack: record a person reading a line and replay their REAL
 * voice, stored on-device (IndexedDB). Works in demo and signed-out — no
 * backend, no key. Also surfaces the path to enable full (arbitrary-text)
 * cloning, which is a configured backend service.
 */
export default function KeylessVoicePack({ familyMemberId, familyMemberName }: Props) {
    const recorder = useAudioRecorder();
    const [clips, setClips] = useState<VoiceClip[]>([]);
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [showCloneInfo, setShowCloneInfo] = useState(false);
    const first = familyMemberName.split(' ')[0] || 'them';
    const supported = voiceStoreSupported() && recorder.isSupported;

    const refresh = useCallback(async () => {
        if (!voiceStoreSupported()) return;
        try {
            const list = await listVoiceClips(familyMemberId);
            setUrls((prev) => {
                Object.values(prev).forEach((u) => URL.revokeObjectURL(u));
                const next: Record<string, string> = {};
                list.forEach((c) => { next[c.id] = URL.createObjectURL(c.blob); });
                return next;
            });
            setClips(list);
        } catch { /* ignore */ }
    }, [familyMemberId]);

    useEffect(() => {
        void refresh();
        return () => { setUrls((prev) => { Object.values(prev).forEach((u) => URL.revokeObjectURL(u)); return {}; }); };
    }, [refresh]);

    const save = async () => {
        if (!recorder.audioBlob) return;
        setSaving(true);
        try {
            await putVoiceClip({
                familyMemberId,
                blob: recorder.audioBlob,
                mime: recorder.audioBlob.type || 'audio/webm',
                durationSeconds: recorder.durationSeconds,
                prompt: `Recorded for ${familyMemberName}`,
            });
            recorder.clearRecording();
            await refresh();
        } finally {
            setSaving(false);
        }
    };

    if (!supported) {
        return <p className="text-xs text-slate-500">Voice recording isn't supported in this browser.</p>;
    }

    return (
        <div className="space-y-3 rounded-2xl border border-cyan-500/10 bg-cyan-500/[0.03] p-4">
            <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-cyan-300" />
                <p className="text-sm font-semibold text-white">{first}'s voice pack</p>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-slate-400">on this device</span>
            </div>
            <p className="text-xs text-slate-400">
                Record {first} reading a line — it's saved privately on your device and you can play their real voice back anytime. No account, no upload.
            </p>

            <div className="flex flex-wrap items-center gap-2">
                {!recorder.isRecording ? (
                    <button onClick={() => void recorder.startRecording()} disabled={recorder.isProcessing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/25 disabled:opacity-50">
                        {recorder.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Record
                    </button>
                ) : (
                    <button onClick={() => void recorder.stopRecording()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25 motion-safe:animate-pulse">
                        <Square className="h-4 w-4" /> Stop
                    </button>
                )}
                {recorder.audioBlob && !recorder.isRecording && (
                    <button onClick={() => void save()} disabled={saving}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Save to voice pack
                    </button>
                )}
            </div>

            {recorder.error && <p className="text-xs text-rose-300">{recorder.error}</p>}
            {recorder.previewUrl && !recorder.isRecording && (
                <div>
                    <audio controls src={recorder.previewUrl} className="w-full" />
                    <p className="mt-1 text-[10px] text-slate-500">Preview · {Math.round(recorder.durationSeconds)}s — not yet saved</p>
                </div>
            )}

            {clips.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">Saved recordings ({clips.length}) — their real voice</p>
                    {clips.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/20 p-2">
                            <Volume2 className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                            <audio controls src={urls[c.id]} className="h-8 min-w-0 flex-1" />
                            <button onClick={() => void deleteVoiceClip(c.id).then(refresh)} aria-label="Delete recording"
                                className="flex-shrink-0 rounded p-1 text-slate-500 transition hover:text-rose-300">
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <button onClick={() => setShowCloneInfo((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 transition hover:text-amber-200">
                <Sparkles className="h-3.5 w-3.5" /> Enable full voice cloning (have {first} speak any words)
            </button>
            {showCloneInfo && (
                <div className="space-y-1.5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-slate-300">
                    <p className="flex items-center gap-1.5 font-medium text-amber-200"><Info className="h-3.5 w-3.5" /> Full cloning is a backend service</p>
                    <p>Replaying recordings works fully on your device. To have {first}'s voice speak <em>any</em> new sentence, EverAfter trains a voice model on a configured provider.</p>
                    <p>Turn it on: add your provider API key to the EverAfter voice service, then sign in to record consented samples and train the model.</p>
                    <a href="https://elevenlabs.io/voice-cloning" target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-amber-300 underline transition hover:text-amber-200">
                        Set up a voice provider <ExternalLink className="h-3 w-3" />
                    </a>
                </div>
            )}
        </div>
    );
}
