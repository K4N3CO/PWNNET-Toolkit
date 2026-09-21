import { ClearableInput } from './ClearableInput';
import { useState, useRef, useEffect, FormEvent, ReactNode } from 'react';
import * as OTPAuth from 'otpauth';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import { logService } from '../utils/logger';
import { 
  X, Terminal as TerminalIcon, Play, RefreshCw, Copy, Check, 
  Cpu, ShieldAlert, Wifi, Globe, MapPin, Hash, KeySquare, Laptop, 
  Compass, Eye, Zap, ShieldAlert as AlertIcon, Lock, ArrowLeft, Bluetooth, Calculator, KeyRound, Gauge, QrCode,
  Search, DoorOpen, Server, Bug, FileText
} from 'lucide-react';
import { ToolDef, TerminalOutput } from '../types';
import { getBackendUrl } from '../config';
import { openExternalLink } from '../utils/openLink';

interface TerminalEmulatorProps {
  tool: ToolDef | null;
  onClose: () => void;
}

const fallbackCopyTextToClipboard = (text: string) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Copy failed', err); }
  document.body.removeChild(textArea);
};

const copyToClipboardV2 = (text: string) => {
  if (!navigator.clipboard) { fallbackCopyTextToClipboard(text); return; }
  navigator.clipboard.writeText(text).catch(() => fallbackCopyTextToClipboard(text));
};

