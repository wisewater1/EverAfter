/**
 * Camera-Based Heart Rate (PPG — Photoplethysmography)
 * 
 * Uses the phone's rear camera + flashlight to detect pulse by measuring
 * red channel intensity changes in the fingertip blood flow.
 * 
 * How it works:
 * 1. User places finger over camera with flash on
 * 2. Camera captures video frames
 * 3. Red channel average intensity is extracted per frame
 * 4. Signal is filtered to remove noise
 * 5. Peaks are detected to count heartbeats
 * 6. BPM is calculated from peak intervals
 * 
 * This is the same principle used by medical pulse oximeters.
 * 100% free, runs entirely in the browser.
 */

import { storeHealthMetrics, type ExtractedHealthData } from '../raphael/healthDataService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PPGReading {
    bpm: number;
    confidence: number; // 0-1, based on signal quality
    duration: number; // seconds of measurement
    signalQuality: 'excellent' | 'good' | 'fair' | 'poor';
    rawSignal: number[]; // normalized red channel values
    timestamp: Date;
}

type PPGProgressCallback = (progress: {
    elapsed: number;
    total: number;
    currentBPM: number;
    signalStrength: number;
}) => void;

// ─── Check support ───────────────────────────────────────────────────────────

export function isCameraSupported(): boolean {
    return typeof navigator !== 'undefined' &&
        'mediaDevices' in navigator &&
        'getUserMedia' in navigator.mediaDevices;
}

// ─── CameraHeartRate class ───────────────────────────────────────────────────

export class CameraHeartRate {
    private stream: MediaStream | null = null;
    private video: HTMLVideoElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private animationFrame: number | null = null;
    private signal: number[] = [];
    private timestamps: number[] = [];
    private measuring = false;
    private measureDuration = 30; // seconds

