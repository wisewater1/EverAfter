/**
 * PhoneHealthConnect — Unified phone health data connection hub
 * 
 * Integrates ALL free health data sources:
 * 
 * Browser-Native (no API keys):
 * - Web Bluetooth (BLE health devices)
 * - Camera PPG (heart rate from phone camera)
 * - Motion Tracker (step counting + GPS)
 * 
 * Free Public APIs (no cost):
 * - OpenFDA (medication info + interactions)
 * - Open Food Facts + USDA (nutrition tracking)
 * - Open-Meteo (weather, UV, air quality, pollen)
 * 
 * All data flows: Connector → healthDataService → Supabase → Delphi → St. Raphael
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { terraClient } from '../lib/terra-client';
import { storeHealthMetrics, type ExtractedHealthData } from '../lib/raphael/healthDataService';
import { bluetoothConnector, isBluetoothSupported, type BLEDevice, type BLEDeviceType } from '../lib/connectors/bluetooth-health';
import { cameraHeartRate, isCameraSupported } from '../lib/connectors/camera-heart-rate';
import { motionTracker, isMotionSupported, isGeolocationSupported } from '../lib/connectors/motion-tracker';
import { searchDrugs, type DrugInfo } from '../lib/connectors/openfda-service';
import { searchFood, logFoodIntake, type FoodItem } from '../lib/connectors/nutrition-service';
import { getEnvironmentSnapshot, storeEnvironmentData, type EnvironmentSnapshot } from '../lib/connectors/environment-health';
import {
    Smartphone, Watch, Activity, RefreshCw, CheckCircle,
    Wifi, WifiOff, Zap, Heart, Footprints, Moon, Droplets, Thermometer,
    TrendingUp, ArrowRight, Loader2, Shield, Clock, Database,
    Bluetooth, Camera, Wind, Pill, Apple, Search, X, Play, Square,
    Sun, CloudRain, Wheat, FlaskConical
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectorCategory = 'all' | 'device' | 'phone' | 'api' | 'environment';
type ActivePanel = null | 'bluetooth' | 'camera' | 'motion' | 'medication' | 'nutrition' | 'environment';

interface SyncResult {
    source: string;
    metrics_stored: number;
    timestamp: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PhoneHealthConnect() {
    const { user } = useAuth();
    const [filter, setFilter] = useState<ConnectorCategory>('all');
    const [activePanel, setActivePanel] = useState<ActivePanel>(null);
    const [recentSyncs, setRecentSyncs] = useState<SyncResult[]>([]);
    const [totalMetrics, setTotalMetrics] = useState(0);
    const [connectedCount, setConnectedCount] = useState(0);

    // Bluetooth state
    const [bleDevices, setBleDevices] = useState<BLEDevice[]>([]);
    const [bleScanning, setBleScanning] = useState(false);

    // Camera PPG state
    const [ppgMeasuring, setPpgMeasuring] = useState(false);
    const [ppgProgress, setPpgProgress] = useState({ elapsed: 0, total: 30, currentBPM: 0, signalStrength: 0 });
    const [ppgResult, setPpgResult] = useState<{ bpm: number; quality: string } | null>(null);

    // Motion state
    const [motionActive, setMotionActive] = useState(false);
    const [motionSteps, setMotionSteps] = useState(0);

    // Medication state
    const [drugQuery, setDrugQuery] = useState('');
    const [drugResults, setDrugResults] = useState<DrugInfo[]>([]);
    const [drugSearching, setDrugSearching] = useState(false);

    // Nutrition state
    const [foodQuery, setFoodQuery] = useState('');
    const [foodResults, setFoodResults] = useState<FoodItem[]>([]);
    const [foodSearching, setFoodSearching] = useState(false);

    // Environment state
    const [envData, setEnvData] = useState<EnvironmentSnapshot | null>(null);
    const [envLoading, setEnvLoading] = useState(false);

    useEffect(() => {
        fetchMetricsCount();
    }, [user?.id]);

    const fetchMetricsCount = useCallback(async () => {
        if (!user?.id) return;
        const { count } = await supabase.from('health_metrics').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
        setTotalMetrics(count || 0);
    }, [user?.id]);

    const addSync = (source: string, count: number) => {
        setRecentSyncs(prev => [{ source, metrics_stored: count, timestamp: new Date().toISOString() }, ...prev.slice(0, 7)]);
        setTotalMetrics(prev => prev + count);
    };

    // ─── Bluetooth handlers ──────────────────────────────────────────────────

    const handleBleScan = async (type: BLEDeviceType) => {
        setBleScanning(true);
        try {
            const device = await bluetoothConnector.scanAndConnect(type);
            if (device) {
                setBleDevices(bluetoothConnector.getDevices());
                setConnectedCount(prev => prev + 1);

                // Subscribe to readings
                bluetoothConnector.onReading(device.id, async (reading) => {
                    if (user?.id) {
                        const stored = await bluetoothConnector.storeReading(user.id, reading);
                        if (stored > 0) addSync(`BLE ${device.name}`, stored);
                    }
                });

                // Take initial reading
                if (user?.id) {
                    const reading = await bluetoothConnector.readOnce(device);
                    if (reading) {
                        const stored = await bluetoothConnector.storeReading(user.id, reading);
                        if (stored > 0) addSync(`BLE ${device.name}`, stored);
                    }
                }
            }
        } catch (error: any) {
            console.error('BLE scan error:', error);
        } finally {
            setBleScanning(false);
        }
    };

    // ─── Camera PPG handlers ─────────────────────────────────────────────────

    const handleCameraPPG = async () => {
        setPpgMeasuring(true);
        setPpgResult(null);
        try {
            const reading = await cameraHeartRate.startMeasurement(30, (progress) => {
                setPpgProgress(progress);
            });
            if (reading && reading.bpm > 0) {
                setPpgResult({ bpm: reading.bpm, quality: reading.signalQuality });
                if (user?.id) {
                    const stored = await cameraHeartRate.storeReading(user.id, reading);
                    if (stored > 0) addSync('Camera PPG', stored);
                }
            }
        } catch (error: any) {
            console.error('Camera PPG error:', error);
        } finally {
            setPpgMeasuring(false);
        }
    };

    const stopCameraPPG = () => {
        const result = cameraHeartRate.stopMeasurement();
        setPpgMeasuring(false);
        if (result && result.bpm > 0) {
            setPpgResult({ bpm: result.bpm, quality: result.signalQuality });
        }
    };

    // ─── Motion handlers ─────────────────────────────────────────────────────

    const handleStartMotion = async () => {
        const session = await motionTracker.startSession('walk');
        if (session) {
            setMotionActive(true);
            motionTracker.onStep((steps) => setMotionSteps(steps));
        }
    };

    const handleStopMotion = async () => {
        const session = await motionTracker.stopSession(user?.id);
        setMotionActive(false);
        if (session && session.steps > 0) {
            addSync('Motion Tracker', 3);
        }
        setMotionSteps(0);
    };

    // ─── Drug search handlers ────────────────────────────────────────────────

    const handleDrugSearch = async () => {
        if (!drugQuery.trim()) return;
        setDrugSearching(true);
        try {
            const results = await searchDrugs(drugQuery, 5);
            setDrugResults(results);
        } finally {
            setDrugSearching(false);
        }
    };

    // ─── Food search handlers ────────────────────────────────────────────────

    const handleFoodSearch = async () => {
        if (!foodQuery.trim()) return;
        setFoodSearching(true);
        try {
            const results = await searchFood(foodQuery, 8);
            setFoodResults(results);
        } finally {
            setFoodSearching(false);
        }
    };

    const handleLogFood = async (food: FoodItem) => {
        if (!user?.id) return;
        const result = await logFoodIntake(user.id, food);
        if (result.stored > 0) addSync(`Food: ${food.name}`, result.stored);
    };

    // ─── Environment handlers ────────────────────────────────────────────────

    const handleLoadEnvironment = async () => {
        setEnvLoading(true);
        try {
            const snapshot = await getEnvironmentSnapshot();
            setEnvData(snapshot);
            if (user?.id) {
                const stored = await storeEnvironmentData(user.id, snapshot);
                if (stored > 0) addSync('Environment', stored);
            }
        } catch (error: any) {
            console.error('Environment fetch error:', error);
        } finally {
            setEnvLoading(false);
        }
    };

    // ─── Connector definitions ───────────────────────────────────────────────

    const CONNECTORS = [
        {
            id: 'bluetooth', category: 'device' as const, name: 'Bluetooth Devices',
            icon: <Bluetooth className="w-6 h-6" />, color: 'from-blue-500 to-indigo-500',
            description: 'Connect BLE heart rate monitors, BP cuffs, scales, SpO2 sensors, glucose meters, thermometers',
            supported: isBluetoothSupported(),
            free: true,
        },
        {
            id: 'camera', category: 'phone' as const, name: 'Camera Heart Rate',
            icon: <Camera className="w-6 h-6" />, color: 'from-rose-500 to-pink-500',
            description: 'Measure pulse with your phone camera (PPG). Place finger over rear camera.',
            supported: isCameraSupported(),
            free: true,
        },
        {
            id: 'motion', category: 'phone' as const, name: 'Activity Tracker',
            icon: <Footprints className="w-6 h-6" />, color: 'from-green-500 to-emerald-500',
            description: 'Count steps via accelerometer and track distance with GPS. No wearable needed.',
            supported: isMotionSupported() || isGeolocationSupported(),
            free: true,
        },
        {
            id: 'medication', category: 'api' as const, name: 'Medication Lookup',
            icon: <Pill className="w-6 h-6" />, color: 'from-amber-500 to-orange-500',
            description: 'Search drug info, interactions, warnings, and recalls via OpenFDA (free).',
            supported: true,
            free: true,
        },
        {
            id: 'nutrition', category: 'api' as const, name: 'Nutrition Tracker',
            icon: <Apple className="w-6 h-6" />, color: 'from-lime-500 to-green-600',
            description: 'Search food nutrition data from Open Food Facts & USDA (free). Log meals.',
            supported: true,
            free: true,
        },
        {
            id: 'environment', category: 'environment' as const, name: 'Environmental Health',
            icon: <Sun className="w-6 h-6" />, color: 'from-cyan-500 to-sky-500',
            description: 'Real-time weather, UV index, air quality, and pollen from Open-Meteo (free).',
            supported: true,
            free: true,
        },
    ];

    const filtered = CONNECTORS.filter(c => filter === 'all' || c.category === filter);

    // ─── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-slate-900/80 to-zinc-900/80 border border-white/10 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 -m-12 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 -m-12 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">Connect Your Phone</h2>
                            <p className="text-zinc-400">Real health data — 100% free. No API keys, no subscriptions.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-center px-4">
                                <p className="text-2xl font-bold text-white">{connectedCount}</p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Connected</p>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center px-4">
                                <p className="text-2xl font-bold text-cyan-400">{totalMetrics}</p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500">Data Points</p>
                            </div>
                        </div>
                    </div>
                    {/* Pipeline */}
                    <div className="mt-5 flex items-center gap-2.5 px-4 py-3 bg-white/5 rounded-xl border border-white/5 flex-wrap">
                        <Smartphone className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <Database className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                        <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-xs text-zinc-500">Phone → Supabase → Delphi Trajectory → St. Raphael</span>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                {([
                    { id: 'all', label: 'All Sources' },
                    { id: 'device', label: '🔵 BLE Devices' },
                    { id: 'phone', label: '📱 Phone Sensors' },
                    { id: 'api', label: '🔗 Free APIs' },
                    { id: 'environment', label: '🌍 Environment' },
                ] as { id: ConnectorCategory; label: string }[]).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === tab.id
                            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                            : 'bg-white/5 text-zinc-500 border border-white/5 hover:text-zinc-300 hover:border-white/10'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Connector cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(connector => {
                    const isActive = activePanel === connector.id;
                    return (
                        <div
                            key={connector.id}
                            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isActive ? 'border-cyan-500/30 bg-zinc-900/60' : 'border-white/10 bg-zinc-900/40 hover:border-white/20'}`}
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${connector.color} text-white`}>
                                            {connector.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white text-sm">{connector.name}</h3>
                                            <span className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">Free</span>
                                        </div>
                                    </div>
                                    {!connector.supported && (
                                        <span className="text-[9px] uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Not Supported</span>
                                    )}
                                </div>
                                <p className="text-zinc-400 text-xs mb-4 leading-relaxed">{connector.description}</p>
                                <button
                                    onClick={() => setActivePanel(isActive ? null : connector.id as ActivePanel)}
                                    disabled={!connector.supported}
                                    className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${connector.supported
                                        ? isActive
                                            ? 'bg-white/10 border border-white/20 text-white'
                                            : 'bg-gradient-to-r ' + connector.color + ' text-white hover:shadow-lg'
                                        : 'bg-white/5 border border-white/5 text-zinc-600 cursor-not-allowed'
                                        }`}
                                >
                                    {isActive ? <><X className="w-4 h-4" /> Close</> : <><ArrowRight className="w-4 h-4" /> Open</>}
                                </button>
                            </div>

                            {/* Expanded panel */}
                            {isActive && (
                                <div className="border-t border-white/10 p-6 bg-black/20">
                                    {connector.id === 'bluetooth' && <BluetoothPanel bleDevices={bleDevices} bleScanning={bleScanning} onScan={handleBleScan} />}
                                    {connector.id === 'camera' && <CameraPanel measuring={ppgMeasuring} progress={ppgProgress} result={ppgResult} onStart={handleCameraPPG} onStop={stopCameraPPG} />}
                                    {connector.id === 'motion' && <MotionPanel active={motionActive} steps={motionSteps} onStart={handleStartMotion} onStop={handleStopMotion} />}
                                    {connector.id === 'medication' && <MedicationPanel query={drugQuery} setQuery={setDrugQuery} results={drugResults} searching={drugSearching} onSearch={handleDrugSearch} />}
                                    {connector.id === 'nutrition' && <NutritionPanel query={foodQuery} setQuery={setFoodQuery} results={foodResults} searching={foodSearching} onSearch={handleFoodSearch} onLog={handleLogFood} />}
                                    {connector.id === 'environment' && <EnvironmentPanel data={envData} loading={envLoading} onLoad={handleLoadEnvironment} />}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Recent sync activity */}
            {recentSyncs.length > 0 && (
                <div className="backdrop-blur-lg bg-zinc-900/40 border border-white/10 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest mb-4">Recent Activity</h3>
                    <div className="space-y-2">
                        {recentSyncs.map((sync, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    <span className="text-sm text-zinc-300">{sync.source}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-cyan-400 font-medium">{sync.metrics_stored} metrics</span>
                                    <span className="text-xs text-zinc-600">{new Date(sync.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-3 uppercase tracking-widest">All data synced to Delphi Health Trajectory automatically</p>
                </div>
            )}
        </div>
    );
}

// ─── Sub-panels ──────────────────────────────────────────────────────────────

function BluetoothPanel({ bleDevices, bleScanning, onScan }: {
    bleDevices: BLEDevice[]; bleScanning: boolean; onScan: (type: BLEDeviceType) => void;
}) {
    const deviceTypes: { type: BLEDeviceType; label: string; icon: React.ReactNode }[] = [
        { type: 'heart_rate', label: 'Heart Rate Monitor', icon: <Heart className="w-4 h-4" /> },
        { type: 'blood_pressure', label: 'Blood Pressure Cuff', icon: <Activity className="w-4 h-4" /> },
        { type: 'weight_scale', label: 'Smart Scale', icon: <TrendingUp className="w-4 h-4" /> },
        { type: 'pulse_oximeter', label: 'Pulse Oximeter (SpO2)', icon: <Wind className="w-4 h-4" /> },
        { type: 'glucose', label: 'Glucose Meter', icon: <Droplets className="w-4 h-4" /> },
        { type: 'thermometer', label: 'Thermometer', icon: <Thermometer className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-3">
            <p className="text-zinc-400 text-xs">Select a device type to scan. Make sure your device is powered on and in pairing mode.</p>
            {deviceTypes.map(dt => (
                <button
                    key={dt.type}
                    onClick={() => onScan(dt.type)}
                    disabled={bleScanning}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-500/10 hover:border-blue-500/20 transition-all text-left"
                >
                    <span className="text-blue-400">{dt.icon}</span>
                    <span className="text-sm text-zinc-300 flex-1">{dt.label}</span>
                    {bleScanning ? <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" /> : <Bluetooth className="w-4 h-4 text-zinc-600" />}
                </button>
            ))}
            {bleDevices.filter(d => d.connected).length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-emerald-400 font-medium mb-2">Connected Devices</p>
                    {bleDevices.filter(d => d.connected).map(device => (
                        <div key={device.id} className="flex items-center gap-2 py-1 text-xs text-zinc-400">
                            <Wifi className="w-3 h-3 text-emerald-400" />
                            {device.name}
                            {device.battery !== undefined && <span className="text-zinc-600">({device.battery}% battery)</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function CameraPanel({ measuring, progress, result, onStart, onStop }: {
    measuring: boolean; progress: { elapsed: number; total: number; currentBPM: number; signalStrength: number };
    result: { bpm: number; quality: string } | null; onStart: () => void; onStop: () => void;
}) {
    return (
        <div className="space-y-4">
            <p className="text-zinc-400 text-xs">Place your fingertip firmly over the rear camera (with flash). Keep still for 30 seconds.</p>
            {measuring ? (
                <div className="space-y-3">
                    <div className="w-full bg-white/10 rounded-full h-2">
                        <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full transition-all" style={{ width: `${(progress.elapsed / progress.total) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                        <span>{Math.round(progress.elapsed)}s / {progress.total}s</span>
                        <span>Signal: {(progress.signalStrength * 100).toFixed(0)}%</span>
                    </div>
                    {progress.currentBPM > 0 && (
                        <div className="text-center">
                            <span className="text-3xl font-bold text-rose-400">{progress.currentBPM}</span>
                            <span className="text-zinc-500 text-sm ml-2">BPM</span>
                        </div>
                    )}
                    <button onClick={onStop} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-zinc-300 flex items-center justify-center gap-2">
                        <Square className="w-4 h-4" /> Stop Early
                    </button>
                </div>
            ) : (
                <>
                    {result && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center mb-3">
                            <span className="text-4xl font-bold text-emerald-400">{result.bpm}</span>
                            <span className="text-zinc-400 text-sm ml-2">BPM</span>
                            <p className="text-xs text-zinc-500 mt-1">Quality: {result.quality}</p>
                        </div>
                    )}
                    <button onClick={onStart} className="w-full px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl text-sm text-white flex items-center justify-center gap-2 hover:shadow-lg">
                        <Camera className="w-4 h-4" /> Measure Heart Rate
                    </button>
                </>
            )}
        </div>
    );
}

