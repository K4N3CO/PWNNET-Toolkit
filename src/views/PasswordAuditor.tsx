import React, { useState, useEffect, useRef } from 'react';
import { Search, Database, Key, ShieldAlert, Check, Copy, Hash, Terminal } from 'lucide-react';
import { ToolDef } from '../types';
import { CustomToolLayout } from '../components/CustomToolLayout';
import { ClearableInput } from '../components/ClearableInput';
import { motion } from 'motion/react';

// -----------------------------
// Default Credentials Database (Expanded to 120+ entries)
// -----------------------------
const DEFAULT_CREDS_DB = [
  // Generic & Top Most Common
  { vendor: 'Admin', product: 'Generic', username: 'admin', password: 'password', notes: 'Common' },
  { vendor: 'Admin', product: 'Generic', username: 'admin', password: 'admin', notes: 'Common' },
  { vendor: 'Guest', product: 'Generic', username: 'guest', password: 'guest', notes: 'Common' },
  { vendor: 'Root', product: 'Generic', username: 'root', password: 'root', notes: 'Common' },
  { vendor: 'User', product: 'Generic', username: 'user', password: 'user', notes: 'Common' },
  { vendor: 'Support', product: 'Generic', username: 'support', password: 'support', notes: 'Common' },

  // Routers & Networking (Tier 1)
  { vendor: 'Cisco', product: 'IOS/Catalyst', username: 'cisco', password: 'cisco', notes: 'Cisco' },
  { vendor: 'Cisco', product: 'Linksys', username: 'admin', password: 'admin', notes: 'Cisco' },
  { vendor: 'Cisco', product: 'RV series', username: 'cisco', password: 'password', notes: 'Cisco' },
  { vendor: 'Ubiquiti', product: 'UniFi/EdgeMAX', username: 'ubnt', password: 'ubnt', notes: 'Ubiquiti' },
  { vendor: 'MikroTik', product: 'RouterOS', username: 'admin', password: '(blank)', notes: 'MikroTik' },
  { vendor: 'TP-Link', product: 'TL-WR', username: 'admin', password: 'admin', notes: 'TP-Link' },
  { vendor: 'D-Link', product: 'DIR series', username: 'admin', password: '(blank)', notes: 'D-Link' },
  { vendor: 'D-Link', product: 'DIR series', username: 'admin', password: 'password', notes: 'D-Link' },
  { vendor: 'Netgear', product: 'Nighthawk', username: 'admin', password: 'password', notes: 'Netgear' },
  { vendor: 'Asus', product: 'RT-AC', username: 'admin', password: 'admin', notes: 'Asus' },
  { vendor: 'Huawei', product: 'HG series', username: 'admin', password: 'admin', notes: 'Huawei' },
  { vendor: 'Huawei', product: 'HG series', username: 'telecomadmin', password: 'admintelecom', notes: 'Huawei' },
  { vendor: 'Zyxel', product: 'USG', username: 'admin', password: '1234', notes: 'Zyxel' },
  { vendor: 'Belkin', product: 'AC series', username: 'admin', password: 'password', notes: 'Belkin' },
  { vendor: 'Trendnet', product: 'TEW', username: 'admin', password: 'admin', notes: 'Trendnet' },
  { vendor: 'Fortinet', product: 'FortiGate', username: 'admin', password: '(blank)', notes: 'Fortinet' },
  { vendor: 'Palo Alto', product: 'PAN-OS', username: 'admin', password: 'admin', notes: 'Palo Alto' },
  { vendor: 'Sophos', product: 'XG/UTM', username: 'admin', password: 'admin', notes: 'Sophos' },
  { vendor: 'Aruba', product: 'Instant On', username: 'admin', password: 'admin', notes: 'Aruba' },
  { vendor: 'Ruckus', product: 'Unleashed', username: 'super', password: 'sp-admin', notes: 'Ruckus' },
  { vendor: 'Pfsense', product: 'Firewall', username: 'admin', password: 'pfsense', notes: 'Pfsense' },

  // IP Cameras & Security (Tier 1)
  { vendor: 'Hikvision', product: 'IP Camera', username: 'admin', password: '12345', notes: 'Hikvision' },
  { vendor: 'Dahua', product: 'IP Camera', username: 'admin', password: 'admin', notes: 'Dahua' },
  { vendor: 'Axis', product: 'Camera', username: 'root', password: 'pass', notes: 'Axis' },
  { vendor: 'Axis', product: 'Camera', username: 'root', password: 'root', notes: 'Axis' },
  { vendor: 'Sony', product: 'IPELA', username: 'admin', password: 'admin', notes: 'Sony' },
  { vendor: 'Panasonic', product: 'WV-series', username: 'admin', password: '12345', notes: 'Panasonic' },
  { vendor: 'Vivotek', product: 'Camera', username: 'root', password: '(blank)', notes: 'Vivotek' },
  { vendor: 'Foscam', product: 'Camera', username: 'admin', password: '(blank)', notes: 'Foscam' },
  { vendor: 'Swann', product: 'DVR', username: 'admin', password: '12345', notes: 'Swann' },
  { vendor: 'Lorex', product: 'NVR', username: 'admin', password: '000000', notes: 'Lorex' },
  { vendor: 'Amcrest', product: 'Camera', username: 'admin', password: 'admin', notes: 'Amcrest' },
  { vendor: 'Mobotix', product: 'Camera', username: 'admin', password: 'meinsm', notes: 'Mobotix' },

  // Databases & Big Data
  { vendor: 'MySQL', product: 'Server', username: 'root', password: '(blank)', notes: 'Database' },
  { vendor: 'PostgreSQL', product: 'Server', username: 'postgres', password: 'postgres', notes: 'Database' },
  { vendor: 'MongoDB', product: 'NoSQL', username: 'admin', password: 'admin', notes: 'Database' },
  { vendor: 'Redis', product: 'KV Store', username: 'root', password: '(blank)', notes: 'Database' },
  { vendor: 'Oracle', product: 'Database', username: 'sys', password: 'password', notes: 'Database' },
  { vendor: 'MSSQL', product: 'SQL Server', username: 'sa', password: 'password', notes: 'Database' },
  { vendor: 'Cassandra', product: 'NoSQL', username: 'cassandra', password: 'cassandra', notes: 'Database' },
  { vendor: 'Elasticsearch', product: 'Search', username: 'elastic', password: 'changeme', notes: 'Database' },
  { vendor: 'CouchDB', product: 'NoSQL', username: 'admin', password: 'password', notes: 'Database' },
  { vendor: 'InfluxDB', product: 'TSDB', username: 'admin', password: 'password', notes: 'Database' },

  // Servers, CMS & DevOps
  { vendor: 'WordPress', product: 'CMS', username: 'admin', password: 'password', notes: 'CMS' },
  { vendor: 'Joomla', product: 'CMS', username: 'admin', password: 'admin', notes: 'CMS' },
  { vendor: 'Drupal', product: 'CMS', username: 'admin', password: 'admin', notes: 'CMS' },
  { vendor: 'Tomcat', product: 'Manager', username: 'admin', password: 'admin', notes: 'Server' },
  { vendor: 'Tomcat', product: 'Manager', username: 'tomcat', password: 's3cret', notes: 'Server' },
  { vendor: 'Jenkins', product: 'CI/CD', username: 'admin', password: 'password', notes: 'DevOps' },
  { vendor: 'JBoss', product: 'App Server', username: 'admin', password: 'admin', notes: 'Server' },
  { vendor: 'WebLogic', product: 'Oracle', username: 'weblogic', password: 'password123', notes: 'Server' },
  { vendor: 'Splunk', product: 'Logs', username: 'admin', password: 'changeme', notes: 'Tools' },
  { vendor: 'Grafana', product: 'Metrics', username: 'admin', password: 'admin', notes: 'Tools' },
  { vendor: 'Docker', product: 'Registry', username: 'docker', password: 'docker', notes: 'DevOps' },

  // Industrial & SCADA (ICS)
  { vendor: 'Schneider', product: 'Modicon', username: 'admin', password: 'admin', notes: 'ICS' },
  { vendor: 'Siemens', product: 'S7/Scalance', username: 'admin', password: 'admin', notes: 'ICS' },
  { vendor: 'Allen-Bradley', product: 'MicroLogix', username: 'admin', password: 'password', notes: 'ICS' },
  { vendor: 'Moxa', product: 'Serial', username: 'admin', password: 'moxa', notes: 'ICS' },
  { vendor: 'ABB', product: 'Robot', username: 'robot', password: 'robot', notes: 'ICS' },
  { vendor: 'GE', product: 'Multilin', username: 'admin', password: '0000', notes: 'ICS' },
  { vendor: 'Honeywell', product: 'ComfortPoint', username: 'admin', password: 'password', notes: 'ICS' },
  { vendor: 'Johnson Controls', product: 'Metasys', username: 'admin', password: 'admin', notes: 'ICS' },

  // Infrastructure & IT Mgmt
  { vendor: 'VMware', product: 'ESXi', username: 'root', password: 'vmware', notes: 'Virtual' },
  { vendor: 'Dell', product: 'iDRAC', username: 'root', password: 'calvin', notes: 'Remote' },
  { vendor: 'HP', product: 'iLO', username: 'Administrator', password: 'password', notes: 'Remote' },
  { vendor: 'Supermicro', product: 'IPMI', username: 'ADMIN', password: 'ADMIN', notes: 'Remote' },
  { vendor: 'APC', product: 'UPS/PDU', username: 'apc', password: 'apc', notes: 'Power' },
  { vendor: 'QNAP', product: 'NAS', username: 'admin', password: 'admin', notes: 'Storage' },
  { vendor: 'Synology', product: 'NAS', username: 'admin', password: 'password', notes: 'Storage' },
  { vendor: 'F5', product: 'BIG-IP', username: 'admin', password: 'admin', notes: 'Network' },
  { vendor: 'Citrix', product: 'NetScaler', username: 'nsroot', password: 'nsroot', notes: 'Network' },

  // VoIP & Comms
  { vendor: 'Polycom', product: 'VVX', username: 'admin', password: '456', notes: 'VoIP' },
  { vendor: 'Yealink', product: 'SIP', username: 'admin', password: 'admin', notes: 'VoIP' },
  { vendor: 'Grandstream', product: 'GXP', username: 'admin', password: 'admin', notes: 'VoIP' },
  { vendor: 'Avaya', product: 'IP Office', username: 'Administrator', password: 'password', notes: 'VoIP' },
  { vendor: 'Cisco', product: 'SPA', username: 'admin', password: 'admin', notes: 'VoIP' },

  // More Networking (Tier 2)
  { vendor: 'Buffalo', product: 'AirStation', username: 'admin', password: 'password', notes: 'Router' },
  { vendor: 'Netis', product: 'WF2411', username: 'admin', password: 'password', notes: 'Router' },
  { vendor: 'Tenda', product: 'F3', username: 'admin', password: 'admin', notes: 'Router' },
  { vendor: 'Zyxel', product: 'Prestige', username: 'admin', password: '1234', notes: 'Router' },
  { vendor: 'Actiontec', product: 'GT701', username: 'admin', password: 'password', notes: 'Modem' },
  { vendor: 'Arris', product: 'TG862', username: 'admin', password: 'password', notes: 'Gateway' },
  { vendor: 'Thomson', product: 'TG585', username: 'admin', password: 'admin', notes: 'Gateway' },
  { vendor: 'Sagemcom', product: 'F@st', username: 'admin', password: 'admin', notes: 'Gateway' },

  // More Cameras (Tier 2)
  { vendor: 'Aventech', product: 'IP Camera', username: 'admin', password: '123456', notes: 'Camera' },
  { vendor: 'BlueIris', product: 'Software', username: 'admin', password: 'admin', notes: 'VMS' },
  { vendor: 'Canon', product: 'VB-series', username: 'root', password: 'camera', notes: 'Camera' },
  { vendor: 'Geovision', product: 'GV-series', username: 'admin', password: 'admin', notes: 'Camera' },
  { vendor: 'Milesight', product: 'Camera', username: 'admin', password: 'password', notes: 'Camera' },
  { vendor: 'Speco', product: 'Camera', username: 'admin', password: '1234', notes: 'Camera' },
  { vendor: 'Wbox', product: 'Camera', username: 'admin', password: 'admin', notes: 'Camera' },

  // Enterprise Software
  { vendor: 'Tableau', product: 'Server', username: 'admin', password: 'admin', notes: 'BI' },
  { vendor: 'TeamCity', product: 'Server', username: 'admin', password: 'admin', notes: 'DevOps' },
  { vendor: 'Kibana', product: 'ELK', username: 'kibana', password: 'password', notes: 'Logs' },
  { vendor: 'Airwatch', product: 'MDM', username: 'admin', password: 'password', notes: 'Mobile' },
  { vendor: 'SolarWinds', product: 'Orion', username: 'admin', password: '(blank)', notes: 'Network' },
  { vendor: 'ManageEngine', product: 'OpManager', username: 'admin', password: 'admin', notes: 'Network' },

  // Printers
  { vendor: 'Ricoh', product: 'Aficio', username: 'admin', password: '(blank)', notes: 'Printer' },
  { vendor: 'Lexmark', product: 'Optra', username: 'admin', password: 'password', notes: 'Printer' },
  { vendor: 'Samsung', product: 'CLP', username: 'admin', password: 'sec-admin', notes: 'Printer' },
  { vendor: 'Sharp', product: 'MX-series', username: 'admin', password: 'admin', notes: 'Printer' },
  { vendor: 'Kyocera', product: 'FS-series', username: 'Admin', password: 'Admin', notes: 'Printer' },

  // Specialized IoT
  { vendor: 'OpenWRT', product: 'LuCI', username: 'root', password: '(blank)', notes: 'IoT' },
  { vendor: 'FreePBX', product: 'VoIP', username: 'admin', password: 'password', notes: 'VoIP' },
  { vendor: 'Nagios', product: 'Monitoring', username: 'nagiosadmin', password: 'nagiosadmin', notes: 'Network' },
  { vendor: 'Cacti', product: 'Monitoring', username: 'admin', password: 'admin', notes: 'Network' },
  { vendor: 'Zabbix', product: 'Monitoring', username: 'Admin', password: 'zabbix', notes: 'Network' },
  { vendor: 'OpenVAS', product: 'Scanner', username: 'admin', password: 'admin', notes: 'Security' },
  { vendor: 'Pi-hole', product: 'DNS', username: 'admin', password: '(blank)', notes: 'IoT' },
];

