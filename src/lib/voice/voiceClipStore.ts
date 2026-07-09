/**
 * Keyless, on-device store for recorded voice clips (a person's REAL voice).
 * Clips live in IndexedDB so nothing leaves the device and it works with no
 * backend and no API key — the "record and replay their real voice" path that
 * works in demo and signed-out. (Arbitrary-text cloning is the separate backend
 * service.)
 */
export interface VoiceClip {
    id: string;
    familyMemberId: string;
    blob: Blob;
    mime: string;
    durationSeconds: number;
    prompt?: string;
    createdAt: number;
}

const DB_NAME = 'everafter_voice';
const STORE = 'clips';

export function voiceStoreSupported(): boolean {
    return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const os = db.createObjectStore(STORE, { keyPath: 'id' });
                os.createIndex('byMember', 'familyMemberId', { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function putVoiceClip(
    clip: Omit<VoiceClip, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
): Promise<VoiceClip> {
    const full = {
        ...clip,
        id: clip.id || `clip-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        createdAt: clip.createdAt || Date.now(),
    } as VoiceClip;
    const db = await openDb();
    try {
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(full);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } finally {
        db.close();
    }
    return full;
}

export async function listVoiceClips(familyMemberId: string): Promise<VoiceClip[]> {
    const db = await openDb();
    try {
        const clips = await new Promise<VoiceClip[]>((res, rej) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).index('byMember').getAll(familyMemberId);
            req.onsuccess = () => res((req.result as VoiceClip[]) || []);
            req.onerror = () => rej(req.error);
        });
        return clips.sort((a, b) => b.createdAt - a.createdAt);
    } finally {
        db.close();
    }
}

export async function deleteVoiceClip(id: string): Promise<void> {
    const db = await openDb();
    try {
        await new Promise<void>((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
    } finally {
        db.close();
    }
}
