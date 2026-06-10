/**
 * Vault Encryption Utility
 * uses Web Crypto API (AES-GCM) for client-side encryption/decryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

export async function generateVaultKey(): Promise<CryptoKey | null> {
    if (!window.crypto?.subtle) {
        console.warn('Web Crypto API (subtle) not available. Insecure context?');
        return null;
    }
    return await window.crypto.subtle.generateKey(
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importKey(keyData: string): Promise<CryptoKey> {
    const binaryString = atob(keyData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return await window.crypto.subtle.importKey(
        'raw',
        bytes,
        { name: ALGORITHM, length: KEY_LENGTH },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function encryptVaultData(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: ALGORITHM, iv },
        key,
        encodedData
    );

    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
        iv: btoa(String.fromCharCode(...new Uint8Array(iv)))
    };
}

export async function decryptVaultData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
    const binaryCipherText = atob(ciphertext);
    const cipherBytes = new Uint8Array(binaryCipherText.length);
    for (let i = 0; i < binaryCipherText.length; i++) {
        cipherBytes[i] = binaryCipherText.charCodeAt(i);
    }

    const binaryIv = atob(iv);
    const ivBytes = new Uint8Array(binaryIv.length);
    for (let i = 0; i < binaryIv.length; i++) {
        ivBytes[i] = binaryIv.charCodeAt(i);
    }

    const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: ALGORITHM, iv: ivBytes },
        key,
        cipherBytes
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
}
