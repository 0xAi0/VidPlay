import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Radio, 
  Sparkles, 
  Upload, 
  Folder as FolderIcon, 
  Clock, 
  Lock, 
  AlertCircle,
  CheckCircle2,
  FileVideo,
  ListPlus,
  FileCode,
  Sliders
} from 'lucide-react';
import { VaultFolder, ExpirationDays, VaultVideo, TorrentFileInfo } from '../types';
import { downloadAndEncryptUrl, importLocalVideoFile } from '../services/downloadManager';
import { downloadTorrentWithPeers, SAMPLE_TORRENTS, TorrentDownloadProgress, parseTorrentFile } from '../services/p2pTorrentEngine';
import { SAMPLE_VIDEOS } from '../services/samples';
import { formatBytes } from '../utils/formatters';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: VaultFolder[];
  defaultRetentionDays: ExpirationDays;
  onDownloadComplete: (video: VaultVideo) => void;
}

type TabType = 'url' | 'torrent' | 'samples' | 'import';

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  folders,
  defaultRetentionDays,
  onDownloadComplete,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('url');
  
  // Form State
  const [urlInput, setUrlInput] = useState('');
  const [isMultiUrlMode, setIsMultiUrlMode] = useState(false);
  const [multiUrlsText, setMultiUrlsText] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('all');
  const [retentionDays, setRetentionDays] = useState<number>(Number(defaultRetentionDays) || 7);

  // Torrent Tab State
  const [torrentSubTab, setTorrentSubTab] = useState<'magnet' | 'file'>('magnet');
  const [magnetInput, setMagnetInput] = useState('');
  const [parsedTorrent, setParsedTorrent] = useState<TorrentFileInfo | null>(null);
  const [torrentProgress, setTorrentProgress] = useState<TorrentDownloadProgress | null>(null);

  // Progress State for URL / Import
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const torrentFileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;


  // Handle single or multi URL download
  const handleStartUrlDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const rawInput = urlInput.trim();

    // If user pasted a magnet link into the URL input, automatically route to torrent engine
    if (!isMultiUrlMode && rawInput.startsWith('magnet:')) {
      setActiveTab('torrent');
      setMagnetInput(rawInput);
      handleStartTorrentDownload(rawInput);
      return;
    }

    const urlsToProcess: string[] = isMultiUrlMode
      ? multiUrlsText.split('\n').map(u => u.trim()).filter(u => u.length > 5 && (u.startsWith('http') || u.startsWith('magnet:')))
      : [rawInput].filter(Boolean);

    if (urlsToProcess.length === 0) {
      setErrorMessage('Please enter at least one valid video URL starting with http://, https://, or a magnet: link');
      return;
    }

    setIsProcessing(true);
    setCurrentProgress(0);

    try {
      for (let i = 0; i < urlsToProcess.length; i++) {
        const targetUrl = urlsToProcess[i];
        
        if (targetUrl.startsWith('magnet:')) {
          setStatusMessage(`Downloading Swarm (${i + 1}/${urlsToProcess.length})...`);
          const video = await downloadTorrentWithPeers(
            targetUrl,
            selectedFolderId,
            retentionDays,
            (progress) => {
              setTorrentProgress(progress);
              setCurrentProgress(progress.progress);
              setDownloadSpeed(progress.speedBps);
            }
          );
          onDownloadComplete(video);
        } else {
          setStatusMessage(`Downloading (${i + 1}/${urlsToProcess.length}): ${targetUrl.substring(0, 40)}...`);

          const video = await downloadAndEncryptUrl(
            targetUrl,
            isMultiUrlMode ? '' : videoTitle,
            selectedFolderId,
            retentionDays,
            (progress, speedBps) => {
              setCurrentProgress(progress);
              setDownloadSpeed(speedBps);
            }
          );

          onDownloadComplete(video);
        }
      }

      setStatusMessage('Download completed! Video saved to private vault.');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Download failed. Please check the URL or try another source.');
    }
  };

  // Handle Torrent / Magnet Download
  const handleStartTorrentDownload = async (magnetToUse?: string) => {
    const magnet = magnetToUse || magnetInput.trim();
    if (!magnet) {
      setErrorMessage('Please enter a valid magnet link or select a public swarm.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const video = await downloadTorrentWithPeers(
        magnet,
        selectedFolderId,
        retentionDays,
        (progress) => {
          setTorrentProgress(progress);
          setCurrentProgress(progress.progress);
          setDownloadSpeed(progress.speedBps);
        }
      );

      onDownloadComplete(video);
      setTimeout(() => {
        setIsProcessing(false);
        setTorrentProgress(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Torrent peer connection failed.');
    }
  };

  // Handle .torrent file selection and parsing
  const handleTorrentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    try {
      const parsed = await parseTorrentFile(file);
      setParsedTorrent(parsed);
      setStatusMessage(`Parsed torrent: ${parsed.name} (${formatBytes(parsed.sizeBytes)})`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse .torrent file format.');
    }
  };

  const handleStartParsedTorrentDownload = async () => {
    if (!parsedTorrent) return;
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const video = await downloadTorrentWithPeers(
        parsedTorrent,
        selectedFolderId,
        retentionDays,
        (progress) => {
          setTorrentProgress(progress);
          setCurrentProgress(progress.progress);
          setDownloadSpeed(progress.speedBps);
        }
      );
      onDownloadComplete(video);
      setTimeout(() => {
        setIsProcessing(false);
        setTorrentProgress(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Torrent peer connection failed.');
    }
  };

  // Handle Local File Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsProcessing(true);
    setStatusMessage(`Encrypting local file with AES-256: ${file.name}...`);

    try {
      const video = await importLocalVideoFile(
        file,
        selectedFolderId,
        retentionDays,
        (progress) => {
          setCurrentProgress(progress);
        }
      );

      onDownloadComplete(video);
      setStatusMessage('File encrypted and stored safely!');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'File import failed.');
    }
  };

  // Handle Quick Sample Download
  const handleDownloadSample = async (sampleUrl: string, sampleTitle: string) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Acquiring "${sampleTitle}" with AES-256 encryption...`);

    try {
      const video = await downloadAndEncryptUrl(
        sampleUrl,
        sampleTitle,
        selectedFolderId,
        retentionDays,
        (progress, speedBps) => {
          setCurrentProgress(progress);
          setDownloadSpeed(speedBps);
        }
      );

      onDownloadComplete(video);
      setStatusMessage('Sample video encrypted and stored!');
      setTimeout(() => {
        setIsProcessing(false);
        onClose();
      }, 800);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Sample download failed.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 border border-red-500/30 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Encrypted Video Acquisition</h2>
              <p className="text-xs text-zinc-400">Download, encrypt with AES-256, and store in offline vault</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 px-5 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>URL Downloads</span>
          </button>

          <button
            onClick={() => setActiveTab('torrent')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'torrent'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>P2P Torrent Swarm</span>
          </button>

          <button
            onClick={() => setActiveTab('samples')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'samples'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>1-Click Test Videos</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'import'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>File Import</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Active Download / Encryption Progress Card */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{statusMessage || 'Processing AES-256 pipeline...'}</span>
                </span>
                <span className="font-mono text-zinc-200 font-bold">{currentProgress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>

              {/* Torrent Piece Map Visualization */}
              {torrentProgress && torrentProgress.pieceMap && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span>P2P Piece Swarm: {torrentProgress.piecesDownloaded}/{torrentProgress.piecesTotal} chunks</span>
                    <span className="text-amber-400">{torrentProgress.peersCount} active peers</span>
                  </div>
                  <div className="grid grid-cols-24 sm:grid-cols-32 gap-1 p-2 bg-zinc-900/90 rounded-lg border border-zinc-800">
                    {torrentProgress.pieceMap.map((acquired, idx) => (
                      <div
                        key={idx}
                        className={`h-2.5 rounded-xs transition-colors ${
                          acquired ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-zinc-800'
                        }`}
                        title={`Piece #${idx}: ${acquired ? 'Verified' : 'Pending'}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                <span>Speed: {formatBytes(downloadSpeed)}/s</span>
                <span>Cipher: Hardware AES-256-GCM</span>
              </div>
            </div>
          )}

          {/* TAB 1: Direct URL Download */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300">
                  {isMultiUrlMode ? 'Multiple Video URLs (One per line)' : 'Video Stream URL'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsMultiUrlMode(!isMultiUrlMode)}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>{isMultiUrlMode ? 'Switch to Single URL' : 'Batch Multiple URLs'}</span>
                </button>
              </div>

              {isMultiUrlMode ? (
                <textarea
                  rows={4}
                  placeholder="https://example.com/video1.mp4&#10;https://example.com/video2.mp4&#10;https://example.com/video3.mp4"
                  value={multiUrlsText}
                  onChange={(e) => setMultiUrlsText(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                />
              ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Custom Title (optional, auto-extracted if empty)"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: P2P Torrent Downloader */}
          {activeTab === 'torrent' && (
            <div className="space-y-4">
              {/* Torrent Sub-mode toggles */}
              <div className="flex items-center gap-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setTorrentSubTab('magnet')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    torrentSubTab === 'magnet'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-amber-400" />
                  <span>Magnet / Public Swarm</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTorrentSubTab('file')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    torrentSubTab === 'file'
                      ? 'bg-zinc-800 text-white shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 text-red-400" />
                  <span>Add .torrent File</span>
                </button>
              </div>

              {torrentSubTab === 'magnet' ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                      Magnet Link or Torrent Swarm URI
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="magnet:?xt=urn:btih:c9e15763f...&dn=Video+Title"
                        value={magnetInput}
                        onChange={(e) => setMagnetInput(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500/80"
                      />
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleStartTorrentDownload()}
                        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
                      >
                        Leech & Encrypt
                      </button>
                    </div>
                  </div>

                  {/* Public Swarm Presets */}
                  <div>
                    <span className="text-xs font-semibold text-zinc-400 block mb-2">
                      Live Public Domain Swarms (Click to Test Download):
                    </span>
                    <div className="space-y-2">
                      {SAMPLE_TORRENTS.map((torrent) => (
                        <div
                          key={torrent.infoHash}
                          onClick={() => {
                            setMagnetInput(torrent.magnet);
                            handleStartTorrentDownload(torrent.magnet);
                          }}
                          className="group flex items-center justify-between p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                              <Radio className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
                                {torrent.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                Hash: {torrent.infoHash.substring(0, 16)}... • {torrent.sizeDisplay}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 group-hover:bg-amber-600 text-zinc-300 group-hover:text-white text-xs font-medium transition-colors"
                          >
                            Start P2P
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                /* Upload .torrent file subtab */
                <div className="space-y-3">
                  <input
                    ref={torrentFileInputRef}
                    type="file"
                    accept=".torrent"
                    onChange={handleTorrentFileSelect}
                    className="hidden"
                  />

                  <div
                    onClick={() => torrentFileInputRef.current?.click()}
                    className="border-2 border-dashed border-zinc-700 hover:border-red-500/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-950/50 hover:bg-zinc-950 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-zinc-900 group-hover:bg-red-500/10 text-zinc-400 group-hover:text-red-400 flex items-center justify-center mb-2.5 transition-colors">
                      <FileCode className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      Click or Drag & Drop .torrent File
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Loads binary bencoded metadata, extracts SHA-1 infoHash, and initiates P2P piece encryption
                    </p>
                  </div>

                  {parsedTorrent && (
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-200 truncate max-w-[280px]">
                          {parsedTorrent.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono text-[11px]">
                          {formatBytes(parsedTorrent.sizeBytes)}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-zinc-400 space-y-1">
                        <div>InfoHash: {parsedTorrent.infoHash}</div>
                        <div>Pieces: {parsedTorrent.pieceCount} pieces ({formatBytes(parsedTorrent.pieceLength)} each)</div>
                        {parsedTorrent.trackers.length > 0 && (
                          <div className="truncate text-zinc-500">Tracker: {parsedTorrent.trackers[0]}</div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleStartParsedTorrentDownload}
                        className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Radio className="w-4 h-4" />
                        <span>Download Swarm & Encrypt (AES-256)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: 1-Click Test Videos */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Instantly test offline AES-256 encryption, custom folders, and auto-delete expiration with open-source sample movies:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_VIDEOS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleDownloadSample(sample.url, sample.title)}
                    className="group flex flex-col p-3 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      <img
                        src={sample.thumbnail}
                        alt={sample.title}
                        className="w-20 h-12 object-cover rounded-lg shrink-0 bg-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 truncate">
                          {sample.title}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {sample.duration} • {sample.size}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-zinc-500">{sample.category}</span>
                      <span className="text-red-400 font-semibold group-hover:underline">
                        1-Click Encrypt & Save →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Local File Import */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-700 hover:border-red-500/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer bg-zinc-950/50 hover:bg-zinc-950 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 group-hover:bg-red-500/10 text-zinc-400 group-hover:text-red-400 flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-200">
                  Click or Drag & Drop Video File
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Supports MP4, WebM, MOV, MKV. The file is encrypted with AES-256 on your machine and stored in local IndexedDB.
                </p>
              </div>
            </div>
          )}

          {/* Organization & Expiration Configuration (Common to all tabs) */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custom Folder Selection */}
              <div>
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1.5">
                  <FolderIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Target Folder</span>
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-700/80 rounded-xl text-zinc-200 focus:outline-none focus:border-red-500"
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* YouTube-style Auto-Delete Expiration Setting (1d to 30d) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auto-Delete Expiration</span>
                  </label>
                  <span className="text-xs font-bold text-amber-400">
                    {retentionDays} {retentionDays === 1 ? 'Day' : 'Days'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 mb-2">
                  {([1, 3, 7, 14, 30] as ExpirationDays[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRetentionDays(d)}
                      className={`py-1 rounded-lg text-xs font-medium transition-all ${
                        retentionDays === d
                          ? 'bg-red-600 text-white font-bold shadow-xs'
                          : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-zinc-500 font-mono">1d</span>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}
                    className="flex-1 accent-red-600 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                  />
                  <span className="text-[10px] text-zinc-500 font-mono">30d</span>
                </div>
              </div>
            </div>

            {/* Explanatory YouTube-style lease badge */}
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Video will stay encrypted in local storage for <strong className="text-zinc-200">{retentionDays} {retentionDays === 1 ? 'day' : 'days'}</strong>, then automatically purge unless manually renewed.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>AES-256-GCM Hardware Encrypted</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>

            {activeTab === 'url' && (
              <button
                type="button"
                onClick={() => handleStartUrlDownload()}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-red-950/40 transition-all flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download & Encrypt</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
