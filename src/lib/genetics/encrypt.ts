/**
 * Genetic data — chunked client-side encryption.
 *
 * PR 3 of the genetics roadmap. Encrypts raw DNA file bytes in the
 * browser using Web Crypto (AES-256-GCM, same primitive the legacy
 * vault uses) before anything reaches Supabase Storage.
 *
 * The envelope layout is deliberately Crypt4GH-shaped — chunked, with a
 * structured header — so a future PR can swap the AES-GCM implementation
 * for a real Crypt4GH-JS one without changing the call sites or the
 * stored blob format expectations. The schema's `blob_path` /
 * `blob_sha256` / `is_encrypted` columns already model exactly this.
 *
 * Envelope layout (raw bytes):
 *
 *   magic           4 bytes   "EGE1"   (EverAfter Genetic Envelope v1)
 *   header_length   4 bytes   uint32 big-endian
 *   header          variable  UTF-8 JSON describing chunkSize, count,
 *                              plaintextSha256, plaintextLength, etc.
 *   chunks          variable  for each chunk:
 *                                 iv  12 bytes
 *                                 ct  variable (plaintext + 16-byte tag)
 *
 * Default chunkSize is 64 KB, picked to balance:
 *   - keeping the envelope small for typical 20 MB consumer DNA files
 *     (~320 chunks → ~5 KB of IV overhead, negligible against blob size)
 *   - supporting eventual byte-range fetch from storage so a future PR
 *     can decrypt only the SNPs being read instead of the whole file.
 *
 * KEYING
 * Takes a CryptoKey directly so the caller can reuse the existing vault
 * key (src/lib/vault-encryption.ts) or generate a per-profile key. Per-
 * profile keys are the right long-term answer (limits blast radius if
 * one is compromised) but interop with the existing vault is what
 * unblocks PR 4.
 */

const MAGIC = new TextEncoder().encode('EGE1');
const ALGORITHM = 'AES-GCM';
const IV_BYTES = 12;
const GCM_TAG_BYTES = 16;
const DEFAULT_CHUNK_SIZE = 64 * 1024; // 64 KB

export class GeneticEncryptError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GeneticEncryptError';
    }
}

interface EnvelopeHeader {
    v: 1;
    /** Plaintext chunk size in bytes (NOT including the GCM tag). */
    chunkSize: number;
    /** Total number of chunks. */
    chunkCount: number;
    /** Hex-encoded SHA-256 of the plaintext. */
    plaintextSha256: string;
    /** Plaintext length in bytes. */
    plaintextLength: number;
    /** Algorithm tag — exists so future versions can pick another cipher. */
    alg: 'AES-256-GCM';
}

export interface EncryptResult {
    /** The full envelope as bytes — ready to upload to Storage. */
    ciphertext: Uint8Array;
    /** SHA-256 of the plaintext, hex-encoded. Goes in the DB row. */
    plaintextSha256: string;
    /** Plaintext length in bytes. */
    plaintextLength: number;
    /** Chunk size actually used (matches the request unless clamped). */
    chunkSize: number;
    /** Number of ciphertext chunks. */
    chunkCount: number;
}

export interface EncryptOptions {
    /** Override the default 64 KB chunk size. Clamped to [4 KB, 1 MB]. */
    chunkSize?: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getSubtle(): SubtleCrypto {
    const subtle =
        typeof globalThis !== 'undefined' && globalThis.crypto?.subtle
            ? globalThis.crypto.subtle
            : null;
    if (!subtle) {
        throw new GeneticEncryptError(
            'Web Crypto SubtleCrypto is not available. This API requires a secure context (HTTPS or localhost) and a modern runtime.',
        );
    }
    return subtle;
}

function randomBytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    globalThis.crypto.getRandomValues(out);
    return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const subtle = getSubtle();
    const digest = await subtle.digest('SHA-256', bytes);
    const view = new Uint8Array(digest);
    let hex = '';
    for (let i = 0; i < view.length; i++) {
        hex += view[i].toString(16).padStart(2, '0');
    }
    return hex;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number) {
    buf[offset] = (value >>> 24) & 0xff;
    buf[offset + 1] = (value >>> 16) & 0xff;
    buf[offset + 2] = (value >>> 8) & 0xff;
    buf[offset + 3] = value & 0xff;
}

function readUint32BE(buf: Uint8Array, offset: number): number {
    return (
        ((buf[offset] << 24) >>> 0) |
        (buf[offset + 1] << 16) |
        (buf[offset + 2] << 8) |
        buf[offset + 3]
    );
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
    let total = 0;
    for (const p of parts) total += p.byteLength;
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.byteLength;
    }
    return out;
}

