/**
 * Formatting utilities for bytes, durations, dates, and YouTube-style expiration countdowns
 */

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface ExpirationInfo {
  isExpired: boolean;
  isUrgent: boolean; // < 24 hours
  text: string;
  percentageRemaining: number;
  totalDurationMs: number;
  remainingMs: number;
}

export function getExpirationInfo(createdAt: number, expiresAt: number): ExpirationInfo {
  const now = Date.now();
  const totalDurationMs = Math.max(1, expiresAt - createdAt);
  const remainingMs = expiresAt - now;

  if (remainingMs <= 0) {
    return {
      isExpired: true,
      isUrgent: true,
      text: 'Expired',
      percentageRemaining: 0,
      totalDurationMs,
      remainingMs: 0,
    };
  }

  const percentageRemaining = Math.max(0, Math.min(100, Math.round((remainingMs / totalDurationMs) * 100)));
  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));

  let text = '';
  const isUrgent = days === 0;

  if (days > 1) {
    text = `Expires in ${days} days`;
  } else if (days === 1) {
    text = `Expires in 1 day ${hours}h`;
  } else if (hours > 0) {
    text = `Expires in ${hours}h ${minutes}m`;
  } else {
    text = `Expires in ${Math.max(1, minutes)}m`;
  }

  return {
    isExpired: false,
    isUrgent,
    text,
    percentageRemaining,
    totalDurationMs,
    remainingMs,
  };
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
