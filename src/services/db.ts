import { 
  VaultVideo, 
  VaultFolder, 
  StorageStats, 
  SecuritySettings, 
  ExpirationDays,
  SecureUrlItem,
  EncryptedUrlRecord
} from '../types';
import { encryptText, decryptText, secureScrubBuffer } from './crypto';

const DB_NAME = 'offline_video_vault_db';
const DB_VERSION = 2;

const STORES = {
  VIDEOS: 'videos',
  BLOBS: 'video_blobs',
  FOLDERS: 'folders',
  SETTINGS: 'settings',
  SECURE_URLS: 'secure_urls',
};

const DEFAULT_FOLDERS: VaultFolder[] = [
  { id: 'all', name: 'All Items', color: 'zinc', iconName: 'Film', createdAt: 0, isSystem: true },
  { id: 'favorites', name: 'Favorites', color: 'rose', iconName: 'Heart', createdAt: 0, isSystem: true },
  { id: 'quick-expire', name: 'Quick Expire (1-3d)', color: 'amber', iconName: 'Clock', createdAt: 0, isSystem: true },
  { id: 'downloads', name: 'Downloads', color: 'blue', iconName: 'Download', createdAt: 0, isSystem: true },
  { id: 'watchlist', name: 'Watch Later', color: 'purple', iconName: 'Bookmark', createdAt: 0, isSystem: true },
  { id: 'courses', name: 'Lectures & Tutorials', color: 'emerald', iconName: 'Folder', createdAt: 0 },
];

const DEFAULT_SETTINGS: SecuritySettings = {
  autoPurgeOnStartup: true,
  defaultRetentionDays: 7,
  secureZeroTraceWipe: true,
  warnExpiringWithin24h: true,
  notifyOnAutoPurge: true,
  useHardwareCrypto: true,
  requirePinToPlay: false,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        const videoStore = db.createObjectStore(STORES.VIDEOS, { keyPath: 'id' });
        videoStore.createIndex('folderId', 'folderId', { unique: false });
        videoStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        videoStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.BLOBS)) {
        db.createObjectStore(STORES.BLOBS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.FOLDERS)) {
        db.createObjectStore(STORES.FOLDERS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.SECURE_URLS)) {
        const urlStore = db.createObjectStore(STORES.SECURE_URLS, { keyPath: 'id' });
        urlStore.createIndex('folderId', 'folderId', { unique: false });
        urlStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}


/**
 * Initialize default folders and settings if first run
 */
export async function initStorage(): Promise<void> {
  const db = await openDatabase();
  const folderTx = db.transaction(STORES.FOLDERS, 'readonly');
  const folderStore = folderTx.objectStore(STORES.FOLDERS);
  const countReq = folderStore.count();

  return new Promise((resolve, reject) => {
    countReq.onsuccess = async () => {
      if (countReq.result === 0) {
        const writeTx = db.transaction(STORES.FOLDERS, 'readwrite');
        const writeStore = writeTx.objectStore(STORES.FOLDERS);
        for (const folder of DEFAULT_FOLDERS) {
          writeStore.put(folder);
        }
        writeTx.oncomplete = () => resolve();
        writeTx.onerror = () => reject(writeTx.error);
      } else {
        resolve();
      }
    };
    countReq.onerror = () => reject(countReq.error);
  });
}

export async function saveVideo(video: VaultVideo, encryptedBuffer: ArrayBuffer): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.VIDEOS, STORES.BLOBS], 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();

    const videoStore = tx.objectStore(STORES.VIDEOS);
    videoStore.put(video);

    const blobStore = tx.objectStore(STORES.BLOBS);
    blobStore.put({ id: video.id, encryptedBuffer });
  });
}

export async function getAllVideos(): Promise<VaultVideo[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readonly');
    const store = tx.objectStore(STORES.VIDEOS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getVideo(id: string): Promise<{ video: VaultVideo; encryptedBuffer: ArrayBuffer } | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.VIDEOS, STORES.BLOBS], 'readonly');
    const videoStore = tx.objectStore(STORES.VIDEOS);
    const blobStore = tx.objectStore(STORES.BLOBS);

    const videoReq = videoStore.get(id);
    const blobReq = blobStore.get(id);

    tx.oncomplete = () => {
      if (!videoReq.result || !blobReq.result) {
        resolve(null);
      } else {
        resolve({
          video: videoReq.result as VaultVideo,
          encryptedBuffer: blobReq.result.encryptedBuffer as ArrayBuffer,
        });
      }
    };

    tx.onerror = () => reject(tx.error);
  });
}

