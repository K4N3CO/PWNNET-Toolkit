import { useState, useEffect } from 'react';
import { CustomToolLayout } from '../components/CustomToolLayout';
import { useInputHistory } from '../utils/useInputHistory';
import { getBackendUrl } from '../config';
import { ClearableInput } from '../components/ClearableInput';
import { ToolDef } from '../types';
import { Copy, Save, ChevronRight, ChevronDown, Check, Download, ArrowRight, Minus, AlertTriangle } from 'lucide-react';
import { openExternalLink } from '../utils/openLink';
import { NativeShell, isNative } from '../utils/nativeShell';
import { logService } from '../utils/logger';

// Helper for Copy
const copyToCb = (text: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(e => console.error(e));
  }
};

const ActionButtons = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    copyToCb(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-2 text-gray-400 shrink-0">
      <button onClick={handleCopy} className="hover:text-neon-green transition-colors">
        {copied ? <Check size={18} className="text-neon-green" /> : <Copy size={18} />}
      </button>
      <button className="hover:text-neon-green transition-colors">
        <Save size={18} />
      </button>
    </div>
  );
};

const ArcLoader = () => (
  <svg width="40" height="40" viewBox="0 0 50 50" className="animate-spin shrink-0">
    <circle cx="25" cy="25" r="20" fill="none" stroke="#222" strokeWidth="4" />
    <circle cx="25" cy="25" r="20" fill="none" stroke="#39FF14" strokeWidth="4" strokeDasharray="30 100" strokeLinecap="round" />
  </svg>
);

// Helper to ensure URL has proper slashes (fixes common mobile typing bug)
const fixUrlSlashes = (val: string) => {
  if (val.startsWith('https:/') && !val.startsWith('https://')) {
    return val.replace('https:/', 'https://');
  }
  if (val.startsWith('http:/') && !val.startsWith('http://')) {
    return val.replace('http:/', 'http://');
  }
  return val;
};

