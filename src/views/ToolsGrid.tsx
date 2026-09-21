import { useState, useMemo } from 'react';
import { ToolDef } from '../types';
import { TOOLS } from '../data/tools';
import { Search, Filter, Shield, Activity, Terminal as CmdIcon } from 'lucide-react';
import { motion } from 'motion/react';

const getCategoryStyles = (category: string) => {
  switch (category) {
    case 'Recon':
      return {
        iconContainer: 'bg-gradient-to-br from-[#38bdf8] via-[#0284c7] to-[#082f49] shadow-[0_10px_20px_-5px_rgba(2,132,199,0.5),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.4)] border border-t-[#7dd3fc]/50 border-x-[#0284c7]/30 border-b-black/80',
        iconColor: 'text-white',
      };
    case 'Web':
      return {
        iconContainer: 'bg-gradient-to-br from-[#34d399] via-[#059669] to-[#064e3b] shadow-[0_10px_20px_-5px_rgba(5,150,105,0.5),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.4)] border border-t-[#6ee7b7]/50 border-x-[#059669]/30 border-b-black/80',
        iconColor: 'text-white',
      };
    case 'Utils':
    default:
      return {
        iconContainer: 'bg-gradient-to-br from-[#a78bfa] via-[#7c3aed] to-[#4c1d95] shadow-[0_10px_20px_-5px_rgba(124,58,237,0.5),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.4)] border border-t-[#c4b5fd]/50 border-x-[#7c3aed]/30 border-b-black/80',
        iconColor: 'text-white',
      };
  }
};

interface ToolsGridProps {
  onSelectTool: (tool: ToolDef) => void;
}

export function ToolsGrid({ onSelectTool }: ToolsGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Categories extraction
  const categories = useMemo(() => {
    const cats = new Set(TOOLS.map((t) => t.category));
    return ['All', ...Array.from(cats)];
  }, []);

  // Filtered tools
  const filteredTools = useMemo(() => {
    const list = TOOLS.filter((tool) => {
      return selectedCategory === 'All' || tool.category === selectedCategory;
    });

    if (selectedCategory === 'All') {
       list.sort((a, b) => {
          if (a.id === 'pwnux') return -1;
          if (b.id === 'pwnux') return 1;
          
          if (a.category < b.category) return -1;
          if (a.category > b.category) return 1;
          
          return 0;
       });
    }

    return list;
  }, [selectedCategory]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-obsidian relative">
      {/* CRT Scanline effect overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)+50%,rgba(0,0,0,0.25)+50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] z-10 opacity-30"></div>
      
      {/* Utility Category Bar */}
      <div className="p-4 bg-[#080808] border-b border-neon-green/20 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          {/* Status Indicators */}
          <div className="flex items-center gap-3 px-3.5 py-1.5 border border-neon-green/20 bg-black/80 text-[10px] font-mono text-gray-400 rounded-xl sm:self-stretch">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
              </span>
              <span className="text-neon-green uppercase font-black tracking-widest text-[9px] glow-text">ACTIVE</span>
            </div>
            <div className="border-l border-neon-green/20 h-4"></div>
            <div className="font-bold tracking-wider">CORE: <span className="text-[#38bdf8]">PWN//NET v1.0.1</span></div>
          </div>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-gray-500 font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 font-bold">
            <Filter size={10} className="text-[#38bdf8]" /> REGISTRY GROUPS:
          </span>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            let themeClasses = '';
            if (isActive) {
              if (cat === 'Recon') {
                themeClasses = 'bg-cyan-500 text-black border-cyan-400 hover:bg-cyan-400 glow-border shadow-[0_0_12px_rgba(34,211,238,0.35)]';
              } else if (cat === 'Web') {
                themeClasses = 'bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400 glow-border shadow-[0_0_12px_rgba(16,185,129,0.35)]';
              } else if (cat === 'Utils') {
                themeClasses = 'bg-purple-500 text-white border-purple-400 hover:bg-purple-400 glow-border shadow-[0_0_12px_rgba(168,85,247,0.35)]';
              } else {
                themeClasses = 'bg-neon-green text-black border-neon-green glow-border';
              }
            } else {
              if (cat === 'Recon') {
                themeClasses = 'bg-black text-gray-400 border-cyan-500/20 hover:text-cyan-400 hover:border-cyan-400/60';
              } else if (cat === 'Web') {
                themeClasses = 'bg-black text-gray-400 border-emerald-500/20 hover:text-emerald-400 hover:border-emerald-400/60';
              } else if (cat === 'Utils') {
                themeClasses = 'bg-black text-gray-400 border-purple-500/20 hover:text-purple-400 hover:border-purple-400/60';
              } else {
                themeClasses = 'bg-black text-gray-400 border-neon-green/20 hover:text-neon-green hover:border-neon-green/60';
              }
            }
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider transition-all border cursor-pointer select-none font-bold rounded-xl ${themeClasses}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border-gray bg-[#080808] p-4 text-center">
            <Shield className="w-10 h-10 text-red-500/50 mb-3 animate-pulse" />
            <h3 className="font-mono text-neon-green text-sm uppercase tracking-widest">No matching security tools</h3>
            <p className="font-sans text-xs text-gray-400 mt-1 max-w-xs">Double check your filters or search criteria. Command registry returned empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-y-7 gap-x-4">
            {filteredTools.map((tool, index) => {
              const Icon = tool.icon;
              let styles = getCategoryStyles(tool.category);
              if (tool.id === 'pwnux') {
                 styles = {
                   iconContainer: 'bg-gradient-to-br from-[#f87171] via-[#dc2626] to-[#7f1d1d] shadow-[0_10px_20px_-5px_rgba(220,38,38,0.5),inset_0_2px_5px_rgba(255,255,255,0.5),inset_0_-3px_5px_rgba(0,0,0,0.4)] border border-t-[#fca5a5]/50 border-x-[#dc2626]/30 border-b-black/80',
                   iconColor: 'text-white',
                 };
              }
              return (
                <motion.button
                  key={tool.id}
                  onClick={() => onSelectTool(tool)}
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: Math.min(index * 0.015, 0.15) }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-start text-center group transition-all duration-300 ease-out select-none cursor-pointer"
                >
                  {/* Neumorphic/Glossy App Icon Container */}
                  <div className={`w-[85px] h-[85px] rounded-[18px] sm:w-[95px] sm:h-[95px] sm:rounded-[22px] flex items-center justify-center relative shadow-2xl transform transition-transform group-hover:-translate-y-1 ${styles.iconContainer}`}>
                    {/* Glassy Top Reflection */}
                    <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/30 to-transparent rounded-t-[18px] sm:rounded-t-[22px] pointer-events-none" />
                    {/* Inner glowing ring */}
                    <div className="absolute inset-0 rounded-[18px] sm:rounded-[22px] border-[1.5px] border-white/10 mix-blend-overlay pointer-events-none" />
                    
                    <Icon size={40} strokeWidth={1.5} className={`${styles.iconColor} z-10 transition-transform duration-300 group-hover:scale-110`} />
                  </div>

                  {/* Title labels */}
                  <div className="mt-2.5 flex flex-col w-full px-1">
                    <span className="text-[12px] sm:text-[13px] font-bold font-sans text-gray-200 group-hover:text-white transition-colors truncate w-full tracking-wide drop-shadow-md">
                      {tool.name}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
