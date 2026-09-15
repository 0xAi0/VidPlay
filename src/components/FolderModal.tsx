import React, { useState } from 'react';
import { X, FolderPlus, Palette, Tag } from 'lucide-react';
import { VaultFolder } from '../types';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folder: VaultFolder) => void;
}

const COLOR_OPTIONS = [
  { id: 'red', bg: 'bg-red-500', label: 'Red' },
  { id: 'blue', bg: 'bg-blue-500', label: 'Blue' },
  { id: 'emerald', bg: 'bg-emerald-500', label: 'Emerald' },
  { id: 'amber', bg: 'bg-amber-500', label: 'Amber' },
  { id: 'purple', bg: 'bg-purple-500', label: 'Purple' },
  { id: 'cyan', bg: 'bg-cyan-500', label: 'Cyan' },
  { id: 'rose', bg: 'bg-rose-500', label: 'Rose' },
  { id: 'zinc', bg: 'bg-zinc-500', label: 'Slate' },
];

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onCreateFolder,
}) => {
  const [folderName, setFolderName] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');
  const [iconName, setIconName] = useState('Folder');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    const newFolder: VaultFolder = {
      id: 'fld_' + Math.random().toString(36).substring(2, 9),
      name: folderName.trim(),
      color: selectedColor,
      iconName: iconName,
      createdAt: Date.now(),
      isSystem: false,
    };

    onCreateFolder(newFolder);
    setFolderName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Create Custom Folder</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Science Docs, Offline Study, Music..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1 mb-2">
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span>Color Tag</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                    selectedColor === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!folderName.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-950/40 transition-all"
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
