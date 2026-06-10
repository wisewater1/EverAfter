import CryptoJS from 'crypto-js';
import { createHmac, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key';

export function encryptToken(token: string): string {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
}

export function decryptToken(encryptedToken: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function generateState(): string {
  return randomBytes(32).toString('hex');
}

export function generateWebhookSecret(): string {
  return randomBytes(64).toString('hex');
}

export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha1' | 'sha256' = 'sha256'
): boolean {
  const hmac = createHmac(algorithm, secret);
  hmac.update(payload);
  const computed = hmac.digest('hex');
  return computed === signature;
}

export function generateDedupKey(provider: string, eventId: string, timestamp: number): string {
  return `${provider}:${eventId}:${timestamp}`;
}
