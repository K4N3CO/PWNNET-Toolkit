import { useState, useEffect } from 'react';
import { Cpu, TerminalSquare, Compass, Shield, Activity, Sun, Moon, Info } from 'lucide-react';

interface TopBarProps {
  title: string;
  onTerminalToggle?: () => void;
  onAboutClick?: () => void;
  onFavoritesClick?: () => void;
}

export function TopBar({ title, onAboutClick, onFavoritesClick }: TopBarProps) {
  const [isLight, setIsLight] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'light';
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isLight) {
      root.classList.add('light');
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('light');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  return (
    <div 
      className="flex justify-between items-center px-2 sm:px-4 bg-[#070707] border-b border-neon-green/30 shrink-0 relative select-none gap-2"
      style={{ minHeight: 'calc(3.5rem + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Visual cyber glow sub-line */}
      <div className="absolute bottom-[-1px] left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-neon-green/50 to-transparent z-20 pointer-events-none" />

      <div className="text-xs font-mono tracking-widest uppercase flex items-center gap-2 sm:gap-3 relative z-0 flex-1 min-w-0">
        <img 
          src="https://i.postimg.cc/FsFhjMXz/Screenshot-20260528-172644-Bazaart.jpg" 
          alt="PWN//NET" 
          className="h-[36px] sm:h-[48px] w-auto object-contain hover:scale-105 transition-all duration-300 opacity-90 mix-blend-screen contrast-125 shrink-0" 
          referrerPolicy="no-referrer" 
        />
      </div>

      <div className="flex items-center gap-1.5 sm:space-x-2 text-[10px] font-mono shrink-0">
        {/* Dynamic Telemetry Badges */}
        <div className="hidden sm:flex items-center gap-1.5 text-gray-400 border border-neon-green/25 bg-black/90 px-2 py-1 rounded-xl select-none">
          <Shield size={10} className="text-neon-green" />
          <span>SHIELD: <span className="text-[#38bdf8] font-bold">ACTIVE</span></span>
        </div>

        {/* Favorites Button */}
        {onFavoritesClick && (
          <button
            onClick={onFavoritesClick}
            className="bg-black hover:bg-neon-green/10 border border-neon-green/40 hover:border-neon-green px-2.5 py-1 rounded-xl text-yellow-400 hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 font-bold text-[9px] tracking-wider"
            title="Favorites"
          >
            <span>⭐</span>
            <span>FAVORITES</span>
          </button>
        )}

        {/* About Button */}
        {onAboutClick && (
          <button
            onClick={onAboutClick}
            className="bg-black hover:bg-neon-green/10 border border-neon-green/40 hover:border-neon-green px-2.5 py-1 rounded-xl text-neon-green hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 font-bold text-[9px] tracking-wider"
            title="About Information"
          >
            <Info size={11} className="stroke-[2.5px] text-blue-400" />
            <span>ABOUT</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={() => setIsLight(prev => !prev)}
          className="bg-black hover:bg-neon-green/10 border border-neon-green/40 hover:border-neon-green px-2.5 py-1 rounded-xl text-neon-green hover:text-white transition-all cursor-pointer active:scale-95 flex items-center gap-1 font-bold text-[9px] tracking-wider"
          title={isLight ? "Activate Dark Mode" : "Activate Light Mode"}
        >
          {isLight ? <Moon size={11} className="stroke-[2.5px] text-teal-400" /> : <Sun size={11} className="stroke-[2.5px] text-[#eab308]" />}
          <span>{isLight ? 'DARK' : 'LIGHT'}</span>
        </button>
      </div>
    </div>
  );
}
