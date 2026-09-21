import React, { ReactNode, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ToolDef } from '../types';

import { useVisualViewport } from '../hooks/useVisualViewport';

interface CustomToolLayoutProps {
  tool: ToolDef;
  onClose: () => void;
  children: ReactNode;
  icon?: any;
  title?: string;
}

export function CustomToolLayout({ tool, onClose, children, icon: CustomIcon, title }: CustomToolLayoutProps) {
  const Icon = CustomIcon || tool.icon;
  const keyboardOffset = useVisualViewport();
  const [isFavorite, setIsFavorite] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const isKeyboardOpen = keyboardOffset > 0;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pwnnet_favorites');
      if (saved) {
        setIsFavorite(JSON.parse(saved).includes(tool.id));
      }
    } catch(e) {}
  }, [tool.id]);

  const toggleFavorite = () => {
    try {
      const saved = localStorage.getItem('pwnnet_favorites');
      let favs = saved ? JSON.parse(saved) : [];
      if (favs.includes(tool.id)) {
        favs = favs.filter((id: string) => id !== tool.id);
        setIsFavorite(false);
      } else {
        favs.push(tool.id);
        setIsFavorite(true);
      }
      localStorage.setItem('pwnnet_favorites', JSON.stringify(favs));
    } catch(e) {}
  };
  
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neon-green/20 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="text-neon-green font-bold tracking-widest text-sm sm:text-base uppercase flex items-center gap-2 truncate">
            {tool.name.toUpperCase()}
          </span>
          <span className={`shrink-0 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono rounded border uppercase tracking-widest bg-neon-green/10 text-neon-green border-neon-green/50`}>
            ACTIVE
          </span>
          <button 
            onClick={toggleFavorite}
            className={`shrink-0 flex items-center justify-center p-1 rounded-full transition-all ${isFavorite ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-100'}`}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <span className={isFavorite ? 'drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'grayscale'}>⭐</span>
          </button>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="flex items-center gap-1.5 text-neon-green border border-neon-green/50 rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold hover:bg-neon-green/10 transition-colors uppercase tracking-widest"
          >
            <ArrowLeft size={14} />
            BACK
          </button>
        </div>
      </div>

      {/* Description Toggle & Content */}
      {!isKeyboardOpen && (
        <>
          <button
            onClick={() => setShowDesc(!showDesc)}
            className="flex items-center justify-center gap-2 py-1 bg-neon-green/5 border-b border-neon-green/10 text-[9px] text-gray-500 uppercase tracking-widest font-bold hover:text-neon-green transition-colors"
          >
            {showDesc ? 'Tap to hide description' : 'Tap to view description'}
          </button>
          {showDesc && (
            <div className="flex gap-3 p-4 sm:p-5 bg-neon-green/[0.02] border-b border-neon-green/10 shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
              <Icon size={16} className="text-neon-green mt-0.5 shrink-0" />
              <p className="text-gray-400 font-mono text-xs sm:text-[13px] leading-relaxed max-w-4xl">
                {tool.description}
              </p>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-6 pb-24 scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto border border-neon-green/20 rounded-[16px] sm:rounded-[24px] p-4 sm:p-8 bg-[#0a0a0a] shadow-[0_0_20px_rgba(57,255,20,0.03)] focus-within:shadow-[0_0_20px_rgba(57,255,20,0.06)] transition-shadow flex flex-col gap-6 sm:gap-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <Icon size={20} className="text-neon-green sm:w-6 sm:h-6" />
            <h2 className="text-white font-bold tracking-widest text-xs sm:text-lg uppercase">
              {title || `${tool.name} MODULE`}
            </h2>
          </div>
          
          <div className="space-y-6 sm:space-y-8 font-mono">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
