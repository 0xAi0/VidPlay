export type ExpirationDays = 1 | 3 | 7 | 14 | 30 | number;

export type VideoSourceType = 'url' | 'torrent' | 'p2p' | 'import';

export interface VaultVideo {
  id: string;
  title: string;
  originalUrl?: string;
  sourceType: VideoSourceType;
  sizeBytes: number;
  mimeType: string;
  thumbnailUrl?: string; // base64 data url
  duration?: number; // in seconds
  createdAt: number; // timestamp
  expiresAt: number; // timestamp
  retentionDays: ExpirationDays; // 1 to 30 days
  folderId: string; // 'all', 'favorites', or custom UUID
  isFavorite?: boolean;
  lastPlayedAt?: number;
  lastPlaybackPosition?: number; // seconds
  tags?: string[];
  
  // Encryption & Storage Metadata
  encryption: {
    algorithm: 'AES-GCM' | 'DirectStorage' | string;
    keyLengthBits: 256 | 0 | number;
    ivHex: string; // Hex representation of 12-byte initialization vector or 'raw'
    saltHex: string; // Hex salt used in PBKDF2 or 'raw'
    encryptedSize: number;
  };
}

export interface VaultFolder {
  id: string;
  name: string;
  color: string;
  iconName: string;
  createdAt: number;
  isSystem?: boolean;
}

export interface SecureUrlItem {
  id: string;
  title: string;
  url: string; // in-memory decrypted
  notes?: string;
  folderId: string;
  tags: string[];
  qualityPreference?: '1080p' | '720p' | '480p' | 'best';
  createdAt: number;
  lastCheckedAt?: number;
  downloadStatus?: 'saved' | 'downloaded' | 'downloading';
  downloadedVideoId?: string;
  encryption: {
    algorithm: 'AES-GCM';
    keyLengthBits: 256;
    ivHex: string;
    saltHex: string;
  };
}

export interface EncryptedUrlRecord {
  id: string;
  folderId: string;
  title: string;
  tags: string[];
  createdAt: number;
  downloadStatus?: 'saved' | 'downloaded' | 'downloading';
  downloadedVideoId?: string;
  encryptedPayloadHex: string; // AES-GCM ciphertext of JSON string { url, notes, qualityPreference }
  ivHex: string;
  saltHex: string;
}

export type DownloadStatus = 'idle' | 'downloading' | 'encrypting' | 'completed' | 'error';

export interface DownloadTask {
  id: string;
  title: string;
  url: string;
  sourceType: VideoSourceType;
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number;
  speedBps: number; // bytes per second
  status: DownloadStatus;
  errorMessage?: string;
  folderId: string;
  retentionDays: ExpirationDays;
  magnetHash?: string;
  peersCount?: number;
  piecesTotal?: number;
  piecesDownloaded?: number;
}

export interface TorrentFileInfo {
  name: string;
  sizeBytes: number;
  sizeFormatted: string;
  infoHash: string;
  pieceCount: number;
  pieceLength: number;
  trackers: string[];
}

export interface SampleVideo {
  id: string;
  title: string;
  description: string;
  url: string;
  duration: string;
  size: string;
  approxBytes: number;
  thumbnail: string;
  category: string;
}

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  videoCount: number;
  urlCount: number;
  expiredCount: number;
  storagePercentage: number;
}

export interface SecuritySettings {
  autoPurgeOnStartup: boolean;
  defaultRetentionDays: ExpirationDays; // 1 to 30 days
  secureZeroTraceWipe: boolean; // Overwrite data with cryptographic noise before deleting
  warnExpiringWithin24h: boolean;
  notifyOnAutoPurge: boolean;
  masterKeyPassphrase?: string;
  useHardwareCrypto: boolean;
  requirePinToPlay: boolean;
  pinCode?: string;
}

export interface P2PTransferMessage {
  type: 'handshake' | 'piece-request' | 'piece-data' | 'complete' | 'cancel';
  videoId?: string;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  pieceIndex?: number;
  totalPieces?: number;
  data?: string; // base64 encoded chunk
}

