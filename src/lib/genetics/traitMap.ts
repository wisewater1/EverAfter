/**
 * Curated variant → trait map.
 *
 * PR 5 of the genetics roadmap. The "reasonable" way to garner info
 * about someone's genetics is NOT to throw every variant at an LLM —
 * it's to map specific SNPs to specific published clinical findings,
 * filter by evidence strength + actionability, and frame everything
 * with "not medical advice" guardrails.
 *
 * This file is the seed of that map. It starts with ~15 well-established
 * variants across five categories — all sourced from public clinical
 * databases (ClinVar, PharmGKB / CPIC, OMIM). Every entry cites its
 * source so the UI can attribute findings honestly.
 *
 * EXTENDING THE MAP
 * Adding a new variant requires four pieces of evidence:
 *   1. A specific rsid (no proxies, no LD blocks)
 *   2. A category (pgx / carrier / cancer_risk / cardiometabolic / trait)
 *   3. A genotype → meaning rule (homozygous risk allele vs heterozygous
 *      carrier vs reference)
 *   4. An evidence_url that resolves to a public clinical database row
 *
 * Variants without published clinical evidence DO NOT belong here.
 * "Interesting but unproven" goes in a separate research-grade table
 * (out of scope for this PR).
 */

export type TraitCategory =
    /** Pharmacogenomics — how someone metabolizes specific drugs. */
    | 'pgx'
    /** Recessive condition carrier status. Relevant for family planning. */
    | 'carrier'
    /** Hereditary cancer risk (BRCA, Lynch, etc.). */
    | 'cancer_risk'
    /** Cardiometabolic predisposition (APOE, FH, etc.). */
    | 'cardiometabolic'
    /** Trait — low-stakes, conversation-starter (lactose, cilantro). */
    | 'trait';

export type Severity =
    | 'info'
    /** Worth knowing but not urgent. Pre-conception planning, lifestyle. */
    | 'moderate'
    /** Talk to your doctor. */
    | 'high'
    /** Discuss with a clinical geneticist or genetic counselor. */
    | 'urgent';

export type EvidenceStrength =
    | 'established'   // CPIC level A, ClinVar pathogenic with 3+ submitters
    | 'strong'        // CPIC level B, ClinVar likely pathogenic, multiple replications
    | 'moderate';     // ClinVar uncertain → likely, single-study replications

/**
 * How a single SNP's genotype maps to a finding. The mapper checks the
 * caller's genotype against `risk_alleles` and `reference_alleles` —
 * the order of letters in the stored genotype string is normalized so
 * "AG" and "GA" both match.
 */
export interface VariantTrait {
    /** Stable internal key — used as trait_id in variant_calls. */
    id: string;
    /** rs number — e.g., 'rs4244285'. */
    rsid: string;
    /** Gene symbol — for display. */
    gene: string;
    category: TraitCategory;
    /** Short, layperson-friendly name. */
    name: string;
    /** One-sentence summary in plain English. */
    summary: string;
    /**
     * Which alleles are the risk / minor / consequential ones. Genotype
     * matching counts how many of these the caller has.
     */
    risk_alleles: string[];
    /** Reference (typically "common") alleles for contrast in the UI. */
    reference_alleles: string[];
    /**
     * Phenotype labels for each dosage (0, 1, 2 risk alleles). The mapper
     * picks the entry matching the caller's count.
     */
    phenotypes: {
        homozygous_risk: { label: string; severity: Severity };
        heterozygous: { label: string; severity: Severity };
        reference: { label: string; severity: Severity };
    };
    /**
     * Action — what the user should consider. Never "do" — always
     * "discuss with", "consider", "ask about".
     */
    recommendation: string;
    evidence: EvidenceStrength;
    /** Public source the UI can link to for the user. */
    evidence_url: string;
    /**
     * Optional condition flags. Used by the UI to suppress findings
     * when the user hasn't opted into a category, or to show a
     * stronger "discuss with a genetic counselor" CTA.
     */
    requires_opt_in?: boolean;
}

/**
 * The seed. Curated, conservative, and explicitly attributed. Every
 * entry would survive a clinical-genetics-counselor review.
 */
