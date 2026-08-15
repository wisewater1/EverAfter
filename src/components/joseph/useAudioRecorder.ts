import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/ogg;codecs=opus',
  'audio/aac',
];

/**
 * Pick a MIME type the browser's MediaRecorder will accept. Returns null
 * when none of our preferred candidates work, so the caller should still
 * try constructing a MediaRecorder with NO mimeType option so the
 * browser picks its own default. (Safari iOS in particular often only
 * accepts the bare audio/mp4 with no codec hint.)
 */
function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return null;
}

export interface AudioRecorderState {
  isSupported: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  durationSeconds: number;
  audioBlob: Blob | null;
  previewUrl: string | null;
  error: string | null;
  /** Live microphone level 0..1 while recording, for a waveform/level meter. */
  inputLevel: number;
  /** True once any real audio signal has been detected during a recording. */
  hasSignal: boolean;
  /** Live microphone permission state. */
  permission: 'unknown' | 'granted' | 'denied';
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderState {
  const mimeType = useMemo(() => getSupportedMimeType(), []);
  // Support requires only the APIs themselves. mimeType being null is
  // not a blocker; the recorder falls back to the browser-picked
  // default in startRecording, which is correct behavior on Safari iOS
  // where MediaRecorder works but none of our preferred candidates are
  // reported as supported.
  // getUserMedia is checked with typeof rather than for truthiness. lib.dom
  // declares it as always present on MediaDevices, so a bare truthiness test is
  // reported as a condition that is always true. The check is still worth
  // making: older and locked-down browsers really do omit it, which is the
  // whole point of the guard.
  const isSupported = Boolean(
    typeof window !== 'undefined'
    && typeof navigator.mediaDevices?.getUserMedia === 'function'
    && typeof MediaRecorder !== 'undefined',
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputLevel, setInputLevel] = useState(0);
  const [hasSignal, setHasSignal] = useState(false);
  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  const stopMetering = useCallback(() => {
    if (levelRafRef.current !== null) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setInputLevel(0);
  }, []);

  const startMetering = useCallback((stream: MediaStream) => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;
      const buffer = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buffer);
        // RMS around the 128 midpoint -> 0..1 level.
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(1, rms * 2.4);
        setInputLevel(level);
        if (level > 0.06) setHasSignal(true);
        levelRafRef.current = requestAnimationFrame(tick);
      };
      levelRafRef.current = requestAnimationFrame(tick);
    } catch {
      // Metering is a nicety; recording still works without it.
    }
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopMetering();
  }, [stopMetering]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    setDurationSeconds(0);
    setError(null);
    setHasSignal(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    setIsProcessing(true);

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        // mimeType may be null (Safari iOS path). When that happens the
        // browser still attached a default codec, read it back from the
        // MediaRecorder instance and fall back to a generic webm guess
        // only as a final safety net.
        const blobType = mimeType || recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        if (blob.size === 0) {
          // No chunks captured (instant start/stop, denied mic, silent device).
          // Leave audioBlob null so the upload guards block an empty clip.
          setError('No audio was captured. Check microphone permissions and try again.');
          chunksRef.current = [];
          startedAtRef.current = null;
          mediaRecorderRef.current = null;
          setIsRecording(false);
          setIsProcessing(false);
          clearTimer();
          stopTracks();
          resolve();
          return;
        }
        const stoppedAt = Date.now();
        const startedAt = startedAtRef.current ?? stoppedAt;
        const seconds = Math.max(1, Math.round((stoppedAt - startedAt) / 1000));

        setAudioBlob(blob);
        setDurationSeconds(seconds);
        setPreviewUrl((currentUrl) => {
          if (currentUrl) {
            URL.revokeObjectURL(currentUrl);
          }
          return URL.createObjectURL(blob);
        });

        chunksRef.current = [];
        startedAtRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        setIsProcessing(false);
        clearTimer();
        stopTracks();
        resolve();
      };

      recorder.stop();
    });
  }, [clearTimer, mimeType, stopTracks]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.');
      return;
    }

    clearRecording();
    setIsProcessing(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermission('granted');
      setHasSignal(false);
      startMetering(stream);
      chunksRef.current = [];

      // Only pass the mimeType option when we know one works. Passing
      // a non-supported value (or an empty string) throws on Safari.
      // Letting the browser pick the default is the right move when no
      // candidate from PREFERRED_MIME_TYPES was reported as supported.
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setDurationSeconds(0);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError('Microphone recording failed. Try again.');
        setIsRecording(false);
        setIsProcessing(false);
        clearTimer();
        stopTracks();
      };

      timerRef.current = window.setInterval(() => {
        if (startedAtRef.current) {
          setDurationSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
        }
      }, 250);

      recorder.start();
      setIsRecording(true);
      setIsProcessing(false);
    } catch (recordError) {
      const message = recordError instanceof Error ? recordError.message : 'Microphone access was denied.';
      const denied = recordError instanceof DOMException
        && (recordError.name === 'NotAllowedError' || recordError.name === 'SecurityError');
      setPermission(denied ? 'denied' : 'unknown');
      setError(denied
        ? 'Microphone access was declined. Allow microphone access for this site in your browser settings, then try again.'
        : message);
      setIsRecording(false);
      setIsProcessing(false);
      clearTimer();
      stopTracks();
    }
  }, [clearRecording, clearTimer, isSupported, mimeType, startMetering, stopTracks]);

  useEffect(() => {
    return () => {
      clearTimer();
      stopTracks();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [clearTimer, previewUrl, stopTracks]);

  return {
    isSupported,
    isRecording,
    isProcessing,
    durationSeconds,
    audioBlob,
    previewUrl,
    error,
    inputLevel,
    hasSignal,
    permission,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
