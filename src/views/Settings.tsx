import { useState } from 'react';
import { 
  ChevronRight, ToggleLeft, ToggleRight, Sliders, ShieldCheck, 
  HelpCircle, Shield, Copy, Check, Info, FileCode
} from 'lucide-react';
import { motion } from 'motion/react';

export function Settings() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);
  const [timeout, setTimeoutVal] = useState(30);
  const [shodanKey, setShodanKey] = useState('DUMMY_SHODAN_KEY_PWNNET');
  const [backendUrl, setBackendUrl] = useState(() => localStorage.getItem('pwnnet_backend_url') || 'https://pwnnet-toolkit.onrender.com');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [copied, setCopied] = useState(false);

  const saveBackendUrl = (url: string) => {
    setBackendUrl(url);
    if (url === 'https://pwnnet-toolkit.onrender.com' || !url.trim()) {
      localStorage.removeItem('pwnnet_backend_url');
    } else {
      localStorage.setItem('pwnnet_backend_url', url);
    }
    setTestStatus('idle');
  };

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const res = await fetch(`${backendUrl}/api/net/status`);
      if (res.ok) setTestStatus('ok');
      else setTestStatus('fail');
    } catch {
      setTestStatus('fail');
    }
  };

  // Trigger export configuration
  const handleExport = () => {
    const config = {
      version: "V16.6",
      system_guid: "47F9F5C4-F2FA-4141-A1CB-4A5B17460A15",
      terminal_timeout_seconds: timeout,
      crt_scanlines: scanlinesEnabled,
      retro_keyclick_audio: soundEnabled,
      active_payload_keys: {
        shodan: shodanKey ? "REDACTED" : "NOT_CONFIGURED"
      },
      pwnnet_core_handshakes: "SUCCESSFUL"
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pwnnet_core_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-obsidian relative select-none font-mono">
      {/* CRT overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)+50%,rgba(0,0,0,0.25)+50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] z-10 opacity-30"></div>

      <div className="p-4 space-y-5 pb-28 relative z-20 max-w-2xl mx-auto">
        
        {/* Brand Header with custom logo */}
        <div className="flex flex-col items-center justify-center py-6 border border-neon-green/20 bg-[#0c0c0c]/80 backdrop-blur-sm p-4 rounded-3xl text-center shadow-lg">
          <img 
            src="https://i.postimg.cc/FsFhjMXz/Screenshot-20260528-172644-Bazaart.jpg" 
            alt="PWN//NET Config" 
            className="h-[150px] w-auto object-contain hover:scale-105 transition-all duration-300 mix-blend-screen contrast-125" 
            referrerPolicy="no-referrer"
          />
          <h2 className="text-sm font-black text-white tracking-widest mt-3.5 uppercase glow-text">PwnNet Config Centre</h2>
          <span className="text-[10px] text-neon-green font-extrabold tracking-widest uppercase opacity-90 mt-1">SECURE CONTROL GRID // V16.7</span>
        </div>
        
        {/* SECTION 1: Tactical Configuration Controls */}
        <div className="border border-neon-green/20 bg-[#0c0c0c]/90 p-5 space-y-4 rounded-2xl shadow-lg">
          <div className="text-[10px] font-bold text-[#38bdf8] flex items-center gap-1.5 uppercase pb-2 border-b border-neon-green/10 tracking-widest">
            <Sliders size={12} className="text-[#38bdf8]" />
            <span>OPERATING SYSTEM UTILITY CONTROLS</span>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between py-2 border-b border-neon-green/5">
            <div className="flex flex-col">
              <span className="text-xs text-white uppercase font-bold tracking-wide">Keypress Audio</span>
              <span className="text-[9px] text-gray-500 uppercase font-sans mt-0.5">Simulates mechanical key clicking</span>
            </div>
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-[#00FF41] hover:text-[#52ff7d] transition-transform active:scale-90 cursor-pointer"
            >
              {soundEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-500" />}
            </button>
          </div>

          {/* CRT scanlines toggle */}
          <div className="flex items-center justify-between py-2 border-b border-neon-green/5">
            <div className="flex flex-col">
              <span className="text-xs text-white uppercase font-bold tracking-wide">CRT Retro Overlays</span>
              <span className="text-[9px] text-gray-500 uppercase font-sans mt-0.5">Enables grid flicker screen metrics</span>
            </div>
            <button 
              onClick={() => setScanlinesEnabled(!scanlinesEnabled)}
              className="text-[#00FF41] hover:text-[#52ff7d] transition-transform active:scale-90 cursor-pointer"
            >
              {scanlinesEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-gray-500" />}
            </button>
          </div>

          {/* Key values slider */}
          <div className="space-y-2 py-2">
            <div className="flex justify-between items-center text-xs text-white uppercase font-bold tracking-wide">
              <span>Terminal Timeout Duration</span>
              <span className="text-neon-green bg-neon-green/10 border border-neon-green/35 px-2 py-0.5 rounded-full text-[10px]">{timeout} Seconds</span>
            </div>
            <input 
              type="range"
              min="5"
              max="120"
              value={timeout}
              onChange={(e) => setTimeoutVal(parseInt(e.target.value))}
              className="w-full accent-neon-green h-1.5 bg-black rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* SECTION 2: External Credentials Security parameters */}
        <div className="border border-neon-green/20 bg-[#0c0c0c]/90 p-5 space-y-6 rounded-2xl shadow-lg">
          <div className="text-[10px] font-bold text-[#38bdf8] flex items-center gap-1.5 uppercase pb-2 border-b border-neon-green/10 tracking-widest">
            <ShieldCheck size={12} className="text-[#38bdf8]" />
            <span>INFRASTRUCTURE & CREDENTIALS</span>
          </div>

          {/* Backend URL Override */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 uppercase text-[9px] font-bold">NODE BACKEND GATEWAY (API):</span>
              <button
                onClick={testConnection}
                disabled={testStatus === 'testing'}
                className={`text-[8px] font-bold px-2 py-0.5 rounded border transition-all ${
                  testStatus === 'ok' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                  testStatus === 'fail' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                  'bg-neon-green/10 text-neon-green border-neon-green/30'
                }`}
              >
                {testStatus === 'testing' ? 'TESTING...' : testStatus === 'ok' ? 'ONLINE ✓' : testStatus === 'fail' ? 'OFFLINE ✗' : 'TEST LINK'}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => saveBackendUrl(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-black border border-neon-green/20 rounded-xl px-3.5 py-2.5 focus:border-neon-green text-neon-green tracking-widest text-xs focus:outline-none transition-all"
                placeholder="https://your-api.com"
              />
              <p className="text-[8px] text-gray-600 uppercase">Default: https://pwnnet-toolkit.onrender.com</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <span className="text-gray-500 uppercase text-[9px] font-bold">SHODAN RECON GATEWAY KEY:</span>
            <div className="flex gap-2 w-full">
              <input 
                type="password"
                value={shodanKey}
                onChange={(e) => setShodanKey(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="off"
                className="flex-1 min-w-0 bg-black border border-neon-green/20 rounded-xl px-3.5 py-2 focus:border-neon-green hover:border-neon-green/50 text-neon-green tracking-widest text-xs focus:outline-none transition-all"
                placeholder="PROVISION API TOKEN..."
              />
              <button 
                onClick={() => setShodanKey('')}
                className="shrink-0 border border-red-500/30 rounded-xl px-4 text-[10px] font-bold uppercase text-red-500 hover:border-red-500 hover:bg-red-500/10 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              >
                CLEAR
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: Information & Export Operations */}
        <div className="p-5 border border-dashed border-neon-green/30 bg-[#0a0a0a]/75 flex flex-col items-center justify-center text-center space-y-3 rounded-2xl">
          <FileCode size={26} className="text-neon-green animate-pulse" />
          <h3 className="text-xs text-white uppercase font-extrabold tracking-wider">System Config Manifest Profile</h3>
          <p className="text-[9px] text-gray-500 uppercase max-w-xs leading-relaxed font-sans mt-1">
            Export secure backup profiles to sync operational setups across terminal nodes.
          </p>
          <button 
            onClick={handleExport}
            className="bg-neon-green text-black hover:bg-white border border-neon-green hover:border-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md hover:shadow-neon-green/20"
          >
            {copied ? <Check size={12} className="stroke-[3px]" /> : <Info size={12} className="stroke-[3px]" />}
            <span>{copied ? 'PROFILE EXPORTED' : 'SAVE EXPLOIT PROFILE'}</span>
          </button>
        </div>

        {/* Firmware Version Telemetry details */}
        <div className="p-2 text-center text-[9px] text-gray-500 font-mono space-y-1">
          <div className="text-neon-green/40 mb-2">TARGET GATEWAY: {backendUrl}</div>
          <div>PWNNET OPERATIONAL FIRMWARE // CORE v16.6.11</div>
          <div className="tracking-widest text-[8px] opacity-75">MD5: AF47F9F5C4F2FA4141A1CB4A5B17460A</div>
        </div>

      </div>
    </div>
  );
}