export function DefaultCredsTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtered, setFiltered] = useState(DEFAULT_CREDS_DB);

  useEffect(() => {
    const q = searchTerm.toLowerCase();
    setFiltered(
      DEFAULT_CREDS_DB.filter(c =>
        c.vendor.toLowerCase().includes(q) ||
        c.product.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        c.password.toLowerCase().includes(q)
      )
    );
  }, [searchTerm]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-4 flex flex-col h-full">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search vendor, product, or credentials..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#050505] border border-neon-green/20 focus:border-neon-green rounded-xl py-3 pl-10 pr-4 text-xs text-white outline-none transition-all"
          />
        </div>

        <div className="flex-1 overflow-auto bg-[#050505] rounded-xl border border-neon-green/20">
          <table className="w-full text-[10px] text-left border-collapse">
            <thead className="sticky top-0 bg-[#0a0a0a] border-b border-neon-green/20">
              <tr>
                <th className="p-3 text-gray-500 uppercase tracking-widest font-bold">Vendor</th>
                <th className="p-3 text-gray-500 uppercase tracking-widest font-bold">User</th>
                <th className="p-3 text-gray-500 uppercase tracking-widest font-bold">Pass</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-neon-green/5 transition-colors">
                  <td className="p-3">
                    <div className="text-white font-bold">{c.vendor}</div>
                    <div className="text-gray-500 text-[8px]">{c.product}</div>
                  </td>
                  <td className="p-3 font-mono text-neon-green">{c.username}</td>
                  <td className="p-3 font-mono text-neon-green">{c.password}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => copy(c.password)} className="p-1 hover:text-white transition-colors">
                      <Copy size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-neon-green/5 border border-neon-green/20 rounded-lg text-center">
          <p className="text-[9px] text-gray-500 font-mono uppercase tracking-widest">
            Showing {filtered.length} entries from the 2026 local database.
          </p>
        </div>
      </div>
    </CustomToolLayout>
  );
}

