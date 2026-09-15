import React, { useState, useEffect } from 'react';
import { 
  X, 
  Radio, 
  Copy, 
  Check, 
  ShieldCheck, 
  Users, 
  ArrowUpRight, 
  Lock, 
  Sparkles,
  Share2
} from 'lucide-react';
import { VaultVideo } from '../types';
import { generateP2PShareCode } from '../services/p2pTorrentEngine';
import { formatBytes } from '../utils/formatters';

interface P2PShareModalProps {
  video: VaultVideo | null;
  onClose: () => void;
}

export const P2PShareModal: React.FC<P2PShareModalProps> = ({
  video,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activePeers, setActivePeers] = useState(3);
  const [isSeeding, setIsSeeding] = useState(true);

  if (!video) return null;

  const shareCode = generateP2PShareCode(video);
  const magnetCode = `magnet:?xt=urn:btih:${video.encryption.ivHex}&dn=${encodeURIComponent(video.title)}&tr=wss%3A%2F%2Ftracker.webtorrent.dev`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">P2P Decentralized Seeder</h2>
              <p className="text-xs text-zinc-400">Direct peer-to-peer encrypted transfer</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Active Seeding Card */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300 font-semibold truncate max-w-xs">
                {video.title}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Seeding Active</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-zinc-400">
              <div>
                <span className="block text-[10px] text-zinc-500">File Size</span>
                <span className="text-zinc-200 font-mono">{formatBytes(video.sizeBytes)}</span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Swarm Peers</span>
                <span className="text-purple-400 font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" /> {activePeers} online
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-zinc-500">Protection</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> AES-256
                </span>
              </div>
            </div>
          </div>

          {/* Share Code */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300 flex items-center justify-between">
              <span>P2P Direct Swarm URI</span>
              <span className="text-[10px] text-zinc-500 font-normal">Pass to another browser tab or peer</span>
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={shareCode}
                className="w-full pl-3 pr-20 py-2 font-mono text-[11px] bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 select-all"
              />
              <button
                onClick={() => copyToClipboard(shareCode)}
                className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Magnet URI format */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-300">
              WebTorrent Magnet Link
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={magnetCode}
                className="w-full pl-3 pr-20 py-2 font-mono text-[11px] bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 select-all"
              />
              <button
                onClick={() => copyToClipboard(magnetCode)}
                className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          {/* Security note */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-[11px] text-purple-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              Direct WebRTC connections transfer encrypted blocks directly between browser peers. The recipient re-encrypts and stores the payload with their local vault key.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