    /**
     * Start measuring heart rate from camera
     * User should place fingertip over rear camera
     */
    async startMeasurement(
        durationSeconds = 30,
        onProgress?: PPGProgressCallback
    ): Promise<PPGReading | null> {
        if (!isCameraSupported()) {
            throw new Error('Camera not supported in this browser');
        }

        this.measureDuration = durationSeconds;
        this.signal = [];
        this.timestamps = [];
        this.measuring = true;

        try {
            // Request rear camera with flash/torch
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                },
            });

            // Try to turn on flash/torch
            const track = this.stream.getVideoTracks()[0];
            try {
                await track.applyConstraints({
                    // @ts-ignore — torch is a valid constraint but not in TS types
                    advanced: [{ torch: true }],
                });
            } catch {
                // Flash not available — still works but with lower quality
                console.warn('Camera flash not available. Signal quality may be reduced.');
            }

            // Create hidden video element
            this.video = document.createElement('video');
            this.video.srcObject = this.stream;
            this.video.setAttribute('playsinline', 'true');
            await this.video.play();

            // Create canvas for frame analysis
            this.canvas = document.createElement('canvas');
            this.canvas.width = 64; // Small for performance
            this.canvas.height = 48;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

            // Collect frames
            return await new Promise<PPGReading | null>((resolve) => {
                const startTime = Date.now();

                const processFrame = () => {
                    if (!this.measuring || !this.video || !this.ctx || !this.canvas) {
                        resolve(null);
                        return;
                    }

                    const elapsed = (Date.now() - startTime) / 1000;

                    if (elapsed >= this.measureDuration) {
                        this.measuring = false;
                        const result = this.analyzeSignal();
                        this.cleanup();
                        resolve(result);
                        return;
                    }

                    // Draw frame to canvas
                    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

                    // Extract red channel average
                    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    const redAvg = this.extractRedChannel(imageData);

                    this.signal.push(redAvg);
                    this.timestamps.push(Date.now());

                    // Progress callback
                    if (onProgress && this.signal.length > 30) {
                        const currentBPM = this.quickBPMEstimate();
                        const signalStrength = this.getSignalStrength();
                        onProgress({
                            elapsed,
                            total: this.measureDuration,
                            currentBPM,
                            signalStrength,
                        });
                    }

                    this.animationFrame = requestAnimationFrame(processFrame);
                };

                this.animationFrame = requestAnimationFrame(processFrame);
            });
        } catch (error) {
            this.cleanup();
            throw error;
        }
    }

    /**
     * Stop measurement early
     */
    stopMeasurement(): PPGReading | null {
        this.measuring = false;
        const result = this.signal.length > 60 ? this.analyzeSignal() : null;
        this.cleanup();
        return result;
    }

    /**
     * Store a PPG reading to Delphi
     */
    async storeReading(userId: string, reading: PPGReading): Promise<number> {
        const dataPoints: ExtractedHealthData[] = [{
            metric_type: 'heart_rate',
            value: reading.bpm,
            unit: 'bpm',
            raw_text: `Camera PPG: ${reading.bpm} bpm (${reading.signalQuality} quality)`,
        }];

        const result = await storeHealthMetrics(userId, dataPoints, 'camera_ppg');
        return result.stored;
    }

    /**
     * Check if currently measuring
     */
    isMeasuring(): boolean {
        return this.measuring;
    }

    // ─── Signal processing ───────────────────────────────────────────────────

    /**
     * Extract average red channel intensity from an image frame
     */
    private extractRedChannel(imageData: ImageData): number {
        const data = imageData.data;
        let redSum = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
            redSum += data[i]; // Red channel
            count++;
        }

        return redSum / count;
    }

    /**
     * Full signal analysis to determine BPM
     */
    private analyzeSignal(): PPGReading {
        // 1. Bandpass filter (0.7 - 3.5 Hz → 42 - 210 BPM)
        const filtered = this.bandpassFilter(this.signal, 0.7, 3.5);

        // 2. Normalize
        const normalized = this.normalize(filtered);

        // 3. Peak detection
        const peaks = this.detectPeaks(normalized);

        // 4. Calculate BPM from peak intervals
        const bpm = this.calculateBPM(peaks);

        // 5. Assess signal quality
        const confidence = this.assessConfidence(peaks, filtered);
        const signalQuality = confidence > 0.8 ? 'excellent' :
            confidence > 0.6 ? 'good' :
                confidence > 0.4 ? 'fair' : 'poor';

        return {
            bpm: Math.round(bpm),
            confidence,
            duration: this.measureDuration,
            signalQuality,
            rawSignal: normalized,
            timestamp: new Date(),
        };
    }

    /**
     * Simple moving average bandpass filter
     */
    private bandpassFilter(signal: number[], lowHz: number, highHz: number): number[] {
        if (signal.length < 10) return signal;

        // Estimate sample rate from timestamps
        const dt = (this.timestamps[this.timestamps.length - 1] - this.timestamps[0]) / (this.timestamps.length - 1);
        const sampleRate = 1000 / dt;

        // Low-pass: moving average with window based on highHz
        const lowPassWindow = Math.max(2, Math.round(sampleRate / highHz / 2));
        const lowPassed = this.movingAverage(signal, lowPassWindow);

        // High-pass: subtract larger moving average
        const highPassWindow = Math.max(3, Math.round(sampleRate / lowHz));
        const trend = this.movingAverage(lowPassed, highPassWindow);

        return lowPassed.map((v, i) => v - (trend[i] || 0));
    }

    /**
     * Moving average filter
     */
    private movingAverage(signal: number[], window: number): number[] {
        const result: number[] = [];
        for (let i = 0; i < signal.length; i++) {
            const start = Math.max(0, i - Math.floor(window / 2));
            const end = Math.min(signal.length, i + Math.ceil(window / 2));
            let sum = 0;
            for (let j = start; j < end; j++) sum += signal[j];
            result.push(sum / (end - start));
        }
        return result;
    }

    /**
     * Normalize signal to 0-1 range
     */
    private normalize(signal: number[]): number[] {
        const min = Math.min(...signal);
        const max = Math.max(...signal);
        const range = max - min || 1;
        return signal.map(v => (v - min) / range);
    }

    /**
     * Detect peaks in normalized signal
     */
    private detectPeaks(signal: number[]): number[] {
        const peaks: number[] = [];
        const threshold = 0.5; // Above average

        for (let i = 2; i < signal.length - 2; i++) {
            if (
                signal[i] > threshold &&
                signal[i] > signal[i - 1] &&
                signal[i] > signal[i + 1] &&
                signal[i] >= signal[i - 2] &&
                signal[i] >= signal[i + 2]
            ) {
                // Minimum distance between peaks (based on max 210 BPM)
                if (peaks.length === 0 || (i - peaks[peaks.length - 1]) > 5) {
                    peaks.push(i);
                }
            }
        }

        return peaks;
    }

    /**
     * Calculate BPM from peak indices
     */
    private calculateBPM(peaks: number[]): number {
        if (peaks.length < 2) return 0;

        // Use timestamps for accurate interval calculation
        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) {
            const t1 = this.timestamps[peaks[i - 1]] || 0;
            const t2 = this.timestamps[peaks[i]] || 0;
            if (t1 && t2) {
                const intervalMs = t2 - t1;
                // Only accept physiologically reasonable intervals (30-200 BPM → 300-2000ms)
                if (intervalMs >= 300 && intervalMs <= 2000) {
                    intervals.push(intervalMs);
                }
            }
        }

        if (intervals.length === 0) return 0;

        // Use median interval for robustness
        intervals.sort((a, b) => a - b);
        const medianInterval = intervals[Math.floor(intervals.length / 2)];

        return 60000 / medianInterval;
    }

    /**
     * Assess confidence/quality of the measurement
     */
    private assessConfidence(peaks: number[], signal: number[]): number {
        if (peaks.length < 3) return 0;

        // Factor 1: Signal variance (higher = more finger detected)
        const variance = this.variance(signal);
        const varianceScore = Math.min(variance / 50, 1);

        // Factor 2: Peak regularity (consistent intervals = higher confidence)
        const intervals: number[] = [];
        for (let i = 1; i < peaks.length; i++) {
            intervals.push(peaks[i] - peaks[i - 1]);
        }
        const intervalVariance = this.variance(intervals);
        const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const cv = Math.sqrt(intervalVariance) / (meanInterval || 1); // coefficient of variation
        const regularityScore = Math.max(0, 1 - cv);

        // Factor 3: Enough data
        const dataScore = Math.min(peaks.length / 10, 1);

        return (varianceScore * 0.3 + regularityScore * 0.5 + dataScore * 0.2);
    }

    /**
     * Quick BPM estimate for progress callback
     */
    private quickBPMEstimate(): number {
        if (this.signal.length < 30) return 0;

        const recentSignal = this.signal.slice(-90); // Last ~3 seconds
        const recentTimestamps = this.timestamps.slice(-90);

        const filtered = this.bandpassFilter(recentSignal, 0.7, 3.5);
        const normalized = this.normalize(filtered);
        const peaks = this.detectPeaks(normalized);

        // Override timestamps for quick estimate
        const savedTimestamps = this.timestamps;
        this.timestamps = recentTimestamps;
        const bpm = this.calculateBPM(peaks);
        this.timestamps = savedTimestamps;

        return Math.round(bpm);
    }

    /**
     * Get current signal strength (0-1)
     */
    private getSignalStrength(): number {
        if (this.signal.length < 10) return 0;
        const recent = this.signal.slice(-30);
        const v = this.variance(recent);
        return Math.min(v / 100, 1);
    }

    /**
     * Calculate variance of an array
     */
    private variance(arr: number[]): number {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
    }

    // ─── Cleanup ─────────────────────────────────────────────────────────────

    private cleanup(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        if (this.video) {
            this.video.pause();
            this.video.srcObject = null;
            this.video = null;
        }
        this.canvas = null;
        this.ctx = null;
    }
}

export const cameraHeartRate = new CameraHeartRate();
