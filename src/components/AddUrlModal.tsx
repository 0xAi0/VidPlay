import React, { useState } from 'react';
import { 
  X, 
  Link2, 
  ListPlus, 
  Folder as FolderIcon, 
  Tag, 
  FileText, 
  Lock, 
  Sparkles, 
  Check, 
  Download,
  ShieldCheck
} from 'lucide-react';
import { VaultFolder, ExpirationDays } from '../types';
import { cleanTitleFromUrl } from '../services/downloadManager';

interface AddUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: VaultFolder[];
  activeFolderId: string;
  defaultRetentionDays: ExpirationDays;
  onSaveUrls: (
    urls: Array<{
      url: string;
      title: string;
      folderId: string;
      tags: string[];
      notes?: string;
      qualityPreference?: '1080p' | '720p' | '480p' | 'best';
    }>,
    alsoDownload: boolean
  ) => Promise<void>;
}

const PRESET_URLS = [
  {
    title: 'Big Buck Bunny (Blender Animation)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    tags: ['blender', 'animation', 'open-source'],
    notes: 'Classic open movie high-definition test stream.',
  },
  {
    title: 'Sintel - The Open Movie Project',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    tags: ['cgi', 'fantasy', 'blender'],
    notes: 'Epic fantasy adventure produced by Blender Foundation.',
  },
  {
    title: 'Tears of Steel (Sci-Fi VFX)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    tags: ['vfx', 'scifi', 'live-action'],
    notes: 'Visual effects short exploring futuristic Amsterdam.',
  },
  {
    title: 'We Are Going On Bullrun',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    tags: ['rally', 'automotive'],
    notes: 'Fast-paced road rally documentary clip.',
  },
];

export const AddUrlModal: React.FC<AddUrlModalProps> = ({
  isOpen,
  onClose,
  folders,
  activeFolderId,
  defaultRetentionDays,
  onSaveUrls,
}) => {
  const [tab, setTab] = useState<'single' | 'batch' | 'presets'>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alsoDownload, setAlsoDownload] = useState(false);

  // Single URL state
  const [singleUrl, setSingleUrl] = useState('');
  const [singleTitle, setSingleTitle] = useState('');
  const [singleFolderId, setSingleFolderId] = useState(activeFolderId === 'all' ? 'watchlist' : activeFolderId);
  const [singleTags, setSingleTags] = useState('stream, offline');
  const [singleNotes, setSingleNotes] = useState('');
  const [singleQuality, setSingleQuality] = useState<'1080p' | '720p' | '480p' | 'best'>('best');

  // Batch Multi-URL state
  const [batchText, setBatchText] = useState('');
  const [batchFolderId, setBatchFolderId] = useState(activeFolderId === 'all' ? 'watchlist' : activeFolderId);
  const [batchTags, setBatchTags] = useState('batch, video');

  if (!isOpen) return null;

  const handleUrlChange = (value: string) => {
    setSingleUrl(value);
    if (!singleTitle.trim() && value.trim()) {
      setSingleTitle(cleanTitleFromUrl(value));
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = singleTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      await onSaveUrls(
        [
          {
            url: singleUrl.trim(),
            title: singleTitle.trim() || cleanTitleFromUrl(singleUrl),
            folderId: singleFolderId,
            tags,
            notes: singleNotes.trim(),
            qualityPreference: singleQuality,
          },
        ],
        alsoDownload
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 5 && line.startsWith('http'));

    if (lines.length === 0) return;

    setIsSubmitting(true);
    try {
      const tags = batchTags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const items = lines.map(u => ({
        url: u,
        title: cleanTitleFromUrl(u),
        folderId: batchFolderId,
        tags,
        notes: `Imported in batch of ${lines.length} URLs`,
        qualityPreference: 'best' as const,
      }));

      await onSaveUrls(items, alsoDownload);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPreset = async (preset: typeof PRESET_URLS[0]) => {
    setIsSubmitting(true);
    try {
      await onSaveUrls(
        [
          {
            url: preset.url,
            title: preset.title,
            folderId: activeFolderId === 'all' ? 'watchlist' : activeFolderId,
            tags: preset.tags,
            notes: preset.notes,
            qualityPreference: 'best',
          },
        ],
        alsoDownload
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add to Secure URL Library</h2>
              <p className="text-xs text-zinc-400">All saved URLs and notes are encrypted with AES-256</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-zinc-800 flex items-center gap-1 bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setTab('single')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              tab === 'single'
                ? 'text-red-500 border-b-2 border-red-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Single URL</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('batch')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              tab === 'batch'
                ? 'text-red-500 border-b-2 border-red-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListPlus className="w-3.5 h-3.5" />
            <span>Batch Multi-URL Import</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('presets')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center gap-1.5 ${
              tab === 'presets'
                ? 'text-red-500 border-b-2 border-red-500 bg-zinc-900'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Presets</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {tab === 'single' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Video URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/video.mp4"
                  value={singleUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  placeholder="Video Title (auto-generated from URL if empty)"
                  value={singleTitle}
                  onChange={(e) => setSingleTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                    <FolderIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Target Folder</span>
                  </label>
                  <select
                    value={singleFolderId}
                    onChange={(e) => setSingleFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-red-500"
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Tags (comma separated)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="tutorial, react, stream"
                    value={singleTags}
                    onChange={(e) => setSingleTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Private Notes (Encrypted)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes, timestamps, or study references..."
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                />
              </div>

              {/* Immediate Download Toggle */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-red-400" />
                  <div>
                    <span className="text-xs font-semibold text-zinc-200 block">Download to Offline Vault Now</span>
                    <span className="text-[11px] text-zinc-400">Also encrypt the video file locally for offline playback</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={alsoDownload}
                  onChange={(e) => setAlsoDownload(e.target.checked)}
                  className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AES-256-GCM Encrypted Record</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !singleUrl.trim()}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{alsoDownload ? 'Save & Download' : 'Save Encrypted URL'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === 'batch' && (
            <form onSubmit={handleBatchSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1">
                  Paste Multiple Video URLs (One per line)
                </label>
                <p className="text-[11px] text-zinc-500 mb-2">
                  Each URL will be encrypted and saved into the selected folder.
                </p>
                <textarea
                  rows={6}
                  required
                  placeholder="https://commondatastorage.googleapis.com/.../video1.mp4&#10;https://commondatastorage.googleapis.com/.../video2.mp4&#10;https://commondatastorage.googleapis.com/.../video3.mp4"
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                    <FolderIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Assign Folder</span>
                  </label>
                  <select
                    value={batchFolderId}
                    onChange={(e) => setBatchFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-red-500"
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Batch Tags</span>
                  </label>
                  <input
                    type="text"
                    placeholder="batch, watchlist"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {batchText.split('\n').filter(l => l.trim().startsWith('http')).length} valid URLs detected
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !batchText.trim()}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Encrypt & Save All</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === 'presets' && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-400 mb-2">
                Click any public domain stream to test instant AES-256 encrypted URL storage:
              </p>
              {PRESET_URLS.map((preset) => (
                <div
                  key={preset.url}
                  onClick={() => handleAddPreset(preset)}
                  className="group p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 truncate">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                      {preset.url}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {preset.tags.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-zinc-900 text-[10px] text-zinc-400">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 group-hover:bg-red-600 text-zinc-300 group-hover:text-white text-xs font-medium shrink-0 transition-colors"
                  >
                    + Add to Vault
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
