import { describe, it, expect } from 'vitest';
import { analyzeVariants, summarizeFindings } from '../findings';
import type { ParsedVariant } from '../types';

function v(rsid: string, genotype: string): ParsedVariant {
    return {
        rsid,
        chromosome: '1',
        position: 1,
        genotype,
        confidence: genotype === '--' ? 'no_call' : 'high',
    };
}

// ─── Category opt-in ────────────────────────────────────────────────────────

describe('analyzeVariants — category opt-in', () => {
    it('returns nothing when no categories are enabled', () => {
        const findings = analyzeVariants(
            [v('rs4244285', 'AG'), v('rs4988235', 'CT')],
            { enabled_categories: [] },
        );
        expect(findings).toHaveLength(0);
    });

    it('returns only findings inside enabled categories', () => {
        const findings = analyzeVariants(
            [
                v('rs4244285', 'AG'),    // pgx — CYP2C19 het
                v('rs4988235', 'CT'),    // trait — lactose het
                v('rs334', 'AT'),         // carrier — sickle het
            ],
            { enabled_categories: ['pgx'] },
        );
        expect(findings).toHaveLength(1);
        expect(findings[0].category).toBe('pgx');
        expect(findings[0].rsid).toBe('rs4244285');
    });

    it('drops requires_opt_in findings without sensitive_findings_acknowledged', () => {
        const findings = analyzeVariants(
            [
                v('rs80357914', 'A-'),    // BRCA1 — requires_opt_in
                v('rs334', 'AT'),          // carrier — does not require
            ],
            { enabled_categories: ['cancer_risk', 'carrier'] },
        );
        expect(findings.map((f) => f.category)).toEqual(['carrier']);
    });

    it('surfaces requires_opt_in findings when acknowledged', () => {
        const findings = analyzeVariants(
            [v('rs80357914', 'A-')],
            {
                enabled_categories: ['cancer_risk'],
                sensitive_findings_acknowledged: true,
            },
        );
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('urgent');
    });
});

// ─── Dosage detection ──────────────────────────────────────────────────────

describe('analyzeVariants — dosage', () => {
    it('flags homozygous risk for two copies', () => {
        // rs4244285 risk = A, reference = G
        const findings = analyzeVariants([v('rs4244285', 'AA')], {
            enabled_categories: ['pgx'],
        });
        expect(findings[0].dosage).toBe('homozygous_risk');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].phenotype_label).toMatch(/poor metabolizer/i);
    });

    it('flags heterozygous for one copy', () => {
        const findings = analyzeVariants([v('rs4244285', 'AG')], {
            enabled_categories: ['pgx'],
        });
        expect(findings[0].dosage).toBe('heterozygous');
        expect(findings[0].severity).toBe('moderate');
        expect(findings[0].phenotype_label).toMatch(/intermediate metabolizer/i);
    });

    it('treats reversed-order genotypes as equivalent (GA == AG)', () => {
        const fa = analyzeVariants([v('rs4244285', 'AG')], {
            enabled_categories: ['pgx'],
        })[0];
        const fb = analyzeVariants([v('rs4244285', 'GA')], {
            enabled_categories: ['pgx'],
        })[0];
        expect(fa.dosage).toBe(fb.dosage);
    });
});

// ─── Reference / no-call handling ───────────────────────────────────────────

describe('analyzeVariants — reference + no-call', () => {
    it('suppresses reference findings by default', () => {
        // GG = both reference alleles, no risk
        const findings = analyzeVariants([v('rs4244285', 'GG')], {
            enabled_categories: ['pgx'],
        });
        expect(findings).toHaveLength(0);
    });

    it('surfaces reference findings when includeReference is true', () => {
        const findings = analyzeVariants([v('rs4244285', 'GG')], {
            enabled_categories: ['pgx'],
            includeReference: true,
        });
        expect(findings).toHaveLength(1);
        expect(findings[0].dosage).toBe('reference');
    });

    it('ignores no-calls entirely', () => {
        const findings = analyzeVariants([v('rs4244285', '--')], {
            enabled_categories: ['pgx'],
            includeReference: true,
        });
        expect(findings).toHaveLength(0);
    });

    it('ignores rsids that aren\'t in the curated map', () => {
        const findings = analyzeVariants([v('rs99999999', 'AA')], {
            enabled_categories: ['pgx', 'carrier', 'cancer_risk', 'cardiometabolic', 'trait'],
            sensitive_findings_acknowledged: true,
            includeReference: true,
        });
        expect(findings).toHaveLength(0);
    });
});

// ─── Sort + summary ────────────────────────────────────────────────────────

describe('analyzeVariants — sort + summary', () => {
    it('sorts findings urgent → info', () => {
        const findings = analyzeVariants(
            [
                v('rs4988235', 'CC'),    // trait — info-tier
                v('rs80357914', 'A-'),    // BRCA1 — urgent
                v('rs4244285', 'AG'),    // PGx het — moderate
            ],
            {
                enabled_categories: ['cancer_risk', 'pgx', 'trait'],
                sensitive_findings_acknowledged: true,
            },
        );
        expect(findings.map((f) => f.severity)).toEqual([
            'urgent',
            'moderate',
            'info',
        ]);
    });

    it('summarizeFindings counts by category and flags urgents', () => {
        const findings = analyzeVariants(
            [
                v('rs80357914', 'A-'),
                v('rs334', 'AT'),
                v('rs4988235', 'CT'),
            ],
            {
                enabled_categories: ['cancer_risk', 'carrier', 'trait'],
                sensitive_findings_acknowledged: true,
            },
        );
        const s = summarizeFindings(findings);
        expect(s.counts.cancer_risk).toBe(1);
        expect(s.counts.carrier).toBe(1);
        expect(s.counts.trait).toBe(1);
        expect(s.urgent).toBe(1);
        expect(s.highOrUrgent).toBe(1);
    });
});

// ─── Evidence attribution ──────────────────────────────────────────────────

describe('analyzeVariants — evidence attribution', () => {
    it('every finding carries an evidence_url', () => {
        const findings = analyzeVariants(
            [v('rs4244285', 'AG'), v('rs4988235', 'CT')],
            { enabled_categories: ['pgx', 'trait'] },
        );
        for (const f of findings) {
            expect(f.evidence_url).toBeTruthy();
            expect(f.evidence_url).toMatch(/^https?:\/\//);
        }
    });
});
