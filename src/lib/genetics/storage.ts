/**
 * Genetic data — persistence layer.
 *
 * PR 4 of the genetics roadmap. Bridges the parser (PR #72) and the
 * encrypt envelope (PR #73) with the Supabase tables and Storage bucket
 * from PR #71.
 *
 * Pure async helpers — no React, no UI. The upload component (also in
 * PR 4) is the only caller for now.
 */

import { supabase } from '../supabase';
import { generateVaultKey, exportKey } from '../vault-encryption';
import { encryptBytes, sha256Hex } from './encrypt';
import { parseGeneticFile } from './parsers';
import type {
    GeneticFormat,
    GeneticProfile,
    NewGeneticProfile,
    ParsedVariant,
    PosthumousDirective,
} from './types';
import { DEFAULT_POSTHUMOUS_DIRECTIVE } from './types';

const BUCKET_ID = 'genetic-profiles';

export class GeneticStorageError extends Error {
    constructor(message: string, public readonly cause?: unknown) {
        super(message);
        this.name = 'GeneticStorageError';
    }
}

function ensureClient() {
    if (!supabase) {
        throw new GeneticStorageError('Supabase client is not configured.');
    }
    return supabase;
}

// ─── Read side ──────────────────────────────────────────────────────────────

/**
 * Every genetic profile owned by the caller, newest first.
 * Optionally filter to one family member.
 */
export async function listGeneticProfiles(opts: {
    userId: string;
    familyMemberId?: string | null;
}): Promise<GeneticProfile[]> {
    const client = ensureClient();
    let query = client
        .from('genetic_profiles')
        .select('*')
        .eq('user_id', opts.userId)
        .order('uploaded_at', { ascending: false });

    if (opts.familyMemberId === null) {
        query = query.is('family_member_id', null);
    } else if (typeof opts.familyMemberId === 'string') {
        query = query.eq('family_member_id', opts.familyMemberId);
    }

    const { data, error } = await query;
    if (error) {
        throw new GeneticStorageError(error.message, error);
    }
    return (data ?? []) as GeneticProfile[];
}

/** Single profile by id, scoped to the caller. */
export async function getGeneticProfile(
    id: string,
    userId: string,
): Promise<GeneticProfile | null> {
    const client = ensureClient();
    const { data, error } = await client
        .from('genetic_profiles')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
    if (error) throw new GeneticStorageError(error.message, error);
    return (data ?? null) as GeneticProfile | null;
}

// ─── Write side ─────────────────────────────────────────────────────────────

export interface UploadProgress {
    phase: 'parse' | 'encrypt' | 'upload' | 'persist' | 'done';
    /** 0..1 within the phase. */
    progress: number;
    message?: string;
}

export interface UploadRequest {
    userId: string;
    familyMemberId: string | null;
    /** The raw decompressed file contents as text. */
    text: string;
    /** Caller may pass a directive; missing fields fall back to defaults. */
    posthumousDirective?: Partial<PosthumousDirective>;
    /** Optional progress callback driven by the four phases below. */
    onProgress?: (progress: UploadProgress) => void;
}

export interface UploadResult {
    profile: GeneticProfile;
    variantCount: number;
    skipped: number;
}

/**
 * End-to-end upload:
 *
 *   1. parse        → ParsedVariant[] + format + chip_version
 *   2. encrypt      → EGE1 envelope (chunked AES-GCM)
 *   3. upload       → Supabase Storage at <uid>/<profile_id>.<ext>.c4gh
 *   4. persist      → insert genetic_profiles row + bulk variant_calls
 *
 * The encryption key is a fresh per-profile vault key. Its exported
 * base64 form is returned to the caller via the genetic_profiles row's
 * encryption_key_id column AFTER the caller has stored it in the user's
 * vault. (This module never stores plaintext keys server-side.)
 *
 * Cancellation is not modelled in PR 4 — pre-upload steps are sync
 * enough that aborting after parse is the only meaningful exit point.
 * Future PR can thread an AbortSignal through.
 */
