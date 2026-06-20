import { describe, it, expect } from 'vitest';
import { decryptBytes, encryptBytes, GeneticEncryptError, sha256Hex } from '../encrypt';

// ─── Test helpers ────────────────────────────────────────────────────────────

async function generateTestKey(): Promise<CryptoKey> {
    return globalThis.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/** Build a deterministic Uint8Array of the requested length. */
function fixture(length: number, seed = 0xab): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) out[i] = (seed + i * 31) & 0xff;
    return out;
}

const MAGIC = new TextEncoder().encode('EGE1');

// ─── round-trip ──────────────────────────────────────────────────────────────

describe('encryptBytes / decryptBytes round-trip', () => {
    it('round-trips a small payload with multiple chunks', async () => {
        const key = await generateTestKey();
        const plain = fixture(200_000); // 200 KB → 4 chunks at 64 KB default

        const enc = await encryptBytes(plain, key);
        expect(enc.chunkCount).toBe(Math.ceil(200_000 / (64 * 1024)));
        expect(enc.plaintextLength).toBe(200_000);

        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec.byteLength).toBe(plain.byteLength);
        expect(dec).toEqual(plain);
    });

    it('round-trips a tiny payload that fits in one chunk', async () => {
        const key = await generateTestKey();
        const plain = fixture(10);

        const enc = await encryptBytes(plain, key);
        expect(enc.chunkCount).toBe(1);

        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec).toEqual(plain);
    });

    it('handles an empty plaintext', async () => {
        const key = await generateTestKey();
        const plain = new Uint8Array(0);

        const enc = await encryptBytes(plain, key);
        expect(enc.chunkCount).toBe(0);
        expect(enc.plaintextLength).toBe(0);

        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec.byteLength).toBe(0);
    });

    it('round-trips a 1 MB payload at the default 64 KB chunk size', async () => {
        const key = await generateTestKey();
        const plain = fixture(1024 * 1024, 17);
        const enc = await encryptBytes(plain, key);
        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec).toEqual(plain);
    }, 30_000);  // 1 MB through AES-GCM in jsdom takes ~4-5s; give CI 30s headroom.

    it('round-trips with a custom chunk size (clamped down)', async () => {
        const key = await generateTestKey();
        const plain = fixture(40_000);
        // 100 → clamped to 4096
        const enc = await encryptBytes(plain, key, { chunkSize: 100 });
        expect(enc.chunkSize).toBe(4096);
        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec).toEqual(plain);
    });

    it('round-trips with a custom chunk size (clamped up)', async () => {
        const key = await generateTestKey();
        const plain = fixture(20_000);
        // 10 MB → clamped to 1 MB
        const enc = await encryptBytes(plain, key, { chunkSize: 10 * 1024 * 1024 });
        expect(enc.chunkSize).toBe(1024 * 1024);
        const dec = await decryptBytes(enc.ciphertext, key);
        expect(dec).toEqual(plain);
    });
});

// ─── envelope shape ─────────────────────────────────────────────────────────

describe('envelope shape', () => {
    it('begins with the EGE1 magic', async () => {
        const key = await generateTestKey();
        const enc = await encryptBytes(fixture(2000), key);
        for (let i = 0; i < MAGIC.byteLength; i++) {
            expect(enc.ciphertext[i]).toBe(MAGIC[i]);
        }
    });

    it('puts a parseable JSON header right after the magic', async () => {
        const key = await generateTestKey();
        const enc = await encryptBytes(fixture(2000), key);
        const headerLen =
            ((enc.ciphertext[4] << 24) >>> 0) |
            (enc.ciphertext[5] << 16) |
            (enc.ciphertext[6] << 8) |
            enc.ciphertext[7];
        const headerBytes = enc.ciphertext.subarray(8, 8 + headerLen);
        const header = JSON.parse(new TextDecoder().decode(headerBytes));
        expect(header.v).toBe(1);
        expect(header.alg).toBe('AES-256-GCM');
        expect(header.chunkSize).toBe(64 * 1024);
        expect(header.plaintextLength).toBe(2000);
        expect(typeof header.plaintextSha256).toBe('string');
        expect(header.plaintextSha256).toHaveLength(64);
    });
});

// ─── tamper detection ──────────────────────────────────────────────────────

describe('tamper detection', () => {
    it('throws when the magic is wrong', async () => {
        const key = await generateTestKey();
        const enc = await encryptBytes(fixture(200), key);
        const corrupted = new Uint8Array(enc.ciphertext);
        corrupted[0] = 0; // overwrite the first byte of the magic
        await expect(decryptBytes(corrupted, key)).rejects.toThrow(GeneticEncryptError);
    });

    it('throws when a ciphertext byte is flipped (GCM tag detection)', async () => {
        const key = await generateTestKey();
        const enc = await encryptBytes(fixture(50_000), key);
        const corrupted = new Uint8Array(enc.ciphertext);
        // Flip a byte deep in the body, past any header structure.
        corrupted[corrupted.byteLength - 100] ^= 0x01;
        await expect(decryptBytes(corrupted, key)).rejects.toThrow();
    });

    it('throws when decrypting with the wrong key', async () => {
        const key = await generateTestKey();
        const otherKey = await generateTestKey();
        const enc = await encryptBytes(fixture(2000), key);
        await expect(decryptBytes(enc.ciphertext, otherKey)).rejects.toThrow();
    });

    it('throws on a truncated envelope', async () => {
        const key = await generateTestKey();
        const enc = await encryptBytes(fixture(2000), key);
        const truncated = enc.ciphertext.subarray(0, 6);
        await expect(decryptBytes(truncated, key)).rejects.toThrow(GeneticEncryptError);
    });
});

// ─── sha256Hex ──────────────────────────────────────────────────────────────

describe('sha256Hex', () => {
    it('produces a 64-char lowercase hex string', async () => {
        const hex = await sha256Hex(new TextEncoder().encode('hello'));
        expect(hex).toHaveLength(64);
        expect(hex).toMatch(/^[0-9a-f]{64}$/);
    });

    it('matches the known SHA-256 of the empty string', async () => {
        // Known vector: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
        const hex = await sha256Hex(new Uint8Array(0));
        expect(hex).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        );
    });
});
