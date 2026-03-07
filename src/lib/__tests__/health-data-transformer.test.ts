import { describe, it, expect } from 'vitest';
import {
    UnitConverter,
    normalizeMetricName,
    convertToStandardUnit,
    validateMetricValue,
} from '../health-data-transformer';

describe('Health Data Transformer - Unit Converter', () => {
    it('converts mmol/L to mg/dL correctly', () => {
        expect(UnitConverter.glucoseMmolToMgDl(5.5)).toBe(99.1);
    });

    it('converts mg/dL to mmol/L correctly', () => {
        expect(UnitConverter.glucoseMgDlToMmol(100)).toBe(5.6);
    });

    it('converts lbs to kg correctly', () => {
        expect(UnitConverter.weightLbsToKg(150)).toBe(68.0);
    });

    it('converts miles to km correctly', () => {
        expect(UnitConverter.distanceMilesToKm(5)).toBe(8.05);
    });
});

describe('Health Data Transformer - Normalization', () => {
    it('normalizes provider-specific metric names', () => {
        expect(normalizeMetricName('activities-steps', 'fitbit')).toBe('steps');
        expect(normalizeMetricName('total_sleep_duration', 'oura')).toBe('sleep_hours');
        expect(normalizeMetricName('glucose_value', 'dexcom')).toBe('glucose');
    });

    it('falls back gracefully for unknown provider metrics', () => {
        expect(normalizeMetricName('Unknown Metric', 'unknown')).toBe('unknown_metric');
    });

    it('converts glucose to standard unit correctly', () => {
        const result = convertToStandardUnit(5.5, 'mmol/L', 'glucose');
        expect(result.value).toBe(99.1);
        expect(result.unit).toBe('mg/dL');
    });

    it('converts distance to standard unit correctly', () => {
        const result = convertToStandardUnit(5, 'miles', 'distance');
        expect(result.value).toBe(8.05);
        expect(result.unit).toBe('km');
    });

    it('validates metric values correctly', () => {
        const valid = validateMetricValue(80, 'heart_rate');
        expect(valid.isValid).toBe(true);
        expect(valid.qualityScore).toBe(1.0);

        const invalid = validateMetricValue(25, 'heart_rate'); // Min is 30
        expect(invalid.isValid).toBe(false);
        expect(invalid.qualityScore).toBe(0.0);
    });
});
