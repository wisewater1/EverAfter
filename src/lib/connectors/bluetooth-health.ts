/**
 * Web Bluetooth Health Connector
 * 
 * Connects to real BLE health devices using the Web Bluetooth API.
 * Supports standard GATT health services:
 * - Heart Rate (0x180D)
 * - Blood Pressure (0x1810)
 * - Weight Scale (0x181D)
 * - Pulse Oximeter (0x1822)
 * - Glucose (0x1808)
 * - Health Thermometer (0x1809)
 */

import { storeHealthMetrics, type ExtractedHealthData } from '../raphael/healthDataService';

// ─── BLE GATT service UUIDs ──────────────────────────────────────────────────

const BLE_SERVICES = {
    HEART_RATE: 0x180D,
    BLOOD_PRESSURE: 0x1810,
    WEIGHT_SCALE: 0x181D,
    PULSE_OXIMETER: 0x1822,
    GLUCOSE: 0x1808,
    HEALTH_THERMOMETER: 0x1809,
    BATTERY: 0x180F,
} as const;

const BLE_CHARACTERISTICS = {
    HEART_RATE_MEASUREMENT: 0x2A37,
    BLOOD_PRESSURE_MEASUREMENT: 0x2A35,
    WEIGHT_MEASUREMENT: 0x2A9D,
    PLX_CONTINUOUS: 0x2A5F,
    PLX_SPOT_CHECK: 0x2A5E,
    GLUCOSE_MEASUREMENT: 0x2A18,
    TEMPERATURE_MEASUREMENT: 0x2A1C,
    BATTERY_LEVEL: 0x2A19,
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BLEDevice {
    id: string;
    name: string;
    type: BLEDeviceType;
    connected: boolean;
    rssi?: number;
    battery?: number;
    lastReading?: HealthReading;
    gattServer?: BluetoothRemoteGATTServer;
    nativeDevice?: BluetoothDevice;
}

export type BLEDeviceType = 'heart_rate' | 'blood_pressure' | 'weight_scale' | 'pulse_oximeter' | 'glucose' | 'thermometer';

export interface HealthReading {
    type: BLEDeviceType;
    values: Record<string, number>;
    unit: string;
    timestamp: Date;
    raw?: DataView;
}

type ReadingCallback = (reading: HealthReading) => void;

// ─── Check browser support ───────────────────────────────────────────────────

export function isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export async function isBluetoothAvailable(): Promise<boolean> {
    if (!isBluetoothSupported()) return false;
    try {
        return await navigator.bluetooth.getAvailability();
    } catch {
        return false;
    }
}

// ─── BluetoothHealthConnector class ──────────────────────────────────────────

export class BluetoothHealthConnector {
    private devices: Map<string, BLEDevice> = new Map();
    private listeners: Map<string, ReadingCallback[]> = new Map();

    /**
     * Scan for and connect to a BLE health device
     */
    async scanAndConnect(type: BLEDeviceType): Promise<BLEDevice | null> {
        if (!isBluetoothSupported()) {
            throw new Error('Web Bluetooth is not supported in this browser. Try Chrome or Edge.');
        }

        const serviceUUID = this.getServiceUUID(type);

        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [serviceUUID] }],
                optionalServices: [BLE_SERVICES.BATTERY],
            });

            if (!device.gatt) {
                throw new Error('GATT server not available on this device');
            }

            const server = await device.gatt.connect();

            const bleDevice: BLEDevice = {
                id: device.id,
                name: device.name || `${type} Device`,
                type,
                connected: true,
                gattServer: server,
                nativeDevice: device,
            };

            // Try to read battery level
            try {
                const batteryService = await server.getPrimaryService(BLE_SERVICES.BATTERY);
                const batteryChar = await batteryService.getCharacteristic(BLE_CHARACTERISTICS.BATTERY_LEVEL);
                const batteryValue = await batteryChar.readValue();
                bleDevice.battery = batteryValue.getUint8(0);
            } catch {
                // Battery service not available on all devices
            }

            // Set up disconnect handler
            device.addEventListener('gattserverdisconnected', () => {
                bleDevice.connected = false;
                this.devices.set(bleDevice.id, bleDevice);
            });

            this.devices.set(bleDevice.id, bleDevice);

            // Start listening for measurements
            await this.startNotifications(bleDevice);

            return bleDevice;
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                // User cancelled the device picker
                return null;
            }
            throw error;
        }
    }

    /**
     * Start receiving notifications from a device
     */
    private async startNotifications(device: BLEDevice): Promise<void> {
        if (!device.gattServer) return;

        const serviceUUID = this.getServiceUUID(device.type);
        const charUUID = this.getCharacteristicUUID(device.type);

        try {
            const service = await device.gattServer.getPrimaryService(serviceUUID);
            const characteristic = await service.getCharacteristic(charUUID);

            characteristic.addEventListener('characteristicvaluechanged', (event: Event) => {
                const target = event.target as BluetoothRemoteGATTCharacteristic;
                if (!target.value) return;

                const reading = this.parseReading(device.type, target.value);
                device.lastReading = reading;
                this.devices.set(device.id, device);

                // Notify listeners
                const callbacks = this.listeners.get(device.id) || [];
                callbacks.forEach(cb => cb(reading));
            });

            await characteristic.startNotifications();
        } catch (error) {
            console.error(`Error starting notifications for ${device.type}:`, error);
        }
    }

    /**
     * Take a single reading from a device
     */
    async readOnce(device: BLEDevice): Promise<HealthReading | null> {
        if (!device.gattServer || !device.connected) {
            throw new Error('Device not connected');
        }

        const serviceUUID = this.getServiceUUID(device.type);
        const charUUID = this.getCharacteristicUUID(device.type);

        try {
            const service = await device.gattServer.getPrimaryService(serviceUUID);
            const characteristic = await service.getCharacteristic(charUUID);
            const value = await characteristic.readValue();

            const reading = this.parseReading(device.type, value);
            device.lastReading = reading;
            return reading;
        } catch (error) {
            console.error(`Error reading from ${device.type}:`, error);
            return null;
        }
    }

    /**
     * Store a reading into Supabase via healthDataService
     */
    async storeReading(userId: string, reading: HealthReading): Promise<number> {
        const dataPoints = this.readingToHealthData(reading);
        const result = await storeHealthMetrics(userId, dataPoints, `ble_${reading.type}`);
        return result.stored;
    }

    /**
     * Subscribe to readings from a device
     */
    onReading(deviceId: string, callback: ReadingCallback): () => void {
        const existing = this.listeners.get(deviceId) || [];
        existing.push(callback);
        this.listeners.set(deviceId, existing);

        return () => {
            const cbs = this.listeners.get(deviceId) || [];
            this.listeners.set(deviceId, cbs.filter(cb => cb !== callback));
        };
    }

    /**
     * Disconnect a device
     */
    disconnect(deviceId: string): void {
        const device = this.devices.get(deviceId);
        if (device?.nativeDevice?.gatt?.connected) {
            device.nativeDevice.gatt.disconnect();
        }
        if (device) {
            device.connected = false;
            this.devices.set(deviceId, device);
        }
    }

    /**
     * Get all known devices
     */
    getDevices(): BLEDevice[] {
        return Array.from(this.devices.values());
    }

    /**
     * Get connected devices
     */
    getConnectedDevices(): BLEDevice[] {
        return this.getDevices().filter(d => d.connected);
    }

    // ─── Protocol parsing ────────────────────────────────────────────────────

    private parseReading(type: BLEDeviceType, data: DataView): HealthReading {
        switch (type) {
            case 'heart_rate': return this.parseHeartRate(data);
            case 'blood_pressure': return this.parseBloodPressure(data);
            case 'weight_scale': return this.parseWeight(data);
            case 'pulse_oximeter': return this.parsePulseOx(data);
            case 'glucose': return this.parseGlucose(data);
            case 'thermometer': return this.parseTemperature(data);
        }
    }

    private parseHeartRate(data: DataView): HealthReading {
        // Byte 0: Flags — bit 0 indicates format (0 = UINT8, 1 = UINT16)
        const flags = data.getUint8(0);
        const is16Bit = (flags & 0x01) !== 0;
        const heartRate = is16Bit ? data.getUint16(1, true) : data.getUint8(1);

        // Energy expended (if flags bit 3 set)
        let energyExpended: number | undefined;
        if ((flags & 0x08) !== 0) {
            const offset = is16Bit ? 3 : 2;
            energyExpended = data.getUint16(offset, true);
        }

        // RR-Interval (if flags bit 4 set)
        let rrInterval: number | undefined;
        if ((flags & 0x10) !== 0) {
            const offset = is16Bit ? (energyExpended !== undefined ? 5 : 3) : (energyExpended !== undefined ? 4 : 2);
            if (offset < data.byteLength - 1) {
                rrInterval = data.getUint16(offset, true) / 1024 * 1000; // Convert to ms
            }
        }

        const values: Record<string, number> = { heart_rate: heartRate };
        if (energyExpended !== undefined) values.energy_expended = energyExpended;
        if (rrInterval !== undefined) values.rr_interval = Math.round(rrInterval);

        return { type: 'heart_rate', values, unit: 'bpm', timestamp: new Date(), raw: data };
    }

    private parseBloodPressure(data: DataView): HealthReading {
        // Byte 0: Flags
        const flags = data.getUint8(0);
        const isKPa = (flags & 0x01) !== 0;
        const unit = isKPa ? 'kPa' : 'mmHg';

        // Blood pressure values are IEEE-11073 16-bit SFLOAT
        const systolic = this.parseSFLOAT(data, 1);
        const diastolic = this.parseSFLOAT(data, 3);
        const meanAP = this.parseSFLOAT(data, 5);

        // Pulse rate (if flags bit 2 set)
        let pulseRate: number | undefined;
        if ((flags & 0x04) !== 0) {
            pulseRate = this.parseSFLOAT(data, 7);
        }

        const values: Record<string, number> = {
            systolic,
            diastolic,
            mean_arterial_pressure: meanAP,
        };
        if (pulseRate !== undefined) values.pulse_rate = pulseRate;

        return { type: 'blood_pressure', values, unit, timestamp: new Date(), raw: data };
    }

    private parseWeight(data: DataView): HealthReading {
        // Byte 0: Flags
        const flags = data.getUint8(0);
        const isImperial = (flags & 0x01) !== 0;

        // Weight is UINT16, resolution depends on unit
        const rawWeight = data.getUint16(1, true);
        const weight = isImperial ? rawWeight * 0.01 : rawWeight * 0.005; // lbs or kg

        const values: Record<string, number> = { weight };

        // BMI (if flags bit 3 set)
        if ((flags & 0x08) !== 0) {
            const bmi = data.getUint16(isImperial ? 3 : 3, true) * 0.1;
            values.bmi = Math.round(bmi * 10) / 10;
        }

        return {
            type: 'weight_scale',
            values,
            unit: isImperial ? 'lbs' : 'kg',
            timestamp: new Date(),
            raw: data,
        };
    }

    private parsePulseOx(data: DataView): HealthReading {
        // PLX Spot Check format
        const flags = data.getUint8(0);
        const spo2 = this.parseSFLOAT(data, 1);
        const pulseRate = this.parseSFLOAT(data, 3);

        const values: Record<string, number> = {
            spo2: Math.round(spo2 * 10) / 10,
            pulse_rate: Math.round(pulseRate),
        };

        // Pulse amplitude index (if available)
        if ((flags & 0x04) !== 0 && data.byteLength >= 7) {
            values.pulse_amplitude = this.parseSFLOAT(data, 5);
        }

        return { type: 'pulse_oximeter', values, unit: '%', timestamp: new Date(), raw: data };
    }

    private parseGlucose(data: DataView): HealthReading {
        // Byte 0: Flags
        const flags = data.getUint8(0);

        // Sequence number (UINT16)
        // const sequence = data.getUint16(1, true);

        // Base time (7 bytes: year, month, day, hours, minutes, seconds)
        // Skip parsing for timestamp, use current time

        // Glucose concentration (SFLOAT, offset depends on time flag)
        const concOffset = (flags & 0x01) !== 0 ? 10 : 3;
        const isKgPerL = (flags & 0x04) === 0;

        let glucose = 0;
        if (data.byteLength > concOffset + 1) {
            glucose = this.parseSFLOAT(data, concOffset);
            if (isKgPerL) {
                glucose = glucose * 100000; // Convert kg/L to mg/dL (approximate)
            }
        }

        return {
            type: 'glucose',
            values: { glucose: Math.round(glucose) },
            unit: 'mg/dL',
            timestamp: new Date(),
            raw: data,
        };
    }

    private parseTemperature(data: DataView): HealthReading {
        // Byte 0: Flags
        const flags = data.getUint8(0);
        const isFahrenheit = (flags & 0x01) !== 0;

        // Temperature is IEEE-11073 32-bit FLOAT (4 bytes at offset 1)
        const temp = this.parseIEEE11073Float(data, 1);

        return {
            type: 'thermometer',
            values: { temperature: Math.round(temp * 10) / 10 },
            unit: isFahrenheit ? '°F' : '°C',
            timestamp: new Date(),
            raw: data,
        };
    }

    // ─── IEEE-11073 number parsing ───────────────────────────────────────────

    private parseSFLOAT(data: DataView, offset: number): number {
        const raw = data.getUint16(offset, true);
        let mantissa = raw & 0x0FFF;
        let exponent = (raw >> 12) & 0x0F;

        // Sign extend
        if (mantissa >= 0x0800) mantissa = mantissa - 0x1000;
        if (exponent >= 0x08) exponent = exponent - 0x10;

        return mantissa * Math.pow(10, exponent);
    }

    private parseIEEE11073Float(data: DataView, offset: number): number {
        const raw = data.getUint32(offset, true);
        let mantissa = raw & 0x00FFFFFF;
        let exponent = (raw >> 24) & 0xFF;

        // Sign extend
        if (mantissa >= 0x800000) mantissa = mantissa - 0x1000000;
        if (exponent >= 0x80) exponent = exponent - 0x100;

        return mantissa * Math.pow(10, exponent);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private getServiceUUID(type: BLEDeviceType): number {
        switch (type) {
            case 'heart_rate': return BLE_SERVICES.HEART_RATE;
            case 'blood_pressure': return BLE_SERVICES.BLOOD_PRESSURE;
            case 'weight_scale': return BLE_SERVICES.WEIGHT_SCALE;
            case 'pulse_oximeter': return BLE_SERVICES.PULSE_OXIMETER;
            case 'glucose': return BLE_SERVICES.GLUCOSE;
            case 'thermometer': return BLE_SERVICES.HEALTH_THERMOMETER;
        }
    }

    private getCharacteristicUUID(type: BLEDeviceType): number {
        switch (type) {
            case 'heart_rate': return BLE_CHARACTERISTICS.HEART_RATE_MEASUREMENT;
            case 'blood_pressure': return BLE_CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT;
            case 'weight_scale': return BLE_CHARACTERISTICS.WEIGHT_MEASUREMENT;
            case 'pulse_oximeter': return BLE_CHARACTERISTICS.PLX_SPOT_CHECK;
            case 'glucose': return BLE_CHARACTERISTICS.GLUCOSE_MEASUREMENT;
            case 'thermometer': return BLE_CHARACTERISTICS.TEMPERATURE_MEASUREMENT;
        }
    }

    private readingToHealthData(reading: HealthReading): ExtractedHealthData[] {
        const data: ExtractedHealthData[] = [];

        switch (reading.type) {
            case 'heart_rate':
                data.push({
                    metric_type: 'heart_rate',
                    value: reading.values.heart_rate,
                    unit: 'bpm',
                    raw_text: `BLE heart rate: ${reading.values.heart_rate} bpm`,
                });
                if (reading.values.rr_interval) {
                    data.push({
                        metric_type: 'hrv',
                        value: reading.values.rr_interval,
                        unit: 'ms',
                        raw_text: `BLE RR interval: ${reading.values.rr_interval} ms`,
                    });
                }
                break;

            case 'blood_pressure':
                data.push({
                    metric_type: 'blood_pressure_systolic',
                    value: reading.values.systolic,
                    unit: reading.unit,
                    raw_text: `BLE BP: ${reading.values.systolic}/${reading.values.diastolic} ${reading.unit}`,
                });
                data.push({
                    metric_type: 'blood_pressure_diastolic',
                    value: reading.values.diastolic,
                    unit: reading.unit,
                    raw_text: `BLE BP diastolic: ${reading.values.diastolic} ${reading.unit}`,
                });
                break;

            case 'weight_scale':
                data.push({
                    metric_type: 'weight',
                    value: reading.values.weight,
                    unit: reading.unit,
                    raw_text: `BLE weight: ${reading.values.weight} ${reading.unit}`,
                });
                if (reading.values.bmi) {
                    data.push({
                        metric_type: 'bmi',
                        value: reading.values.bmi,
                        unit: 'kg/m²',
                        raw_text: `BLE BMI: ${reading.values.bmi}`,
                    });
                }
                break;

            case 'pulse_oximeter':
                data.push({
                    metric_type: 'oxygen_saturation',
                    value: reading.values.spo2,
                    unit: '%',
                    raw_text: `BLE SpO2: ${reading.values.spo2}%`,
                });
                if (reading.values.pulse_rate) {
                    data.push({
                        metric_type: 'heart_rate',
                        value: reading.values.pulse_rate,
                        unit: 'bpm',
                        raw_text: `BLE pulse: ${reading.values.pulse_rate} bpm`,
                    });
                }
                break;

            case 'glucose':
                data.push({
                    metric_type: 'glucose',
                    value: reading.values.glucose,
                    unit: 'mg/dL',
                    raw_text: `BLE glucose: ${reading.values.glucose} mg/dL`,
                });
                break;

            case 'thermometer':
                data.push({
                    metric_type: 'temperature',
                    value: reading.values.temperature,
                    unit: reading.unit,
                    raw_text: `BLE temperature: ${reading.values.temperature} ${reading.unit}`,
                });
                break;
        }

        return data;
    }
}

// Singleton instance
export const bluetoothConnector = new BluetoothHealthConnector();