export const TRAIT_MAP: VariantTrait[] = [
    // ─── Pharmacogenomics (PGx) ─────────────────────────────────────────────
    {
        id: 'pgx_cyp2c19_star2',
        rsid: 'rs4244285',
        gene: 'CYP2C19',
        category: 'pgx',
        name: 'Clopidogrel (Plavix) response',
        summary:
            'CYP2C19 metabolizes clopidogrel. Carriers of the *2 loss-of-function allele convert less drug into its active form.',
        risk_alleles: ['A'],
        reference_alleles: ['G'],
        phenotypes: {
            homozygous_risk: {
                label: 'Likely poor metabolizer',
                severity: 'high',
            },
            heterozygous: {
                label: 'Likely intermediate metabolizer',
                severity: 'moderate',
            },
            reference: {
                label: 'Normal metabolizer',
                severity: 'info',
            },
        },
        recommendation:
            'If you take clopidogrel after a stent or for stroke prevention, discuss alternatives (prasugrel, ticagrelor) with your cardiologist.',
        evidence: 'established',
        evidence_url: 'https://www.pharmgkb.org/variant/PA166154434',
    },
    {
        id: 'pgx_vkorc1_warfarin',
        rsid: 'rs9923231',
        gene: 'VKORC1',
        category: 'pgx',
        name: 'Warfarin sensitivity',
        summary:
            'VKORC1 is the target of warfarin. The T allele lowers VKORC1 expression and increases warfarin sensitivity.',
        risk_alleles: ['T'],
        reference_alleles: ['C'],
        phenotypes: {
            homozygous_risk: {
                label: 'Highly sensitive — needs a lower dose',
                severity: 'high',
            },
            heterozygous: {
                label: 'Increased sensitivity',
                severity: 'moderate',
            },
            reference: {
                label: 'Typical dose response',
                severity: 'info',
            },
        },
        recommendation:
            'If you start warfarin, the FDA-labeled CPIC algorithm uses this variant to pick a starting dose. Tell your prescriber.',
        evidence: 'established',
        evidence_url: 'https://www.pharmgkb.org/variant/PA166154200',
    },
    {
        id: 'pgx_slco1b1_statins',
        rsid: 'rs4149056',
        gene: 'SLCO1B1',
        category: 'pgx',
        name: 'Statin myopathy risk',
        summary:
            'SLCO1B1 transports statins into the liver. The C allele reduces transport — simvastatin in particular can cause muscle pain at high doses.',
        risk_alleles: ['C'],
        reference_alleles: ['T'],
        phenotypes: {
            homozygous_risk: {
                label: 'High myopathy risk on simvastatin',
                severity: 'high',
            },
            heterozygous: {
                label: 'Elevated myopathy risk',
                severity: 'moderate',
            },
            reference: {
                label: 'Typical statin tolerance',
                severity: 'info',
            },
        },
        recommendation:
            'If you take a statin and experience muscle pain, this variant is worth mentioning. CPIC suggests lower simvastatin doses or an alternative statin.',
        evidence: 'established',
        evidence_url: 'https://www.pharmgkb.org/variant/PA166154579',
    },

    // ─── Hereditary cancer risk ─────────────────────────────────────────────
    // BRCA1/2 founder mutations are the most established and most
    // tested. They warrant an opt-in flag — the conversation around a
    // positive finding requires genetic counseling, not an app.
    {
        id: 'cancer_brca1_185delAG',
        rsid: 'rs80357914',
        gene: 'BRCA1',
        category: 'cancer_risk',
        name: 'BRCA1 185delAG (Ashkenazi founder)',
        summary:
            'A frameshift variant in BRCA1 that substantially elevates lifetime risk of breast and ovarian cancer.',
        risk_alleles: ['-'],          // deletion allele
        reference_alleles: ['AG'],
        phenotypes: {
            homozygous_risk: {
                label: 'Very high cancer risk — see a specialist',
                severity: 'urgent',
            },
            heterozygous: {
                label: 'Substantially elevated cancer risk',
                severity: 'urgent',
            },
            reference: {
                label: 'No founder variant detected at this position',
                severity: 'info',
            },
        },
        recommendation:
            'A clinical-grade test and a meeting with a genetic counselor are both recommended before acting on this finding.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/17661/',
        requires_opt_in: true,
    },
    {
        id: 'cancer_brca2_6174delT',
        rsid: 'rs80359550',
        gene: 'BRCA2',
        category: 'cancer_risk',
        name: 'BRCA2 6174delT (Ashkenazi founder)',
        summary:
            'A BRCA2 frameshift that elevates breast, ovarian, prostate, and pancreatic cancer risk.',
        risk_alleles: ['-'],
        reference_alleles: ['T'],
        phenotypes: {
            homozygous_risk: {
                label: 'Very high cancer risk — see a specialist',
                severity: 'urgent',
            },
            heterozygous: {
                label: 'Substantially elevated cancer risk',
                severity: 'urgent',
            },
            reference: {
                label: 'No founder variant detected at this position',
                severity: 'info',
            },
        },
        recommendation:
            'A clinical-grade test and a meeting with a genetic counselor are both recommended before acting on this finding.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/9325/',
        requires_opt_in: true,
    },

    // ─── Cardiometabolic ───────────────────────────────────────────────────
    {
        id: 'apoe_e4_rs429358',
        rsid: 'rs429358',
        gene: 'APOE',
        category: 'cardiometabolic',
        name: 'APOE-ε4 (rs429358)',
        summary:
            'One of the two SNPs that define the APOE-ε4 allele — the strongest common genetic risk factor for late-onset Alzheimer\'s disease and elevated LDL cholesterol response.',
        risk_alleles: ['C'],
        reference_alleles: ['T'],
        phenotypes: {
            homozygous_risk: {
                label: 'APOE-ε4 homozygous (in combination with rs7412)',
                severity: 'high',
            },
            heterozygous: {
                label: 'One copy of the ε4 SNP (combine with rs7412 to confirm)',
                severity: 'moderate',
            },
            reference: {
                label: 'No ε4 at this position',
                severity: 'info',
            },
        },
        recommendation:
            'APOE-ε4 status is an emotionally significant finding. We surface it only if you opt in, and we recommend talking to a clinician before acting.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/17848/',
        requires_opt_in: true,
    },
    {
        id: 'apoe_e2_rs7412',
        rsid: 'rs7412',
        gene: 'APOE',
        category: 'cardiometabolic',
        name: 'APOE-ε2 / ε4 partner SNP (rs7412)',
        summary:
            'The second SNP needed to call APOE haplotype. Combined with rs429358 it defines ε2 / ε3 / ε4 status.',
        risk_alleles: ['C'],
        reference_alleles: ['T'],
        phenotypes: {
            homozygous_risk: {
                label: 'Reference at rs7412 (combine with rs429358)',
                severity: 'info',
            },
            heterozygous: {
                label: 'One copy of the reference C allele',
                severity: 'info',
            },
            reference: {
                label: 'TT — ε2 carrier status candidate (combine with rs429358)',
                severity: 'info',
            },
        },
        recommendation:
            'Used together with rs429358 to determine ε2/ε3/ε4 haplotype.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/17854/',
        requires_opt_in: true,
    },
    {
        id: 'fh_ldlr_rs688',
        rsid: 'rs688',
        gene: 'LDLR',
        category: 'cardiometabolic',
        name: 'LDLR variant — LDL clearance',
        summary:
            'A common LDLR variant associated with modestly higher LDL cholesterol levels. Not a familial hypercholesterolemia variant, but worth knowing alongside a lipid panel.',
        risk_alleles: ['T'],
        reference_alleles: ['C'],
        phenotypes: {
            homozygous_risk: {
                label: 'Mildly elevated LDL-C tendency',
                severity: 'moderate',
            },
            heterozygous: {
                label: 'Slightly elevated LDL-C tendency',
                severity: 'info',
            },
            reference: { label: 'Typical LDLR allele', severity: 'info' },
        },
        recommendation:
            'A standard lipid panel is the next step. Diet and exercise have the largest effect.',
        evidence: 'moderate',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/snp/rs688',
    },

    // ─── Carrier status ────────────────────────────────────────────────────
    {
        id: 'carrier_cftr_f508del',
        rsid: 'rs113993960',
        gene: 'CFTR',
        category: 'carrier',
        name: 'Cystic fibrosis (ΔF508 — CFTR)',
        summary:
            'The single most common pathogenic CFTR variant. Two copies cause cystic fibrosis; one copy makes the individual a carrier without symptoms.',
        risk_alleles: ['D'],          // 23andMe encodes deletion as "D"
        reference_alleles: ['I'],     // insertion / reference
        phenotypes: {
            homozygous_risk: {
                label: 'Two copies — affected by cystic fibrosis',
                severity: 'urgent',
            },
            heterozygous: {
                label: 'Carrier — asymptomatic but relevant for family planning',
                severity: 'moderate',
            },
            reference: { label: 'No ΔF508 detected', severity: 'info' },
        },
        recommendation:
            'Two CF carriers in a couple have a 25% per-pregnancy chance of an affected child. If you and a partner are both carriers, talk to a genetic counselor.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/7105/',
    },
    {
        id: 'carrier_hbb_sickle',
        rsid: 'rs334',
        gene: 'HBB',
        category: 'carrier',
        name: 'Sickle cell (HBB)',
        summary:
            'A single base substitution in HBB. Two copies cause sickle cell disease; one copy gives sickle cell trait (usually asymptomatic).',
        risk_alleles: ['T'],
        reference_alleles: ['A'],
        phenotypes: {
            homozygous_risk: {
                label: 'Sickle cell disease',
                severity: 'urgent',
            },
            heterozygous: {
                label: 'Sickle cell trait (carrier)',
                severity: 'moderate',
            },
            reference: { label: 'No sickle variant detected', severity: 'info' },
        },
        recommendation:
            'Sickle trait is usually asymptomatic but matters for high-altitude / high-stress contexts and for family planning.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/15333/',
    },
    {
        id: 'carrier_hexa_taysachs',
        rsid: 'rs28941770',
        gene: 'HEXA',
        category: 'carrier',
        name: 'Tay-Sachs (HEXA 1278insTATC)',
        summary:
            'The most common HEXA variant causing Tay-Sachs disease. Two copies cause the condition; one copy makes the individual a carrier.',
        risk_alleles: ['-'],
        reference_alleles: ['TATC'],
        phenotypes: {
            homozygous_risk: { label: 'Tay-Sachs disease', severity: 'urgent' },
            heterozygous: {
                label: 'Carrier — asymptomatic but relevant for family planning',
                severity: 'moderate',
            },
            reference: { label: 'No HEXA variant detected', severity: 'info' },
        },
        recommendation:
            'Both parents must be carriers for a child to be affected. Counseling is recommended if both members of a couple test positive.',
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/clinvar/variation/3995/',
    },

    // ─── Traits ────────────────────────────────────────────────────────────
    {
        id: 'trait_lactose_lct',
        rsid: 'rs4988235',
        gene: 'MCM6 / LCT',
        category: 'trait',
        name: 'Lactose tolerance',
        summary:
            'The T allele upstream of LCT keeps the lactase gene active into adulthood — the genetic basis of lactose tolerance in Northern European populations.',
        risk_alleles: ['C'],          // C is the intolerance-associated allele
        reference_alleles: ['T'],
        phenotypes: {
            homozygous_risk: {
                label: 'Likely lactose intolerant',
                severity: 'info',
            },
            heterozygous: {
                label: 'One tolerant + one intolerant allele',
                severity: 'info',
            },
            reference: { label: 'Lactose tolerant', severity: 'info' },
        },
        recommendation:
            "Lactose intolerance can usually be managed with lactose-free dairy or lactase supplements. Doesn't predict severity.",
        evidence: 'established',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/snp/rs4988235',
    },
    {
        id: 'trait_cilantro_or6a2',
        rsid: 'rs72921001',
        gene: 'OR6A2',
        category: 'trait',
        name: 'Cilantro "soapy taste"',
        summary:
            'A variant in an olfactory receptor cluster correlated with perceiving cilantro as soapy.',
        risk_alleles: ['C'],
        reference_alleles: ['A'],
        phenotypes: {
            homozygous_risk: {
                label: 'Likely cilantro tastes soapy',
                severity: 'info',
            },
            heterozygous: { label: 'Mixed perception possible', severity: 'info' },
            reference: { label: 'Cilantro probably tastes fine', severity: 'info' },
        },
        recommendation: 'Fun fact. No clinical action.',
        evidence: 'moderate',
        evidence_url: 'https://www.ncbi.nlm.nih.gov/snp/rs72921001',
    },
];

/** Index by rsid for O(1) lookup at finding-time. */
export const TRAIT_MAP_BY_RSID: Map<string, VariantTrait> = (() => {
    const m = new Map<string, VariantTrait>();
    for (const t of TRAIT_MAP) m.set(t.rsid.toLowerCase(), t);
    return m;
})();
