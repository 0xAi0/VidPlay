/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  VaultVideo, 
  VaultFolder, 
  StorageStats, 
  SecuritySettings, 
  ExpirationDays,
  SecureUrlItem
} from './types';
import { 
  getAllVideos, 
  getFolders, 
  getSettings, 
  saveVideo, 
  deleteVideo, 
  updateVideo, 
  renewVideoExpiration, 
  purgeExpiredVideos, 
  getStorageQuota, 
  createFolder, 
  deleteFolder, 
  updateSettings,
  getAllSecureUrls,
  saveSecureUrl,
  deleteSecureUrl,
  updateSecureUrl
} from './services/db';
import { downloadAndEncryptUrl } from './services/downloadManager';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoCard } from './components/VideoCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { DownloadModal } from './components/DownloadModal';
import { FolderModal } from './components/FolderModal';
import { P2PShareModal } from './components/P2PShareModal';
import { StorageSettingsModal } from './components/StorageSettingsModal';
import { SecureUrlLibrary } from './components/SecureUrlLibrary';
import { AddUrlModal } from './components/AddUrlModal';
import { EmptyState } from './components/EmptyState';
import { 
  ArrowUpDown, 
  CheckSquare, 
  Square, 
  Trash2, 
  RefreshCw, 
  FolderInput, 
  ShieldAlert,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';

type SortOption = 'expiration' | 'date_desc' | 'date_asc' | 'size_desc' | 'title';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'videos' | 'urls'>('videos');

  // Data States
  const [videos, setVideos] = useState<VaultVideo[]>([]);
  const [secureUrls, setSecureUrls] = useState<SecureUrlItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [settings, setSettings] = useState<SecuritySettings>({
    autoPurgeOnStartup: true,
    defaultRetentionDays: 7,
    useHardwareCrypto: true,
    requirePinToPlay: false,
    secureZeroTraceWipe: true,
    warnExpiringWithin24h: true,
  });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    usedBytes: 0,
    quotaBytes: 50 * 1024 * 1024 * 1024,
    videoCount: 0,
    expiredCount: 0,
    storagePercentage: 0,
  });

  // Filter & Search States
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('expiration');

  // Selection for Batch Actions
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  // Modal States
  const [activePlayerVideo, setActivePlayerVideo] = useState<VaultVideo | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isAddUrlModalOpen, setIsAddUrlModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [p2pShareVideo, setP2pShareVideo] = useState<VaultVideo | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  // Refresh all state from IndexedDB
  const refreshVault = useCallback(async () => {
    try {
      const [allVids, allUrls, allFlds, curSettings, stats] = await Promise.all([
        getAllVideos(),
        getAllSecureUrls(),
        getFolders(),
        getSettings(),
        getStorageQuota(),
      ]);

      setVideos(allVids);
      setSecureUrls(allUrls);
      setFolders(allFlds);
      setSettings(curSettings);
      setStorageStats(stats);
    } catch (err) {
      console.error('Failed to load vault data:', err);
    }
  }, []);

  // Initial load and auto-purge execution
  useEffect(() => {
    const initialize = async () => {
      const loadedSettings = await getSettings();
      if (loadedSettings.autoPurgeOnStartup) {
        const { purgedCount } = await purgeExpiredVideos();
        if (purgedCount > 0) {
          showToast(`Auto-purged ${purgedCount} expired video(s) per retention setting.`);
        }
      }
      await refreshVault();
    };

    initialize();

    // Background interval check for expired videos every 45s
    const interval = setInterval(async () => {
      const { purgedCount } = await purgeExpiredVideos();
      if (purgedCount > 0) {
        showToast(`Auto-purged ${purgedCount} expired video(s).`);
      }
      await refreshVault();
    }, 45000);

    return () => clearInterval(interval);
  }, [refreshVault]);

  // Video Action Handlers
  const handlePlayVideo = (video: VaultVideo) => {
    setActivePlayerVideo(video);
  };

  const handleDeleteVideo = async (id: string) => {
    await deleteVideo(id);
    setSelectedVideoIds(prev => prev.filter(vid => vid !== id));
    await refreshVault();
    showToast('Video permanently removed from encrypted storage.');
  };

  const handleRenewVideo = async (id: string, days: ExpirationDays) => {
    const updated = await renewVideoExpiration(id, days);
    if (updated) {
      await refreshVault();
      showToast(`Lease extended for ${days} days.`);
    }
  };

  const handleMoveFolder = async (id: string, folderId: string) => {
    await updateVideo({ id, folderId });
    await refreshVault();
    showToast('Video moved to folder.');
  };

  const handleToggleFavorite = async (id: string) => {
    const target = videos.find(v => v.id === id);
    if (target) {
      await updateVideo({ id, isFavorite: !target.isFavorite });
      await refreshVault();
    }
  };

  // Folder Handlers
  const handleCreateFolder = async (folder: VaultFolder) => {
    await createFolder(folder);
    await refreshVault();
    setSelectedFolderId(folder.id);
    showToast(`Folder "${folder.name}" created.`);
  };

  const handleDeleteFolder = async (folderId: string) => {
    // Re-assign videos to 'all'
    const folderVideos = videos.filter(v => v.folderId === folderId);
    for (const v of folderVideos) {
      await updateVideo({ id: v.id, folderId: 'all' });
    }
    await deleteFolder(folderId);
    setSelectedFolderId('all');
    await refreshVault();
    showToast('Folder deleted. Contents preserved in All Videos.');
  };

  // Settings Handlers
  const handleUpdateSettings = async (newSettings: Partial<SecuritySettings>) => {
    const updated = await updateSettings(newSettings);
    setSettings(updated);
    showToast('Vault preferences updated.');
  };

  const handlePurgeExpired = async () => {
    setIsPurging(true);
    const { purgedCount } = await purgeExpiredVideos();
    setIsPurging(false);
    await refreshVault();
    if (purgedCount > 0) {
      showToast(`Purged ${purgedCount} expired item(s). Freed space.`);
    } else {
      showToast('No expired videos to purge.');
    }
  };

  const handleClearAllData = async () => {
    for (const v of videos) {
      await deleteVideo(v.id);
    }
    for (const u of secureUrls) {
      await deleteSecureUrl(u.id);
    }
    await refreshVault();
    showToast('Vault securely wiped.');
  };

  // URL Library Handlers
  const handleSaveSecureUrl = async (urlItem: SecureUrlItem) => {
    await saveSecureUrl(urlItem);
    await refreshVault();
    showToast(`URL "${urlItem.title}" encrypted with AES-256 and saved.`);
  };

  const handleDeleteSecureUrl = async (id: string) => {
    await deleteSecureUrl(id);
    await refreshVault();
    showToast('Encrypted URL removed from library.');
  };

  const handleUpdateSecureUrl = async (urlItem: Partial<SecureUrlItem> & { id: string }) => {
    await updateSecureUrl(urlItem);
    await refreshVault();
  };

  const handleDownloadUrlToVault = async (urlItem: SecureUrlItem) => {
    showToast(`Downloading & encrypting "${urlItem.title}" for offline playback...`);
    try {
      const video = await downloadAndEncryptUrl(
        urlItem.url,
        urlItem.title,
        urlItem.folderId,
        settings.defaultRetentionDays || 7
      );
      await refreshVault();
      setActiveTab('videos');
      showToast(`"${video.title}" downloaded and encrypted for offline viewing!`);
    } catch (err: any) {
      showToast(err.message || 'Download failed.');
    }
  };

  // Quick download sample directly
  const handleQuickDownloadSample = async (url: string, title: string) => {
    showToast(`Downloading & encrypting "${title}"...`);
    try {
      const video = await downloadAndEncryptUrl(
        url,
        title,
        selectedFolderId,
        settings.defaultRetentionDays || 7
      );
      await refreshVault();
      showToast(`"${video.title}" encrypted with AES-256 and stored!`);
    } catch (err: any) {
      showToast(err.message || 'Download failed.');
    }
  };

  // Filtered & Sorted Videos
  const filteredVideos = useMemo(() => {
    const now = Date.now();

    return videos.filter((video) => {
      // Folder filter
      if (selectedFolderId === 'favorites' && !video.isFavorite) return false;
      if (selectedFolderId === 'quick-expire' && video.retentionDays > 3) return false;
      if (selectedFolderId !== 'all' && selectedFolderId !== 'favorites' && selectedFolderId !== 'quick-expire') {
        if (video.folderId !== selectedFolderId) return false;
      }

      // Source filter
      if (filterSource !== 'all' && video.sourceType !== filterSource) return false;

      // Urgency filter
      if (filterUrgency === 'urgent') {
        const remaining = video.expiresAt - now;
        if (remaining <= 0 || remaining > 24 * 60 * 60 * 1000) return false;
      } else if (filterUrgency === 'expired') {
        if (video.expiresAt > now) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = video.title.toLowerCase().includes(q);
        const matchesUrl = video.originalUrl?.toLowerCase().includes(q);
        const matchesTags = video.tags?.some(t => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesUrl && !matchesTags) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'expiration') {
        return a.expiresAt - b.expiresAt;
      }
      if (sortBy === 'date_desc') {
        return b.createdAt - a.createdAt;
      }
      if (sortBy === 'date_asc') {
        return a.createdAt - b.createdAt;
      }
      if (sortBy === 'size_desc') {
        return b.sizeBytes - a.sizeBytes;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
  }, [videos, selectedFolderId, filterSource, filterUrgency, searchQuery, sortBy]);

  // Active folder object
  const activeFolder = folders.find(f => f.id === selectedFolderId) || {
    id: 'all',
    name: 'All Videos',
    color: 'zinc',
    iconName: 'Film',
    createdAt: 0,
  };

  // Batch Selection Handlers
  const handleSelectAllVisible = () => {
    if (selectedVideoIds.length === filteredVideos.length) {
      setSelectedVideoIds([]);
    } else {
      setSelectedVideoIds(filteredVideos.map(v => v.id));
    }
  };

  const handleBatchDelete = async () => {
    if (confirm(`Delete ${selectedVideoIds.length} selected video(s) permanently?`)) {
      for (const id of selectedVideoIds) {
        await deleteVideo(id);
      }
      setSelectedVideoIds([]);
      await refreshVault();
      showToast('Selected videos deleted from encrypted storage.');
    }
  };

  const handleBatchRenew = async (days: ExpirationDays) => {
    for (const id of selectedVideoIds) {
      await renewVideoExpiration(id, days);
    }
    setSelectedVideoIds([]);
    await refreshVault();
    showToast(`Extended lease by ${days} days for selected items.`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Top YouTube-style Navigation Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        storageStats={storageStats}
        onOpenDownloadModal={() => setIsDownloadModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onPurgeExpired={handlePurgeExpired}
        isPurging={isPurging}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAddUrlModal={() => setIsAddUrlModalOpen(true)}
      />

      {/* Main App Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onOpenNewFolderModal={() => setIsFolderModalOpen(true)}
          onDeleteFolder={handleDeleteFolder}
          videos={videos}
          filterSource={filterSource}
          onFilterSourceChange={setFilterSource}
          filterUrgency={filterUrgency}
          onFilterUrgencyChange={setFilterUrgency}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          urlsCount={secureUrls.length}
        />

        {/* Library Main Content View */}
        {activeTab === 'urls' ? (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <SecureUrlLibrary
              urls={secureUrls}
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              onOpenAddUrlModal={() => setIsAddUrlModalOpen(true)}
              onDeleteUrl={handleDeleteSecureUrl}
              onUpdateUrl={handleUpdateSecureUrl}
              onDownloadUrl={handleDownloadUrlToVault}
            />
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Folder Title & Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    {activeFolder.name}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {filteredVideos.length} {filteredVideos.length === 1 ? 'video' : 'videos'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Encrypted in browser storage with AES-256 • YouTube-style auto-expiration active
                </p>
              </div>

              {/* Sort & Action Controls */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {/* Batch Action Toolbar when items selected */}
                {selectedVideoIds.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs animate-fadeIn">
                    <span className="font-semibold text-zinc-300">
                      {selectedVideoIds.length} selected
                    </span>
                    <button
                      onClick={() => handleBatchRenew(30)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-medium transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Renew 30d</span>
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-red-950/50 hover:bg-red-900 text-red-300 font-medium transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-300">
                  <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline text-zinc-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-transparent border-none text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    <option value="expiration" className="bg-zinc-900">Expires Soonest</option>
                    <option value="date_desc" className="bg-zinc-900">Recently Added</option>
                    <option value="date_asc" className="bg-zinc-900">Oldest Added</option>
                    <option value="size_desc" className="bg-zinc-900">Largest File Size</option>
                    <option value="title" className="bg-zinc-900">Title (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Videos Grid or Empty State */}
            {filteredVideos.length === 0 ? (
              <EmptyState
                folderName={activeFolder.name}
                onOpenDownload={() => setIsDownloadModalOpen(true)}
                onQuickDownloadSample={handleQuickDownloadSample}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    folders={folders}
                    onPlay={handlePlayVideo}
                    onDelete={handleDeleteVideo}
                    onRenew={handleRenewVideo}
                    onMoveFolder={handleMoveFolder}
                    onToggleFavorite={handleToggleFavorite}
                    onOpenP2PShare={(v) => setP2pShareVideo(v)}
                  />
                ))}
              </div>
            )}
          </main>
        )}
      </div>

      {/* Built-in Secure Decrypted Video Player Modal */}
      {activePlayerVideo && (
        <VideoPlayerModal
          video={activePlayerVideo}
          onClose={() => setActivePlayerVideo(null)}
        />
      )}

      {/* Download & Import Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        folders={folders}
        defaultRetentionDays={settings.defaultRetentionDays || 7}
        onDownloadComplete={async (newVideo) => {
          await refreshVault();
          showToast(`"${newVideo.title}" encrypted with AES-256 and stored!`);
        }}
      />

      {/* Add Secure URL Modal */}
      <AddUrlModal
        isOpen={isAddUrlModalOpen}
        onClose={() => setIsAddUrlModalOpen(false)}
        folders={folders}
        selectedFolderId={selectedFolderId !== 'favorites' && selectedFolderId !== 'quick-expire' ? selectedFolderId : 'all'}
        onSaveUrl={handleSaveSecureUrl}
      />

      {/* Custom Folder Creator Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
      />

      {/* P2P Share Seeder Modal */}
      {p2pShareVideo && (
        <P2PShareModal
          video={p2pShareVideo}
          onClose={() => setP2pShareVideo(null)}
        />
      )}

      {/* Storage & Security Settings Modal */}
      <StorageSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        storageStats={storageStats}
        settings={settings}
        encryptedUrlsCount={secureUrls.length}
        onUpdateSettings={handleUpdateSettings}
        onPurgeExpired={handlePurgeExpired}
        onClearAllData={handleClearAllData}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-zinc-700/80 text-zinc-100 text-xs font-medium shadow-2xl backdrop-blur-md animate-bounce-short">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
