import React from 'react';
import { 
  ShieldCheck, 
  HardDrive, 
  Plus, 
  Search, 
  SlidersHorizontal,
  Lock,
  Trash2
} from 'lucide-react';
import { StorageStats } from '../types';
import { formatBytes } from '../utils/formatters';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  storageStats: StorageStats;
  onOpenDownloadModal: () => void;
  onOpenSettingsModal: () => void;
  onPurgeExpired: () => void;
  isPurging?: boolean;
  activeTab?: 'videos' | 'urls';
  onTabChange?: (tab: 'videos' | 'urls') => void;
  onOpenAddUrlModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  storageStats,
  onOpenDownloadModal,
  onOpenSettingsModal,
  onPurgeExpired,
  isPurging,
  activeTab = 'videos',
  onTabChange,
  onOpenAddUrlModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-950/40">
          {/* YouTube-like Play/Lock Icon */}
          <div className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-white ml-0.5" />
          <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-700 rounded-full p-0.5">
            <Lock className="w-2.5 h-2.5 text-red-400" />
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold tracking-tight text-white text-base sm:text-lg">
              Offline<span className="text-red-500">Vault</span>
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              AES-256
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:inline">
            Encrypted Standalone Storage
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-xl hidden md:block">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search offline encrypted videos, URLs, or tags..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-900/90 border border-zinc-800 rounded-full text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 text-xs text-zinc-400 hover:text-zinc-200 px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Security Shield Indicator */}
        <div 
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
          title="Hardware AES-256-GCM Web Crypto active. No external database or server telemetry."
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>AES-GCM Encrypted</span>
        </div>

        {/* Storage Pill */}
        <button
          onClick={onOpenSettingsModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 transition-colors"
          title="Browser storage allocation"
        >
          <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Storage:</span>
          <span className="font-medium text-zinc-200">
            {formatBytes(storageStats.usedBytes)}
          </span>
        </button>

        {/* Purge Expired Quick Button (if expired videos exist) */}
        {storageStats.expiredCount > 0 && (
          <button
            onClick={onPurgeExpired}
            disabled={isPurging}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 text-xs font-medium transition-colors"
            title={`Purge ${storageStats.expiredCount} expired items now`}
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Purge ({storageStats.expiredCount})</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={onOpenSettingsModal}
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
          title="Vault Security & Expiration Settings"
          aria-label="Settings"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        {/* Primary Action Buttons */}
        {activeTab === 'urls' ? (
          <button
            onClick={onOpenAddUrlModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-red-950/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add URL</span>
          </button>
        ) : (
          <button
            onClick={onOpenDownloadModal}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-red-950/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Download</span>
          </button>
        )}
      </div>
    </header>
  );
};