export async function updateVideo(partial: Partial<VaultVideo> & { id: string }): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.VIDEOS);
    const getReq = store.get(partial.id);

    getReq.onsuccess = () => {
      if (getReq.result) {
        const updated = { ...getReq.result, ...partial };
        store.put(updated);
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function renewVideoExpiration(id: string, days: ExpirationDays): Promise<VaultVideo | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.VIDEOS, 'readwrite');
    const store = tx.objectStore(STORES.VIDEOS);
    const getReq = store.get(id);

    let updatedVideo: VaultVideo | null = null;

    getReq.onsuccess = () => {
      if (getReq.result) {
        const video = getReq.result as VaultVideo;
        const now = Date.now();
        const clampedDays = Math.max(1, Math.min(30, Number(days) || 7));
        const durationMs = clampedDays * 24 * 60 * 60 * 1000;
        video.retentionDays = clampedDays;
        video.expiresAt = now + durationMs;
        store.put(video);
        updatedVideo = video;
      }
    };

    tx.oncomplete = () => resolve(updatedVideo);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Updates a video's retention period to any value between 1 and 30 days
 */
export async function updateVideoRetention(id: string, days: number): Promise<VaultVideo | null> {
  const clampedDays = Math.max(1, Math.min(30, Math.round(days)));
  return renewVideoExpiration(id, clampedDays);
}

export async function deleteVideo(id: string, zeroTrace: boolean = true): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.VIDEOS, STORES.BLOBS], 'readwrite');
    const videoStore = tx.objectStore(STORES.VIDEOS);
    const blobStore = tx.objectStore(STORES.BLOBS);

    if (zeroTrace) {
      const getReq = blobStore.get(id);
      getReq.onsuccess = () => {
        if (getReq.result?.encryptedBuffer) {
          secureScrubBuffer(getReq.result.encryptedBuffer);
        }
        blobStore.delete(id);
        videoStore.delete(id);
      };
    } else {
      videoStore.delete(id);
      blobStore.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMultipleVideos(ids: string[], zeroTrace: boolean = true): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.VIDEOS, STORES.BLOBS], 'readwrite');
    const videoStore = tx.objectStore(STORES.VIDEOS);
    const blobStore = tx.objectStore(STORES.BLOBS);

    for (const id of ids) {
      if (zeroTrace) {
        const getReq = blobStore.get(id);
        getReq.onsuccess = () => {
          if (getReq.result?.encryptedBuffer) {
            secureScrubBuffer(getReq.result.encryptedBuffer);
          }
        };
      }
      videoStore.delete(id);
      blobStore.delete(id);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Checks all stored videos against current time and auto-deletes expired ones
 * Respects zeroTrace setting for cryptographic secure overwriting
 */
export async function purgeExpiredVideos(): Promise<{ purgedCount: number; freedBytes: number; purgedTitles: string[] }> {
  const [videos, settings] = await Promise.all([getAllVideos(), getSettings()]);
  const now = Date.now();
  const expired = videos.filter(v => v.expiresAt <= now);

  if (expired.length === 0) {
    return { purgedCount: 0, freedBytes: 0, purgedTitles: [] };
  }

  const idsToDelete = expired.map(v => v.id);
  const purgedTitles = expired.map(v => v.title);
  const freedBytes = expired.reduce((acc, v) => acc + (v.encryption?.encryptedSize || v.sizeBytes), 0);

  await deleteMultipleVideos(idsToDelete, settings.secureZeroTraceWipe ?? true);

  return {
    purgedCount: expired.length,
    freedBytes,
    purgedTitles,
  };
}

export async function getStorageQuota(): Promise<StorageStats> {
  const [videos, urls] = await Promise.all([getAllVideos(), getAllSecureUrls().catch(() => [])]);
  const now = Date.now();
  const expiredCount = videos.filter(v => v.expiresAt <= now).length;
  const usedBytes = videos.reduce((acc, v) => acc + (v.encryption?.encryptedSize || v.sizeBytes), 0);

  let quotaBytes = 50 * 1024 * 1024 * 1024; // Default fallback 50GB
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) quotaBytes = estimate.quota;
    } catch {
      // fallback
    }
  }

  const storagePercentage = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));

  return {
    usedBytes,
    quotaBytes,
    videoCount: videos.length,
    urlCount: urls.length,
    expiredCount,
    storagePercentage,
  };
}

