import { describe, it, expect } from 'vitest';
import { normalize } from '../posthumous';
import { DEFAULT_POSTHUMOUS_DIRECTIVE } from '../types';

describe('posthumous.normalize', () => {
    it('returns the schema default for an empty input', () => {
        expect(normalize({})).toEqual(DEFAULT_POSTHUMOUS_DIRECTIVE);
    });

    it('returns the schema default for a null input', () => {
        expect(normalize(null)).toEqual(DEFAULT_POSTHUMOUS_DIRECTIVE);
    });

    it('keeps a valid policy', () => {
        const result = normalize({ policy: 'destroy' });
        expect(result.policy).toBe('destroy');
    });

    it('falls back to ask_pdg when policy is unknown', () => {
        const result = normalize({ policy: 'send_to_mars' });
        expect(result.policy).toBe('ask_pdg');
    });

    it('keeps a positive destroy_after_days', () => {
        const result = normalize({ destroy_after_days: 30 });
        expect(result.destroy_after_days).toBe(30);
    });

    it('coerces destroy_after_days <= 0 to null', () => {
        expect(normalize({ destroy_after_days: 0 }).destroy_after_days).toBeNull();
        expect(normalize({ destroy_after_days: -10 }).destroy_after_days).toBeNull();
    });

    it('coerces non-numeric destroy_after_days to null', () => {
        expect(normalize({ destroy_after_days: 'soon' }).destroy_after_days).toBeNull();
    });

    it('filters notify_pdg_ids to strings only', () => {
        const result = normalize({
            notify_pdg_ids: ['valid', 123, null, 'also-valid'],
        });
        expect(result.notify_pdg_ids).toEqual(['valid', 'also-valid']);
    });

    it('coerces non-array notify_pdg_ids to []', () => {
        expect(normalize({ notify_pdg_ids: 'just-one' }).notify_pdg_ids).toEqual([]);
    });

    it('requires true (not truthy) for the boolean flags', () => {
        const r = normalize({
            actionable_findings_to_pdg: 1, // not a strict true
            raw_data_to_pdg: 'yes',
        });
        expect(r.actionable_findings_to_pdg).toBe(false);
        expect(r.raw_data_to_pdg).toBe(false);
    });

    it('keeps a valid notify_blood_relatives', () => {
        expect(normalize({ notify_blood_relatives: 'auto' }).notify_blood_relatives).toBe(
            'auto',
        );
        expect(normalize({ notify_blood_relatives: 'never' }).notify_blood_relatives).toBe(
            'never',
        );
    });

    it('falls back to "ask" when notify_blood_relatives is unknown', () => {
        expect(
            normalize({ notify_blood_relatives: 'maybe' }).notify_blood_relatives,
        ).toBe('ask');
    });
});
