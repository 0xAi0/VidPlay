import { VaultVideo, DownloadTask, ExpirationDays } from '../types';
import { encryptBuffer } from './crypto';
import { saveVideo } from './db';

/**
 * Extracts a representative thumbnail and video duration from a Blob using an offscreen video element
 */
export async function extractVideoMetadata(blob: Blob): Promise<{ thumbnailUrl: string; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(blob);
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    // Timeout fallback if video decoding fails
    const fallbackTimeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        thumbnailUrl: '',
        duration: 0,
      });
    }, 5000);

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of video
      const targetTime = Math.min(1.5, video.duration / 4);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(fallbackTimeout);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 480;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(objectUrl);
          resolve({
            thumbnailUrl,
            duration: Math.round(video.duration || 0),
          });
          return;
        }
      } catch {
        // canvas tainted or format error
      }
      URL.revokeObjectURL(objectUrl);
      resolve({
        thumbnailUrl: '',
        duration: Math.round(video.duration || 0),
      });
    };

    video.onerror = () => {
      clearTimeout(fallbackTimeout);
      URL.revokeObjectURL(objectUrl);
      resolve({
        thumbnailUrl: '',
        duration: 0,
      });
    };
  });
}

/**
 * Downloads a video from a direct URL with byte-level progress reporting.
 * Uses the server proxy to avoid CORS 'Failed to fetch' errors, and stores
 * directly in local private vault storage for instant offline playback.
 */
export async function downloadAndEncryptUrl(
  url: string,
  title: string,
  folderId: string,
  retentionDays: ExpirationDays,
  onProgress?: (progress: number, speedBps: number, downloadedBytes: number, totalBytes: number) => void
): Promise<VaultVideo> {
  const trimmedUrl = url.trim();

  // Try server proxy first to completely eliminate browser CORS restrictions
  let response: Response;
  const proxyUrl = `/api/proxy-download?url=${encodeURIComponent(trimmedUrl)}`;

  try {
    const res = await fetch(proxyUrl);
    if (res.ok) {
      response = res;
    } else {
      // If proxy returned error status, try reading error message
      let errorMsg = `Server proxy error: ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorMsg = errorJson.error;
      } catch {
        // fallback
      }
      // Try direct fetch as fallback
      try {
        const directRes = await fetch(trimmedUrl, { mode: 'cors' });
        if (directRes.ok) {
          response = directRes;
        } else {
          throw new Error(errorMsg);
        }
      } catch {
        throw new Error(errorMsg);
      }
    }
  } catch (err: any) {
    // If proxy fetch network failed, try direct fetch
    try {
      const directRes = await fetch(trimmedUrl, { mode: 'cors' });
      if (directRes.ok) {
        response = directRes;
      } else {
        throw new Error(`Failed to fetch video: ${directRes.status} ${directRes.statusText}`);
      }
    } catch {
      throw new Error(err.message || 'Failed to download video. Please check URL and network connection.');
    }
  }

  const contentLengthHeader = response.headers.get('content-length');
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  const mimeType = response.headers.get('content-type') || 'video/mp4';

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Streaming response body not supported by browser.');
  }

  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;
  let lastTime = Date.now();
  let bytesSinceLast = 0;
  let speedBps = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      downloadedBytes += value.length;
      bytesSinceLast += value.length;

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 0.5) {
        speedBps = Math.round(bytesSinceLast / elapsed);
        lastTime = now;
        bytesSinceLast = 0;

        const progress = totalBytes > 0 ? Math.min(99, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
        onProgress?.(progress, speedBps, downloadedBytes, totalBytes);
      }
    }
  }

  // Combine chunks into single ArrayBuffer
  const combinedBuffer = new Uint8Array(downloadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combinedBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  onProgress?.(99, 0, downloadedBytes, downloadedBytes);

  // Extract thumbnail and metadata
  const rawBlob = new Blob([combinedBuffer], { type: mimeType });
  const { thumbnailUrl, duration } = await extractVideoMetadata(rawBlob);

  const videoId = 'vid_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const now = Date.now();
  const clampedDays = Math.max(1, Math.min(30, Number(retentionDays) || 7));
  const expiresAt = now + clampedDays * 24 * 60 * 60 * 1000;

  // Store directly in local private vault storage (IndexedDB)
  const videoRecord: VaultVideo = {
    id: videoId,
    title: title || cleanTitleFromUrl(trimmedUrl),
    originalUrl: trimmedUrl,
    sourceType: 'url',
    sizeBytes: downloadedBytes,
    mimeType,
    thumbnailUrl,
    duration,
    createdAt: now,
    expiresAt,
    retentionDays: clampedDays,
    folderId: folderId || 'all',
    encryption: {
      algorithm: 'DirectStorage',
      keyLengthBits: 0,
      ivHex: 'raw',
      saltHex: 'raw',
      encryptedSize: downloadedBytes,
    },
  };

  await saveVideo(videoRecord, combinedBuffer.buffer);

  onProgress?.(100, 0, downloadedBytes, downloadedBytes);

  return videoRecord;
}

/**
 * Imports a user local file into the private vault storage for offline playback
 */
export async function importLocalVideoFile(
  file: File,
  folderId: string,
  retentionDays: ExpirationDays,
  onProgress?: (progress: number) => void
): Promise<VaultVideo> {
  onProgress?.(15);
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(50);

  const { thumbnailUrl, duration } = await extractVideoMetadata(file);
  onProgress?.(80);

  const videoId = 'vid_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  const now = Date.now();
  const expiresAt = now + retentionDays * 24 * 60 * 60 * 1000;

  const videoRecord: VaultVideo = {
    id: videoId,
    title: file.name.replace(/\.[^/.]+$/, ''),
    sourceType: 'import',
    sizeBytes: file.size,
    mimeType: file.type || 'video/mp4',
    thumbnailUrl,
    duration,
    createdAt: now,
    expiresAt,
    retentionDays,
    folderId: folderId || 'all',
    encryption: {
      algorithm: 'DirectStorage',
      keyLengthBits: 0,
      ivHex: 'raw',
      saltHex: 'raw',
      encryptedSize: file.size,
    },
  };

  await saveVideo(videoRecord, arrayBuffer);
  onProgress?.(100);

  return videoRecord;
}

export function cleanTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    const decoded = decodeURIComponent(filename).replace(/\.[^/.]+$/, '');
    if (decoded && decoded.length > 2) {
      return decoded.replace(/[-_]/g, ' ');
    }
  } catch {
    // fallback
  }
  return 'Encrypted Video Stream';
}
