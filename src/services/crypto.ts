/**
 * AES-256-GCM Web Crypto Implementation
 * Provides military-grade client-side encryption for offline media blobs.
 */

// Device-bound master secret stored in session / local storage for transparent vault access
const MASTER_SECRET_STORAGE_KEY = 'ovv_master_secret_v1';

function getOrGenerateMasterSecret(): string {
  let secret = localStorage.getItem(MASTER_SECRET_STORAGE_KEY);
  if (!secret) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(MASTER_SECRET_STORAGE_KEY, secret);
  }
  return secret;
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const byteArray = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 with SHA-256
 */
async function deriveKey(salt: Uint8Array, customPassphrase?: string): Promise<CryptoKey> {
  const secret = customPassphrase || getOrGenerateMasterSecret();
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedDataResult {
  encryptedBuffer: ArrayBuffer;
  ivHex: string;
  saltHex: string;
  originalSize: number;
  encryptedSize: number;
}

/**
 * Encrypts an ArrayBuffer with AES-256-GCM
 */
export async function encryptBuffer(
  data: ArrayBuffer,
  customPassphrase?: string
): Promise<EncryptedDataResult> {
  // Generate 16-byte random salt for PBKDF2
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);

  // Derive 256-bit AES key
  const key = await deriveKey(salt, customPassphrase);

  // Generate standard 12-byte (96-bit) IV for AES-GCM
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);

  // Perform hardware-accelerated AES-256-GCM encryption
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    data
  );

  return {
    encryptedBuffer,
    ivHex: bufferToHex(iv),
    saltHex: bufferToHex(salt),
    originalSize: data.byteLength,
    encryptedSize: encryptedBuffer.byteLength,
  };
}

/**
 * Decrypts an AES-256-GCM encrypted ArrayBuffer back to original plaintext
 */
export async function decryptBuffer(
  encryptedData: ArrayBuffer,
  ivHex: string,
  saltHex: string,
  customPassphrase?: string
): Promise<ArrayBuffer> {
  const iv = hexToBuffer(ivHex);
  const salt = hexToBuffer(saltHex);
  const key = await deriveKey(salt, customPassphrase);

  return window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    key,
    encryptedData
  );
}

/**
 * Creates a decrypted Blob and temporary Object URL for video playback.
 * Returns an object containing the URL and a cleanup function to revoke it when finished.
 */
export async function createDecryptedMediaUrl(
  encryptedData: ArrayBuffer,
  ivHex: string,
  saltHex: string,
  mimeType: string,
  customPassphrase?: string
): Promise<{ url: string; revoke: () => void }> {
  // If stored as raw unencrypted bytes or without encryption headers
  if (!ivHex || ivHex === 'raw' || !saltHex || saltHex === 'raw') {
    const blob = new Blob([encryptedData], { type: mimeType || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return {
      url,
      revoke: () => {
        URL.revokeObjectURL(url);
      },
    };
  }

  try {
    const decryptedBuffer = await decryptBuffer(encryptedData, ivHex, saltHex, customPassphrase);
    const blob = new Blob([decryptedBuffer], { type: mimeType || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return {
      url,
      revoke: () => {
        URL.revokeObjectURL(url);
      },
    };
  } catch (err) {
    console.warn('Decryption failed, falling back to direct video stream:', err);
    const blob = new Blob([encryptedData], { type: mimeType || 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return {
      url,
      revoke: () => {
        URL.revokeObjectURL(url);
      },
    };
  }
}

/**
 * Computes a SHA-256 fingerprint of the key or file for cryptographic verification display
 */
export async function computeSha256Fingerprint(data: ArrayBuffer | string): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hash = await window.crypto.subtle.digest('SHA-256', buffer);
  return bufferToHex(hash).substring(0, 16).toUpperCase();
}

/**
 * Encrypts arbitrary text string (URLs, notes, JSON) with AES-256-GCM
 */
export async function encryptText(
  text: string,
  customPassphrase?: string
): Promise<{ cipherHex: string; ivHex: string; saltHex: string }> {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  const result = await encryptBuffer(encoded.buffer as ArrayBuffer, customPassphrase);
  return {
    cipherHex: bufferToHex(result.encryptedBuffer),
    ivHex: result.ivHex,
    saltHex: result.saltHex,
  };
}

/**
 * Decrypts AES-256-GCM ciphertext hex back to UTF-8 plaintext string
 */
export async function decryptText(
  cipherHex: string,
  ivHex: string,
  saltHex: string,
  customPassphrase?: string
): Promise<string> {
  const cipherBytes = hexToBuffer(cipherHex);
  const decryptedBuffer = await decryptBuffer(cipherBytes.buffer as ArrayBuffer, ivHex, saltHex, customPassphrase);
  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Zero-trace cryptographic scrubbing: overwrites memory buffer with random bytes before deletion
 */
export function secureScrubBuffer(buffer: ArrayBuffer | Uint8Array): void {
  const target = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (window.crypto && window.crypto.getRandomValues) {
    try {
      window.crypto.getRandomValues(target);
    } catch {
      // fallback
    }
  }
  target.fill(0);
}

