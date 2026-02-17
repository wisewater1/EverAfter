/**
 * Motion & Activity Tracker
 * 
 * Uses browser DeviceMotion API for step counting via accelerometer,
 * and Geolocation API for GPS distance tracking. All free, no API keys.
 */

import { storeHealthMetrics, type ExtractedHealthData } from '../raphael/healthDataService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ActivitySession {
    id: string;
    type: 'walk' | 'run' | 'general';
    startedAt: Date;
    endedAt?: Date;
    steps: number;
    distance: number; // meters
    calories: number;
    positions: GeolocationPosition[];
    isActive: boolean;
}

type StepCallback = (steps: number) => void;

// ─── Check support ───────────────────────────────────────────────────────────

export function isMotionSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
}

export function isGeolocationSupported(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

// ─── MotionTracker class ─────────────────────────────────────────────────────

export class MotionTracker {
    private session: ActivitySession | null = null;
    private stepCount = 0;
    private lastAccelMagnitude = 0;
    private stepThreshold = 1.2; // m/s² — threshold for step detection
    private lastStepTime = 0;
    private minStepInterval = 250; // ms — minimum time between steps
    private listeners: StepCallback[] = [];
    private watchId: number | null = null;
    private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

    // ─── Accelerometer step counting ─────────────────────────────────────────

    /**
     * Request permission and start step counting
     */
    async startStepCounting(): Promise<boolean> {
        if (!isMotionSupported()) {
            console.warn('DeviceMotion API not supported');
            return false;
        }

        // iOS 13+ requires permission
        if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceMotionEvent as any).requestPermission();
                if (permission !== 'granted') {
                    console.warn('Motion permission denied');
                    return false;
                }
            } catch {
                console.warn('Motion permission request failed');
                return false;
            }
        }

        this.stepCount = 0;
        this.lastStepTime = 0;
        this.lastAccelMagnitude = 0;

        this.motionHandler = (event: DeviceMotionEvent) => {
            this.processMotion(event);
        };

        window.addEventListener('devicemotion', this.motionHandler);
        return true;
    }

    /**
     * Stop step counting
     */
    stopStepCounting(): number {
        if (this.motionHandler) {
            window.removeEventListener('devicemotion', this.motionHandler);
            this.motionHandler = null;
        }
        return this.stepCount;
    }

    /**
     * Process accelerometer data for step detection
     * Uses peak detection on acceleration magnitude
     */
    private processMotion(event: DeviceMotionEvent): void {
        const accel = event.accelerationIncludingGravity;
        if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

        // Calculate magnitude of acceleration vector
        const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);

        // Remove gravity (~9.8 m/s²) to get dynamic acceleration
        const dynamicAccel = Math.abs(magnitude - 9.81);

        const now = Date.now();

        // Step detection: look for peak above threshold with minimum interval
        if (
            dynamicAccel > this.stepThreshold &&
            this.lastAccelMagnitude <= this.stepThreshold &&
            (now - this.lastStepTime) > this.minStepInterval
        ) {
            this.stepCount++;
            this.lastStepTime = now;

            // Notify listeners
            this.listeners.forEach(cb => cb(this.stepCount));
        }

        this.lastAccelMagnitude = dynamicAccel;
    }

    // ─── GPS activity tracking ───────────────────────────────────────────────

    /**
     * Start a GPS-tracked activity session
     */
    async startSession(type: 'walk' | 'run' | 'general' = 'walk'): Promise<ActivitySession | null> {
        if (!isGeolocationSupported()) {
            console.warn('Geolocation not supported');
            return null;
        }

        // Also start step counting
        await this.startStepCounting();

        this.session = {
            id: Date.now().toString(),
            type,
            startedAt: new Date(),
            steps: 0,
            distance: 0,
            calories: 0,
            positions: [],
            isActive: true,
        };

        // Start watching position
        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.handlePosition(position),
            (error) => console.warn('Geolocation error:', error.message),
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            }
        );

        return this.session;
    }

    /**
     * Stop the current session and store results
     */
    async stopSession(userId?: string): Promise<ActivitySession | null> {
        if (!this.session) return null;

        this.session.isActive = false;
        this.session.endedAt = new Date();
        this.session.steps = this.stepCount;
        this.session.calories = this.estimateCalories(this.stepCount, this.session.distance, this.session.type);

        // Stop GPS
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        // Stop step counting
        this.stopStepCounting();

        // Store to Delphi if userId provided
        if (userId) {
            await this.storeSessionData(userId, this.session);
        }

        const result = { ...this.session };
        this.session = null;
        return result;
    }

    /**
     * Get current session state
     */
    getCurrentSession(): ActivitySession | null {
        if (this.session) {
            this.session.steps = this.stepCount;
        }
        return this.session;
    }

    /**
     * Subscribe to step updates
     */
    onStep(callback: StepCallback): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    // ─── Internal helpers ────────────────────────────────────────────────────

    private handlePosition(position: GeolocationPosition): void {
        if (!this.session) return;

        const { positions } = this.session;

        if (positions.length > 0) {
            const lastPos = positions[positions.length - 1];
            const dist = this.haversineDistance(
                lastPos.coords.latitude, lastPos.coords.longitude,
                position.coords.latitude, position.coords.longitude
            );
            this.session.distance += dist;
        }

        positions.push(position);
    }

    /**
     * Haversine formula for distance between two GPS coordinates
     */
    private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * Estimate calories from steps, distance, and activity type
     * Uses MET-based estimation
     */
    private estimateCalories(steps: number, distanceM: number, type: 'walk' | 'run' | 'general'): number {
        const MET = type === 'run' ? 8.0 : type === 'walk' ? 3.5 : 4.0;
        const durationHours = distanceM > 0
            ? (distanceM / (type === 'run' ? 2778 : 1389)) / 3600 // speed in m/s
            : steps / (type === 'run' ? 180 : 120) / 60; // cadence estimate
        const weight = 70; // default weight in kg
        return Math.round(MET * weight * durationHours);
    }

    /**
     * Store session data to health_metrics via Delphi
     */
    private async storeSessionData(userId: string, session: ActivitySession): Promise<void> {
        const dataPoints: ExtractedHealthData[] = [];

        if (session.steps > 0) {
            dataPoints.push({
                metric_type: 'steps',
                value: session.steps,
                unit: 'steps',
                raw_text: `Activity session: ${session.steps} steps`,
            });
        }

        if (session.distance > 0) {
            dataPoints.push({
                metric_type: 'distance',
                value: Math.round(session.distance) / 1000,
                unit: 'km',
                raw_text: `Activity distance: ${(session.distance / 1000).toFixed(2)} km`,
            });
        }

        if (session.calories > 0) {
            dataPoints.push({
                metric_type: 'calories_burned',
                value: session.calories,
                unit: 'kcal',
                raw_text: `Activity calories: ${session.calories} kcal`,
            });
        }

        if (dataPoints.length > 0) {
            await storeHealthMetrics(userId, dataPoints, 'motion_tracker');
        }
    }
}

export const motionTracker = new MotionTracker();
