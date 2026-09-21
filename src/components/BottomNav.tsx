import { Activity, BookOpen, Database, Settings } from 'lucide-react';
import { Tab } from '../types';
import { motion } from 'motion/react';

interface BottomNavProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  disabled?: boolean;
}

export function BottomNav({ activeTab, setActiveTab, disabled }: BottomNavProps) {
  const tabs = [
    { id: 'tools', label: 'TOOLS', icon: Activity },
    { id: 'logbook', label: 'LOGS', icon: Database },
    { id: 'resources', label: 'RESOURCES', icon: BookOpen },
    { id: 'settings', label: 'SYSTEM', icon: Settings },
  ];

  return (
    <div 
      className="flex justify-around items-center bg-[#070707] border-t border-neon-green/30 px-2 sm:px-6 relative select-none h-[4.25rem] pb-1"
    >
      {/* Visual top cyber neon horizontal line */}
      <div className="absolute top-[-1px] left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-neon-green/45 to-transparent" />

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => !disabled && setActiveTab(tab.id as Tab)}
            className={`flex-1 relative flex flex-col items-center justify-center h-12 rounded-xl transition-all duration-300 group ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
            disabled={disabled}
          >
            {isActive && (
              <motion.div 
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-neon-green/[0.05] border border-neon-green/25 rounded-xl shadow-inner shadow-neon-green/5"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <div className={`z-10 flex flex-col items-center gap-1 transition-all ${isActive ? 'text-neon-green scale-105' : 'text-gray-500 group-hover:text-gray-300'}`}>
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'glow-text' : ''} />
              <span className="text-[9px] uppercase font-black tracking-widest font-mono text-center">
                {tab.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
