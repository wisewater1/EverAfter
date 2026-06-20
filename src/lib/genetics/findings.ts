/**
 * Genetic findings — pure analyzer.
 *
 * Given a set of variant calls + the user's opt-in categories, return
 * typed findings keyed off the curated TRAIT_MAP. This is the
 * "reasonable way to garner info about someone's genetics" — no LLM,
 * no proprietary risk scores, just rsid lookup against published
 * clinical evidence with explicit attribution.
 *
 * GUARDRAILS BAKED IN:
 *   - Categories must be explicitly opted in. The cancer_risk and
 *     cardiometabolic categories have requires_opt_in: true variants
 *     that won't surface even if the category is enabled unless the
 *     user passes a second flag.
 *   - Reference / "no finding" results are SUPPRESSED by default —
 *     reporting "you don't have BRCA1 founder mutation" is noisy.
 *     Caller passes includeReference: true to override.
 *   - Every finding carries an evidence_url for honest attribution.
 *
 * The analyzer is pure (no DOM, no async, no Supabase) so it can be
 * unit-tested with fixture arrays, run inside an Edge Function for
 * server-side dashboards, and ported to the on-device LLM later.
 */

import type { Severity, TraitCategory, VariantTrait } from './traitMap';
import { TRAIT_MAP_BY_RSID } from './traitMap';
import type { ParsedVariant } from './types';

export type FindingDosage = 'reference' | 'heterozygous' | 'homozygous_risk';

export interface Finding {
    id: string;
    rsid: string;
    gene: string;
    category: TraitCategory;
    name: string;
    summary: string;
    dosage: FindingDosage;
    /** Layperson-friendly label picked from the trait's phenotypes table. */
    phenotype_label: string;
    severity: Severity;
    /** Actual genotype the user has at this position (e.g., "AG"). */
    genotype: string;
    recommendation: string;
    evidence_url: string;
    evidence: VariantTrait['evidence'];
}

export interface AnalyzeOptions {
    /**
     * Categories the user has explicitly opted into. Findings outside
     * these categories are dropped before they reach the UI.
     */
    enabled_categories: TraitCategory[];
    /**
     * For cancer_risk and cardiometabolic, the user must additionally
     * acknowledge the heavier consent flow. Variants with
     * requires_opt_in: true are dropped unless this is true.
     */
    sensitive_findings_acknowledged?: boolean;
    /**
     * Default false — suppress "no finding" results so the UI shows
     * only meaningful rows. Set true for a complete coverage report.
     */
    includeReference?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Count how many of the trait's risk_alleles appear in the user's
 * genotype string. Handles diploid calls ("AG", "GG"), no-calls ("--"),
 * and indel encodings ("D" deletion / "I" insertion, used by 23andMe).
 *
 * Returns null when the call is ambiguous (no-call, or genotype doesn't
 * match any expected allele set) so the caller can drop it.
 */
function countRiskAlleles(
    genotype: string,
    risk: string[],
    reference: string[],
): number | null {
    if (!genotype || genotype === '--' || genotype === 'NN' || genotype === '00') {
        return null;
    }
    const riskSet = new Set(risk.map((a) => a.toUpperCase()));
    const refSet = new Set(reference.map((a) => a.toUpperCase()));

    // Split the genotype into "alleles". For a 2-char SNP that's two
    // characters; for indels (single letter encodings in 23andMe like
    // "II", "DD", "DI") it's still two characters.
    const alleles: string[] = [];
    for (const ch of genotype) alleles.push(ch.toUpperCase());

    let count = 0;
    let recognized = 0;
    for (const a of alleles) {
        if (riskSet.has(a)) {
            count += 1;
            recognized += 1;
        } else if (refSet.has(a)) {
            recognized += 1;
        }
    }

    // If we didn't recognize either allele the call doesn't map to this
    // trait — surface nothing.
    if (recognized === 0) return null;
    return count;
}

function dosageFromCount(count: number): FindingDosage {
    if (count >= 2) return 'homozygous_risk';
    if (count === 1) return 'heterozygous';
    return 'reference';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Walk the variants, look each rsid up in the curated TRAIT_MAP, and
 * produce a typed Finding for every match that passes the consent
 * filters.
 *
 * The implementation is intentionally O(N) over variants — for a
 * 700k-variant 23andMe profile this runs in milliseconds because the
 * vast majority of rsids miss the curated map.
 */
export function analyzeVariants(
    variants: ParsedVariant[],
    options: AnalyzeOptions,
): Finding[] {
    const findings: Finding[] = [];
    const enabled = new Set(options.enabled_categories);

    for (const variant of variants) {
        const trait = TRAIT_MAP_BY_RSID.get(variant.rsid.toLowerCase());
        if (!trait) continue;
        if (!enabled.has(trait.category)) continue;
        if (trait.requires_opt_in && !options.sensitive_findings_acknowledged) {
            continue;
        }

        const count = countRiskAlleles(
            variant.genotype,
            trait.risk_alleles,
            trait.reference_alleles,
        );
        if (count === null) continue;

        const dosage = dosageFromCount(count);
        const isReference = dosage === 'reference';
        if (isReference && !options.includeReference) continue;

        const phenotype =
            dosage === 'homozygous_risk'
                ? trait.phenotypes.homozygous_risk
                : dosage === 'heterozygous'
                  ? trait.phenotypes.heterozygous
                  : trait.phenotypes.reference;

        findings.push({
            id: trait.id,
            rsid: trait.rsid,
            gene: trait.gene,
            category: trait.category,
            name: trait.name,
            summary: trait.summary,
            dosage,
            phenotype_label: phenotype.label,
            severity: phenotype.severity,
            genotype: variant.genotype,
            recommendation: trait.recommendation,
            evidence_url: trait.evidence_url,
            evidence: trait.evidence,
        });
    }

    // Sort: urgent first, then high, moderate, info. Stable within tier.
    const order: Record<Severity, number> = {
        urgent: 0,
        high: 1,
        moderate: 2,
        info: 3,
    };
    findings.sort((a, b) => order[a.severity] - order[b.severity]);

    return findings;
}

/** Quick stats for the panel header. */
export function summarizeFindings(findings: Finding[]): {
    counts: Record<TraitCategory, number>;
    urgent: number;
    highOrUrgent: number;
} {
    const counts: Record<TraitCategory, number> = {
        pgx: 0,
        carrier: 0,
        cancer_risk: 0,
        cardiometabolic: 0,
        trait: 0,
    };
    let urgent = 0;
    let highOrUrgent = 0;
    for (const f of findings) {
        counts[f.category] += 1;
        if (f.severity === 'urgent') {
            urgent += 1;
            highOrUrgent += 1;
        } else if (f.severity === 'high') {
            highOrUrgent += 1;
        }
    }
    return { counts, urgent, highOrUrgent };
}
