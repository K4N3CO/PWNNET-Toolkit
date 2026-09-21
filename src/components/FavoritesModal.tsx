import React, { useState, useEffect } from 'react';
import { X, Star, Trash2 } from 'lucide-react';
import { ToolDef } from '../types';
import { TOOLS } from '../data/tools';
import { motion } from 'motion/react';

interface FavoritesModalProps {
  onClose: () => void;
  onSelectTool: (tool: ToolDef) => void;
}

export function FavoritesModal({ onClose, onSelectTool }: FavoritesModalProps) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pwnnet_favorites');
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch(e) {}
  }, []);

  const favoriteTools = favorites.map(id => TOOLS.find(t => t.id === id)).filter(Boolean) as ToolDef[];

  const removeFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newFavs = favorites.filter(fav => fav !== id);
    setFavorites(newFavs);
    localStorage.setItem('pwnnet_favorites', JSON.stringify(newFavs));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#0a0a0a] border border-neon-green/30 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-[0_0_30px_rgba(57,255,20,0.05)]"
      >
        <div className="flex items-center justify-between p-4 bg-neon-green/[0.02] border-b border-neon-green/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <h2 className="text-neon-green font-bold tracking-widest text-sm uppercase">Favorites</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-neon-green transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-neon-green/20">
          {favoriteTools.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-xs font-mono">
              <span className="block text-2xl mb-2 opacity-50">⭐</span>
              No favorite tools yet.<br />
              Tap the star icon inside a tool to add it here.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {favoriteTools.map(tool => {
                const Icon = tool.icon;
                return (
                  <div 
                    key={tool.id} 
                    onClick={() => {
                        onSelectTool(tool);
                        onClose();
                    }}
                    className="flex flex-row items-center p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-neon-green/[0.05] hover:border-neon-green/30 cursor-pointer transition-all group"
                  >
                    <Icon size={18} className="text-neon-green mr-3 opacity-70 group-hover:opacity-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-200 text-sm tracking-wide lowercase truncate">{tool.name}</h3>
                      <div className="text-[9px] text-gray-500 tracking-widest font-mono uppercase truncate mt-0.5">{tool.category} / {tool.actionType}</div>
                    </div>
                    <button 
                      onClick={(e) => removeFavorite(e, tool.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors p-2"
                      title="Remove from favorites"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
