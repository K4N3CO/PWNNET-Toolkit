import { useState, useEffect, Component, ReactNode, useRef } from 'react';
import { Tab, ToolDef } from './types';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { TerminalEmulator } from './components/Terminal';
import { ToolsGrid } from './views/ToolsGrid';
import { Logbook } from './views/Logbook';
import { Resources } from './views/Resources';
import { Settings } from './views/Settings';
import { DorksPage } from './views/DorksPage';
import { CustomToolRouter } from './views/CustomTools';
import { SplashScreen } from './components/SplashScreen';
import { AboutModal } from './components/AboutModal';
import { FavoritesModal } from './components/FavoritesModal';
import { AnimatePresence } from 'motion/react';
import { initKotlinLogger } from './utils/kotlinLogger';
import { logService } from './utils/logger';
import { App as CapApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500 font-mono text-sm break-all">App Crashed: {this.state.error?.message} - {(this.state.error as any)?.stack}</div>;
    }
    return this.props.children;
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('tools');
  const [activeTool, setActiveTool] = useState<ToolDef | null>(null);
  const [showExitToast, setShowExitToast] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const backPressCount = useRef(0);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardOpen(true));
    const hideListener = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardOpen(false));
    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, []);

  useEffect(() => {
    initKotlinLogger();
    logService.addLog({
      module: 'SYSTEM',
      event: 'Application Boot',
      target: Capacitor.getPlatform(),
      status: 'SYSTEM',
      details: `PWNNET Toolkit initialized on ${Capacitor.getPlatform()} platform. Native Bridge: ${Capacitor.isNativePlatform() ? 'ACTIVE' : 'SIMULATED'}`
    });
  }, []);

  // Handle hardware back button for Tools
  useEffect(() => {
    const backListener = CapApp.addListener('backButton', () => {
      if (activeTool) {
        setActiveTool(null);
        // Clean up history state if needed
        if (window.history.state?.view === 'tool') {
          window.history.back();
        }
      } else if (activeTab !== 'tools') {
        setActiveTab('tools');
      } else {
        // On home screen
        if (backPressCount.current === 0) {
          backPressCount.current = 1;
          setShowExitToast(true);
          setTimeout(() => {
            backPressCount.current = 0;
            setShowExitToast(false);
          }, 2000);
        } else {
          CapApp.exitApp();
        }
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [activeTool, activeTab]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If we go back and there's no tool state, but we had a tool open, close it
      if (activeTool && (!e.state || e.state.view !== 'tool')) {
        setActiveTool(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTool]);

  const handleSelectTool = (tool: ToolDef) => {
    setActiveTool(tool);
    window.history.pushState({ view: 'tool', id: tool.id }, '');
  };

  const handleCloseTool = () => {
    setActiveTool(null);
    if (window.history.state?.view === 'tool') {
      window.history.back();
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'tools': return 'PwnNet Tools';
      case 'logbook': return 'Logs';
      case 'resources': return 'Resources';
      case 'settings': return 'System';
    }
  };

  return (
    <ErrorBoundary>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      <div className="flex flex-col h-[100dvh] w-full bg-obsidian text-neon-green font-mono overflow-hidden" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <TopBar 
          title={getTitle()} 
          onTerminalToggle={activeTab === 'tools' ? () => setActiveTool(activeTool) : undefined} 
          onFavoritesClick={() => setShowFavorites(true)}
          onAboutClick={() => setShowAbout(true)}
        />
      
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === 'tools' && <ToolsGrid onSelectTool={handleSelectTool} />}
        {activeTab === 'logbook' && <Logbook />}
        {activeTab === 'resources' && <Resources />}
        {activeTab === 'settings' && <Settings />}

        {activeTool && activeTool.id === 'dorks' ? (
          <DorksPage tool={activeTool} onClose={handleCloseTool} />
        ) : activeTool && activeTool.actionType === 'custom' ? (
          <CustomToolRouter tool={activeTool} onClose={handleCloseTool} />
        ) : activeTool && (
          <TerminalEmulator 
            tool={activeTool} 
            onClose={handleCloseTool} 
          />
        )}
      </div>

      {showFavorites && (
        <FavoritesModal 
          onClose={() => setShowFavorites(false)} 
          onSelectTool={handleSelectTool} 
        />
      )}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {!isKeyboardOpen && (
        <div className="shrink-0 z-50 relative bg-obsidian">
          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} disabled={!!activeTool} />
        </div>
      )}

      <AnimatePresence>
        {showExitToast && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none">
            <div className="bg-neon-green text-black px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(57,255,20,0.5)] border border-white/20 whitespace-nowrap">
              Push back again to exit app
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}
