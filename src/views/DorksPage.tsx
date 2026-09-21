import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Globe, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { ToolDef } from '../types';
import { useInputHistory } from '../utils/useInputHistory';
import { openExternalLink } from '../utils/openLink';

interface DorksPageProps {
  tool: ToolDef;
  onClose: () => void;
}

const PRESETS = [
  {
    category: 'OPEN DIRECTORY LISTINGS',
    dorks: [
      { name: 'INDEX OF ADMIN', query: 'intitle:"index of" admin' },
      { name: 'INDEX OF PASSWORD', query: 'intitle:"index of" password' },
      { name: 'PARENT DIRECTORY', query: 'intitle:"index of" "parent directory"' },
      { name: 'INDEX OF BACKUP', query: 'intitle:"index of" backup' },
      { name: 'INDEX OF SQL', query: 'intitle:"index of" "dump.sql" | "db.sql"' },
      { name: 'INDEX OF KEY', query: 'intitle:"index of" "key.pem" | "id_rsa"' }
    ]
  },
  {
    category: 'ADMIN PORTALS',
    dorks: [
      { name: 'GENERIC ADMIN LOGIN', query: 'inurl:admin login' },
      { name: 'WP ADMIN', query: 'inurl:wp-admin' },
      { name: 'ADMINISTRATOR', query: 'intitle:"admin login" | inurl:administrator' },
      { name: 'CPANEL LOGIN', query: 'inurl:cpanel login' },
      { name: 'PMA LOGIN', query: 'inurl:phpmyadmin/index.php' },
      { name: 'GRAFANA LOGIN', query: 'intitle:"Grafana" "Welcome to"' }
    ]
  },
  {
    category: 'CRYPTO & WALLETS',
    dorks: [
      { name: 'RECOVERY PHRASES', query: 'ext:txt | ext:docx "mnemonic" | "seed phrase"' },
      { name: 'METAMASK VAULTS', query: 'ext:json "metamask" "vault"' },
      { name: 'BITCOIN WALLETS', query: 'ext:dat "wallet.dat"' },
      { name: 'ETHEREUM KEYS', query: 'ext:json "UTC--" "address"' },
      { name: 'KEPPASS DBs', query: 'ext:kdbx | ext:kdb' }
    ]
  },
  {
    category: 'CONFIDENTIAL DOCS',
    dorks: [
      { name: 'CONFIDENTIAL PDFs', query: 'ext:pdf "confidential" | "strictly confidential"' },
      { name: 'INTERNAL SPREADSHEETS', query: 'ext:xls | ext:xlsx "internal" | "do not distribute"' },
      { name: 'FINANCIAL RECORDS', query: 'ext:doc | ext:docx "financial statement" | "budget"' },
      { name: 'HR / PAYROLL', query: 'ext:pdf | ext:xls "payroll" | "employee salaries"' },
      { name: 'NOTION LEAKS', query: 'site:notion.site "internal" | "confidential"' }
    ]
  },
  {
    category: 'EXPOSED PASSWORDS',
    dorks: [
      { name: 'SQL PASSWORDS', query: 'ext:sql intext:password' },
      { name: 'ENV DB PASSWORDS', query: 'ext:env "DB_PASSWORD"' },
      { name: 'LOG FILE PASSWORDS', query: 'ext:log "password="' },
      { name: 'CONFIG PASSWORDS', query: 'ext:yml | ext:json "password:"' },
      { name: 'BASH HISTORY', query: 'inurl:.bash_history' }
    ]
  },
  {
    category: 'ENVIRONMENT SECRETS',
    dorks: [
      { name: 'ENV API KEYS', query: 'ext:env "API_KEY" | "SECRET_KEY"' },
      { name: 'AWS CREDENTIALS', query: 'ext:json "AKIA" | "aws_access_key"' },
      { name: 'GITHUB TOKENS', query: 'ext:env "ghp_"' },
      { name: 'JWT TOKENS', query: 'ext:json "eyJ" "token"' },
      { name: 'FIREBASE CONFIGS', query: 'ext:json "firebaseio.com" "apiKey"' }
    ]
  },
  {
    category: 'CLOUD NATIVE',
    dorks: [
      { name: 'KUBERNETES SECRETS', query: 'ext:yaml "kind: Secret" "data:"' },
      { name: 'KUBECONFIG LEAK', query: 'inurl:".kube/config" intitle:"index of"' },
      { name: 'TERRAFORM STATE', query: 'ext:tfstate | ext:tfvars' },
      { name: 'DOCKER REGISTRY', query: 'inurl:v2/_catalog' },
      { name: 'DOCKER COMPOSE', query: 'ext:yml "docker-compose" "MYSQL_ROOT_PASSWORD"' }
    ]
  },
  {
    category: 'AI & LLM SECRETS',
    dorks: [
      { name: 'OPENAI API KEYS', query: 'ext:env | ext:txt "sk-ant" | "sk-proj" | "sk-"' },
      { name: 'ANTHROPIC KEYS', query: 'ext:env "ANTHROPIC_API_KEY"' },
      { name: 'HUGGINGFACE TOKENS', query: 'ext:json | ext:env "hf_"' },
      { name: 'PINECONE DB', query: 'ext:env "PINECONE_API_KEY"' },
      { name: 'LANGCHAIN LOGS', query: 'ext:log "langchain" "input" "output"' }
    ]
  },
  {
    category: 'INDUSTRIAL (ICS/OT)',
    dorks: [
      { name: 'SCADA INTERFACES', query: 'intitle:"SCADA Login" | inurl:/scada/' },
      { name: 'MODBUS PANELS', query: 'intitle:"Modbus" inurl:admin' },
      { name: 'PLC WEB INTERFACE', query: 'intitle:"S7-1200" | intitle:"S7-1500" "web server"' },
      { name: 'MQTT BROKERS', query: 'intext:"MQTT" "Dashboard" inurl:8083' }
    ]
  },
  {
    category: 'REMOTE ACCESS',
    dorks: [
      { name: 'RDP WEB CLIENT', query: 'intitle:"Remote Desktop Web Connection"' },
      { name: 'VNC VIEWER', query: 'intitle:"VNC Viewer" inurl:5800' },
      { name: 'ANYDESK LOGS', query: 'ext:log "AnyDesk" "connection"' },
      { name: 'TEAMVIEWER CONFIG', query: 'ext:reg "TeamViewer" "Password"' }
    ]
  },
  {
    category: 'GIT DIRECTORY LEAK',
    dorks: [
      { name: '.GIT EXPOSED', query: 'inurl:"/.git"' },
      { name: '.GIT CONFIG', query: 'inurl:".git/config"' },
      { name: 'GIT HEAD EXPOSURE', query: 'inurl:".git/HEAD"' },
      { name: 'GITHUB DUMPS', query: 'ext:txt "github.com/" "password"' },
      { name: 'GITLAB SECRETS', query: 'inurl:gitlab-secrets.json' }
    ]
  },
  {
    category: 'PASTEBIN LEAKS',
    dorks: [
      { name: 'PASTEBIN PASSWORDS', query: 'site:pastebin.com "password"' },
      { name: 'PASTEBIN EMAILS', query: 'site:pastebin.com "email" | "username"' },
      { name: 'PASTEBIN API KEYS', query: 'site:pastebin.com "api_key" | "secret"' },
      { name: 'PASTEBIN DATABASE', query: 'site:pastebin.com "CREATE TABLE" | "INSERT INTO"' }
    ]
  },
  {
    category: 'EXPOSED APIS',
    dorks: [
      { name: 'SWAGGER UI', query: 'inurl:/swagger-ui.html | intitle:"Swagger UI"' },
      { name: 'GRAPHQL ENDPOINTS', query: 'inurl:/graphql | intitle:"GraphQL Playground"' },
      { name: 'API V1 ENDPOINTS', query: 'inurl:api/v1' },
      { name: 'JSON API ENDPOINTS', query: 'ext:json "api" | "v1"' },
      { name: 'STRIPE KEYS', query: 'ext:js | ext:env "pk_live_" | "sk_live_"' }
    ]
  }
];