const CopyableLink = ({ url, label }: { url: string, label?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    copyToClipboardV2(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const openExternal = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <span className="inline-flex items-center gap-2 text-blue-400 underline underline-offset-2 decoration-dotted decoration-blue-500/40 text-[10px] sm:text-xs">
      {label || url}
      <button onClick={handleCopy} className="p-1 rounded hover:bg-white/10 transition-colors" title="Copy link">
        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
      </button>
      <button onClick={() => openExternalLink(url)} className="p-1 rounded hover:bg-white/10 transition-colors" title="Open in browser">
        ↗
      </button>
    </span>
  );
};

import { useInputHistory } from '../utils/useInputHistory';
import { useVisualViewport } from '../hooks/useVisualViewport';
import { NativeShell, isNative } from '../utils/nativeShell';

export function TerminalEmulator({ tool, onClose }: TerminalEmulatorProps) {
  const keyboardOffset = useVisualViewport();
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const { value: target, setValue: setTarget, handleKeyDown, saveToHistory, historyUp, historyDown } = useInputHistory();

  const [showInput, setShowInput] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tool) {
      setOutput([]);
      setShowInput(tool.requiresInput || false);
      setTarget('');

      if (!tool.requiresInput) {
        runAutoTool(tool.id);
      } else {
        setIsRunning(true);
        if (tool.id === 'base64') {
          addOutput('system', 'Base64 encoder/decoder ready. Enter text to encode, or "decode:<base64>" to decode.');
        } else if (tool.id === 'cipher') {
          addOutput('system', 'Cipher decoder ready. Enter text to analyze.');
        } else if (tool.id === 'pwnux') {
          addOutput('system', 'Pwnux emulator ready.');
          addOutput('info', "Type 'help' to show commands.");
        } else {
          addOutput('info', `Module ready. Enter a target to proceed.`);
        }
        setIsRunning(false);
      }
    }
  }, [tool]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (showInput && !isRunning && inputRef.current) {
      // Don't auto-focus on mobile devices to prevent the keyboard from popping up
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
      if (!isMobile) {
        inputRef.current.focus();
      }
    }
  }, [showInput, isRunning]);

  const addOutput = (type: TerminalOutput['type'], content: ReactNode, rawLog?: string) => {
    const entry: TerminalOutput = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      content,
    };
    
    let stringContent = rawLog;
    if (!stringContent && typeof content === 'string') {
      stringContent = content;
    }
    entry.rawContent = stringContent;

    setOutput(prev => [...prev, entry]);
    
    if (stringContent) {
      const logStatus: LogEntry['status'] =
        type === 'error' ? 'FAIL' :
        type === 'system' ? 'SYSTEM' :
        'OK';

      logService.addLog({
        module: tool ? tool.id.toUpperCase() : 'TERMINAL',
        event: type === 'input' ? 'Command Input' : 'Process Output',
        target: resolvedTarget || 'localhost',
        status: logStatus,
        details: stringContent.substring(0, 500)
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'system': return 'text-neon-green font-bold';
      case 'input': return 'text-neon-green/80';
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'info': return 'text-gray-200';
      default: return 'text-gray-400';
    }
  };

  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (tool && tool.id) {
      try {
        const saved = localStorage.getItem('pwnnet_favorites');
        if (saved) {
          setIsFavorite(JSON.parse(saved).includes(tool.id));
        }
      } catch(e) {}
    }
  }, [tool]);

  const toggleFavorite = () => {
    if (!tool) return;
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

  const getStatusBadge = () => {
    if (isRunning) return { text: 'RUNNING', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50' };
    if (output.some(o => o.type === 'error')) return { text: 'ERROR', color: 'bg-red-500/10 text-red-500 border-red-500/50' };
    if (output.length > 0) return { text: 'ACTIVE', color: 'bg-neon-green/10 text-neon-green border-neon-green/50' };
    return { text: 'READY', color: 'bg-neon-green/5 text-neon-green/80 border-neon-green/30' };
  };

  const runAutoTool = async (toolId: string) => {
    setIsRunning(true);
    addOutput('system', `Initializing ${toolId.toUpperCase()} module...`);

    if (toolId === 'device') {
      const mem = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency;
      const info = [
        `User Agent: ${navigator.userAgent}`,
        `Platform: ${navigator.platform}`,
        `Language: ${navigator.language}`,
        `Screen: ${screen.width}x${screen.height}`,
        `Color Depth: ${screen.colorDepth}bit`,
        `Device Memory: ${mem || 'Unknown'} GB`,
        `CPU Cores: ${cores || 'Unknown'}`,
        `Online: ${navigator.onLine}`,
        `Cookies Enabled: ${navigator.cookieEnabled}`,
        `Touch Support: ${navigator.maxTouchPoints > 0}`,
      ];
      info.forEach(line => addOutput('info', line));
      addOutput('success', 'Device scan complete.');
    }
    else if (toolId === 'security') {
      const checks = [
        { name: 'Cookies Enabled', pass: navigator.cookieEnabled },
        { name: 'Do Not Track', pass: (navigator as any).doNotTrack === '1' },
        { name: 'Local Storage', pass: !!window.localStorage },
        { name: 'Session Storage', pass: !!window.sessionStorage },
        { name: 'Service Worker Support', pass: 'serviceWorker' in navigator },
        { name: 'Geolocation API', pass: 'geolocation' in navigator },
      ];
      checks.forEach(c => {
        addOutput(c.pass ? 'success' : 'error', `${c.name}: ${c.pass ? '✓' : '✗'}`);
      });
      addOutput('success', 'Security profile scan complete.');
    }
    else if (toolId === 'speed') {
      addOutput('system', 'Testing latency...');
      const start = performance.now();
      try {
        await fetch('https://www.google.com/images/phd/px.gif', { mode: 'no-cors', cache: 'no-store' });
        const end = performance.now();
        addOutput('info', `Round-trip latency: ~${Math.round(end - start)}ms`);
        addOutput('success', 'Latency test complete.');
      } catch {
        addOutput('error', 'Latency test blocked.');
      }
    }
    else if (toolId === 'base64') {
      addOutput('system', 'Base64 encoder/decoder ready. Enter text to encode, or "decode:<base64>" to decode.');
    }
    else if (toolId === 'cipher') {
      addOutput('system', 'Cipher decoder ready. Enter text to analyze.');
    }
    else if (toolId === 'pwnux') {
      addOutput('system', 'Pwnux emulator ready.');
      addOutput('info', "Type 'help' to show commands.");
    }
    else if (toolId === 'passwords') {
      addOutput('system', 'Generating cryptographically secure password...');
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
      let pwd = '';
      const array = new Uint32Array(24);
      crypto.getRandomValues(array);
      for (let i = 0; i < 24; i++) {
        pwd += charset[array[i] % charset.length];
      }
      addOutput('success', pwd);
      addOutput('info', 'Length: 24 | Entropy: ~157 bits');
    }
    else {
      addOutput('info', `Module ready. Enter a target to proceed.`);
    }

    setIsRunning(false);
  };

  const handleRunTarget = async (input: string) => {
    if (!input.trim() || !tool) return;

    const activeToolId = tool.id;
    if (activeToolId === 'web_faker') {
       setOutput([]);
    }
    const prompt = 'root@pwnux:~$';
    addOutput('input', `${prompt} ${input}`);

    setIsRunning(true);
    let resolvedTarget = input.trim();
    if (!resolvedTarget.startsWith('http://') && !resolvedTarget.startsWith('https://') && 
        (activeToolId === 'http' || activeToolId === 'spider' || activeToolId === 'admin_finder' || activeToolId === 'js_scan' || activeToolId === 'cors_scan')) {
      resolvedTarget = 'https://' + resolvedTarget;
    }

    const ipDomainRegex = /^(?:http[s]?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/.*)?$|^localhost(?:\/.*)?$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

    const domainRequiredTools = ['admin_finder', 'blacklist', 'certs', 'dns', 'geo', 'http', 'ip_host', 'mail', 'ping', 'port_scan', 'shodan', 'spider', 'vt', 'whois', 'traceroute', 'net_scan', 'subdomains', 'js_scan', 'cors_scan', 'sub'];
    
    if (domainRequiredTools.includes(activeToolId) && !ipDomainRegex.test(resolvedTarget)) {
      addOutput('error', 'Invalid input format. Please enter a valid domain, IP address, or URL.');
      setIsRunning(false);
      return;
    }

    if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(resolvedTarget.replace(/^https?:\/\//, ''))) {
      if (['ping', 'port_scan', 'net_scan', 'traceroute', 'ip_host'].includes(activeToolId)) {
        addOutput('system', '⚠ [WARNING]: Target appears to be a Private IP (LAN). Our cloud-hosted scanners execute from an external server and CANNOT reach devices on your local Wi-Fi. It will likely timeout.');
      }
    }

    if (activeToolId === 'pwned' && !emailRegex.test(resolvedTarget)) {
      addOutput('error', 'Invalid input format. Please enter a valid email address.');
      setIsRunning(false);
      return;
    }

    if (activeToolId === 'mac' && !macRegex.test(resolvedTarget.toUpperCase())) {
      addOutput('error', 'Invalid input format. Please enter a valid MAC address (e.g., 00:1A:2B:...).');
      setIsRunning(false);
      return;
    }

    const runBackendTool = async (endpoint: string, params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      // @ts-ignore - import.meta.env might not be fully typed in some setups
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/${endpoint}?${qs}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      return data;
    };

    try {
      // --- NATIVE TOOLS (Device-side binaries) ---
      if (activeToolId.endsWith('_native') || activeToolId === 'hash_cracker') {
        if (!isNative) {
          addOutput('error', 'Native binaries (Nmap/Gobuster/John) can only be executed on an Android/iOS device via the native shell.');
          setIsRunning(false);
          return;
        }

        const binary = activeToolId === 'hash_cracker' ? 'john' : activeToolId.replace('_native', '');
        addOutput('system', `Attempting to initialize native ${binary} binary...`);

        try {
          addOutput('system', `Initializing native ${binary}...`);

          const stdoutHandle = await NativeShell.addListener('stdout', (data: any) => {
             const line = data.line;
             // Regex to detect Gobuster path format: "[+] /admin (Status: 200)"
             const gobusterMatch = line.match(/^\[\+\]\s+(\/[^\s]+)/);

             if (gobusterMatch && resolvedTarget) {
               const path = gobusterMatch[1];
               const fullUrl = resolvedTarget.endsWith('/') ?
                 `${resolvedTarget}${path.substring(1)}` :
                 `${resolvedTarget}${path}`;

               addOutput('info', (
                 <div className="flex items-center gap-2 group">
                   <span className="text-white">{line}</span>
                   <button
                     onClick={() => openExternalLink(fullUrl)}
                     className="px-2 py-0.5 bg-neon-green/20 text-neon-green text-[9px] border border-neon-green/30 rounded hover:bg-neon-green hover:text-black transition-all font-bold uppercase tracking-tighter"
                   >
                     Go to Link
                   </button>
                 </div>
               ), line);
             } else {
               addOutput('info', line);
             }
          });
          const stderrHandle = await NativeShell.addListener('stderr', (data: any) => {
             addOutput('error', data.line);
          });

          const cmd = activeToolId === 'hash_cracker' ? `john --format=raw-md5 --wordlist=common.txt ${resolvedTarget}` :
                      binary === 'nmap' ? `nmap -sT -Pn -F ${resolvedTarget}` :
                      `gobuster dir -u ${resolvedTarget} -w https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/Web-Content/common.txt --delay 10ms`;

          const result = await NativeShell.execute({ command: cmd });
          const exitCode = result?.exitCode ?? 0;

          if (exitCode === 0) {
            addOutput('success', `Native ${binary} finished.`);
          } else {
            addOutput('error', `Exited with code: ${exitCode}`);
          }

          // Cleanup after a short delay
          setTimeout(() => {
            stdoutHandle.remove();
            stderrHandle.remove();
            setIsRunning(false);
          }, 1000);
        } catch (e: any) {
          addOutput('error', `Native execution failed: ${e.message}`);
          setIsRunning(false);
        }
        return;
      }

      // --- ADMIN FINDER ---
      if (activeToolId === 'admin_finder') {
        addOutput('system', `Scanning admin panels on ${resolvedTarget} via backend...`);
        const data = await runBackendTool('adminfinder', { target: resolvedTarget });
        const cleanTarget = resolvedTarget.replace(/\/+$/, '');
        if (data.results && data.results.length > 0) {
          data.results.forEach((r: any) => {
             const path = r.path.startsWith('/') ? r.path : '/' + r.path;
             addOutput('success', <CopyableLink url={`${cleanTarget}${path}`} label={`[${r.status}] FOUND: ${cleanTarget}${path}`} />, `[${r.status}] FOUND: ${cleanTarget}${path}`);
          });
          addOutput('system', `Complete. Found ${data.results.length} admin panel(s).`);
        } else {
          addOutput('info', 'No common admin panels found.');
        }
        setIsRunning(false);
        return;
      }

      // --- PWNUX CLI ---
      if (activeToolId === 'pwnux') {
        const args = input.trim().split(' ');
        const cmd = args[0].toLowerCase();

        if (cmd === 'help') {
          addOutput('info', `Available commands:
  nmap <target>    - Fast port scan (Cloud)
  ping <target>    - TCP latency test
  whois <domain>   - WHOIS registration info
  dns <domain>     - DNS record enumeration
  admin <url>      - Admin panel finder
  http <url>       - View HTTP response headers
  crawl <url>      - Extract links from webpage
  sub <domain>     - Enumeration subdomains
  clear              - Clear terminal screen
  echo <text>      - Print text to screen
  help               - Show this menu`);
        }
        else if (cmd === 'clear') { setOutput([]); }
        else if (cmd === 'echo') { addOutput('info', args.slice(1).join(' ')); }
        else if (cmd === 'nmap') {
          const host = args[1];
          if (!host) { addOutput('error', 'Usage: nmap <target>'); setIsRunning(false); return; }
          addOutput('system', `Scanning ${host} via cloud-nmap...`);
          try {
            const data = await runBackendTool('nmap', { target: host });
            addOutput('info', data.result || 'No output from scan');
          } catch (e: any) {
            addOutput('error', 'Scan failed: ' + e.message);
          }
        }
        else if (cmd === 'ping') {
          const host = args[1];
          if (!host) { addOutput('error', 'Usage: ping <target>'); setIsRunning(false); return; }
          addOutput('system', `Pinging ${host} via backend TCP...`);
          try {
            const data = await runBackendTool('ping', { target: host });
            addOutput('success', `Reply from ${data.ip} via port ${data.port}: time=${data.time}ms`);
          } catch (e: any) {
            addOutput('error', 'Ping failed: ' + e.message);
          }
        }
        else if (cmd === 'whois') {
          const domain = args[1];
          if (!domain) { addOutput('error', 'Usage: whois <domain>'); setIsRunning(false); return; }
          addOutput('system', `WHOIS ${domain}...`);
          try {
            const data = await runBackendTool('whois', { target: domain });
            data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
          } catch (e: any) {
            addOutput('error', 'WHOIS failed: ' + e.message);
          }
        }
        else if (cmd === 'dns') {
          const domain = args[1];
          if (!domain) { addOutput('error', 'Usage: dns <domain>'); setIsRunning(false); return; }
          addOutput('system', `DNS records for ${domain}...`);
          try {
            const data = await runBackendTool('dns', { target: domain });
            data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
            addOutput('success', 'DNS lookup complete.');
          } catch (e: any) {
            addOutput('error', 'DNS lookup failed: ' + e.message);
          }
        }
        else if (cmd === 'admin') {
          const site = args[1];
          if (!site) { addOutput('error', 'Usage: admin <url>'); setIsRunning(false); return; }
          addOutput('system', `Admin scan on ${site}...`);
          try {
            const data = await runBackendTool('adminfinder', { target: site });
            if (data.results && data.results.length > 0) {
              data.results.forEach((r: any) => addOutput('success', `[${r.status}] FOUND: ${site}${r.path}`));
            } else {
              addOutput('info', 'No admin panels found.');
            }
          } catch (e: any) {
            addOutput('error', 'Scan failed: ' + e.message);
          }
        }
        else if (cmd === 'sub') {
          const host = args[1];
          if (!host) { addOutput('error', 'Usage: sub <domain>'); setIsRunning(false); return; }
          addOutput('system', `Subdomain enum for ${host}...`);
          try {
            const data = await runBackendTool('subdomains', { target: host });
            if (data.result && data.result.length > 0) {
              data.result.forEach((s: string) => addOutput('info', s));
              addOutput('success', `Found ${data.result.length} subdomains.`);
            } else {
              addOutput('info', 'No subdomains discovered.');
            }
          } catch (e: any) {
            addOutput('error', 'Enum failed: ' + e.message);
          }
        }
        else if (cmd === 'http') {
          const url = args[1];
          if (!url) { addOutput('error', 'Usage: http <url>'); setIsRunning(false); return; }
          addOutput('system', `Headers for ${url}...`);
          try {
            const data = await runBackendTool('http', { target: url });
            data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
          } catch (e: any) {
            addOutput('error', 'HTTP failed: ' + e.message);
          }
        }
        else if (cmd === 'crawl') {
          const url = args[1];
          if (!url) { addOutput('error', 'Usage: crawl <url>'); setIsRunning(false); return; }
          addOutput('system', `Crawling ${url}...`);
          try {
            const data = await runBackendTool('spider', { target: url });
            if (data.links && data.links.length > 0) {
              data.links.forEach((l: string) => {
                 addOutput('info', <CopyableLink url={l} label={`[URL] ${l}`} />, `[URL] ${l}`);
              });
              addOutput('system', `Spider completed. Found ${data.links.length} total links.`);
            } else {
              addOutput('info', data.result || 'No links found.');
            }
          } catch (e: any) {
            addOutput('error', 'Crawl failed: ' + e.message);
          }
        }
        else {
          addOutput('error', `Unknown command: ${cmd}. Type 'help'.`);
        }

        setIsRunning(false);
        return;
      }

      // --- REGULAR TOOLS ---
      if (activeToolId === 'llm_jailbreak') {
        addOutput('system', `Generating custom LLM jailbreak payload targeting: ${resolvedTarget}...`);
        try {
          const backendUrl = getBackendUrl();
          const res = await fetch(`${backendUrl}/api/net/llm_jailbreak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: resolvedTarget })
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `HTTP ${res.status}`);
          }
          addOutput('success', '[PAYLOAD GENERATED]');
          addOutput('info', data.result || 'No payload received.');
        } catch (e: any) {
           addOutput('error', `Failed to generate: ${e.message}`);
        }
      }
      else if (activeToolId === 'shodan') {
        addOutput('system', `Shodan: ${resolvedTarget}`);
        addOutput('success', ( <CopyableLink url={`https://www.shodan.io/search?query=${encodeURIComponent(resolvedTarget)}`} label="→ Open Shodan search" /> ), `→ Open Shodan search: https://www.shodan.io/search?query=${resolvedTarget}`);
      }
      else if (activeToolId === 'vt') {
        addOutput('system', `VirusTotal: ${resolvedTarget}`);
        addOutput('success', ( <CopyableLink url={`https://www.virustotal.com/gui/search/${encodeURIComponent(resolvedTarget)}`} label="→ VirusTotal analysis" /> ), `→ VirusTotal analysis: https://www.virustotal.com/gui/search/${resolvedTarget}`);
      }
      else if (activeToolId === 'dorks') {
        addOutput('system', 'Google Dorks:');
        const cleanTarget = resolvedTarget.replace(/https?:\/\//, '');
        addOutput('info', `site:${cleanTarget} intitle:"index of"`);
        addOutput('info', `site:${cleanTarget} inurl:admin`);
        addOutput('info', `site:${cleanTarget} ext:sql|ext:env|ext:bak`);
        addOutput('info', `site:${cleanTarget} inurl:wp-admin`);
        addOutput('info', `site:${cleanTarget} intitle:"phpinfo"`);
        addOutput('success', ( <CopyableLink url={`https://www.google.com/search?q=site:${cleanTarget}`} label="→ Open Google search" /> ), `→ Open Google search: https://www.google.com/search?q=site:${cleanTarget}`);
      }
      else if (activeToolId === 'pwned') {
        addOutput('system', `Have I Been Pwned check for: ${resolvedTarget}`);
        addOutput('success', ( <CopyableLink url={`https://haveibeenpwned.com/account/${encodeURIComponent(resolvedTarget)}`} label="→ View on HaveIBeenPwned" /> ), `→ View on HaveIBeenPwned: https://haveibeenpwned.com/account/${resolvedTarget}`);
      }
      else if (activeToolId === 'blacklist') {
         addOutput('system', `Checking blacklists for ${resolvedTarget}...`);
         try {
           const data = await runBackendTool('blacklist', { target: resolvedTarget });
           addOutput('info', `Resolved IP: ${data.ip}`);
           data.results.forEach((r: any) => {
             addOutput(r.clean ? 'success' : 'error', `[${r.clean ? 'CLEAN' : 'LISTED'}] ${r.list}`);
           });
         } catch (e: any) {
           addOutput('error', `Blacklist check failed: ${e.message}`);
         }
      }
      else if (activeToolId === 'port_scan') {
        const isPrivateIP = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(resolvedTarget.replace(/^https?:\/\//, ''));

        if (isNative && isPrivateIP) {
          addOutput('system', `[HYBRID MODE]: Target is Local. Switching to Native Nmap...`);
          try {
            const stdoutHandle = await NativeShell.addListener('stdout', (data: any) => {
               addOutput('info', data.line);
            });
            const result = await NativeShell.execute({ command: `nmap -sT -Pn -F ${resolvedTarget.replace(/^https?:\/\//, '')}` });
            if (result.exitCode === 0) addOutput('success', `Native scan complete.`);
            setTimeout(() => { stdoutHandle.remove(); setIsRunning(false); }, 1000);
          } catch (e: any) {
            addOutput('error', `Native Error: ${e.message}`);
            setIsRunning(false);
          }
          return;
        }

        addOutput('system', `Port scan on ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('portscan', { target: resolvedTarget });
          data.results.forEach((r: any) => {
            addOutput(r.isOpen ? 'success' : 'info', `Port ${r.port} (${r.service}): ${r.isOpen ? 'OPEN' : 'CLOSED'}`);
          });
          const openCount = data.results.filter((r: any) => r.isOpen).length;
          addOutput(openCount > 0 ? 'success' : 'info', `Scan complete. ${openCount} open ports found.`);
        } catch (e: any) {
          addOutput('error', `Port scan failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'whois') {
        addOutput('system', `WHOIS: ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('whois', { target: resolvedTarget });
          data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
        } catch (e: any) {
          addOutput('error', `WHOIS failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'dns') {
        addOutput('system', `DNS: ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('dns', { target: resolvedTarget });
          data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
          addOutput('success', 'DNS complete.');
        } catch (e: any) {
          addOutput('error', `DNS failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'ping') {
        addOutput('system', `Ping (TCP): ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('ping', { target: resolvedTarget });
          addOutput('success', `Reply from ${data.ip} via port ${data.port}: time=${data.time}ms`);
        } catch (e: any) {
          addOutput('error', `Ping failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'net_scan') {
        addOutput('system', `Network scan (subnet detection): ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('netscan', { target: resolvedTarget });
          addOutput('info', `Target IP: ${data.targetIp}`);
          if (data.alive && data.alive.length > 0) {
            data.alive.forEach((r: any) => addOutput('success', `Host alive: ${r.ip}`));
          } else {
             addOutput('info', 'No other alive hosts found in standard subnets.');
          }
        } catch (e: any) {
          addOutput('error', `Network scan failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'traceroute') {
        addOutput('system', `Traceroute: ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('traceroute', { target: resolvedTarget });
          data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
        } catch (e: any) {
          addOutput('error', `Traceroute failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'http') {
        addOutput('system', `HTTP headers: ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('http', { target: resolvedTarget });
          data.result.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
        } catch (e: any) {
          addOutput('error', `HTTP failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'spider') {
        addOutput('system', `Crawling ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('spider', { target: resolvedTarget });
          if (data.links && data.links.length > 0) {
            data.links.forEach((l: string) => {
               addOutput('info', <CopyableLink url={l} label={`[URL] ${l}`} />, `[URL] ${l}`);
            });
            addOutput('system', `Spider completed. Found ${data.links.length} total links.`);
          } else {
            addOutput('info', data.result || 'No links found.');
          }
          addOutput('success', 'Crawl complete.');
        } catch (e: any) {
           addOutput('error', `Crawl failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'subdomains') {
        addOutput('system', `Enumerating subdomains via crt.sh for ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('subdomains', { target: resolvedTarget });
          if (data.result && data.result.length > 0) {
            data.result.forEach((sub: string) => addOutput('info', <CopyableLink url={`https://${sub}`} label={`[SUB] ${sub}`} />, `[SUB] ${sub}`));
            addOutput('success', `Found ${data.result.length} unique subdomains.`);
          } else {
            addOutput('info', 'No subdomains found or API rate limited.');
          }
        } catch (e: any) { addOutput('error', `Subdomain enum failed: ${e.message}`); }
      }
      else if (activeToolId === 'js_scan') {
        addOutput('system', `Scanning JavaScript files on ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('js_scan', { target: resolvedTarget });
          addOutput('info', data.result);
          if (data.secrets && data.secrets.length > 0) {
             addOutput('error', `🔥 POTENTIAL SECRETS FOUND (${data.secrets.length}):`);
             data.secrets.forEach((s: string) => addOutput('info', s));
          } else {
             addOutput('success', 'No obvious secrets found.');
          }
          if (data.endpoints && data.endpoints.length > 0) {
             addOutput('info', `📡 ENDPOINTS DISCOVERED (${data.endpoints.length}):`);
             data.endpoints.forEach((e: string) => addOutput('info', e));
          }
        } catch (e: any) { addOutput('error', `JS scan failed: ${e.message}`); }
      }
      else if (activeToolId === 'cors_scan') {
        addOutput('system', `Auditing CORS policy for ${resolvedTarget}...`);
        try {
          const data = await runBackendTool('cors_scan', { target: resolvedTarget });
          addOutput(data.status === 'CRITICAL' ? 'error' : data.status === 'WARNING' ? 'info' : 'success', data.result);
          addOutput('info', `Access-Control-Allow-Origin: ${data.acao}`);
          addOutput('info', `Access-Control-Allow-Credentials: ${data.acac}`);
        } catch (e: any) { addOutput('error', `CORS audit failed: ${e.message}`); }
      }
      else if (activeToolId === 'certs') {
        addOutput('system', `Fetching TLS certs for ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('certs', { target: resolvedTarget });
           addOutput('info', `Subject: ${JSON.stringify(data.subject)}`);
           addOutput('info', `Issuer: ${JSON.stringify(data.issuer)}`);
           addOutput('info', `Valid From: ${data.valid_from}`);
           addOutput('info', `Valid To: ${data.valid_to}`);
           addOutput('info', `Fingerprint: ${data.fingerprint}`);
           addOutput('success', 'Certificate retrieved.');
        } catch (e: any) {
           addOutput('error', `Cert fetch failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'mac') {
        addOutput('system', `Looking up MAC vendor for: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('mac', { address: resolvedTarget });
           addOutput('success', `Vendor: ${data.vendor}`);
        } catch (e: any) {
           addOutput('error', `MAC lookup failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'mail') {
        addOutput('system', `Mail server check: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('mail', { target: resolvedTarget });
           if (data.mx && data.mx.length > 0) {
             data.mx.forEach((m: any) => addOutput('info', `[MX] ${m.priority} ${m.exchange}`));
           } else { addOutput('error', 'No MX records found'); }
           if (data.spf && data.spf.length > 0) {
             data.spf.forEach((s: any) => addOutput('success', `[SPF] ${s}`));
           } else { addOutput('error', 'No SPF records found'); }
           if (data.dmarc && data.dmarc.length > 0) {
             data.dmarc.forEach((d: any) => addOutput('success', `[DMARC] ${d}`));
           }
        } catch (e: any) {
           addOutput('error', `Mail check failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'cve') {
        addOutput('success', ( <CopyableLink url={`https://nvd.nist.gov/vuln/search/results?query=${encodeURIComponent(resolvedTarget)}`} label="→ NVD CVE Search" /> ), `→ NVD CVE Search: https://nvd.nist.gov/vuln/search/results?query=${resolvedTarget}`);
      }
      else if (activeToolId === 'dir_scan') {
        addOutput('system', `Directory scan: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('dirscan', { target: resolvedTarget });
           if (data.results && data.results.length > 0) {
              data.results.forEach((r: any) => addOutput('info', `[${r.status}] ${r.path.startsWith('/') ? r.path : '/' + r.path}`));
           } else {
              addOutput('info', 'No common directories found.');
           }
           addOutput('success', 'Scan complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'wp_scan') {
        addOutput('system', `WP Scan: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('wpscan', { target: resolvedTarget });
           if (!data.isWordPress) {
              addOutput('info', 'WordPress NOT detected on this target.');
           } else {
              addOutput('success', `This site is using WordPress ${data.version ? `v${data.version}` : ''}`);
              if (data.plugins && data.plugins.length > 0) {
                 addOutput('info', `Plugins found: ${data.plugins.join(', ')}`);
              }
              if (data.themes && data.themes.length > 0) {
                 addOutput('info', `Themes found: ${data.themes.join(', ')}`);
              }
              if (data.endpoints) {
                 for (const [ep, status] of Object.entries(data.endpoints)) {
                    addOutput('info', `Endpoint: ${ep} (Status: ${status})`);
                 }
              }
           }
           addOutput('success', 'Scan complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'react_scan') {
        addOutput('system', `React/Next Scan: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('reactscan', { target: resolvedTarget });
           if (data.results && data.results.length > 0) {
              data.results.forEach((r: any) => addOutput('info', `Found: [${r.status}] ${r.path}`));
           } else {
              addOutput('info', 'No React/Next specific paths found.');
           }
           addOutput('success', 'Scan complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'dos') {
        addOutput('system', `Stress test: ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('dos', { target: resolvedTarget });
           addOutput('info', data.result);
           addOutput('success', 'Test complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'web_faker') {
        addOutput('system', `Generating fake identity...`);
        try {
           const id = parseInt(resolvedTarget) || Math.floor(Math.random() * 10000) + 1;
           const backendUrl = getBackendUrl();
           const res = await fetch(`${backendUrl}/api/net/webfaker?id=${id}`);
           if (!res.ok) throw new Error('Data generation failed');
           const data = await res.json();
           if (data.content) {
             data.content.split('\n').filter((l: string) => l.trim()).forEach((l: string) => addOutput('info', l));
           } else {
             addOutput('error', 'No data returned.');
           }
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'smb') {
        addOutput('system', `Auditing SMB on ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('smb', { target: resolvedTarget });
           if (data.result === 'open') {
             addOutput('success', '[ALERT] Port 445 (SMB) is OPEN.');
             addOutput('info', 'Anonymous access might be enabled. Further manual testing recommended (e.g. smbclient).');
           } else {
             addOutput('info', 'Port 445 is Closed or Filtered. No exposed SMB detected.');
           }
           addOutput('success', 'SMB audit complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'shell') {
        addOutput('system', `Connecting to standard ports on ${resolvedTarget}...`);
        try {
           const data = await runBackendTool('shell', { target: resolvedTarget });
           if (data.ssh?.open && data.ssh?.banner) addOutput('info', `SSH (22): ${data.ssh.banner}`);
           else if (data.ssh?.open) addOutput('info', `SSH (22): Open (No banner)`);

           if (data.ftp?.open && data.ftp?.banner) addOutput('info', `FTP (21): ${data.ftp.banner}`);
           else if (data.ftp?.open) addOutput('info', `FTP (21): Open (No banner)`);

           if (!data.ssh?.open && !data.ftp?.open) addOutput('info', 'No banners received/ports filtered on 22 or 21.');
           addOutput('success', 'Banner grab complete.');
        } catch (e: any) { addOutput('error', e.message); }
      }
      else if (activeToolId === 'base64') {
        if (input.startsWith('decode:')) {
          try {
            addOutput('info', `Decoded: ${atob(input.replace('decode:', '').trim())}`);
          } catch { addOutput('error', 'Invalid Base64.'); }
        } else {
          addOutput('info', `Encoded: ${btoa(input)}`);
        }
      }
      else if (activeToolId === 'cipher') {
        const text = input;
        // Try ROT13
        const rot13 = text.replace(/[a-zA-Z]/g, (c: string) => {
          const code = c.charCodeAt(0);
          if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 13) % 26) + 65);
          if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 13) % 26) + 97);
          return c;
        });
        addOutput('info', `ROT13: ${rot13}`);
        
        // Check if hex
        if (/^[0-9a-fA-F\s]+$/.test(text)) {
          const hex = text.replace(/\s/g, '');
          if (hex.length % 2 === 0) {
            let decoded = '';
            for (let i = 0; i < hex.length; i += 2) {
              decoded += String.fromCharCode(parseInt(hex.substring(i, i+2), 16));
            }
            addOutput('info', `Hex decoded: ${decoded}`);
          }
        }
        
        // Check if binary
        if (/^[01\s]+$/.test(text)) {
          const bin = text.replace(/\s/g, '');
          if (bin.length % 8 === 0) {
            let decoded = '';
            for (let i = 0; i < bin.length; i += 8) {
              decoded += String.fromCharCode(parseInt(bin.substring(i, i+8), 2));
            }
            addOutput('info', `Binary decoded: ${decoded}`);
          }
        }
        
        // Try Base64
        try {
          const decoded = atob(text);
          if (decoded.length > 2 && /^[\x20-\x7E]+$/.test(decoded)) {
            addOutput('info', `Base64 decoded: ${decoded}`);
          }
        } catch {}
      }
      else if (activeToolId === 'ip_host') {
        addOutput('system', `Resolving basic IP/Host info for ${resolvedTarget}...`);
        try {
          const geoData = await runBackendTool('geoip', { target: resolvedTarget }).catch(() => null);
          let domains = resolvedTarget;
          
          if (/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(resolvedTarget)) {
             try {
                 const dnsData = await runBackendTool('dns', { target: resolvedTarget, reverse: 'true' });
                 if (dnsData && dnsData.result) {
                     const lines = dnsData.result.split('\n').filter((l: string) => l.trim() && l.includes('PTR'));
                     if (lines.length > 0) {
                         domains = lines.map((l: string) => l.split('\t').pop()).join(', ');
                     }
                 }
             } catch {}
          }

          if (geoData && geoData.geo && geoData.geo.query) {
             addOutput('info', `IPv4 Address: ${geoData.geo.query}`);
             addOutput('info', `Provider: ${geoData.geo.isp || geoData.geo.org || 'Unknown'}`);
             addOutput('info', `Domain: ${domains}`);
             addOutput('success', 'Basic resolution complete.');
          } else if (geoData && geoData.targetIp) {
             addOutput('info', `IPv4 Address: ${geoData.targetIp}`);
             addOutput('info', `Domain: ${domains}`);
             addOutput('success', 'Basic resolution complete. (Details unavailable)');
          } else {
             addOutput('error', 'Could not resolve target.');
          }
        } catch (e: any) {
          addOutput('error', `Resolution failed: ${e.message}`);
        }
      }
      else if (activeToolId === 'qr_gen') {
        addOutput('system', `Generating QR Code for: ${resolvedTarget}`);
        addOutput('success', (
          <div className="bg-white p-4 rounded inline-block mt-2">
            <QRCodeCanvas value={resolvedTarget} size={150} fgColor="#000000" bgColor="#ffffff" />
          </div>
        ));
      }
      else if (activeToolId === 'ip_calc') {
        addOutput('system', `Calculating subnet for: ${resolvedTarget}`);
        try {
          const [ip, cidr] = resolvedTarget.includes('/') ? resolvedTarget.split('/') : [resolvedTarget, '24'];
          const parts = ip.split('.').map(Number);
          if (parts.length !== 4 || parts.some(isNaN) || Number(cidr) < 0 || Number(cidr) > 32) throw new Error();
          
          let mask = ~(2 ** (32 - Number(cidr)) - 1);
          let net = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
          let networkNode = new Uint32Array([net & mask])[0];
          let broadcastNode = new Uint32Array([net | ~mask])[0];

          const toIp = (num: number) => [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');
          
          addOutput('info', `IP: ${ip} / ${cidr}`);
          addOutput('success', `Network: ${toIp(networkNode)}`);
          addOutput('info', `Broadcast: ${toIp(broadcastNode)}`);
          addOutput('info', `Hosts: ${(2 ** (32 - Number(cidr))) - 2 > 0 ? (2 ** (32 - Number(cidr))) - 2 : 0}`);
        } catch(e) {
          addOutput('error', 'Invalid IP/CIDR. Usage: 192.168.1.1/24');
        }
      }
      else if (activeToolId === 'otp') {
        addOutput('system', `Analyzing OTP secret: ${resolvedTarget}`);
        try {
          let totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(resolvedTarget) });
          addOutput('success', `Valid Base32 Secret.`);
          addOutput('info', `Current Token: ${totp.generate()}`);
          addOutput('info', `URI: ${totp.toString()}`);
        } catch {
          addOutput('error', 'Invalid Base32 secret string.');
        }
      }
      else if (activeToolId === 'notes') {
        addOutput('system', `Saved note to temporary memory buffer.`);
        addOutput('success', `Note: ${resolvedTarget}`);
      }
      else if (activeToolId === 'browser') {
        addOutput('system', `Attempting to frame ${resolvedTarget}...`);
        addOutput('info', (
          <div className="w-full h-64 mt-2 border border-white/20 rounded">
            <iframe src={resolvedTarget.startsWith('http') ? resolvedTarget : 'https://' + resolvedTarget} className="w-full h-full bg-white" title="browser" sandbox="allow-scripts allow-same-origin" />
          </div>
        ));
      }
      else {
        addOutput('info', `${activeToolId} executed for ${resolvedTarget}`);
      }
    } catch (e: any) {
      addOutput('error', `Failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (target.trim() && tool && !isRunning) {
      const input = target;
      // Hide keyboard mobile (except for pwnux where we may want to keep typing, but okay blur is fine)
      if (tool.id !== 'pwnux') {
        (document.activeElement as HTMLElement)?.blur();
        if (inputRef.current) inputRef.current.blur();
      }
      
      saveToHistory(input);
      handleRunTarget(input);
      if (tool.id === 'pwnux') {
        setTarget('');
        // Keep focus for continuous typing
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }
  };

  const copyAllOutput = () => {
    const text = output.map(o => {
      if (o.rawContent) return o.rawContent;
      if (typeof o.content === 'string') return o.content;
      return '';
    }).filter(Boolean).join('\n');
    copyToClipboardV2(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!tool) return null;

  const status = getStatusBadge();
  const commands = ['help', 'nmap', 'ping', 'whois', 'dns', 'admin', 'http', 'crawl', 'sub', 'clear', 'echo', 'exit'];

  const handleExtraKey = (key: string) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = target;

    input.focus();

    if (key === 'ESC') {
      setTarget('');
    } else if (key === '/') {
      const newVal = val.slice(0, start) + '/' + val.slice(end);
      setTarget(newVal);
      setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
    } else if (key === '-') {
      const newVal = val.slice(0, start) + '-' + val.slice(end);
      setTarget(newVal);
      setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
    } else if (key === 'TAB') {
      // Basic Tab Completion
      const currentCmd = val.trim().split(' ')[0];
      if (currentCmd) {
        const matches = commands.filter(c => c.startsWith(currentCmd));
        if (matches.length === 1) {
          setTarget(matches[0] + ' ');
        } else if (matches.length > 1) {
          addOutput('info', `Matches: ${matches.join(', ')}`);
        }
      }
    } else if (key === '←') {
      input.setSelectionRange(Math.max(0, start - 1), Math.max(0, start - 1));
    } else if (key === '→') {
      input.setSelectionRange(start + 1, start + 1);
    } else if (key === 'HOME') {
      input.setSelectionRange(0, 0);
    } else if (key === 'END') {
      input.setSelectionRange(val.length, val.length);
    } else if (key === '↑') {
      historyUp();
    } else if (key === '↓') {
      historyDown();
    }
  };

  const extraKeysRows = [
    ['ESC', '/', '-', 'HOME', '↑', 'END', 'PGUP'],
    ['TAB', 'CTRL', 'ALT', '←', '↓', '→', 'PGDN'],
  ];

  const ToolIcon = tool.icon;
  const [showDesc, setShowDesc] = useState(false);
  const isKeyboardOpen = keyboardOffset > 0;

  const getPlaceholder = (id: string, requiresInput?: boolean) => {
    if (!requiresInput) return 'no input parameters needed';
    switch (id) {
      case 'pwnux': return 'type command...';
      case 'http': case 'spider': case 'admin_finder': case 'admin-finder': case 'dir_scan': case 'wp_scan': case 'react_scan': case 'subdomains': case 'js_scan': case 'cors_scan':
        return 'enter target url (e.g. https://example.com)';
      case 'port_scan': case 'smb': case 'shell': case 'traceroute': case 'geo': case 'dos':
        return 'enter ip address or domain (e.g. 192.168.1.1 or example.com)';
      case 'mac': return 'enter mac address (e.g. 00:1A:2B:...)';
      case 'certs': case 'mail': case 'dns': case 'dorks':
        return 'enter domain (e.g. example.com)';
      case 'pwned': return 'enter email address (e.g. target@email.com)';
      case 'vt': case 'ip_host': case 'blacklist': case 'whois': case 'ping':
        return 'enter domain or ip address';
      case 'net_scan': return 'enter network subnet or ip (e.g. 192.168.1.0/24)';
      case 'cve': return 'enter cve id (e.g. cve-2021-44228)';
      case 'web_faker': return 'enter ID to generate (e.g. 5) or click RANDOM';
      default: return 'enter target...';
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neon-green/20 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="text-neon-green font-bold tracking-widest text-sm sm:text-base uppercase flex items-center gap-2 truncate">
            {tool.name.toUpperCase()}
          </span>
          <span className={`shrink-0 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-mono rounded border uppercase tracking-widest ${status.color}`}>
            {status.text}
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
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs text-gray-500 font-mono hidden sm:inline-block">{output.length} lines</span>
            <button onClick={copyAllOutput} className="p-1.5 text-neon-green hover:bg-neon-green/10 rounded transition-colors" title="Copy output">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
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
              <ToolIcon size={16} className="text-neon-green mt-0.5 shrink-0" />
              <p className="text-gray-400 font-mono text-xs sm:text-[13px] leading-relaxed max-w-4xl">
                {tool.description}
              </p>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto border border-neon-green/20 rounded-[24px] p-5 sm:p-8 bg-[#0a0a0a] shadow-[0_0_20px_rgba(57,255,20,0.03)] focus-within:shadow-[0_0_20px_rgba(57,255,20,0.06)] transition-shadow flex flex-col gap-8">
          
          <div className="flex items-center gap-3">
            <ToolIcon size={24} className="text-neon-green" />
            <h2 className="text-white font-bold tracking-widest text-sm sm:text-lg uppercase">
              {tool.name} MODULE
            </h2>
          </div>

          {showInput && tool.id !== 'pwnux' && (
            <form onSubmit={handleSubmit} className="space-y-4 block">
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                TARGET/PAYLOAD DEFINITION
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <ClearableInput
                  ref={inputRef}
                  type="text"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoCapitalize="none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={getPlaceholder(tool.id, tool.requiresInput)}
                  className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs sm:text-[13px]"
                  disabled={isRunning}
                  onClear={() => setTarget('')}
                />
                <button
                  type="submit"
                  disabled={!target.trim() || isRunning}
                  className="bg-neon-green/[0.05] hover:bg-neon-green text-neon-green hover:text-black border border-neon-green transition-all font-bold text-xs uppercase tracking-widest rounded-xl p-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-neon-green active:scale-[0.98] sm:min-w-[140px]"
                >
                  {isRunning ? 'EXECUTING...' : 'EXECUTE'}
                </button>
                {tool.id === 'web_faker' && (
                  <button
                    type="button"
                    onClick={() => {
                        const randomNum = Math.floor(Math.random() * 95 + 5).toString();
                        setTarget(randomNum);
                        handleRunTarget(randomNum);
                    }}
                    className="bg-neon-green/[0.05] hover:bg-neon-green text-neon-green hover:text-black border border-neon-green transition-all font-bold text-xs uppercase tracking-widest rounded-xl p-4 flex items-center justify-center active:scale-[0.98] sm:min-w-[100px]"
                  >
                    RANDOM
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Terminal Output */}
          <div className={`border border-neon-green/30 rounded-2xl p-4 sm:p-5 pb-0 overflow-hidden bg-[#050505] relative flex flex-col min-h-[300px] h-[50vh] max-h-[600px] ${tool.id === 'pwnux' ? 'flex-1 max-h-none h-auto' : ''}`}>
            <div className="flex items-center gap-3 mb-4 shrink-0 border-b border-neon-green/20 pb-4">
              <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase flex items-center gap-2">
                <TerminalIcon size={14} className="text-neon-green"/>
                TERMINAL OUTPUT
              </span>
              <div className="ml-auto flex flex-col sm:flex-row items-end sm:items-center gap-2">
                {output.length > 0 && (
                  <button 
                    onClick={() => setOutput([])}
                    className="text-gray-400 hover:text-red-400 transition-colors uppercase font-bold text-[9px] tracking-wider px-2 py-0.5 border border-transparent hover:border-red-500/30 rounded"
                  >
                    CLEAR
                  </button>
                )}
                <span className="bg-neon-green/10 text-neon-green border border-neon-green/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                  {tool.id === 'pwnux' ? 'INTERACTIVE' : 'READ-ONLY'}
                </span>
              </div>
            </div>
            
            <div 
              ref={outputRef} 
              onClick={() => {
                if (tool.id === 'pwnux' && inputRef.current) {
                  inputRef.current.focus();
                }
              }}
              className={`flex-1 overflow-y-auto font-mono text-xs sm:text-[13px] space-y-2 scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent pr-2 pb-28 ${tool.id === 'pwnux' ? 'cursor-text' : ''}`}
            >
              {output.length === 0 && !isRunning && tool.id !== 'pwnux' && (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50 py-10">
                  <TerminalIcon size={32} className="mb-4 opacity-30 text-neon-green" />
                  <p className="font-mono uppercase tracking-widest text-[10px] text-center mb-2">Ready.<br/>{tool.requiresInput ? 'AWAITING INPUT PARAMETERS.' : 'INITIALIZING...'}</p>
                  {tool.requiresInput && (
                    <p className="font-mono text-[9px] text-neon-green/50">Example: {tool.id === 'port_scan' ? '192.168.1.1' : tool.id.includes('mail') ? 'example.com' : 'target.com'}</p>
                  )}
                </div>
              )}
              {output.map(entry => (
                <div key={entry.id} className={`${getTypeColor(entry.type)} break-words whitespace-pre-wrap`}>
                  <span className="text-[10px] opacity-40 mr-2 shrink-0">[{new Date(entry.timestamp).toLocaleTimeString()}]</span>
                  <span className="align-middle">{entry.content}</span>
                </div>
              ))}
              {isRunning && tool.id !== 'pwnux' && (
                <div className="flex items-center gap-2 text-neon-green mt-4 animate-pulse">
                  <RefreshCw size={12} className="animate-spin shrink-0" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Processing request...</span>
                </div>
              )}
              {tool.id === 'pwnux' && (
                <div className="flex items-center mt-2 group relative">
                  <span className="text-neon-green font-bold shrink-0 mr-2">root@pwnux:~$</span>
                  <form onSubmit={handleSubmit} className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      className="w-full bg-transparent border-none outline-none text-neon-green font-mono text-xs sm:text-[13px] shadow-none ring-0 placeholder:text-neon-green/30"
                      value={target}
                      onChange={e => setTarget(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isRunning}
                      autoCapitalize="none"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoFocus
                    />
                  </form>
                </div>
              )}
              {isRunning && tool.id === 'pwnux' && (
                <div className="flex items-center gap-2 text-neon-green mt-2 animate-pulse">
                  <RefreshCw size={12} className="animate-spin shrink-0" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Executing...</span>
                </div>
              )}
            </div>

            {tool.id === 'pwnux' && (
              <div 
                className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-neon-green/30 p-2 pb-3 sm:p-3 flex flex-col gap-1.5 z-20 rounded-b-2xl shadow-[0_-5px_15px_rgba(0,0,0,0.5)]"
              >
                <div className="w-full max-w-3xl mx-auto flex flex-col gap-1">
                  {extraKeysRows.map((row, i) => (
                    <div key={i} className="flex justify-between gap-1 overflow-x-auto no-scrollbar">
                      {row.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); }}
                          onTouchStart={(e) => { 
                             e.preventDefault();
                             handleExtraKey(k);
                          }}
                          onClick={(e) => {
                             e.preventDefault();
                             handleExtraKey(k);
                          }}
                          className="flex-1 min-w-[36px] bg-[#111116] active:bg-[#333] border border-neon-green/20 text-gray-300 hover:text-neon-green font-mono text-[11px] sm:text-[12px] py-2 sm:py-2.5 rounded-lg flex items-center justify-center transition-colors select-none touch-manipulation shadow-sm"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
