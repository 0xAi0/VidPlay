import React, { useState } from 'react';
import { 
  Play, 
  Lock, 
  MoreVertical, 
  Trash2, 
  RefreshCw, 
  FolderInput, 
  Share2, 
  Heart, 
  DownloadCloud, 
  Radio, 
  Clock, 
  CheckCircle2,
  FileVideo
} from 'lucide-react';
import { VaultVideo, VaultFolder, ExpirationDays } from '../types';
import { formatBytes, formatDuration, getExpirationInfo, formatDate } from '../utils/formatters';

interface VideoCardProps {
  video: VaultVideo;
  folders: VaultFolder[];
  onPlay: (video: VaultVideo) => void;
  onDelete: (id: string) => void;
  onRenew: (id: string, days: ExpirationDays) => void;
  onMoveFolder: (id: string, folderId: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenP2PShare: (video: VaultVideo) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  folders,
  onPlay,
  onDelete,
  onRenew,
  onMoveFolder,
  onToggleFavorite,
  onOpenP2PShare,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showRenewSubmenu, setShowRenewSubmenu] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);

  const expiration = getExpirationInfo(video.createdAt, video.expiresAt);
  const currentFolder = folders.find(f => f.id === video.folderId) || { name: 'Vault', color: 'zinc' };

  const getSourceBadge = () => {
    switch (video.sourceType) {
      case 'torrent':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Radio className="w-2.5 h-2.5" /> P2P Torrent
          </span>
        );
      case 'import':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <FileVideo className="w-2.5 h-2.5" /> File Import
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <DownloadCloud className="w-2.5 h-2.5" /> URL Stream
          </span>
        );
    }
  };

  return (
    <div className="group relative flex flex-col bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-xl hover:shadow-black/40">
      {/* Thumbnail Container */}
      <div 
        onClick={() => onPlay(video)}
        className="relative aspect-video w-full bg-zinc-950 cursor-pointer overflow-hidden group/thumb"
      >
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600">
            <Lock className="w-8 h-8 mb-1 text-zinc-500" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              AES-256 Encrypted
            </span>
          </div>
        )}

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover/thumb:scale-110 transition-transform">
            <Play className="w-5 h-5 ml-0.5 fill-white" />
          </div>
        </div>

        {/* Top Floating Security & Expiration Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span 
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 border border-emerald-500/40"
            title="Encrypted with hardware-accelerated AES-256-GCM"
          >
            <Lock className="w-2.5 h-2.5" />
            <span>AES-256</span>
          </span>
        </div>

        {/* Expiration Tag Top-Right */}
        <div className="absolute top-2 right-2">
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-md border shadow-sm ${
            expiration.isExpired
              ? 'bg-red-950/80 text-red-300 border-red-800'
              : expiration.isUrgent
              ? 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
              : 'bg-black/70 text-zinc-300 border-zinc-700'
          }`}>
            <Clock className="w-2.5 h-2.5" />
            <span>{expiration.text}</span>
          </span>
        </div>

        {/* Duration Badge Bottom-Right */}
        {video.duration ? (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[11px] font-mono font-medium text-white">
            {formatDuration(video.duration)}
          </div>
        ) : null}

        {/* Expiration Depletion Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/80">
          <div 
            className={`h-full transition-all duration-300 ${
              expiration.isExpired
                ? 'bg-red-600'
                : expiration.isUrgent
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${expiration.percentageRemaining}%` }}
            title={`Lease remaining: ${expiration.percentageRemaining}%`}
          />
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 
              onClick={() => onPlay(video)}
              className="text-sm font-semibold text-zinc-100 hover:text-red-400 line-clamp-2 leading-snug cursor-pointer transition-colors"
              title={video.title}
            >
              {video.title}
            </h3>

            {/* Favorite & More Menu */}
            <div className="relative flex items-center shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(video.id);
                }}
                className={`p-1 rounded-md transition-colors ${
                  video.isFavorite ? 'text-red-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title={video.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${video.isFavorite ? 'fill-red-500' : ''}`} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                  setShowRenewSubmenu(false);
                  setShowFolderSubmenu(false);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Context Dropdown Menu */}
              {showMenu && (
                <div 
                  className="absolute right-0 top-8 z-30 w-48 bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl py-1 text-xs text-zinc-200 space-y-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onPlay(video);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 text-left font-medium"
                  >
                    <Play className="w-3.5 h-3.5 text-red-500" /> Play Decrypted Stream
                  </button>

                  <button
                    onClick={() => {
                      setShowRenewSubmenu(!showRenewSubmenu);
                      setShowFolderSubmenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Renew Expiration
                    </div>
                    <span className="text-[10px] text-zinc-400">▶</span>
                  </button>

                  {/* Renew sub options */}
                  {showRenewSubmenu && (
                    <div className="bg-zinc-950 py-1 border-y border-zinc-800 space-y-0.5">
                      {[1, 3, 7, 14, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => {
                            onRenew(video.id, days as ExpirationDays);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-6 py-1.5 hover:bg-zinc-800 text-zinc-300 text-left"
                        >
                          <span>Extend +{days} {days === 1 ? 'day' : 'days'}</span>
                          {video.retentionDays === days && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowFolderSubmenu(!showFolderSubmenu);
                      setShowRenewSubmenu(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <FolderInput className="w-3.5 h-3.5 text-blue-400" /> Move to Folder
                    </div>
                    <span className="text-[10px] text-zinc-400">▶</span>
                  </button>

                  {/* Move to folder sub options */}
                  {showFolderSubmenu && (
                    <div className="bg-zinc-950 py-1 border-y border-zinc-800 max-h-36 overflow-y-auto space-y-0.5">
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            onMoveFolder(video.id, f.id);
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center justify-between px-6 py-1.5 hover:bg-zinc-800 text-zinc-300 text-left"
                        >
                          <span className="truncate">{f.name}</span>
                          {video.folderId === f.id && (
                            <CheckCircle2 className="w-3 h-3 text-blue-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenP2PShare(video);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 text-left"
                  >
                    <Share2 className="w-3.5 h-3.5 text-purple-400" /> P2P Direct Share
                  </button>

                  <div className="border-t border-zinc-800 my-1" />

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      if (confirm(`Delete "${video.title}" immediately from encrypted storage?`)) {
                        onDelete(video.id);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-950/50 text-red-400 text-left"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete from Vault
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Folder & Source Tags */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {getSourceBadge()}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-medium">
              📁 {currentFolder.name}
            </span>
          </div>
        </div>

        {/* Card Footer: Metadata & Actions */}
        <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-zinc-300">{formatBytes(video.sizeBytes)}</span>
            <span>•</span>
            <span className="text-[11px]">{formatDate(video.createdAt)}</span>
          </div>

          <button
            onClick={() => onPlay(video)}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <span>Play</span>
            <Play className="w-3 h-3 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
