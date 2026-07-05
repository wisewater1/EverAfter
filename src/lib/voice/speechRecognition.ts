/**
 * Thin wrapper over the browser Web Speech API (SpeechRecognition).
 *
 * On-device speech to text: no server, no API key, works in Chrome, Edge,
 * and Safari. It streams interim results while the person speaks and a
 * final transcript when they stop. When the API is unavailable (some
 * mobile browsers), callers fall back to typing the transcript by hand,
 * so this never blocks the flow.
 */

type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string; message?: string }) => void) | null;
    onend: (() => void) | null;
};

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<{
        isFinal: boolean;
        0: { transcript: string; confidence: number };
        length: number;
    }>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported(): boolean {
    return getCtor() !== null;
}

export interface TranscriptionResult {
    transcript: string;
    confidence: number;
}

export interface TranscriberHandle {
    stop: () => void;
    abort: () => void;
}

export interface TranscriberCallbacks {
    onInterim?: (text: string) => void;
    onFinal: (result: TranscriptionResult) => void;
    onError?: (message: string) => void;
    onEnd?: () => void;
}

/**
 * Start live transcription. Returns a handle to stop it, or null if the
 * API is not available in this browser.
 */
export function startTranscription(callbacks: TranscriberCallbacks, lang = 'en-US'): TranscriberHandle | null {
    const Ctor = getCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = '';
    let bestConfidence = 0;

    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const alt = result[0];
            if (result.isFinal) {
                finalText += (finalText ? ' ' : '') + alt.transcript.trim();
                if (alt.confidence > bestConfidence) bestConfidence = alt.confidence;
            } else {
                interim += alt.transcript;
            }
        }
        if (interim && callbacks.onInterim) callbacks.onInterim(interim.trim());
    };

    recognition.onerror = (event) => {
        // 'no-speech' and 'aborted' are normal end conditions, not failures.
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        callbacks.onError?.(event.message || event.error || 'Speech recognition error');
    };

    recognition.onend = () => {
        callbacks.onFinal({ transcript: finalText.trim(), confidence: bestConfidence || 0.7 });
        callbacks.onEnd?.();
    };

    try {
        recognition.start();
    } catch {
        return null;
    }

    return {
        stop: () => {
            try { recognition.stop(); } catch { /* already stopped */ }
        },
        abort: () => {
            try { recognition.abort(); } catch { /* already stopped */ }
        },
    };
}
