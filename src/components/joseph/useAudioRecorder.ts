import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return '';
  }

  for (const candidate of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
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
  const isSupported = Boolean(
    typeof window !== 'undefined'
    && navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined'
    && mimeType,
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
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
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

      const recorder = new MediaRecorder(stream, { mimeType });
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
