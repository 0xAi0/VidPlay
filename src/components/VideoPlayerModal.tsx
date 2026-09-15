import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  RotateCcw, 
  RotateCw, 
  X, 
  Lock, 
  ShieldCheck, 
  Clock, 
  Settings2,
  Tv
} from 'lucide-react';
import { VaultVideo } from '../types';
import { getVideo, updateVideo } from '../services/db';
import { createDecryptedMediaUrl } from '../services/crypto';
import { formatDuration, formatBytes, getExpirationInfo } from '../utils/formatters';

interface VideoPlayerModalProps {
  video: VaultVideo | null;
  onClose: () => void;
  onRenewExpiration?: (id: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
}) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const revokeCallbackRef = useRef<(() => void) | null>(null);

  // Decrypt media and initialize playback
  useEffect(() => {
    if (!video) return;

    let isMounted = true;
    setIsDecrypting(true);
    setDecryptError(null);

    const loadAndDecrypt = async () => {
      try {
        const stored = await getVideo(video.id);
        if (!stored) {
          throw new Error('Encrypted video payload could not be located in local storage.');
        }

        const { url, revoke } = await createDecryptedMediaUrl(
          stored.encryptedBuffer,
          stored.video.encryption.ivHex,
          stored.video.encryption.saltHex,
          stored.video.mimeType
        );

        if (!isMounted) {
          revoke();
          return;
        }

        revokeCallbackRef.current = revoke;
        setMediaUrl(url);
        setIsDecrypting(false);
      } catch (err: any) {
        if (!isMounted) return;
        setIsDecrypting(false);
        setDecryptError(err.message || 'Failed to decrypt AES-256 payload.');
      }
    };

    loadAndDecrypt();

    return () => {
      isMounted = false;
      if (revokeCallbackRef.current) {
        revokeCallbackRef.current();
        revokeCallbackRef.current = null;
      }
      setMediaUrl(null);
    };
  }, [video]);

  // Restore saved playback position
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration || video?.duration || 0;
    setDuration(dur);

    if (video?.lastPlaybackPosition && video.lastPlaybackPosition < dur - 5) {
      videoRef.current.currentTime = video.lastPlaybackPosition;
      setCurrentTime(video.lastPlaybackPosition);
    }
  };

  // Track and save playback position on unmount / close
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleClose = useCallback(() => {
    if (video && videoRef.current) {
      updateVideo({
        id: video.id,
        lastPlaybackPosition: Math.round(videoRef.current.currentTime),
        lastPlayedAt: Date.now(),
      }).catch(() => {});
    }
    onClose();
  }, [video, onClose]);

  // Play / Pause Toggle
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Skip 10s back / forward
  const skip = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
  }, [duration]);

  // Scrubbing
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // PiP not supported or rejected
    }
  };

  // Volume & Mute
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
      videoRef.current.volume = volume || 0.5;
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const setSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Auto-hide controls on mouse idle
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(10);
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          if (!document.fullscreenElement) {
            handleClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, skip, handleClose]);

  if (!video) return null;

  const expiration = getExpirationInfo(video.createdAt, video.expiresAt);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-2 sm:p-6 animate-fadeIn">
      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between pb-3 px-2 text-zinc-300">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Decrypted In-Memory</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md sm:max-w-xl">
            {video.title}
          </h2>
        </div>

        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
          title="Close Player (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Media Player Viewport */}
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex items-center justify-center select-none group"
      >
        {isDecrypting ? (
          <div className="flex flex-col items-center gap-4 text-zinc-400 p-6 text-center">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-2 border-red-600/30 border-t-red-600 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <p className="text-white font-semibold text-base">Unlocking AES-256 Media Stream</p>
              <p className="text-xs text-zinc-500 mt-1">Decrypting encrypted IndexedDB chunks with hardware acceleration...</p>
            </div>
          </div>
        ) : decryptError ? (
          <div className="flex flex-col items-center gap-3 text-red-400 p-6 text-center max-w-md">
            <X className="w-10 h-10 text-red-500" />
            <p className="font-semibold text-sm">Playback Decryption Error</p>
            <p className="text-xs text-zinc-400">{decryptError}</p>
            <button
              onClick={handleClose}
              className="mt-2 px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs hover:bg-zinc-700"
            >
              Close
            </button>
          </div>
        ) : mediaUrl ? (
          <>
            <video
              ref={videoRef}
              src={mediaUrl}
              onClick={togglePlay}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              autoPlay
              playsInline
              className="w-full h-full object-contain cursor-pointer"
            />

            {/* Top Watermark / Security Tag */}
            <div className={`absolute top-4 left-4 transition-opacity duration-300 pointer-events-none ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 text-xs text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-mono font-medium text-[11px]">AES-256-GCM Secure Pipeline</span>
              </div>
            </div>

            {/* Expiration warning top right */}
            <div className={`absolute top-4 right-4 transition-opacity duration-300 pointer-events-none ${
              showControls ? 'opacity-100' : 'opacity-0'
            }`}>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 text-xs text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{expiration.text}</span>
              </div>
            </div>

            {/* Custom Overlay Controls */}
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-4 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              {/* Timeline Scrubber */}
              <div className="relative group/timeline mb-2 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={handleScrub}
                  className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600 hover:h-2.5 transition-all"
                />
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Play / Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                    title={isPlaying ? 'Pause (Space / K)' : 'Play (Space / K)'}
                  >
                    {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                  </button>

                  {/* Skip -10s */}
                  <button
                    onClick={() => skip(-10)}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Rewind 10s (Left Arrow / J)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Skip +10s */}
                  <button
                    onClick={() => skip(10)}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title="Forward 10s (Right Arrow / L)"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>

                  {/* Volume Slider & Toggle */}
                  <div className="flex items-center gap-1.5 group/volume">
                    <button
                      onClick={toggleMute}
                      className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-16 sm:w-20 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-xs font-mono text-zinc-300 ml-2 select-none">
                    <span>{formatDuration(currentTime)}</span>
                    <span className="text-zinc-500 mx-1">/</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {/* Speed Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>{playbackSpeed}x</span>
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-10 right-0 bg-zinc-900 border border-zinc-700 rounded-xl py-1 w-24 shadow-2xl text-xs space-y-0.5">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            className={`w-full px-3 py-1.5 text-left transition-colors ${
                              playbackSpeed === s ? 'text-red-400 font-bold bg-zinc-800' : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Picture in Picture */}
                  {document.pictureInPictureEnabled && (
                    <button
                      onClick={togglePiP}
                      className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                      title="Picture in Picture"
                    >
                      <Tv className="w-4 h-4" />
                    </button>
                  )}

                  {/* Fullscreen */}
                  <button
                    onClick={toggleFullscreen}
                    className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Bottom Metadata Panel */}
      <div className="w-full max-w-5xl mt-3 px-2 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cipher: AES-GCM (256-bit key)</span>
          </span>
          <span>IV: <span className="font-mono text-zinc-300">{video.encryption.ivHex.substring(0, 8)}...</span></span>
          <span>Size: <span className="text-zinc-300">{formatBytes(video.sizeBytes)}</span></span>
        </div>

        <div className="flex items-center gap-2">
          <span>Shortcuts: Space (play/pause), J/L (seek), F (fullscreen), M (mute)</span>
        </div>
      </div>
    </div>
  );
};
