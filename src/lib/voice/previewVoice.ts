/**
 * Keyless voice preview via the browser's Web Speech API (speechSynthesis).
 *
 * This is NOT voice cloning: it speaks with a generic system voice so a family
 * member's words are audible everywhere (demo + real, no backend, no API key),
 * as a stand-in until a real voice model is trained on the backend. Callers must
 * label it honestly as a "preview voice".
 */

export function voicePreviewSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof SpeechSynthesisUtterance !== 'undefined'
    );
}

/** Deterministically pick a voice from a seed so a given person always sounds the same. */
function pickVoice(seed: string): SpeechSynthesisVoice | null {
    try {
        const voices = window.speechSynthesis.getVoices() || [];
        if (!voices.length) return null;
        const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
        const pool = en.length ? en : voices;
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        return pool[h % pool.length] || null;
    } catch {
        return null;
    }
}

export interface SpeakPreviewOptions {
    seed?: string;
    onEnd?: () => void;
}

/** Speak `text` with a generic voice. Returns false if the browser can't synthesize. */
export function speakPreview(text: string, opts: SpeakPreviewOptions = {}): boolean {
    if (!voicePreviewSupported() || !text.trim()) return false;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(opts.seed || text);
        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }
        utterance.rate = 0.95;
        utterance.pitch = 1;
        if (opts.onEnd) {
            utterance.onend = opts.onEnd;
            utterance.onerror = opts.onEnd;
        }
        window.speechSynthesis.speak(utterance);
        return true;
    } catch {
        return false;
    }
}

export function stopPreview(): void {
    try {
        window.speechSynthesis.cancel();
    } catch {
        /* ignore */
    }
}