// ----------------------------------------------------
// SECURE URL LIBRARY (AES-256 Encrypted Bookmarks & Streams)
// ----------------------------------------------------

/**
 * Saves a single URL securely with AES-256 encryption into IndexedDB
 */
export async function saveSecureUrl(
  item: Omit<SecureUrlItem, 'encryption'>,
  customPassphrase?: string
): Promise<SecureUrlItem> {
  const db = await openDatabase();
  const payloadToEncrypt = JSON.stringify({
    url: item.url,
    notes: item.notes || '',
    qualityPreference: item.qualityPreference || 'best',
  });

  const enc = await encryptText(payloadToEncrypt, customPassphrase);

  const record: EncryptedUrlRecord = {
    id: item.id || 'url_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7),
    folderId: item.folderId || 'all',
    title: item.title || item.url,
    tags: item.tags || [],
    createdAt: item.createdAt || Date.now(),
    downloadStatus: item.downloadStatus || 'saved',
    downloadedVideoId: item.downloadedVideoId,
    encryptedPayloadHex: enc.cipherHex,
    ivHex: enc.ivHex,
    saltHex: enc.saltHex,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SECURE_URLS, 'readwrite');
    const store = tx.objectStore(STORES.SECURE_URLS);
    store.put(record);

    tx.oncomplete = () => {
      resolve({
        id: record.id,
        title: record.title,
        url: item.url,
        notes: item.notes,
        folderId: record.folderId,
        tags: record.tags,
        qualityPreference: item.qualityPreference,
        createdAt: record.createdAt,
        downloadStatus: record.downloadStatus,
        downloadedVideoId: record.downloadedVideoId,
        encryption: {
          algorithm: 'AES-GCM',
          keyLengthBits: 256,
          ivHex: enc.ivHex,
          saltHex: enc.saltHex,
        },
      });
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Batch saves multiple video URLs with AES-256 encryption
 */
export async function saveMultipleSecureUrls(
  items: Array<Omit<SecureUrlItem, 'encryption'>>,
  customPassphrase?: string
): Promise<SecureUrlItem[]> {
  const results: SecureUrlItem[] = [];
  for (const item of items) {
    const saved = await saveSecureUrl(item, customPassphrase);
    results.push(saved);
  }
  return results;
}

/**
 * Retrieves all stored encrypted URLs and decrypts their payloads in memory
 */
export async function getAllSecureUrls(customPassphrase?: string): Promise<SecureUrlItem[]> {
  const db = await openDatabase();
  const records: EncryptedUrlRecord[] = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SECURE_URLS, 'readonly');
    const store = tx.objectStore(STORES.SECURE_URLS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const decryptedItems: SecureUrlItem[] = [];

  for (const rec of records) {
    try {
      const decryptedText = await decryptText(rec.encryptedPayloadHex, rec.ivHex, rec.saltHex, customPassphrase);
      const parsed = JSON.parse(decryptedText);

      decryptedItems.push({
        id: rec.id,
        title: rec.title,
        url: parsed.url,
        notes: parsed.notes,
        folderId: rec.folderId,
        tags: rec.tags || [],
        qualityPreference: parsed.qualityPreference || 'best',
        createdAt: rec.createdAt,
        downloadStatus: rec.downloadStatus || 'saved',
        downloadedVideoId: rec.downloadedVideoId,
        encryption: {
          algorithm: 'AES-GCM',
          keyLengthBits: 256,
          ivHex: rec.ivHex,
          saltHex: rec.saltHex,
        },
      });
    } catch (err) {
      console.warn('Failed to decrypt URL record:', rec.id, err);
      // Fallback with encrypted indicator
      decryptedItems.push({
        id: rec.id,
        title: rec.title,
        url: '[Encrypted URL - Key Mismatch]',
        notes: '',
        folderId: rec.folderId,
        tags: rec.tags || [],
        createdAt: rec.createdAt,
        downloadStatus: rec.downloadStatus,
        downloadedVideoId: rec.downloadedVideoId,
        encryption: {
          algorithm: 'AES-GCM',
          keyLengthBits: 256,
          ivHex: rec.ivHex,
          saltHex: rec.saltHex,
        },
      });
    }
  }

  return decryptedItems;
}

export async function deleteSecureUrl(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SECURE_URLS, 'readwrite');
    const store = tx.objectStore(STORES.SECURE_URLS);
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMultipleSecureUrls(ids: string[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SECURE_URLS, 'readwrite');
    const store = tx.objectStore(STORES.SECURE_URLS);
    for (const id of ids) {
      store.delete(id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateSecureUrl(
  partial: Partial<SecureUrlItem> & { id: string },
  customPassphrase?: string
): Promise<void> {
  const db = await openDatabase();
  return new Promise(async (resolve, reject) => {
    const tx = db.transaction(STORES.SECURE_URLS, 'readwrite');
    const store = tx.objectStore(STORES.SECURE_URLS);
    const getReq = store.get(partial.id);

    getReq.onsuccess = async () => {
      const rec = getReq.result as EncryptedUrlRecord;
      if (!rec) {
        resolve();
        return;
      }

      let url = '';
      let notes = '';
      let qualityPreference = 'best';

      try {
        const decryptedText = await decryptText(rec.encryptedPayloadHex, rec.ivHex, rec.saltHex, customPassphrase);
        const parsed = JSON.parse(decryptedText);
        url = parsed.url;
        notes = parsed.notes;
        qualityPreference = parsed.qualityPreference;
      } catch {
        // fallback
      }

      if (partial.url !== undefined) url = partial.url;
      if (partial.notes !== undefined) notes = partial.notes;
      if (partial.qualityPreference !== undefined) qualityPreference = partial.qualityPreference;

      const enc = await encryptText(JSON.stringify({ url, notes, qualityPreference }), customPassphrase);

      const updated: EncryptedUrlRecord = {
        ...rec,
        title: partial.title !== undefined ? partial.title : rec.title,
        folderId: partial.folderId !== undefined ? partial.folderId : rec.folderId,
        tags: partial.tags !== undefined ? partial.tags : rec.tags,
        downloadStatus: partial.downloadStatus !== undefined ? partial.downloadStatus : rec.downloadStatus,
        downloadedVideoId: partial.downloadedVideoId !== undefined ? partial.downloadedVideoId : rec.downloadedVideoId,
        encryptedPayloadHex: enc.cipherHex,
        ivHex: enc.ivHex,
        saltHex: enc.saltHex,
      };

      store.put(updated);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}


// Folders Management
export async function getFolders(): Promise<VaultFolder[]> {
  await initStorage();
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, 'readonly');
    const store = tx.objectStore(STORES.FOLDERS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || DEFAULT_FOLDERS);
    req.onerror = () => reject(req.error);
  });
}

export async function createFolder(folder: VaultFolder): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, 'readwrite');
    const store = tx.objectStore(STORES.FOLDERS);
    store.put(folder);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFolder(folderId: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.FOLDERS, 'readwrite');
    const store = tx.objectStore(STORES.FOLDERS);
    store.delete(folderId);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Settings
export async function getSettings(): Promise<SecuritySettings> {
  const db = await openDatabase();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.SETTINGS, 'readonly');
    const store = tx.objectStore(STORES.SETTINGS);
    const req = store.get('app_settings');

    req.onsuccess = () => resolve(req.result?.value || DEFAULT_SETTINGS);
    req.onerror = () => resolve(DEFAULT_SETTINGS);
  });
}

export async function updateSettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SETTINGS, 'readwrite');
    const store = tx.objectStore(STORES.SETTINGS);
    store.put({ key: 'app_settings', value: merged });

    tx.oncomplete = () => resolve(merged);
    tx.onerror = () => reject(tx.error);
  });
}
