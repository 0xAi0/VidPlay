import React from 'react';
import { DownloadCloud, Lock, Sparkles, Radio, Shield } from 'lucide-react';
import { SAMPLE_VIDEOS } from '../services/samples';

interface EmptyStateProps {
  folderName: string;
  onOpenDownload: () => void;
  onQuickDownloadSample: (url: string, title: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  folderName,
  onOpenDownload,
  onQuickDownloadSample,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-2xl mx-auto">
      {/* Visual Vault Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shadow-2xl">
          <DownloadCloud className="w-10 h-10 text-red-500" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-emerald-950 border border-emerald-500/50 rounded-full p-2 text-emerald-400">
          <Lock className="w-4 h-4" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2">
        {folderName === 'All Videos' ? 'Your Encrypted Vault is Empty' : `No Videos in "${folderName}"`}
      </h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        Save videos for offline playback with hardware-accelerated AES-256-GCM encryption. Configure 1 to 30 day auto-delete leases just like YouTube.
      </p>

      {/* Main Download CTA */}
      <div className="flex items-center gap-3 mb-10">
        <button
          onClick={onOpenDownload}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-950/40 hover:scale-105 active:scale-95 transition-all"
        >
          <DownloadCloud className="w-4 h-4" />
          <span>Add URL or Torrent Download</span>
        </button>
      </div>

      {/* One-Click Demo Video Starters */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 text-left">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Instant One-Click Starters (Public Domain Demos):</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_VIDEOS.slice(0, 3).map((sample) => (
            <div
              key={sample.id}
              onClick={() => onQuickDownloadSample(sample.url, sample.title)}
              className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <span className="text-xs font-semibold text-zinc-200 group-hover:text-red-400 line-clamp-1">
                  {sample.title}
                </span>
                <span className="text-[11px] text-zinc-500 block mt-1">
                  {sample.duration} • {sample.size}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-red-400 font-medium">
                <span>AES-256</span>
                <span className="group-hover:translate-x-0.5 transition-transform">Download →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
