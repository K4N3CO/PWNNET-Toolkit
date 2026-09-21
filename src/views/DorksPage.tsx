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
    ]
  },
  {
    category: 'ADMIN PORTALS',
    dorks: [
      { name: 'GENERIC ADMIN LOGIN', query: 'inurl:admin login' },
      { name: 'WP ADMIN', query: 'inurl:wp-admin' },
      { name: 'ADMINISTRATOR', query: 'intitle:"admin login" | inurl:administrator' },
      { name: 'CPANEL LOGIN', query: 'inurl:cpanel login' }
    ]
  },
  {
    category: 'CONFIDENTIAL DOCS',
    dorks: [
      { name: 'CONFIDENTIAL PDFs', query: 'ext:pdf "confidential" | "strictly confidential"' },
      { name: 'INTERNAL SPREADSHEETS', query: 'ext:xls | ext:xlsx "internal" | "do not distribute"' },
      { name: 'FINANCIAL RECORDS', query: 'ext:doc | ext:docx "financial statement" | "budget"' },
      { name: 'HR / PAYROLL', query: 'ext:pdf | ext:xls "payroll" | "employee salaries"' }
    ]
  },
  {
    category: 'EXPOSED PASSWORDS',
    dorks: [
      { name: 'SQL PASSWORDS', query: 'ext:sql intext:password' },
      { name: 'ENV DB PASSWORDS', query: 'ext:env "DB_PASSWORD"' },
      { name: 'LOG FILE PASSWORDS', query: 'ext:log "password="' },
      { name: 'CONFIG PASSWORDS', query: 'ext:yml | ext:json "password:"' }
    ]
  },
  {
    category: 'SERVER ERROR LOGS',
    dorks: [
      { name: 'APACHE ERROR LOGS', query: 'ext:log "Apache Server at" "Port 80"' },
      { name: 'PHP ERROR LOGS', query: 'ext:log "PHP Parse error" | "PHP Fatal error"' },
      { name: 'SQL ERROR LOGS', query: 'ext:log "SQL syntax" | "MySQL server version"' },
      { name: 'GENERIC ERROR LOGS', query: 'ext:log "error" | "exception" | "stacktrace"' }
    ]
  },
  {
    category: 'DATABASE BACKUPS',
    dorks: [
      { name: 'SQL/BAK DUMPS', query: 'ext:sql | ext:bak | ext:db' },
      { name: 'SQLITE DB EXPOSURE', query: 'ext:sqlite | ext:db3' },
      { name: 'MYSQL BACKUPS', query: 'ext:sql "MySQL dump"' },
      { name: 'PGSQL BACKUPS', query: 'ext:sql "PostgreSQL database dump"' }
    ]
  },
  {
    category: 'ENVIRONMENT SECRETS',
    dorks: [
      { name: 'ENV API KEYS', query: 'ext:env "API_KEY" | "SECRET_KEY"' },
      { name: 'AWS CREDENTIALS', query: 'ext:json "AKIA" | "aws_access_key"' },
      { name: 'GITHUB TOKENS', query: 'ext:env "ghp_"' },
      { name: 'JWT TOKENS', query: 'ext:json "eyJ" "token"' }
    ]
  },
  {
    category: 'LIVE WEBCAMS',
    dorks: [
      { name: 'AXIS WEBCAMS', query: 'inurl:/view.shtml' },
      { name: 'NETWORK CAMERAS', query: 'intitle:"Live View / - AXIS"' },
      { name: 'IP CAMERA LOGIN', query: 'intitle:"webcamXP 5" | inurl:8080/view' },
      { name: 'MOBOTIX CAMERAS', query: 'inurl:"control/userimage.html"' }
    ]
  },
  {
    category: 'GIT DIRECTORY LEAK',
    dorks: [
      { name: '.GIT EXPOSED', query: 'inurl:"/.git"' },
      { name: '.GIT CONFIG', query: 'inurl:".git/config"' },
      { name: 'GIT HEAD EXPOSURE', query: 'inurl:".git/HEAD"' },
      { name: 'GITHUB DUMPS', query: 'ext:txt "github.com/" "password"' }
    ]
  },
  {
    category: 'JIRA / TRELLO BOARDS',
    dorks: [
      { name: 'PUBLIC JIRA DASHBOARDS', query: 'inurl:jira "dashboard" | inurl:secure/Dashboard.jspa' },
      { name: 'TRELLO BOARDS', query: 'inurl:trello.com/b' },
      { name: 'CONFLUENCE EXPOSURE', query: 'inurl:/pages/viewpage.action' },
      { name: 'ASANA PUBLIC BOARDS', query: 'site:asana.com "public"' }
    ]
  },
  {
    category: 'OPEN S3 BUCKETS',
    dorks: [
      { name: 'AWS S3 EXPOSURE', query: 'site:s3.amazonaws.com' },
      { name: 'S3 LISTBUCKETRESULT', query: 'intitle:"ListBucketResult"' },
      { name: 'GCP STORAGE BUCKETS', query: 'site:storage.googleapis.com' },
      { name: 'AZURE BLOB STORAGE', query: 'site:blob.core.windows.net' }
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
    category: 'VULNERABLE SOFTWARE',
    dorks: [
      { name: 'PHP INFO', query: 'ext:php intitle:phpinfo' },
      { name: 'APACHE TOMCAT EXPOSURE', query: 'intitle:"Apache Tomcat" "Welcome to"' },
      { name: 'JENKINS DASHBOARD', query: 'intitle:"Dashboard [Jenkins]"' },
      { name: 'SPRING BOOT ACTUATOR', query: 'inurl:/actuator/env' }
    ]
  },
  {
    category: 'EXPOSED APIS',
    dorks: [
      { name: 'SWAGGER UI', query: 'inurl:/swagger-ui.html | intitle:"Swagger UI"' },
      { name: 'GRAPHQL ENDPOINTS', query: 'inurl:/graphql | intitle:"GraphQL Playground"' },
      { name: 'API V1 ENDPOINTS', query: 'inurl:api/v1' },
      { name: 'JSON API ENDPOINTS', query: 'ext:json "api" | "v1"' }
    ]
  },
  {
    category: 'CLOUD CREDENTIALS',
    dorks: [
      { name: 'PRIVATE KEYS (PEM/KEY)', query: 'ext:pem | ext:ppk | ext:key' },
      { name: 'AWS CONFIG FILES', query: 'inurl:".aws/credentials"' },
      { name: 'GCP CREDENTIALS', query: 'ext:json "type": "service_account"' },
      { name: 'SSH AUTHORIZED KEYS', query: 'inurl:"authorized_keys"' }
    ]
  },
  {
    category: 'AI & LLM SECRETS',
    dorks: [
      { name: 'OPENAI API KEYS', query: 'ext:env | ext:txt "sk-ant" | "sk-proj" | "sk-"' },
      { name: 'ANTHROPIC KEYS', query: 'ext:env "ANTHROPIC_API_KEY"' },
      { name: 'HUGGINGFACE TOKENS', query: 'ext:json | ext:env "hf_"' },
      { name: 'PINECONE DB', query: 'ext:env "PINECONE_API_KEY"' }
    ]
  },
  {
    category: 'MODERN WEB FRAMEWORKS',
    dorks: [
      { name: 'NEXT.JS EXPOSED MAPS', query: 'ext:js.map inurl:_next/static' },
      { name: 'NUXT APP DATA', query: 'intext:"__NUXT__"' },
      { name: 'VITE DEV SERVER', query: 'inurl:"@vite/client"' },
      { name: 'REACT PROFILER', query: 'inurl:?react_perf' }
    ]
  },
  {
    category: 'CI/CD & AUTOMATION',
    dorks: [
      { name: 'GITHUB ACTIONS', query: 'path:.github/workflows ext:yml "password"' },
      { name: 'GITLAB CI RUNNERS', query: 'ext:yml inurl:.gitlab-ci.yml "token"' },
      { name: 'TRAVIS CI SECRETS', query: 'inurl:.travis.yml "secure:"' },
      { name: 'CIRCLE CI', query: 'inurl:.circleci/config.yml "aws_access_key"' }
    ]
  },
  {
    category: 'MESSAGING & COMMS',
    dorks: [
      { name: 'SLACK WEBHOOKS', query: 'ext:py | ext:env "hooks.slack.com/services/"' },
      { name: 'DISCORD WEBHOOKS', query: 'intext:"discord.com/api/webhooks/" EXCLUDE:"github.com"' },
      { name: 'TELEGRAM BOTS', query: 'ext:json | ext:env "api.telegram.org/bot"' },
      { name: 'MS TEAMS WEBHOOKS', query: 'inurl:"webhookb.webhook.office.com"' }
    ]
  },
  {
    category: 'MODERN DATABASES',
    dorks: [
      { name: 'MONGODB URIs', query: 'ext:env "mongodb+srv://"' },
      { name: 'SUPABASE SECRETS', query: 'ext:env "SUPABASE_KEY" | "SUPABASE_URL"' },
      { name: 'FIREBASE CONFIGS', query: 'ext:json | ext:env "firebaseio.com" "apiKey"' },
      { name: 'REDIS URLS', query: 'ext:env "redis://:password"' }
    ]
  },
  {
    category: 'CLOUD NATIVE',
    dorks: [
      { name: 'KUBERNETES SECRETS', query: 'ext:yaml "kind: Secret" "data:"' },
      { name: 'KUBECONFIG LEAK', query: 'inurl:".kube/config" intitle:"index of"' },
      { name: 'TERRAFORM STATE', query: 'ext:tfstate | ext:tfvars' },
      { name: 'DOCKER COMPOSE SECRETS', query: 'ext:yml "docker-compose" "MYSQL_ROOT_PASSWORD"' }
    ]
  }
];

