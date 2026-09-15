import React from 'react';
import { 
  Film, 
  Heart, 
  Clock, 
  Download, 
  FolderPlus, 
  Folder as FolderIcon,
  Shield, 
  Layers,
  Radio,
  FileVideo,
  Trash2,
  Bookmark,
  Link2
} from 'lucide-react';
import { VaultFolder, VaultVideo } from '../types';

interface SidebarProps {
  folders: VaultFolder[];
  selectedFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onOpenNewFolderModal: () => void;
  onDeleteFolder: (folderId: string) => void;
  videos: VaultVideo[];
  filterSource: string;
  onFilterSourceChange: (source: string) => void;
  filterUrgency: string;
  onFilterUrgencyChange: (urgency: string) => void;
  collapsed?: boolean;
  activeTab?: 'videos' | 'urls';
  onTabChange?: (tab: 'videos' | 'urls') => void;
  urlsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  selectedFolderId,
  onSelectFolder,
  onOpenNewFolderModal,
  onDeleteFolder,
  videos,
  filterSource,
  onFilterSourceChange,
  filterUrgency,
  onFilterUrgencyChange,
  activeTab = 'videos',
  onTabChange,
  urlsCount = 0,
}) => {
  // Compute counts
  const now = Date.now();
  const allCount = videos.length;
  const favoritesCount = videos.filter(v => v.isFavorite).length;
  const urgentCount = videos.filter(v => v.expiresAt > now && (v.expiresAt - now) <= 24 * 60 * 60 * 1000).length;
  const expiredCount = videos.filter(v => v.expiresAt <= now).length;

  const getFolderCount = (folderId: string) => {
    if (folderId === 'all') return allCount;
    if (folderId === 'favorites') return favoritesCount;
    if (folderId === 'quick-expire') {
      return videos.filter(v => v.retentionDays <= 3).length;
    }
    return videos.filter(v => v.folderId === folderId).length;
  };

  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    switch (iconName) {
      case 'Film': return <Film className={className} />;
      case 'Heart': return <Heart className={className} />;
      case 'Clock': return <Clock className={className} />;
      case 'Download': return <Download className={className} />;
      default: return <FolderIcon className={className} />;
    }
  };

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-[calc(100vh-4rem)] overflow-y-auto select-none shrink-0 p-3 space-y-6">
      {/* Top Main Mode Navigation (Offline Videos vs Encrypted URLs) */}
      {onTabChange && (
        <div className="space-y-1">
          <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Vault Library
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
            <button
              onClick={() => onTabChange('videos')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'videos'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Videos ({allCount})</span>
            </button>
            <button
              onClick={() => onTabChange('urls')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'urls'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>URLs ({urlsCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Navigation & Folders */}
      <div>
        <div className="flex items-center justify-between px-3 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
            Vault Folders
          </span>
          <button
            onClick={onOpenNewFolderModal}
            className="text-xs text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-900"
            title="Create Custom Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        <nav className="space-y-0.5">
          {folders.map((folder) => {
            const count = getFolderCount(folder.id);
            const isSelected = selectedFolderId === folder.id;

            return (
              <div
                key={folder.id}
                className="group relative flex items-center"
              >
                <button
                  onClick={() => onSelectFolder(folder.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-red-600/15 text-red-400 border border-red-500/30 font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isSelected ? 'text-red-400' : 'text-zinc-400'}>
                      {renderIcon(folder.iconName)}
                    </span>
                    <span className="truncate text-left">{folder.name}</span>
                  </div>
                  <span className={`text-xs px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-red-500/20 text-red-300' : 'text-zinc-500 group-hover:text-zinc-400'
                  }`}>
                    {count}
                  </span>
                </button>

                {!folder.isSystem && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${folder.name}"? Videos will remain in All Videos.`)) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 absolute right-8 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Expiration Filter Section */}
      <div>
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Auto-Delete Status
        </div>
        <div className="space-y-1 text-xs">
          <button
            onClick={() => onFilterUrgencyChange('all')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'all'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <span>All Active</span>
            <span className="font-mono text-zinc-500">{allCount - expiredCount}</span>
          </button>
          
          <button
            onClick={() => onFilterUrgencyChange('urgent')}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
              filterUrgency === 'urgent'
                ? 'bg-amber-500/20 text-amber-300 font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Expiring &lt;24h</span>
            </div>
            <span className="font-mono text-zinc-500">{urgentCount}</span>
          </button>

          {expiredCount > 0 && (
            <button
              onClick={() => onFilterUrgencyChange('expired')}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                filterUrgency === 'expired'
                  ? 'bg-red-500/20 text-red-300 font-medium'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-red-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Expired (Auto-purging)</span>
              </div>
              <span className="font-mono text-zinc-500">{expiredCount}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sources Filter Section */}
      <div>
        <div className="px-3 mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Download Source
        </div>
        <div className="space-y-1 text-xs">
          <button
            onClick={() => onFilterSourceChange('all')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              filterSource === 'all'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Sources</span>
          </button>

          <button
            onClick={() => onFilterSourceChange('url')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              filterSource === 'url'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Direct Web URLs</span>
          </button>

          <button
            onClick={() => onFilterSourceChange('torrent')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              filterSource === 'torrent'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>P2P / Torrents</span>
          </button>

          <button
            onClick={() => onFilterSourceChange('import')}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              filterSource === 'import'
                ? 'bg-zinc-800 text-white font-medium'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <FileVideo className="w-3.5 h-3.5 text-emerald-400" />
            <span>Local Encrypted Imports</span>
          </button>
        </div>
      </div>

      {/* Security Architecture Badge */}
      <div className="mt-auto pt-4 border-t border-zinc-800/80">
        <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Shield className="w-4 h-4" />
            <span>AES-256 Vault Mode</span>
          </div>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Zero cloud server tracking. Videos are encrypted with AES-GCM and stored exclusively within your browser's IndexedDB.
          </p>
        </div>
      </div>
    </aside>
  );
};
