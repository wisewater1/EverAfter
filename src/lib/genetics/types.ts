/**
 * Genetic data: shared types.
 *
 * PR 1 of the genetics roadmap. Types here mirror the schema in
 * supabase/migrations/20260620190000_create_genetic_storage.sql so the
 * frontend can pass strongly-typed values into the parser, encrypt
 * helper, and upload flow without each consumer re-deriving the shape.
 *
 * Nothing in this PR uses these types yet: they're the stable contract
 * that PRs 2-6 will import.
 */

/** File shapes EverAfter accepts. CHECK constraint mirrors this. */
export type GeneticFormat =
    | '23andme'        // gzipped tab-delimited rsid/chr/pos/genotype, ~20 MB
    | 'ancestrydna'    // similar shape with .txt extension
    | 'myheritage'     // CSV with extra metadata
    | 'familytree'     // FamilyTreeDNA, close to 23andMe layout
    | 'vcf'            // Variant Call Format, clinical-grade variants
    | 'cram'           // reference-compressed aligned reads
    | 'bam'            // aligned reads (large; usually not direct upload)
    | 'fastq';         // raw reads (very large; rarely direct upload)

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'no_call';

/**
 * Posthumous directive: what happens to this DNA file after the user
 * dies. This is the EverAfter differentiator: every other genetic
 * platform punts on this; we ship it first-class.
 *
 * The shape matches the jsonb default in the migration.
 */
export interface PosthumousDirective {
    /**
     * Top-level policy.
     *   'destroy'          : wipe the blob + variant_calls on verified death
     *   'preserve_locked'  : keep encrypted, no survivor access ever
     *   'release_to_pdg'   : release to the named PDG(s) on verified death
     *   'ask_pdg'          : default: PDG must affirm a per-finding decision
     */
    policy: 'destroy' | 'preserve_locked' | 'release_to_pdg' | 'ask_pdg';
    /**
     * Optional: auto-destroy the file N days after death is verified, even
     * if 'release_to_pdg' was set. Belt + suspenders.
     */
    destroy_after_days: number | null;
    /** family_member.id values of designated Posthumous Data Guardians. */
    notify_pdg_ids: string[];
    /**
     * Should the PDG receive a digest of actionable hereditary findings
     * (e.g., BRCA, Lynch syndrome, APOE-ε4) even if raw data is destroyed?
     */
    actionable_findings_to_pdg: boolean;
    /**
     * Should the PDG receive the raw encrypted blob + decryption key?
     * Default false: most users will want findings, not raw data.
     */
    raw_data_to_pdg: boolean;
    /**
     * What to do for blood relatives whose own health is implicated by
     * findings in this file:
     *   'auto' : proactively notify on death
     *   'ask'  : PDG decides per-finding (default)
     *   'never': no notification
     */
    notify_blood_relatives: 'auto' | 'ask' | 'never';
}

/**
 * A row in public.genetic_profiles: one uploaded DNA dataset.
 *
 * The blob itself lives in Supabase Storage (bucket 'genetic-profiles')
 * encrypted with Crypt4GH; this row carries the metadata + the storage
 * path the frontend uses to fetch + decrypt.
 */
export interface GeneticProfile {
    id: string;
    user_id: string;
    /** FK to family_members.id (PR #69). Null until linked. */
    family_member_id: string | null;

    format: GeneticFormat;
    source_provider: string | null;          // '23andMe', 'AncestryDNA'
    chip_version: string | null;             // '23andMe v5'
    snp_count: number;
    sample_count: number;

    /** Object key inside the 'genetic-profiles' bucket. */
    blob_path: string;
    blob_size_bytes: number | null;
    blob_sha256: string | null;
    is_encrypted: boolean;
    encryption_key_id: string | null;

    upload_provenance: Record<string, unknown>;
    posthumous_directive: PosthumousDirective;
    metadata: Record<string, unknown>;

    uploaded_at: string;
    created_at: string;
    updated_at: string;
}

/**
 * A single SNP row extracted from a profile. PR 2 (parser) fills these;
 * PR 5 (risk overlay) reads them by rsid or by trait_id.
 */
export interface VariantCall {
    id: string;
    genetic_profile_id: string;
    rsid: string;
    chromosome: string;
    position: number;
    /** Always 2 chars or '--' (no-call). */
    genotype: string;
    confidence: ConfidenceLevel | null;
    /** Tagged by the trait-mapping pipeline (PR 5). Null until then. */
    trait_id: string | null;
    created_at: string;
}

/**
 * What the parser (PR 2) returns before persistence. The DB layer adds
 * id / created_at / genetic_profile_id at insert time.
 */
export interface ParsedVariant {
    rsid: string;
    chromosome: string;
    position: number;
    genotype: string;
    confidence: ConfidenceLevel | null;
}

/**
 * What the upload flow (PR 4) hands to the persistence helper. The blob
 * has already been encrypted client-side and written to Storage; this
 * struct carries just the metadata needed to create the genetic_profiles
 * row + bulk-insert variant_calls.
 */
export interface NewGeneticProfile {
    family_member_id: string | null;
    format: GeneticFormat;
    source_provider: string | null;
    chip_version: string | null;
    blob_path: string;
    blob_size_bytes: number;
    blob_sha256: string;
    encryption_key_id: string;
    upload_provenance?: Record<string, unknown>;
    posthumous_directive?: Partial<PosthumousDirective>;
    metadata?: Record<string, unknown>;
    variants: ParsedVariant[];
}

/**
 * Default the frontend should pass on first upload when the user hasn't
 * customized the directive yet. The migration encodes the same defaults
 * server-side so a missing directive on insert still produces this shape.
 */
export const DEFAULT_POSTHUMOUS_DIRECTIVE: PosthumousDirective = {
    policy: 'ask_pdg',
    destroy_after_days: null,
    notify_pdg_ids: [],
    actionable_findings_to_pdg: false,
    raw_data_to_pdg: false,
    notify_blood_relatives: 'ask',
};