function clampChunkSize(requested: number | undefined): number {
    const n = typeof requested === 'number' && requested > 0 ? requested : DEFAULT_CHUNK_SIZE;
    if (n < 4 * 1024) return 4 * 1024;
    if (n > 1024 * 1024) return 1024 * 1024;
    return n;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext byte array into an EGE1 envelope using the given
 * CryptoKey. Allocates one Uint8Array roughly the size of the
 * plaintext; on consumer DNA files (~20 MB) this is fine.
 */
export async function encryptBytes(
    plaintext: Uint8Array,
    key: CryptoKey,
    options: EncryptOptions = {},
): Promise<EncryptResult> {
    if (!(plaintext instanceof Uint8Array)) {
        throw new GeneticEncryptError('plaintext must be a Uint8Array');
    }
    const subtle = getSubtle();
    const chunkSize = clampChunkSize(options.chunkSize);

    const plaintextSha256 = await sha256Hex(plaintext);
    const chunkCount =
        plaintext.byteLength === 0 ? 0 : Math.ceil(plaintext.byteLength / chunkSize);

    const chunks: Uint8Array[] = [];
    for (let i = 0; i < chunkCount; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, plaintext.byteLength);
        const slice = plaintext.subarray(start, end);

        const iv = randomBytes(IV_BYTES);
        const ciphertextBuffer = await subtle.encrypt(
            { name: ALGORITHM, iv },
            key,
            slice,
        );
        const ct = new Uint8Array(ciphertextBuffer);

        // Per-chunk frame: [iv | ct]. The GCM tag is appended by subtle.encrypt
        // inside ct, so ct.byteLength = slice.byteLength + GCM_TAG_BYTES.
        const frame = new Uint8Array(IV_BYTES + ct.byteLength);
        frame.set(iv, 0);
        frame.set(ct, IV_BYTES);
        chunks.push(frame);
    }

    const header: EnvelopeHeader = {
        v: 1,
        chunkSize,
        chunkCount,
        plaintextSha256,
        plaintextLength: plaintext.byteLength,
        alg: 'AES-256-GCM',
    };
    const headerBytes = new TextEncoder().encode(JSON.stringify(header));
    const headerLen = new Uint8Array(4);
    writeUint32BE(headerLen, 0, headerBytes.byteLength);

    const envelope = concatBytes([MAGIC, headerLen, headerBytes, ...chunks]);

    return {
        ciphertext: envelope,
        plaintextSha256,
        plaintextLength: plaintext.byteLength,
        chunkSize,
        chunkCount,
    };
}

/**
 * Decrypt an EGE1 envelope back into the original plaintext bytes.
 * Throws if the magic doesn't match, the header is malformed, the
 * cipher algorithm isn't supported, or any GCM auth tag fails.
 */
export async function decryptBytes(
    envelope: Uint8Array,
    key: CryptoKey,
): Promise<Uint8Array> {
    if (!(envelope instanceof Uint8Array)) {
        throw new GeneticEncryptError('envelope must be a Uint8Array');
    }
    if (envelope.byteLength < MAGIC.byteLength + 4) {
        throw new GeneticEncryptError('Envelope is too short to be valid.');
    }
    for (let i = 0; i < MAGIC.byteLength; i++) {
        if (envelope[i] !== MAGIC[i]) {
            throw new GeneticEncryptError('Envelope magic does not match EGE1.');
        }
    }
    const subtle = getSubtle();

    const headerLen = readUint32BE(envelope, MAGIC.byteLength);
    const headerStart = MAGIC.byteLength + 4;
    const headerEnd = headerStart + headerLen;
    if (headerEnd > envelope.byteLength) {
        throw new GeneticEncryptError(
            'Envelope header length runs past the end of the envelope.',
        );
    }
    let header: EnvelopeHeader;
    try {
        header = JSON.parse(
            new TextDecoder().decode(envelope.subarray(headerStart, headerEnd)),
        );
    } catch {
        throw new GeneticEncryptError('Envelope header is not valid JSON.');
    }
    if (header.v !== 1 || header.alg !== 'AES-256-GCM') {
        throw new GeneticEncryptError(
            `Unsupported envelope version/alg: v=${header.v}, alg=${header.alg}`,
        );
    }

    // Walk the chunks. Each frame is [iv (12) | ciphertext].
    // We don't trust the on-disk byte length of any chunk except the
    // last; the per-chunk plaintext size is implied by the header's
    // chunkSize EXCEPT the final chunk which can be shorter.
    let offset = headerEnd;
    const fullChunkCipherLen = header.chunkSize + GCM_TAG_BYTES; // GCM tag is 16
    const out = new Uint8Array(header.plaintextLength);
    let outOffset = 0;

    for (let i = 0; i < header.chunkCount; i++) {
        const isLast = i === header.chunkCount - 1;
        const expectedPlainLen = isLast
            ? header.plaintextLength - (header.chunkCount - 1) * header.chunkSize
            : header.chunkSize;
        const expectedCipherLen = expectedPlainLen + GCM_TAG_BYTES;

        const ivStart = offset;
        const ivEnd = ivStart + IV_BYTES;
        const ctStart = ivEnd;
        const ctEnd = ctStart + expectedCipherLen;

        if (ctEnd > envelope.byteLength) {
            throw new GeneticEncryptError(
                `Chunk ${i} runs past the end of the envelope.`,
            );
        }

        const iv = envelope.subarray(ivStart, ivEnd);
        const ct = envelope.subarray(ctStart, ctEnd);

        // subtle.decrypt accepts ArrayBufferView so passing subarrays avoids
        // copying.
        const plainBuf = await subtle.decrypt({ name: ALGORITHM, iv }, key, ct);
        const plain = new Uint8Array(plainBuf);

        if (plain.byteLength !== expectedPlainLen) {
            throw new GeneticEncryptError(
                `Chunk ${i} decrypted to ${plain.byteLength} bytes, expected ${expectedPlainLen}.`,
            );
        }
        out.set(plain, outOffset);
        outOffset += plain.byteLength;
        offset = ctEnd;
    }

    if (outOffset !== header.plaintextLength) {
        throw new GeneticEncryptError(
            'Decrypted byte total does not match the header plaintext length.',
        );
    }

    // Integrity check: re-hash and compare against the header's sha256.
    const sha = await sha256Hex(out);
    if (sha !== header.plaintextSha256) {
        throw new GeneticEncryptError(
            'Plaintext SHA-256 does not match the envelope header — possible tampering.',
        );
    }

    return out;
}

/** Exposed for the DB layer: caller computes once, stores it. */
export { sha256Hex };