export async function uploadGeneticFile(req: UploadRequest): Promise<UploadResult> {
    const client = ensureClient();
    const tick = (phase: UploadProgress['phase'], progress: number, message?: string) =>
        req.onProgress?.({ phase, progress, message });

    // 1. Parse ----------------------------------------------------------------
    tick('parse', 0);
    const parsed = parseGeneticFile(req.text);
    tick('parse', 1, `Parsed ${parsed.variants.length} variants`);

    // 2. Encrypt --------------------------------------------------------------
    tick('encrypt', 0);
    const cryptoKey = await generateVaultKey();
    if (!cryptoKey) {
        throw new GeneticStorageError(
            'Web Crypto unavailable — insecure context? Genetic upload requires HTTPS.',
        );
    }
    const exportedKey = await exportKey(cryptoKey);

    const plaintextBytes = new TextEncoder().encode(req.text);
    const enc = await encryptBytes(plaintextBytes, cryptoKey);
    tick('encrypt', 1, `Encrypted ${enc.chunkCount} chunks (${plaintextBytes.byteLength} B)`);

    // 3. Upload ---------------------------------------------------------------
    // Path scheme matches the storage RLS policy: first folder = caller uid.
    const profileId = crypto.randomUUID();
    const blobPath = `${req.userId}/${profileId}.${formatExt(parsed.format)}.c4gh`;

    tick('upload', 0);
    const { error: uploadError } = await client.storage
        .from(BUCKET_ID)
        .upload(blobPath, new Blob([enc.ciphertext], { type: 'application/octet-stream' }), {
            contentType: 'application/octet-stream',
            upsert: false,
        });
    if (uploadError) {
        throw new GeneticStorageError(
            `Storage upload failed: ${uploadError.message}`,
            uploadError,
        );
    }
    tick('upload', 1);

    // 4. Persist --------------------------------------------------------------
    tick('persist', 0);
    const newProfile: Omit<NewGeneticProfile, 'variants'> & { id: string; user_id: string } = {
        id: profileId,
        user_id: req.userId,
        family_member_id: req.familyMemberId,
        format: parsed.format,
        source_provider: providerForFormat(parsed.format),
        chip_version: parsed.chip_version,
        blob_path: blobPath,
        blob_size_bytes: enc.ciphertext.byteLength,
        blob_sha256: enc.plaintextSha256,
        encryption_key_id: exportedKey,
        posthumous_directive: {
            ...DEFAULT_POSTHUMOUS_DIRECTIVE,
            ...req.posthumousDirective,
        },
        metadata: {
            chunkSize: enc.chunkSize,
            chunkCount: enc.chunkCount,
            parserSkipped: parsed.skipped,
        },
        upload_provenance: {
            sourceFilename: null,
            uploadedAt: new Date().toISOString(),
        },
    };

    const { data: insertedProfile, error: insertError } = await client
        .from('genetic_profiles')
        .insert({
            ...newProfile,
            snp_count: parsed.variants.length,
            sample_count: 1,
            is_encrypted: true,
        })
        .select()
        .single();
    if (insertError || !insertedProfile) {
        // Best-effort rollback: try to delete the blob we just uploaded so
        // we don't leave orphaned ciphertext in storage. RLS allows the
        // caller to delete their own object.
        await client.storage.from(BUCKET_ID).remove([blobPath]).catch(() => {});
        throw new GeneticStorageError(
            `Persisting genetic_profile failed: ${insertError?.message ?? 'unknown'}`,
            insertError,
        );
    }

    // Bulk-insert variant_calls. Done in batches to avoid hitting the
    // PostgREST request size limit on very large files (10k rows ≈ ~1 MB).
    const BATCH = 5000;
    for (let i = 0; i < parsed.variants.length; i += BATCH) {
        const batch = parsed.variants.slice(i, i + BATCH).map((v: ParsedVariant) => ({
            genetic_profile_id: profileId,
            rsid: v.rsid,
            chromosome: v.chromosome,
            position: v.position,
            genotype: v.genotype,
            confidence: v.confidence,
        }));
        const { error: variantsError } = await client.from('variant_calls').insert(batch);
        if (variantsError) {
            // Don't try to rollback variant_calls — the profile row is
            // already in. Surface the error so the caller can retry the
            // remaining batches.
            throw new GeneticStorageError(
                `Inserting variant_calls batch ${i / BATCH} failed: ${variantsError.message}`,
                variantsError,
            );
        }
        tick('persist', Math.min(1, (i + batch.length) / parsed.variants.length));
    }
    tick('done', 1);

    return {
        profile: insertedProfile as GeneticProfile,
        variantCount: parsed.variants.length,
        skipped: parsed.skipped,
    };
}

/** Delete a profile, its variant_calls (FK CASCADE), and its blob. */
export async function deleteGeneticProfile(
    id: string,
    userId: string,
): Promise<void> {
    const client = ensureClient();
    const profile = await getGeneticProfile(id, userId);
    if (!profile) return;

    // Remove blob first — if this fails RLS will keep the row visible
    // and the user can retry. The reverse order would leave an orphaned
    // ciphertext blob.
    await client.storage.from(BUCKET_ID).remove([profile.blob_path]).catch(() => {});

    const { error } = await client
        .from('genetic_profiles')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    if (error) throw new GeneticStorageError(error.message, error);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatExt(format: GeneticFormat): string {
    switch (format) {
        case '23andme':
            return 'txt';
        case 'ancestrydna':
            return 'txt';
        case 'myheritage':
        case 'familytree':
            return 'csv';
        case 'vcf':
            return 'vcf';
        case 'cram':
            return 'cram';
        case 'bam':
            return 'bam';
        case 'fastq':
            return 'fq';
        default:
            return 'bin';
    }
}

function providerForFormat(format: GeneticFormat): string {
    switch (format) {
        case '23andme':
            return '23andMe';
        case 'ancestrydna':
            return 'AncestryDNA';
        case 'myheritage':
            return 'MyHeritage';
        case 'familytree':
            return 'FamilyTreeDNA';
        case 'vcf':
            return 'VCF';
        case 'cram':
            return 'CRAM';
        case 'bam':
            return 'BAM';
        case 'fastq':
            return 'FASTQ';
        default:
            return 'Unknown';
    }
}

// Re-export for one-stop import in the upload component.
export { sha256Hex };