import { useVisualViewport } from '../hooks/useVisualViewport';

export function DorksPage({ tool, onClose }: DorksPageProps) {
  const keyboardOffset = useVisualViewport();
  const { value: targetDomain, setValue: setTargetDomain, handleKeyDown: handleDomainKeyDown, saveToHistory: saveDomainHistory } = useInputHistory('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [compilingString, setCompilingString] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
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

  const handleSelectDork = (query: string) => {
    setCompilingString(query);
  };

  const validateTarget = (showError = false) => {
    const ipDomainRegex = /^(?:http[s]?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/.*)?$|^localhost(?:\/.*)?$/;
    if (targetDomain.trim() && !ipDomainRegex.test(targetDomain.trim())) {
      if (showError) setErrorMsg('INVALID FORMAT');
      return false;
    }
    if (showError) setErrorMsg('');
    return true;
  };

  const handleCopy = () => {
    if (!validateTarget(true)) return;
    saveDomainHistory();
    const sitePrefix = targetDomain.trim() ? `site:${targetDomain.replace(/https?:\/\//, '')} ` : '';
    const fullSearch = `${sitePrefix}${compilingString}`;
    navigator.clipboard.writeText(fullSearch);
  };

  const fixUrlSlashes = (val: string) => {
    if (val.startsWith('https:/') && !val.startsWith('https://')) return val.replace('https:/', 'https://');
    if (val.startsWith('http:/') && !val.startsWith('http://')) return val.replace('http:/', 'http://');
    return val;
  };

  const categories = ['ALL', ...PRESETS.map(p => p.category)];

  const filteredDorks = PRESETS.flatMap(p =>
    p.dorks.map(d => ({ ...d, category: p.category }))
  ).filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.query.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = activeCategory === 'ALL' || d.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="absolute inset-0 z-50 bg-[#080808] flex flex-col font-mono text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neon-green/20 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <span className="text-neon-green font-bold tracking-widest text-xs sm:text-sm uppercase flex items-center gap-2 truncate">
            GOOGLE DORKS
          </span>
          <button 
            onClick={toggleFavorite}
            className={`shrink-0 flex items-center justify-center p-1 rounded-full transition-all ${isFavorite ? 'opacity-100 scale-110' : 'opacity-40'}`}
          >
            <span className={isFavorite ? 'drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : 'grayscale'}>⭐</span>
          </button>
        </div>
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 text-neon-green border border-neon-green/50 rounded-full px-3 sm:px-4 py-1.5 text-[10px] font-bold hover:bg-neon-green/10 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={12} />
          BACK
        </button>
      </div>

      {/* Target & Search Strip */}
      <div className="p-4 bg-[#0a0a0a] border-b border-neon-green/10 space-y-3 shrink-0">
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            inputMode="url"
            value={targetDomain}
            onChange={(e) => { setTargetDomain(fixUrlSlashes(e.target.value)); setErrorMsg(''); }}
            onKeyDown={handleDomainKeyDown}
            placeholder="TARGET DOMAIN (E.G. TARGET.COM)"
            className={`w-full bg-black border ${errorMsg ? 'border-red-500' : 'border-neon-green/20'} rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-neon-green outline-none uppercase placeholder:text-neon-green/10 focus:border-neon-green transition-all`}
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="SEARCH DORKS (E.G. PASSWORDS, S3...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-neon-green/10 rounded-xl py-2.5 pl-9 pr-3 text-[11px] text-white outline-none placeholder:text-gray-700 focus:border-neon-green/50 transition-all uppercase"
          />
        </div>

        {/* Category Pills (Horizontal scroll is good for mobile navigation) */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[9px] font-bold whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-neon-green text-black border-neon-green' : 'bg-transparent text-gray-500 border-white/10 hover:border-neon-green/30'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32 scrollbar-thin scrollbar-thumb-neon-green/20">
        {filteredDorks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <Search size={48} />
            <p className="mt-4 text-xs uppercase tracking-widest font-bold text-center px-10">No matching dorks found in registry</p>
          </div>
        ) : (
          filteredDorks.map((dork, idx) => (
            <div
              key={idx}
              onClick={() => handleSelectDork(dork.query)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${compilingString === dork.query ? 'border-neon-green bg-neon-green/5 shadow-[0_0_15px_rgba(57,255,20,0.05)]' : 'border-white/5 bg-[#0a0a0a] hover:border-neon-green/20'}`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-[10px] font-bold uppercase transition-colors ${compilingString === dork.query ? 'text-neon-green' : 'text-gray-400'}`}>
                  {dork.name}
                </span>
                <span className="text-[8px] text-gray-700 bg-white/[0.03] px-2 py-0.5 rounded border border-white/5 uppercase">{dork.category}</span>
              </div>
              <code className="text-[9px] text-gray-500 break-all font-mono leading-relaxed block">
                {dork.query}
              </code>
            </div>
          ))
        )}
      </div>

      {/* Builder & Actions (Sticky Bottom) */}
      {!isKeyboardOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/90 backdrop-blur-md border-t border-neon-green/20 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)] z-20">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Compiler:</span>
              <button
                onClick={() => setCompilingString('')}
                className="text-[8px] text-red-500/70 hover:text-red-500 uppercase font-black"
              >
                [Clear Builder]
              </button>
            </div>
            <div className="bg-black/50 border border-neon-green/20 rounded-xl p-3 min-h-[45px] flex items-center">
              <p className="text-[11px] text-neon-green font-mono break-all leading-relaxed">
                {targetDomain.trim() ? <span className="text-gray-400">site:{targetDomain.replace(/https?:\/\//, '')} </span> : ''}
                {compilingString || <span className="text-neon-green/10 italic">Pick a preset above...</span>}
              </p>
            </div>
          </div>

          <div className="flex gap-3 h-12">
            <button
              onClick={handleCopy}
              className="flex-1 bg-black border border-neon-green/30 text-neon-green font-bold text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Copy size={14} />
              COPY
            </button>
            <button
              onClick={async () => {
                if (!validateTarget(true) || !compilingString) return;
                saveDomainHistory();
                const cleanTarget = targetDomain.trim().replace(/https?:\/\//, '');
                const query = (cleanTarget ? `site:${cleanTarget} ` : '') + compilingString;
                const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                await openExternalLink(url);
              }}
              className={`flex-[2] bg-neon-green text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95 ${!compilingString ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] shadow-[0_0_10px_rgba(57,255,20,0.2)]'}`}
            >
              LAUNCH SEARCH
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