import { useVisualViewport } from '../hooks/useVisualViewport';

export function DorksPage({ tool, onClose }: DorksPageProps) {
  const keyboardOffset = useVisualViewport();
  const { value: targetDomain, setValue: setTargetDomain, handleKeyDown: handleDomainKeyDown, saveToHistory: saveDomainHistory } = useInputHistory('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [compilingString, setCompilingString] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
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

  const handleSelectDork = (query: string) => {
    setCompilingString(query);
  };

  const validateTarget = (showError = false) => {
    const ipDomainRegex = /^(?:http[s]?:\/\/)?(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/.*)?$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?:\/.*)?$|^localhost(?:\/.*)?$/;
    if (targetDomain.trim() && !ipDomainRegex.test(targetDomain.trim())) {
      if (showError) setErrorMsg('INVALID DOMAIN FORMAT');
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

  return (
    <div className="absolute inset-0 z-50 bg-[#080808] flex flex-col font-mono text-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-neon-green/20 bg-[#0a0a0a] shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-neon-green font-bold tracking-widest text-sm sm:text-base uppercase flex items-center gap-2">
            GOOGLE DORKS
          </span>
          <span className="border border-neon-green text-neon-green text-[10px] px-1.5 py-0.5 rounded uppercase tracking-widest">
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
        <button 
          onClick={onClose}
          className="flex items-center gap-1.5 text-neon-green border border-neon-green/50 rounded-full px-3 sm:px-4 py-1.5 text-xs font-bold hover:bg-neon-green/10 transition-colors uppercase tracking-widest"
        >
          <ArrowLeft size={14} />
          BACK
        </button>
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
              <Search size={16} className="text-neon-green mt-0.5 shrink-0" />
              <p className="text-gray-400 font-mono text-xs sm:text-[13px] leading-relaxed max-w-4xl">
                {tool.description}
              </p>
            </div>
          )}
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-thin scrollbar-thumb-neon-green/20 scrollbar-track-transparent">
        <div className="max-w-2xl mx-auto border border-neon-green/20 rounded-[24px] p-5 sm:p-8 bg-[#0a0a0a] shadow-[0_0_20px_rgba(57,255,20,0.03)] focus-within:shadow-[0_0_20px_rgba(57,255,20,0.06)] transition-shadow">
          
          <div className="flex items-center gap-3 mb-8">
            <Globe size={24} className="text-neon-green" />
            <h2 className="text-white font-bold tracking-widest text-sm sm:text-lg uppercase">
              GOOGLE DORK VULNERABILITY HELPER
            </h2>
          </div>

          <div className="space-y-8">
            
            {/* Target Input */}
            <div className="space-y-3 block">
              <div className="flex items-center justify-between">
                <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  TARGET DOMAIN NAME (OPTIONAL - LEAVE EMPTY FOR GLOBAL DORK SEARCH)
                </label>
                {errorMsg && (
                  <span className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                    {errorMsg}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={targetDomain}
                onChange={(e) => { setTargetDomain(e.target.value); setErrorMsg(''); }}
                onKeyDown={handleDomainKeyDown}
                placeholder="enter domain (e.g. example.com) or leave blank"
                className={`w-full bg-[#050505] border ${errorMsg ? 'border-red-500/50 focus:border-red-500' : 'border-neon-green/20 focus:border-neon-green'} rounded-xl p-4 sm:p-4 text-neon-green font-mono text-xs sm:text-[13px] outline-none placeholder:text-neon-green/30 transition-all uppercase`}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Presets */}
            <div className="space-y-3 block">
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                SELECT VULNERABLE SEARCH PRESETS
              </label>
              <div className="space-y-2.5">
                {PRESETS.map((preset, idx) => {
                  const isActive = activeCategory === preset.category;
                  return (
                    <div key={idx} className={`border rounded-xl overflow-hidden transition-all ${isActive ? 'border-neon-green/40 bg-neon-green/[0.04]' : 'border-neon-green/10 bg-[#080808] hover:border-neon-green/30'}`}>
                      <button
                        onClick={() => setActiveCategory(isActive ? null : preset.category)}
                        className={`w-full p-3.5 sm:p-4 text-left flex justify-between items-center font-mono text-xs font-bold uppercase tracking-widest transition-colors ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}
                      >
                        {preset.category}
                        {isActive ? <ChevronDown size={18} className="text-neon-green" /> : <ChevronRight size={18} className="text-gray-600" />}
                      </button>
                      
                      {isActive && (
                        <div className="p-2 border-t border-neon-green/10 bg-[#050505] space-y-1">
                          {preset.dorks.map((dork, didx) => (
                            <button
                              key={didx}
                              onClick={() => handleSelectDork(dork.query)}
                              className="w-full text-left p-3 hover:bg-neon-green/10 text-neon-green/70 hover:text-neon-green text-[11px] sm:text-xs rounded-lg transition-colors truncate uppercase font-bold tracking-wide"
                            >
                              {dork.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compiling String */}
            <div className="border border-neon-green/30 rounded-2xl p-5 sm:p-6 bg-[#050505] relative mt-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">
                  DORK COMPILING STRING:
                </span>
                <span className="bg-neon-green/10 text-neon-green border border-neon-green/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                  EDITABLE
                </span>
              </div>
              <textarea
                value={compilingString}
                onChange={(e) => setCompilingString(e.target.value)}
                placeholder="SELECT A PRESET OR TYPE YOUR QUERY..."
                className="w-full bg-transparent border-none outline-none text-neon-green font-mono text-sm resize-none h-14 uppercase placeholder:text-neon-green/20"
                spellCheck={false}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="flex-1 border border-neon-green/30 hover:border-neon-green hover:bg-neon-green/10 text-neon-green font-bold text-xs uppercase tracking-widest rounded-xl p-4 transition-all flex items-center justify-center active:scale-[0.98] gap-2"
              >
                <Copy size={16} />
                COPY DORK
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
                className={`flex-[2] bg-neon-green text-black border border-neon-green transition-all font-bold text-xs uppercase tracking-widest rounded-xl p-4 flex items-center justify-center active:scale-[0.98] ${!compilingString ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white hover:shadow-[0_0_15px_rgba(57,255,20,0.4)]'}`}
              >
                LAUNCH SEARCH
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