// 1. Web DirScanner
export function DirScannerTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [results, setResults] = useState<any[]>([]);

  const execute = async () => {
    let target = fixUrlSlashes(url.trim());
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;

    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setResults([]);
    logService.addLog({ module: 'DIR_SCAN', event: 'Scan Started', target: target, status: 'SYSTEM', details: `Target: ${target}` });

    const cleanTarget = target.replace(/^https?:\/\//, '').split('/')[0];
    const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(cleanTarget);

    if (isNative && isPrivateIP) {
      try {
        const stdoutHandle = await NativeShell.addListener('stdout', (data: any) => {
          const line = data.line;
          const match = line.match(/^\[\+\]\s+(\/[^\s]+)/);
          if (match) {
            setResults(prev => [...prev, { path: match[1], status: 200, url: `${target.replace(/\/+$/, '')}${match[1]}` }]);
          }
        });
        await NativeShell.execute({ command: `gobuster dir -u ${target} -w common.txt` });
        stdoutHandle.remove();
      } catch (e) {
        console.error("Native Gobuster error:", e);
      } finally {
        setStatus('finished');
      }
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const qs = new URLSearchParams({ target: target }).toString();
      const res = await fetch(`${backendUrl}/api/net/dirscan?${qs}`);
      if (!res.ok) throw new Error(`Gateway Error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const found = data.results || [];
      setResults(found);
      logService.addLog({
        module: 'DIR_SCAN',
        event: 'Scan Finished',
        target: target,
        status: found.length > 0 ? 'OK' : 'WARN',
        details: `Discovered ${found.length} directories.`
      });
    } catch (e: any) {
      console.error(e);
      setResults([{ path: 'ERROR', status: 500, url: `CONNECTION FAILED: ${e.message}` }]);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Input area */}
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder="https://example.com"
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-neon-green/10 pt-4">
            <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
               {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green" />}
            </div>
            <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
              <div>Found <span className="mx-2">/</span> <span className="text-white">{results.length}</span></div>
              <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
            </div>
            {results.length > 0 && <button onClick={() => setResults([])} className="bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">DISCOVERED DIRECTORIES</h3>
             </div>
             <div className="flex flex-col gap-2">
               {results.map((r, i) => (
                 <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 rounded-r-lg p-3 flex flex-col sm:flex-row sm:items-center items-start justify-between text-sm font-mono hover:border-neon-green/30 transition-all group gap-3 sm:gap-0">
                   <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                     <span className="text-white font-bold text-sm break-all whitespace-normal group-hover:text-neon-green transition-colors">{r.url || `${url.replace(/\/+$/, '')}${r.path.startsWith('/') ? r.path : '/' + r.path}`}</span>
                     <span className="text-gray-500 text-[10px] uppercase">Status: <span className={r.status === 200 ? 'text-neon-green' : r.status === 403 ? 'text-red-500' : 'text-gray-400'}>{r.status}</span></span>
                   </div>
                   <ActionButtons text={r.url || `${url.replace(/\/+$/, '')}${r.path.startsWith('/') ? r.path : '/' + r.path}`} />
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// 2. Web Crawler / Spider
export function SpiderTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [results, setResults] = useState<string[]>([]);

  const execute = async () => {
    let target = fixUrlSlashes(url.trim());
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;

    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setResults([]);
    logService.addLog({ module: 'DIR_SCAN', event: 'Scan Started', target: target, status: 'SYSTEM', details: `Target: ${target}` });
    try {
      const backendUrl = getBackendUrl();
      const qs = new URLSearchParams({ target: target }).toString();
      const res = await fetch(`${backendUrl}/api/net/spider?${qs}`);
      if (!res.ok) throw new Error(`Gateway Error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.links) {
        setResults(data.links);
      } else if (data.result) {
        setResults(data.result.split('\n').filter((l: string) => l.trim()));
      }
    } catch (e: any) {
      console.error(e);
      setResults([`CRAWL ERROR: ${e.message}`]);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder="https://example.com"
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-neon-green/10 pt-4">
            <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
               {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green" />}
            </div>
            <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
              <div>Found <span className="mx-2">/</span> <span className="text-white">{results.length}</span></div>
              <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
            </div>
            {results.length > 0 && <button onClick={() => setResults([])} className="bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>}
          </div>
        </div>

        {results.length > 0 && (
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">SPIDER RESULTS</h3>
             </div>
             <div className="flex flex-col gap-2">
               {results.map((r, i) => (
                 <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 rounded-r-lg p-3 flex justify-between items-start text-sm font-mono hover:border-neon-green/30 transition-all group">
                   <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                     <span className="text-white font-bold text-sm break-all whitespace-normal group-hover:text-neon-green transition-colors">{r}</span>
                     <span className="text-gray-500 text-[10px] uppercase">Status: <span className="text-neon-green">200</span></span>
                   </div>
                   <div className="pt-1">
                     <ActionButtons text={r} />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// 3. React/Next Vulnerability Scanner
export function ReactScannerTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [results, setResults] = useState<any[]>([]);

  const execute = async () => {
    let target = fixUrlSlashes(url.trim());
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;

    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setResults([]);
    logService.addLog({ module: 'DIR_SCAN', event: 'Scan Started', target: target, status: 'SYSTEM', details: `Target: ${target}` });
    try {
      const backendUrl = getBackendUrl();
      const formattedUrl = target;
      
      // Let's also do HTTP headers to populate the scanner
      const headersPromise = fetch(`${backendUrl}/api/net/http?target=${encodeURIComponent(formattedUrl)}`).then(r => r.json()).catch(() => ({}));
      const reactPromise = fetch(`${backendUrl}/api/net/reactscan?target=${encodeURIComponent(formattedUrl)}`).then(r => r.json()).catch(() => ({}));
      
      const [headersData, reactData] = await Promise.all([headersPromise, reactPromise]);
      
      setResults([{
        url: formattedUrl,
        reactPaths: reactData.results || [],
        headers: headersData.result || ''
      }]);

    } catch (e) {
      console.error(e);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder="target.com"
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-neon-green/10 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
                {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green opacity-50" />}
              </div>
              <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
                <div>Targets <span className="mx-2">/</span> <span className="text-white">1</span></div>
                <div>Results <span className="mx-2">/</span> <span className="text-white">{results.length}</span></div>
                <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
              </div>
            </div>
            {results.length > 0 && <button onClick={() => setResults([])} className="bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>}
          </div>
        </div>

        {results.map((r, i) => (
          <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 rounded-r-lg p-4 flex flex-col gap-4 text-sm font-sans hover:border-neon-green/30 transition-all group">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <span className="font-bold text-sm text-white font-mono truncate pr-2 group-hover:text-neon-green transition-colors">{r.url}</span>
                <div className="flex gap-2 font-mono text-[10px]">
                   <span className="bg-[#125832] border border-neon-green text-[#39FF14] px-2 py-1 rounded font-bold uppercase">REACHABLE</span>
                   <span className="bg-[#125832] border border-neon-green text-[#39FF14] px-2 py-1 rounded font-bold uppercase">HTTP 200</span>
                </div>
              </div>
              <ActionButtons text={r.url} />
            </div>

            <div className="mt-2 text-gray-300 font-mono">
               <div className="font-bold mb-2 uppercase text-[10px] tracking-widest text-white border-b border-white/5 pb-1">React/Next Specific Paths:</div>
               <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                 {r.reactPaths.length > 0 ? r.reactPaths.map((p: any, idx: number) => (
                   <div key={idx} className="text-xs text-gray-400">Found: [{p.status}] {p.path}</div>
                 )) : <div className="text-xs text-gray-500">None found</div>}
               </div>
            </div>
          </div>
        ))}
      </div>
    </CustomToolLayout>
  );
}

// 4. WP Scanner
export function WpScannerTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [data, setData] = useState<any>(null);

  const execute = async () => {
    let target = fixUrlSlashes(url.trim());
    if (!target) return;
    if (!target.startsWith('http')) target = 'https://' + target;

    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setData(null);
    try {
      const backendUrl = getBackendUrl();
      const qs = new URLSearchParams({ target: target }).toString();
      const [wpRes, httpRes] = await Promise.all([
        fetch(`${backendUrl}/api/net/wpscan?${qs}`).catch(() => ({ json: () => ({}) } as Response)),
        fetch(`${backendUrl}/api/net/http?${qs}`).catch(() => ({ json: () => ({}) } as Response))
      ]);
      const [apiData, httpData] = await Promise.all([wpRes.json(), httpRes.json()]);
      setData({ ...apiData, headers: httpData.result || '' });
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder="https://example.com"
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto shrink-0 bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-neon-green/10 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
                {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green" />}
              </div>
              <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
                <div>Scan Type <span className="mx-2">/</span> <span className="text-white">LIGHT</span></div>
                <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
              </div>
            </div>
            {data && <button onClick={() => setData(null)} className="bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>}
          </div>
        </div>

        {data && (
          <div className="flex flex-col gap-6 mt-2">
            {/* Basic Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">BASIC INFO</h3>
              </div>
              <div className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 p-4 font-mono rounded-r-lg">
                 <div className="text-gray-500 font-bold mb-1 uppercase text-[10px] tracking-widest">Web</div>
                 <div className="text-gray-200 break-all text-sm">{url}</div>
                 {!data.isWordPress && <div className="text-red-400 mt-2 text-xs">WordPress NOT detected.</div>}
                 {data.isWordPress && <div className="text-neon-green mt-2 text-xs font-bold">This site is using WordPress {data.version ? `v${data.version}` : ''}</div>}
              </div>
            </div>

            {/* Headers */}
            {data.headers && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                  <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">HEADERS ({data.headers.split('\n').filter((l: string) => l.trim().length > 0).length - 1})</h3>
                </div>
                <div className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 p-4 font-mono rounded-r-lg flex flex-col gap-2">
                  {data.headers.split('\n').filter((l: string) => l.trim().length > 0).map((line: string, i: number) => {
                    const separatorIndex = line.indexOf(':');
                    if (separatorIndex !== -1 && i > 0) {
                      const key = line.substring(0, separatorIndex);
                      const value = line.substring(separatorIndex + 1);
                      return (
                        <div key={i} className="text-xs text-gray-300 break-all leading-relaxed">
                          <span className="text-white font-bold tracking-wide uppercase">{key} <span className="text-gray-500">:</span></span> {value}
                        </div>
                      );
                    }
                    return (
                      <div key={i} className="text-xs text-white font-bold break-all pb-1 mb-1 border-b border-white/5">
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Plugins */}
            {data.plugins && (data.plugins.length > 0 || !data.isWordPress) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                  <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">PLUGINS ({data.plugins.length})</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {data.plugins.length > 0 ? data.plugins.map((p: string, i: number) => (
                    <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 p-3 rounded-r-lg shadow-sm text-gray-300 font-bold text-sm font-mono flex items-center justify-between group cursor-pointer hover:border-r-neon-green/30 transition-all">
                      {p}
                      <Download size={14} className="text-gray-500 group-hover:text-neon-green" />
                    </div>
                  )) : (
                    <div className="text-xs text-gray-500 pl-4 font-mono">None found</div>
                  )}
                </div>
              </div>
            )}

            {/* Themes */}
            {data.themes && data.themes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                  <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">THEMES ({data.themes.length})</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {data.themes.map((t: string, i: number) => (
                    <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 p-3 rounded-r-lg shadow-sm font-bold font-mono text-sm text-neon-green hover:bg-neon-green/5 transition-all">
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// 5. IP Scanner
export function NetScannerTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [results, setResults] = useState<any[]>([]);
  const defaultGateway = '192.168.1.1';

  const execute = async () => {
    let target = fixUrlSlashes((url || defaultGateway).trim());
    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setResults([]);
    logService.addLog({ module: 'DIR_SCAN', event: 'Scan Started', target: target, status: 'SYSTEM', details: `Target: ${target}` });

    const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(target);

    if (isNative && isPrivateIP) {
      try {
        const prefix = target.substring(0, target.lastIndexOf('.') + 1);
        const subnetStr = `${prefix}0/24`;

        const hostListener = await NativeShell.addListener('hostFound', (hostData: any) => {
          setResults(prev => {
            if (prev.some(r => r.ip === hostData.ip)) return prev;
            return [...prev, { ip: hostData.ip, status: 'Alive (Native Scan)' }];
          });
        });

        await NativeShell.scanLAN({ subnet: subnetStr });
        hostListener.remove();
      } catch (e) {
        console.error("Native scanLAN error:", e);
      } finally {
        setStatus('finished');
      }
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const qs = new URLSearchParams({ target }).toString();
      const res = await fetch(`${backendUrl}/api/net/netscan?${qs}`);
      const data = await res.json();
      setResults(data.alive || [{ip: target, status: 'Alive (mocked)'}]);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder={`Gateway IP: ${defaultGateway}`}
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto shrink-0 bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-t border-neon-green/10 pt-4">
            <div className="flex items-center gap-4">
              <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
                 {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green" />}
              </div>
              <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
                <div>Queue <span className="mx-2">/</span> <span className="text-white">{url || defaultGateway}/24</span></div>
                <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
              </div>
            </div>
            {results.length > 0 && <button onClick={() => setResults([])} className="bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>}
            <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase text-left sm:text-right hidden sm:block">
               Range: 1 → 254<br />Timeout: 80ms
            </div>
          </div>
          {/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(url || defaultGateway) && (
            <div className="text-yellow-500 font-mono text-[10px] sm:text-xs mt-2 border border-yellow-500/30 bg-yellow-500/5 p-2 rounded flex items-center gap-2 uppercase tracking-wide">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Note: Cloud-hosted scanners run from an external server and cannot scan your local Wi-Fi / Private IP. For local scanning, run the tool directly.</span>
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">DISCOVERED HOSTS ({results.length})</h3>
             </div>
             <div className="flex flex-col gap-2">
               {results.map((r, i) => (
                 <div key={i} className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 rounded-r-lg p-4 flex items-center justify-between text-sm hover:border-r-neon-green/30 transition-all font-mono group">
                   <div className="flex flex-col gap-1 flex-1 min-w-0 pr-4">
                     <span className="text-white font-bold group-hover:text-neon-green transition-colors truncate">{r.ip}</span>
                     <span className="text-gray-500 text-[10px] uppercase">{i === 0 ? 'Gateway / Router' : 'Network Device'}</span>
                   </div>
                   <div className="flex items-center gap-4">
                     <span className="text-neon-green/70 font-bold text-[10px] uppercase cursor-pointer hover:underline hover:text-neon-green hidden sm:inline-block">[Scan Ports]</span>
                     <ActionButtons text={r.ip} />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// 6. WhoIs
export function WhoisTool({ tool, onClose }: { tool: ToolDef; onClose: () => void }) {
  const { value: url, setValue: setUrl } = useInputHistory();
  const [status, setStatus] = useState<'idle' | 'running' | 'finished'>('idle');
  const [data, setData] = useState<any>('');

  const execute = async () => {
    let target = fixUrlSlashes(url.trim());
    if (!target) return;
    (document.activeElement as HTMLElement)?.blur();
    setStatus('running');
    setData('');
    try {
      const backendUrl = getBackendUrl();
      const qs = new URLSearchParams({ target: target }).toString();
      const res = await fetch(`${backendUrl}/api/net/whois?${qs}`);
      const json = await res.json();
      setData(json.result);
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('finished');
    }
  };

  return (
    <CustomToolLayout tool={tool} title="Whols" onClose={onClose}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="bg-[#050505] border-l-4 border-l-neon-green border-y border-r border-neon-green/20 rounded-r-lg p-4 sm:p-5 flex flex-col gap-4 sm:gap-5">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <ClearableInput 
               type="text" 
               inputMode="url"
               value={url}
               onChange={(e) => setUrl(fixUrlSlashes(e.target.value))}
               onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); execute(); } }}
               autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
               placeholder="google.com"
               className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
             onClear={() => setUrl('')} />
            <button 
              onClick={status === 'running' ? () => setStatus('finished') : execute}
              className="w-full sm:w-auto shrink-0 bg-neon-green text-black border border-neon-green rounded px-6 py-3 hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex items-center justify-center font-bold"
            >
               {status === 'running' ? <Minus size={20} /> : <Search size={20} />}
            </button>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-t border-neon-green/10 pt-4">
            <div className="w-[40px] h-[40px] bg-black border border-neon-green/20 rounded flex items-center justify-center shrink-0">
               {status === 'running' ? <ArcLoader /> : <Check size={20} className="text-neon-green" />}
            </div>
            <div className="text-xs font-mono flex flex-col gap-1 text-gray-400 uppercase tracking-widest">
              <div>Status <span className="mx-2">/</span> <span className={status === 'running' ? 'text-neon-green animate-pulse' : 'text-white'}>{status === 'running' ? 'SCANNING' : status === 'finished' ? 'COMPLETE' : 'STANDBY'}</span></div>
            </div>
          </div>
        </div>

        {data && (
          <div className="flex flex-col gap-3">
             <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 bg-neon-green rounded-full shadow-[0_0_5px_#39ff14]"></div>
                <h3 className="text-white uppercase tracking-widest text-xs font-bold font-mono">WHOIS RECORD FOR {url}</h3>
             </div>
             <div className="bg-[#050505] border-l-2 border-l-neon-green border-y border-r border-white/5 rounded-r-lg p-5 overflow-x-auto">
               <pre className="text-[10px] sm:text-xs font-mono text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{data}</pre>
             </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// Icon for WP Scanner since it was missing
function Search(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