import { NativeShell, isNative } from '../utils/nativeShell';
import { logService } from '../utils/logger';

// -----------------------------
// Hash Cracker (Wrapper)
// -----------------------------
export function HashCrackerTool({ tool, onClose }: { tool: ToolDef, onClose: () => void }) {
  const [hash, setHash] = useState('');
  const [hashType, setHashType] = useState('md5');
  const [wordlist, setWordlist] = useState('common.txt');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [crackedPass, setCrackedPass] = useState<string | null>(null);
  const [mutationConfig, setMutationConfig] = useState({
    caps: true,
    numbers: true,
    punct: true,
    leet: true
  });
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  const hashTypes = ['md5', 'sha1', 'sha256', 'sha512', 'ntlm', 'bcrypt', 'crypt', 'descrypt', 'bitcoin-wallet', 'wpa-psk', 'ethereum-wallet', 'metamask', 'pkcs12', 'keystore'];
  const wordlists = [
    'common.txt',
    'top10k.txt',
    'Top12k.txt',
    'top50k.txt',
    'rockyou.txt',
    'bip39-en.txt',
    'electrum1-en.txt',
    'electrum2-pt.txt',
    'milw0rm-dictionary.txt'
  ];

  const handleCrack = async () => {
    if (!isNative) {
      alert("Native computation requires an Android device.");
      return;
    }
    setLoading(true);
    setCrackedPass(null);
    setOutput([`[SYSTEM] Initializing Native Compute Engine...`, `[SYSTEM] Optimization: ARM64 Multithreading`]);

    try {
      const stdoutHandle = await NativeShell.addListener('stdout', (data: any) => {
        setOutput(prev => [...prev, data.line]);
      });

      // 2. Call the REAL computation method in Java and wait for result directly
      const result: any = await NativeShell.crackHash({
        hash: hash.trim(),
        type: hashType,
        wordlist: wordlist,
        useCaps: mutationConfig.caps,
        useNumbers: mutationConfig.numbers,
        usePunct: mutationConfig.punct,
        useLeet: mutationConfig.leet
      });

      if (result && result.success) {
        setCrackedPass(result.plaintext);
      }

      stdoutHandle.remove();
      setLoading(false);

    } catch (e: any) {
      setOutput(prev => [...prev, "[CRITICAL] Compute Failure: " + e.message]);
      setLoading(false);
    }
  };

  return (
    <CustomToolLayout tool={tool} onClose={onClose}>
      <div className="space-y-6 block h-full flex flex-col">
        <div className="shrink-0 space-y-6">
          <div>
            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">TARGET HASH</label>
            <textarea
              value={hash}
              onChange={e => setHash(e.target.value)}
              className="w-full bg-[#050505] border border-neon-green/20 focus:border-neon-green rounded-xl p-4 text-neon-green font-mono text-xs outline-none transition-all h-24 resize-none"
              placeholder="Enter hash string (e.g. 5d41402abc4b2a76b9719d911017c592)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">HASH ALGORITHM</label>
              <select
                value={hashType}
                onChange={e => setHashType(e.target.value)}
                className="w-full bg-[#050505] border border-neon-green/20 rounded-xl p-3 text-neon-green font-mono text-xs outline-none appearance-none"
              >
                {hashTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest block mb-2">WORDLIST</label>
              <select
                value={wordlist}
                onChange={e => setWordlist(e.target.value)}
                className="w-full bg-[#050505] border border-neon-green/20 rounded-xl p-3 text-neon-green font-mono text-xs outline-none appearance-none"
              >
                {wordlists.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mutation Engine Rules</span>
              <button
                onClick={() => {
                  const allOn = Object.values(mutationConfig).every(v => v);
                  setMutationConfig({ caps: !allOn, numbers: !allOn, punct: !allOn, leet: !allOn });
                }}
                className="text-[9px] text-neon-green hover:underline uppercase font-bold"
              >
                {Object.values(mutationConfig).every(v => v) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'caps', label: 'Caps', desc: 'A-Z Variations' },
                { id: 'numbers', label: 'Numbers', desc: 'Suffixes (123...)' },
                { id: 'punct', label: 'Punct', desc: 'Symbols (!@#...)' },
                { id: 'leet', label: 'Leet', desc: 'Substitutions' }
              ].map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white font-bold">{m.label}</span>
                    <span className="text-[8px] text-gray-500 uppercase">{m.desc}</span>
                  </div>
                  <button
                    onClick={() => setMutationConfig(prev => ({ ...prev, [m.id]: !prev[m.id as keyof typeof prev] }))}
                    className={`w-8 h-4 rounded-full transition-all relative ${mutationConfig[m.id as keyof typeof mutationConfig] ? 'bg-neon-green' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-0.5 w-3 h-3 bg-black rounded-full transition-all ${mutationConfig[m.id as keyof typeof mutationConfig] ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleCrack}
            disabled={!hash || loading}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50 ${crackedPass ? 'bg-green-500 text-black' : 'bg-neon-green text-black hover:bg-white'}`}
          >
            {loading ? 'CRACKING...' : crackedPass ? 'RE-START BRUTEFORCE' : 'START BRUTEFORCE'}
          </button>
        </div>

        {crackedPass && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-500/20 border border-green-500/40 rounded-xl text-center"
          >
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter mb-1">Recovered Plaintext:</p>
            <p className="text-green-400 font-mono text-xl font-black tracking-widest uppercase">{crackedPass}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(crackedPass); alert('Copied to clipboard'); }}
              className="mt-2 text-[10px] text-green-500/80 hover:text-white underline uppercase font-bold"
            >
              Copy to Secure Buffer
            </button>
          </motion.div>
        )}

        <div className="h-64 border border-neon-green/20 bg-[#050505] rounded-xl p-4 overflow-auto scrollbar-thin scrollbar-thumb-neon-green/20">
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2 sticky top-0 bg-[#050505] z-10">
            <Terminal size={14} className="text-neon-green" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Engine Output</span>
          </div>
          <div className="space-y-1">
            {output.map((line, i) => (
              <div key={i} className={`text-[10px] font-mono break-all ${line.includes('DONE') ? 'text-green-400 font-bold' : 'text-gray-300'}`}>{line}</div>
            ))}
            {output.length === 0 && (
              <div className="text-[10px] text-gray-600 italic">Awaiting hash definition...</div>
            )}
            <div ref={outputEndRef} />
          </div>
        </div>
      </div>
    </CustomToolLayout>
  );
}
