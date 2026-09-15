import React, { useState, useMemo } from 'react';
import { 
  Link2, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Folder as FolderIcon, 
  Download, 
  Play, 
  Copy, 
  Check, 
  Trash2, 
  ShieldCheck, 
  Tag, 
  FileText, 
  CheckSquare, 
  Square,
  ExternalLink,
  Lock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { SecureUrlItem, VaultFolder, ExpirationDays } from '../types';

interface SecureUrlLibraryProps {
  urls: SecureUrlItem[];
  folders: VaultFolder[];
  activeFolderId: string;
  onSelectFolder: (folderId: string) => void;
  onOpenAddModal: () => void;
  onDeleteUrl: (id: string) => void;
  onDeleteMultipleUrls: (ids: string[]) => void;
  onUpdateFolder: (id: string, folderId: string) => void;
  onDownloadToVault: (urlItem: SecureUrlItem) => void;
  onPlayUrl: (url: string, title: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'folder' | 'status';

export const SecureUrlLibrary: React.FC<SecureUrlLibraryProps> = ({
  urls,
  folders,
  activeFolderId,
  onSelectFolder,
  onOpenAddModal,
  onDeleteUrl,
  onDeleteMultipleUrls,
  onUpdateFolder,
  onDownloadToVault,
  onPlayUrl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [batchTargetFolder, setBatchTargetFolder] = useState<string>('');

  // Map folder id to folder object
  const folderMap = useMemo(() => {
    const map = new Map<string, VaultFolder>();
    folders.forEach(f => map.set(f.id, f));
    return map;
  }, [folders]);

  // Filtered and sorted URLs
  const filteredUrls = useMemo(() => {
    return urls.filter(item => {
      // Folder filter
      if (activeFolderId !== 'all' && item.folderId !== activeFolderId) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchUrl = item.url.toLowerCase().includes(q);
        const matchNotes = item.notes?.toLowerCase().includes(q);
        const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
        if (!matchTitle && !matchUrl && !matchNotes && !matchTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'folder': {
          const nameA = folderMap.get(a.folderId)?.name || '';
          const nameB = folderMap.get(b.folderId)?.name || '';
          return nameA.localeCompare(nameB);
        }
        case 'status':
          return (b.downloadStatus === 'downloaded' ? 1 : 0) - (a.downloadStatus === 'downloaded' ? 1 : 0);
        default:
          return 0;
      }
    });
  }, [urls, activeFolderId, searchQuery, sortOption, folderMap]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredUrls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUrls.map(u => u.id)));
    }
  };

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    onDeleteMultipleUrls(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchMove = (targetFolderId: string) => {
    if (!targetFolderId || selectedIds.size === 0) return;
    selectedIds.forEach(id => onUpdateFolder(id, targetFolderId));
    setSelectedIds(new Set());
    setBatchTargetFolder('');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-y-auto">
      {/* Top Controls Header */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-red-500" />
                <span>Secure URL Library</span>
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>AES-256 Protected</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Keep encrypted video links and stream bookmarks organized in custom folders
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950/40 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add URLs</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Search, Folders, Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, decrypted URL domain, notes, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Folder Pills & Sort Dropdown */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="bg-transparent text-xs text-zinc-200 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-zinc-900">Newest Added</option>
                <option value="oldest" className="bg-zinc-900">Oldest Added</option>
                <option value="title-asc" className="bg-zinc-900">Title (A-Z)</option>
                <option value="title-desc" className="bg-zinc-900">Title (Z-A)</option>
                <option value="folder" className="bg-zinc-900">Folder</option>
                <option value="status" className="bg-zinc-900">Download Status</option>
              </select>
            </div>

            {/* Select All Checkbox Button */}
            {filteredUrls.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-1.5 transition-colors shrink-0"
              >
                {selectedIds.size === filteredUrls.length && filteredUrls.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>
                  {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Batch Actions Toolbar when items are selected */}
        {selectedIds.size > 0 && (
          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/50 flex flex-wrap items-center justify-between gap-2 animate-fadeIn text-xs">
            <span className="font-semibold text-red-300 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4" />
              <span>{selectedIds.size} encrypted URLs selected</span>
            </span>

            <div className="flex items-center gap-2">
              <select
                value={batchTargetFolder}
                onChange={(e) => {
                  setBatchTargetFolder(e.target.value);
                  if (e.target.value) handleBatchMove(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-200 focus:outline-none"
              >
                <option value="">Move to Folder...</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* Count Bar */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Showing <strong className="text-zinc-200">{filteredUrls.length}</strong> of{' '}
            <strong className="text-zinc-200">{urls.length}</strong> encrypted URLs
            {activeFolderId !== 'all' && (
              <span> in folder <span className="text-red-400">"{folderMap.get(activeFolderId)?.name}"</span></span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-[11px]">PBKDF2-SHA256 • AES-GCM-256</span>
          </div>
        </div>

        {/* Empty State */}
        {filteredUrls.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-zinc-900/30">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-red-500 flex items-center justify-center mb-3">
              <Link2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {searchQuery ? 'No matching URLs found' : 'No URLs in this folder yet'}
            </h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-4">
              {searchQuery
                ? `No encrypted URLs match "${searchQuery}". Try clearing search filters.`
                : 'Store and organize YouTube, educational video streams, or direct CDN links encrypted with AES-256.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-950/40 flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Video URLs</span>
              </button>
            </div>
          </div>
        )}

        {/* Grid of URL Cards */}
        {filteredUrls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUrls.map((item) => {
              const folder = folderMap.get(item.folderId);
              const isSelected = selectedIds.has(item.id);
              const isDownloaded = item.downloadStatus === 'downloaded';

              // Extract domain
              let domain = 'stream';
              try {
                domain = new URL(item.url).hostname.replace('www.', '');
              } catch {
                domain = 'direct link';
              }

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl bg-zinc-900 border transition-all duration-200 overflow-hidden flex flex-col ${
                    isSelected
                      ? 'border-red-500/80 shadow-lg shadow-red-950/30'
                      : 'border-zinc-800 hover:border-zinc-700/80 hover:shadow-md hover:shadow-black/50'
                  }`}
                >
                  {/* Top Bar: Checkbox, Domain, Folder Badge */}
                  <div className="p-3.5 pb-2 flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(item.id)}
                        className="text-zinc-400 hover:text-white transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-red-500" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                        )}
                      </button>

                      <span className="text-[11px] font-mono text-zinc-400 truncate bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                        {domain}
                      </span>
                    </div>

                    {/* Folder selector pill */}
                    <div className="relative shrink-0">
                      <select
                        value={item.folderId}
                        onChange={(e) => onUpdateFolder(item.id, e.target.value)}
                        className="text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-zinc-700/80 rounded-lg px-2 py-1 focus:outline-none focus:border-red-500 cursor-pointer"
                      >
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Title */}
                      <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-red-400 transition-colors line-clamp-2">
                        {item.title}
                      </h3>

                      {/* Decrypted URL preview */}
                      <p className="text-[11px] font-mono text-zinc-500 truncate mt-1">
                        {item.url}
                      </p>

                      {/* Notes (if any) */}
                      {item.notes && (
                        <div className="mt-2 text-xs text-zinc-400 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/60 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 text-[11px]">{item.notes}</span>
                        </div>
                      )}

                      {/* Tags */}
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {item.tags.map(t => (
                            <span
                              key={t}
                              className="px-1.5 py-0.5 rounded-md bg-zinc-950 text-[10px] text-zinc-400 border border-zinc-800"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Status & Encrypted badge */}
                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span className="text-zinc-500">AES-256 Stored</span>
                      </div>

                      {isDownloaded ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Vault Downloaded</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-semibold">
                          Encrypted Bookmark
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="px-4 py-2.5 bg-zinc-950/70 border-t border-zinc-800/80 flex items-center justify-between gap-1">
                    {/* Play / Stream */}
                    <button
                      type="button"
                      onClick={() => onPlayUrl(item.url, item.title)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Stream preview in built-in player"
                    >
                      <Play className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                      <span>Stream</span>
                    </button>

                    {/* Download to Offline Vault */}
                    <button
                      type="button"
                      onClick={() => onDownloadToVault(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Download file, encrypt with AES-256, and store in vault"
                    >
                      <Download className="w-3.5 h-3.5 text-red-400" />
                      <span>{isDownloaded ? 'Re-Download' : 'Save Offline'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {/* Copy Decrypted URL */}
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(item.id, item.url)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="Copy decrypted URL to clipboard"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDeleteUrl(item.id)}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Delete encrypted URL"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