function MotionPanel({ active, steps, onStart, onStop }: {
    active: boolean; steps: number; onStart: () => void; onStop: () => void;
}) {
    return (
        <div className="space-y-4">
            <p className="text-zinc-400 text-xs">Uses your phone's accelerometer and GPS. Place phone in pocket and walk normally.</p>
            {active ? (
                <div className="space-y-3">
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                        <Footprints className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
                        <span className="text-4xl font-bold text-emerald-400">{steps}</span>
                        <span className="text-zinc-400 text-sm ml-2">steps</span>
                        <p className="text-xs text-zinc-500 mt-1">Counting...</p>
                    </div>
                    <button onClick={onStop} className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-zinc-300 flex items-center justify-center gap-2">
                        <Square className="w-4 h-4" /> Stop & Save
                    </button>
                </div>
            ) : (
                <button onClick={onStart} className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-sm text-white flex items-center justify-center gap-2 hover:shadow-lg">
                    <Play className="w-4 h-4" /> Start Tracking
                </button>
            )}
        </div>
    );
}

function MedicationPanel({ query, setQuery, results, searching, onSearch }: {
    query: string; setQuery: (q: string) => void; results: DrugInfo[]; searching: boolean; onSearch: () => void;
}) {
    return (
        <div className="space-y-3">
            <p className="text-zinc-400 text-xs">Search FDA drug database — free, no key needed. Get warnings, interactions, and recalls.</p>
            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    placeholder="Search drug name..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-amber-500/30"
                />
                <button onClick={onSearch} disabled={searching} className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg text-sm">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
            </div>
            {results.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {results.map((drug, i) => (
                        <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-lg">
                            <p className="text-sm font-medium text-white">{drug.brand_name}</p>
                            <p className="text-xs text-zinc-500">{drug.generic_name} — {drug.manufacturer}</p>
                            <p className="text-xs text-amber-400/80 mt-1">{drug.purpose.slice(0, 120)}{drug.purpose.length > 120 ? '...' : ''}</p>
                            {drug.warnings && drug.warnings !== 'No warnings available' && (
                                <p className="text-xs text-rose-400/70 mt-1">⚠ {drug.warnings.slice(0, 100)}...</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function NutritionPanel({ query, setQuery, results, searching, onSearch, onLog }: {
    query: string; setQuery: (q: string) => void; results: FoodItem[]; searching: boolean;
    onSearch: () => void; onLog: (food: FoodItem) => void;
}) {
    return (
        <div className="space-y-3">
            <p className="text-zinc-400 text-xs">Search food nutrition from Open Food Facts (free). Log meals to track calories and macros.</p>
            <div className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    placeholder="Search food..."
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-lime-500/30"
                />
                <button onClick={onSearch} disabled={searching} className="px-4 py-2 bg-lime-500/20 border border-lime-500/30 text-lime-400 rounded-lg text-sm">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
            </div>
            {results.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {results.map((food, i) => (
                        <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{food.name}</p>
                                {food.brand && <p className="text-xs text-zinc-500">{food.brand}</p>}
                                <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                                    <span className="text-amber-400">{food.nutrition.calories} kcal</span>
                                    <span>P: {food.nutrition.protein}g</span>
                                    <span>C: {food.nutrition.carbohydrates}g</span>
                                    <span>F: {food.nutrition.fat}g</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onLog(food)}
                                className="px-3 py-1.5 bg-lime-500/20 border border-lime-500/30 text-lime-400 rounded-lg text-xs hover:bg-lime-500/30"
                            >
                                Log
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function EnvironmentPanel({ data, loading, onLoad }: {
    data: EnvironmentSnapshot | null; loading: boolean; onLoad: () => void;
}) {
    return (
        <div className="space-y-4">
            <p className="text-zinc-400 text-xs">Get real-time weather, UV, air quality, and pollen for your location via Open-Meteo (free).</p>
            <button
                onClick={onLoad}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 rounded-xl text-sm text-white flex items-center justify-center gap-2 hover:shadow-lg disabled:opacity-50"
            >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching...</> : <><RefreshCw className="w-4 h-4" /> Get Current Conditions</>}
            </button>
            {data && (
                <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Thermometer className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                            <p className="text-sm font-bold text-white">{data.weather.temperature}°F</p>
                            <p className="text-[10px] text-zinc-500">Temperature</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Sun className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                            <p className="text-sm font-bold text-white">{data.weather.uvIndex}</p>
                            <p className="text-[10px] text-zinc-500">UV Index</p>
                        </div>
                        <div className="p-2 bg-white/5 rounded-lg">
                            <Wind className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                            <p className="text-sm font-bold text-white">{data.airQuality.aqi}</p>
                            <p className="text-[10px] text-zinc-500">AQI</p>
                        </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-400">Environmental Health Score</span>
                            <span className={`text-sm font-bold ${data.overallHealthScore > 70 ? 'text-emerald-400' : data.overallHealthScore > 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                                {data.overallHealthScore}/100
                            </span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div
                                className={`h-1.5 rounded-full ${data.overallHealthScore > 70 ? 'bg-emerald-400' : data.overallHealthScore > 40 ? 'bg-amber-400' : 'bg-rose-400'}`}
                                style={{ width: `${data.overallHealthScore}%` }}
                            />
                        </div>
                    </div>
                    {data.weather.healthImpacts.length > 0 && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-zinc-400">Health Alerts</p>
                            {data.weather.healthImpacts.concat(data.airQuality.healthImpacts).slice(0, 3).map((impact, i) => (
                                <div key={i} className={`px-3 py-2 rounded-lg text-xs ${impact.level === 'severe' ? 'bg-rose-500/10 text-rose-400' : impact.level === 'high' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                    <p className="font-medium">{impact.factor}</p>
                                    <p className="text-zinc-500 mt-0.5">{impact.recommendation}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
