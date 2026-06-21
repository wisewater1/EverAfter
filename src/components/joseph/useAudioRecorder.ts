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
 * when none of our preferred candidates work — the caller should still
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
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderState {
  const mimeType = useMemo(() => getSupportedMimeType(), []);
  // Support requires only the APIs themselves. mimeType being null is
  // not a blocker — the recorder falls back to the browser-picked
  // default in startRecording, which is correct behavior on Safari iOS
  // where MediaRecorder works but none of our preferred candidates are
  // reported as supported.
  const isSupported = Boolean(
    typeof window !== 'undefined'
    && navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined',
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

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
        // browser still attached a default codec — read it back from the
        // MediaRecorder instance and fall back to a generic webm guess
        // only as a final safety net.
        const blobType = mimeType || recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
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
      setError(recordError instanceof Error ? recordError.message : 'Microphone access was denied.');
      setIsRecording(false);
      setIsProcessing(false);
      clearTimer();
      stopTracks();
    }
  }, [clearRecording, clearTimer, isSupported, mimeType, stopTracks]);

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
    startRecording,
    stopRecording,
    clearRecording,
  };
}
