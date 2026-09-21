import express from 'express';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const resolveMx = promisify(dns.resolveMx);
const resolveTxt = promisify(dns.resolveTxt);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper for port scanning
const checkPort = (port: number, host: string, timeout = 2000): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let status = false;

    socket.on('connect', () => {
      status = true;
      socket.destroy();
    });

    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy();
    });

    socket.on('error', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      resolve(status);
    });

    socket.connect(port, host);
  });
};

// Helper to clean target (removes http/https, port, and trailing slash)
const cleanTarget = (target: string): string => {
  return target.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
};

// --- API ROUTES ---

// 0. Status
app.get('/api/net/status', (req, res) => {
  res.json({ status: 'READY' });
});

// 1. Port Scanner
app.get('/api/net/portscan', async (req, res) => {
  const { target, ports } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  const defaultPorts = [
    { port: 21, service: 'FTP' },
    { port: 22, service: 'SSH' },
    { port: 23, service: 'Telnet' },
    { port: 25, service: 'SMTP' },
    { port: 53, service: 'DNS' },
    { port: 80, service: 'HTTP' },
    { port: 110, service: 'POP3' },
    { port: 143, service: 'IMAP' },
    { port: 443, service: 'HTTPS' },
    { port: 445, service: 'SMB' },
    { port: 3306, service: 'MySQL' },
    { port: 8080, service: 'HTTP-Proxy' }
  ];

  let portsToScan = defaultPorts;
  if (ports && typeof ports === 'string') {
    portsToScan = ports.split(',').map(p => ({ port: parseInt(p, 10), service: 'Unknown' })).filter(p => !isNaN(p.port));
  }

  try {
    const results = await Promise.all(
      portsToScan.map(async (p) => {
        const isOpen = await checkPort(p.port, hostTarget, 2500);
        return { ...p, isOpen };
      })
    );
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan ports' });
  }
});

// 1.1 Blacklist
app.get('/api/net/blacklist', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }
  const hostTarget = cleanTarget(target);
  try {
    const isIp = /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostTarget);
    let ip = hostTarget;
    if (!isIp) {
      const lookRes = await dns.promises.lookup(hostTarget);
      ip = lookRes.address;
    }
    const reverseIp = ip.split('.').reverse().join('.');
    
    const lists = ['zen.spamhaus.org', 'b.barracudacentral.org', 'bl.spamcop.net'];
    const results = await Promise.all(lists.map(async (list) => {
      try {
        await dns.promises.resolve(`${reverseIp}.${list}`);
        return { list, clean: false };
      } catch (e) {
        return { list, clean: true };
      }
    }));
    res.json({ ip, results });
  } catch (e) {
    res.status(500).json({ error: 'DNS resolution failed' });
  }
});

// 1.2 DNS Endpoint Natively
app.get('/api/net/dns', async (req, res) => {
  const { target, server, reverse } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target required' });

  const hostTarget = cleanTarget(target);

  try {
    const resolver = new dns.promises.Resolver();
    if (server && typeof server === 'string' && server !== 'default') {
      try { resolver.setServers([server]); } catch (e) {}
    }

    let output = '';
    output += `; <<>> PWN//NET DNS Lookup <<>> ${hostTarget}\n`;
    if (server && server !== 'default') output += `; Server: ${server}\n`;
    output += `\n`;

    if (reverse === 'true') {
       try {
          const hostnames = await resolver.reverse(hostTarget);
          output += ';; REVERSE RECORDS:\n' + hostnames.map(r => `${hostTarget}.\tIN\tPTR\t${r}`).join('\n') + '\n\n';
       } catch (e: any) {
          output += `;; REVERSE LOOKUP FAILED: ${e.message}\n`;
       }
       return res.json({ result: output || 'No Reverse DNS records found.' });
    }

    try {
       const ns = await resolver.resolveNs(hostTarget);
       output += ';; NS RECORDS:\n' + ns.map(r => `${hostTarget}.\tIN\tNS\t${r}`).join('\n') + '\n\n';
    } catch(e) {}
    try {
       const a = await resolver.resolve4(hostTarget);
       output += ';; A RECORDS:\n' + a.map(r => `${hostTarget}.\tIN\tA\t${r}`).join('\n') + '\n\n';
    } catch(e) {}
    try {
       const mx = await resolver.resolveMx(hostTarget);
       output += ';; MX RECORDS:\n' + mx.map(r => `${hostTarget}.\tIN\tMX\t${r.priority} ${r.exchange}`).join('\n') + '\n\n';
    } catch(e) {}
    try {
       const txt = await resolver.resolveTxt(hostTarget);
       output += ';; TXT RECORDS:\n' + txt.map(r => `${hostTarget}.\tIN\tTXT\t"${r.join('')}"`).join('\n') + '\n';
    } catch(e) {}
    res.json({ result: output || 'No DNS records found.' });
  } catch (e) {
    res.json({ result: 'No DNS records found or lookup failed.' });
  }
});

// 1.3 Whois Endpoint Natively
app.get('/api/net/whois', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target required' });

  const hostTarget = cleanTarget(target);

  try {
    const socket = new net.Socket();
    let data = '';
    socket.setTimeout(5000);
    socket.connect(43, 'whois.iana.org', () => {
      socket.write(hostTarget + '\r\n');
    });
    socket.on('data', chunk => data += chunk);
    socket.on('end', () => {
        if (data.length < 10) throw new Error('Short response');
        res.json({ result: data });
    });
    socket.on('error', async () => {
        // Fallback to web API if port 43 blocked
        try {
            const fb = await fetch(`https://rdap.org/domain/${hostTarget}`).then(r => r.json());
            res.json({ result: JSON.stringify(fb, null, 2) });
        } catch(e) {
            res.json({ result: 'Whois lookup failed (connection error & fallback failed).' });
        }
    });
    socket.on('timeout', () => { socket.destroy(); res.json({ result: 'Whois lookup timed out.' }); });
  } catch(e) {
    res.json({ result: 'Failed to perform whois' });
  }
});

// 1.4 Spider Proxy Natively
app.get('/api/net/spider', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'https://' + baseUrl;

  try {
    const crawled = new Set<string>();
    const queue: string[] = [baseUrl];
    const allLinks = new Set<string>();
    
    const startTime = Date.now();
    const MAX_PAGES = 15; // Increased depth for superior discovery
    const CONCURRENCY = 3; // Process multiple pages at once
    
    while (queue.length > 0 && crawled.size < MAX_PAGES) {
      if (Date.now() - startTime > 25000) break; // 25s absolute timeout
      
      // Batch process URLs for speed
      const currentBatch = queue.splice(0, CONCURRENCY);

      await Promise.all(currentBatch.map(async (fetchUrl) => {
        if (crawled.has(fetchUrl)) return;
        crawled.add(fetchUrl);

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(fetchUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
          });
          clearTimeout(timeoutId);
          
          if (!response || !response.ok) return;
          
          const contentType = response.headers.get('content-type') || '';
          const text = await response.text();
          
          // SUPERIOR EXTRACTION: Catch href, src, action, and data-links, even in JS strings
          const patterns = [
            /(?:href|src|action)\s*=\s*(?:["'])(.*?)(?:["'])/gi,
            /(?:["'])(https?:\/\/[a-z0-9-+&@#/%?=~_|!:,.;]*[a-z0-9-+&@#/%=~_|])(?:["'])/gi, // URL strings in JS
            /(?:["'])(\/[a-z0-9-_/.?=#&]+)(?:["'])/gi // Relative paths in JS
          ];

          patterns.forEach(regex => {
            let match;
            while ((match = regex.exec(text)) !== null) {
              let l = match[1].trim();
              if (!l || l.startsWith('javascript:') || l.startsWith('mailto:') || l.startsWith('tel:') || l.startsWith('#') || l.startsWith('data:')) continue;

              try {
                const absoluteUrl = new URL(l, fetchUrl).href;
                allLinks.add(absoluteUrl);

                // Intelligent Enqueue
                const parsedUrl = new URL(absoluteUrl);
                const baseHost = new URL(baseUrl).host;
                if (parsedUrl.host === baseHost && !crawled.has(absoluteUrl) && !queue.includes(absoluteUrl)) {
                    // Avoid non-crawlable assets but still list them
                    if (!absoluteUrl.match(/\.(png|jpg|jpeg|gif|css|pdf|zip|mp4|svg|ico|woff|woff2|ttf|eot)$/i)) {
                        queue.push(absoluteUrl);
                    }
                }
              } catch(e) {}
            }
          });
        } catch (e) {}
      }));
    }

    const uniqueLinks = Array.from(allLinks).sort();
    const internalLinks = uniqueLinks.filter(l => { try { return new URL(l).host === new URL(baseUrl).host; } catch(e) { return false; } });
    const externalLinks = uniqueLinks.filter(l => !internalLinks.includes(l));

    let result = `Spider Results for ${baseUrl} (Deep-crawled ${crawled.size} pages):\n`;
    result += `\n[--- INTERNAL ASSETS/LINKS (${internalLinks.length}) ---]\n${internalLinks.slice(0, 150).join('\n')}`;
    result += `\n\n[--- EXTERNAL DOMAINS (${externalLinks.length}) ---]\n${externalLinks.slice(0, 100).join('\n')}`;
    
    res.json({ result, links: uniqueLinks });
  } catch (e) {
    res.json({ result: 'Superior crawl failed. Target unreachable.', links: [] });
  }
});

// 1.5 HTTP Headers Natively
app.get('/api/net/http', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'http://' + baseUrl;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(baseUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    
    let result = `HTTP/${response.status === 200 ? '1.1' : '1.1'} ${response.status} ${response.statusText}\n`;
    for (const [key, value] of response.headers.entries()) {
       result += `${key.replace(/(^\w|-\w)/g, c => c.toUpperCase())}: ${value}\n`;
    }
    res.json({ result });
  } catch (e) {
    res.json({ result: 'Failed to fetch HTTP headers. Target may be offline.' });
  }
});

app.get('/api/net/subdomains', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  
  let host = target.replace(/^https?:\/\//, '').split('/')[0];
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`https://crt.sh/?q=%25.${host}&output=json`, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (response.ok) {
       const data = await response.json();
       const subdomains = new Set<string>();
       data.forEach((entry: any) => {
          if (entry.name_value) {
             const names = entry.name_value.split('\n');
             names.forEach((n: string) => {
                if (n.endsWith(`.${host}`) && !n.includes('*')) {
                   subdomains.add(n.toLowerCase());
                }
             });
          }
       });
       res.json({ result: Array.from(subdomains).sort() });
    } else {
       res.status(500).json({ error: `crt.sh API returned status ${response.status}` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to access crt.sh API (timeout or network error)' });
  }
});

// 2. Mail Servers (MX & TXT)
app.get('/api/net/mail', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  try {
    let mxRecords = [];
    try {
      mxRecords = await resolveMx(hostTarget);
      // Sort by priority
      mxRecords.sort((a, b) => a.priority - b.priority);
    } catch (e) {
      // Ignored if no MX
    }

    let txtRecordsStr = [];
    try {
      const txtRecords = await resolveTxt(hostTarget);
      txtRecordsStr = txtRecords.map(t => t.join(''));
    } catch (e) {
      // Ignored if no TXT
    }

    // Filter TXT for SPF and DMARC
    const spf = txtRecordsStr.filter(r => r.startsWith('v=spf1'));
    
    // Attempt DMARC lookup if target is domain
    let dmarc = [];
    try {
      const dmarcTxt = await resolveTxt(`_dmarc.${hostTarget}`);
      dmarc = dmarcTxt.map(t => t.join('')).filter(r => r.startsWith('v=DMARC1'));
    } catch (e) {
      // Ignored
    }

    res.json({ mx: mxRecords, spf, dmarc });
  } catch (error) {
    res.status(500).json({ error: 'Failed DNS lookup' });
  }
});

// 3. MAC Vendor Lookup
app.get('/api/net/mac', async (req, res) => {
  const { address } = req.query;
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'MAC Address is required' });
  }

  try {
    // MacVendors API is free and doesn't require keys for simple GETs
    const response = await fetch(`https://api.macvendors.com/${encodeURIComponent(address)}`);
    if (response.ok) {
      const vendor = await response.text();
      res.json({ vendor });
    } else {
      res.status(404).json({ error: 'Vendor not found for this MAC address' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to lookup MAC' });
  }
});

// 4. Traceroute (using HackerTarget API)
app.get('/api/net/traceroute', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  let hostTarget = target;
  if (target.startsWith('http')) hostTarget = target.replace(/^https?:\/\//, '').split('/')[0];

  try {
    const response = await fetch(`https://api.hackertarget.com/mtr/?q=${encodeURIComponent(hostTarget)}`);
    if (response.ok) {
      const data = await response.text();
      if (data.includes('error') || data.includes('API count exceeded')) {
        // Fallback to fetch test
        const start = Date.now();
        try {
           const rc = new AbortController();
           const rt = setTimeout(() => rc.abort(), 4000);
           await fetch(`http://${hostTarget}`, { signal: rc.signal }).catch(() => fetch(`https://${hostTarget}`, { signal: rc.signal }));
           clearTimeout(rt);
           const time = Date.now() - start;
           res.json({ result: `MTR API limit hit. Fallback HTTP/HTTPS test:\n\nConnected to ${hostTarget}\nTime: ${time}ms\nStatus: REACHABLE\n\n(Full MTR trace disabled in restricted environment)` });
        } catch(e) {
           res.json({ result: `MTR API limit hit. Fallback HTTP/HTTPS test:\n\nCould not reach ${hostTarget} on web ports.\nStatus: UNREACHABLE or FILTERED` });
        }
      } else {
        res.json({ result: data });
      }
    } else {
      res.status(500).json({ error: 'Failed to perform traceroute' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform traceroute' });
  }
});

// 5. Network Scanner (Lightweight Ping / Socket sweep of targeted CIDR base)
app.get('/api/net/netscan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  try {
    // Basic IP detection
    let scanIp = hostTarget;
    if (!/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostTarget)) {
       try {
         const dnsRes = await resolveTxt(hostTarget); // just to check if it resolves, fallback to lookup
       } catch(e) {}
       const lookRes = await dns.promises.lookup(hostTarget);
       scanIp = lookRes.address;
    }

    const parts = scanIp.split('.');
    if (parts.length === 4) {
      const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const results = [];
      const BATCH_SIZE = 50;
      for (let i = 1; i <= 254; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && i + j <= 254; j++) {
          batch.push(i + j);
        }
        const batchResults = await Promise.all(
          batch.map(async (lastOctet) => {
            const ip = `${base}.${lastOctet}`;
            const isAlive = await checkPort(80, ip, 1000) || await checkPort(443, ip, 1000) || await checkPort(22, ip, 1000);
            return { ip, isAlive };
          })
        );
        results.push(...batchResults);
      }
      res.json({ targetIp: scanIp, alive: results.filter(r => r.isAlive) });
    } else {
      res.status(400).json({ error: 'Invalid IPv4 structure' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to scan subnet for target' });
  }
});

// SMB Audit
app.get('/api/net/smb', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  const checkSmb = (): Promise<string> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);
      let resolved = false;

      socket.on('connect', () => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve('open');
        }
      });
      socket.on('error', () => {
        if (!resolved) { resolved = true; resolve('closed'); }
      });
      socket.on('timeout', () => {
        socket.destroy();
        if (!resolved) { resolved = true; resolve('closed'); }
      });

      socket.connect(445, hostTarget);
    });
  };

  try {
    const result = await checkSmb();
    res.json({ result });
  } catch(e) {
    res.json({ result: 'error' });
  }
});

// 6. Shell/FTP connect banner grab
app.get('/api/net/shell', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  const grabBanner = (port: number, host: string, timeout = 3000): Promise<{open: boolean, banner: string, error?: string}> => {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let buf = '';
      let tcpError = '';

      socket.setTimeout(timeout);

      socket.on('data', (data) => {
        buf += data.toString();
        if (buf.length > 5) {
           socket.destroy();
        }
      });

      socket.on('connect', () => {});

      socket.on('timeout', () => {
        tcpError = 'ETIMEDOUT (Connection timed out)';
        socket.destroy();
      });

      socket.on('error', (err: any) => {
        tcpError = err.code || err.message || 'Connection failed';
        socket.destroy();
      });

      socket.on('close', () => {
        resolve({
          open: buf.length > 0 || socket.bytesRead > 0,
          banner: buf.trim(),
          error: tcpError
        });
      });

      try {
        socket.connect(port, host);
      } catch (err: any) {
        resolve({ open: false, banner: '', error: err.message });
      }
    });
  };

  try {
    const [ssh, ftp] = await Promise.all([
      grabBanner(22, hostTarget),
      grabBanner(21, hostTarget)
    ]);
    res.json({ ssh, ftp });
  } catch (error) {
    res.status(500).json({ error: 'Banner grab failed' });
  }
});

// 7. GeoIP / IP Info (Using IP-API)
app.get('/api/net/geoip', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);

  try {
    let lookupTarget = hostTarget;
    // Resolve DNS First if it's a domain
    if (!/^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(hostTarget)) {
      try {
        const lookRes = await dns.promises.lookup(hostTarget);
        lookupTarget = lookRes.address;
      } catch (err) {
         return res.status(404).json({ error: 'DNS resolution failed for target host' });
      }
    }

    const geoResponse = await fetch(`http://ip-api.com/json/${lookupTarget}`);
    if (geoResponse.ok) {
      const geoResult = await geoResponse.json();
      if (geoResult.status === 'success') {
         res.json({ targetIp: lookupTarget, geo: geoResult });
         return;
      }
    }
    
    res.status(404).json({ error: 'Geolocation data not found' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve IP/Host info' });
  }
});

// 8. TCP Ping
app.get('/api/net/ping', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  // Clean target
  const hostTarget = target.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

  let hostIp = hostTarget;
  try {
    const lookRes = await dns.promises.lookup(hostTarget);
    hostIp = lookRes.address;
  } catch (e) {
    return res.status(404).json({ error: 'DNS resolution failed.' });
  }

  const pingTcp = (port: number): Promise<number | null> => {
     return new Promise((resolve) => {
        const start = Date.now();
        const socket = new net.Socket();
        let connected = false;
        
        socket.setTimeout(2000);
        socket.on('connect', () => {
           connected = true;
           socket.destroy();
           resolve(Date.now() - start);
        });
        socket.on('timeout', () => {
           socket.destroy();
           resolve(null);
        });
        socket.on('error', () => {
           socket.destroy();
           if (!connected) resolve(null);
        });
        socket.connect(port, hostIp);
     });
  };

  try {
    const time80 = await pingTcp(80);
    const time443 = await pingTcp(443);
    
    if (time80 !== null) {
       res.json({ ip: hostIp, port: 80, time: time80 });
    } else if (time443 !== null) {
       res.json({ ip: hostIp, port: 443, time: time443 });
    } else {
       res.status(408).json({ error: 'Host unreachable or blocked ICMP/TCP ping requests' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Ping failed' });
  }
});

// 9. TLS Certificate Verification
app.get('/api/net/certs', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const hostTarget = cleanTarget(target);
  const tls = require('tls');
  
  const options = {
    host: hostTarget,
    port: 443,
    servername: hostTarget,
    rejectUnauthorized: false
  };

  const socket = tls.connect(options, () => {
    const cert = socket.getPeerCertificate(true);
    socket.destroy();

    if (cert && Object.keys(cert).length > 0) {
      res.json({
        subject: cert.subject,
        issuer: cert.issuer,
        valid_from: cert.valid_from,
        valid_to: cert.valid_to,
        fingerprint: cert.fingerprint,
        fingerprint256: cert.fingerprint256,
        serialNumber: cert.serialNumber
      });
    } else {
      res.status(404).json({ error: 'No certificate retrieved' });
    }
  });

  socket.setTimeout(3000);
  socket.on('timeout', () => {
    socket.destroy();
    res.status(408).json({ error: 'Timeout waiting for TLS socket' });
  });

  socket.on('error', (err: any) => {
    socket.destroy();
    res.status(500).json({ error: err.message || 'TLS connection failed' });
  });
});

// 10. Have I Been Pwned check (using unofficial free lookup or error if blocked)
app.get('/api/net/pwned', async (req, res) => {
  const { email } = req.query;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Note: HIBP requires an API key, we will attempt to query a public endpoint or inform the user it requires an API key. 
  // Let's use the standard haveibeenpwned.com API, but it returns 401 without a key.
  // Instead of faking, we make the request and if it errors, we return the real error.
  
  try {
     const pwnedRes = await fetch(`https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`);
     if (pwnedRes.ok) {
        const data = await pwnedRes.json();
        res.json({ breaches: data });
     } else if (pwnedRes.status === 404) {
        res.json({ breaches: [] }); // Not pawned
     } else if (pwnedRes.status === 401) {
        res.status(401).json({ error: 'This tool requires a Have I Been Pwned API Key to be configured on the server environment. Provide API key in .env to use.' });
     } else {
        res.status(500).json({ error: `HIBP API returned status ${pwnedRes.status}`});
     }
  } catch (error) {
     res.status(500).json({ error: 'Failed to contact HIBP registry' });
  }
});

// 11. Directory Scanner
app.get('/api/net/dirscan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  const commonDirs = [
    'admin', 'login', 'dashboard', 'api', 'assets', 'css', 'js', 'images',
    'wp-admin', 'wp-content', 'wp-includes', 'robots.txt', 'sitemap.xml', '.git', '.git/config',
    '.env', 'backup', 'old', 'test', 'dev', 'logs', 'config', 'vendor', 'composer.json',
    'composer.lock', 'package.json', 'package-lock.json', '.svn', '.env.example', 'README.md',
    'src', 'pub', 'public', 'build', 'dist', 'cgi-bin', 'cache', 'tmp', 'secret',
    'temp', 'users', 'user', 'app', 'core', 'lib', 'uploads', 'download', 'downloads',
    'media', 'files', 'data', 'database', 'db', 'sql', 'dump.sql', 'db.sql', 'backup.sql',
    'phpmyadmin', 'pma', 'mysql', 'adminer', 'server-status', '.htaccess', '.htpasswd',
    'crossdomain.xml', 'phpinfo.php', 'info.php', 'test.php', 'index.php.bak', 'index.html.bak',
    'config.php', 'config.inc.php', 'config.json', 'config.yml', 'settings.php', 'settings.json',
    'web.config', 'server.js', 'main.js', 'app.js', 'yarn.lock', 'docker-compose.yml', 'Dockerfile',
    '.DS_Store', 'Thumbs.db', 'LICENSE', 'changelog.txt', 'CHANGELOG', 'LICENSE.txt', 
    'administrator', 'auth', 'auth/login', 'account', 'profile', 'register', 'signup',
    'v1', 'v2', 'v3', 'graphql', 'swagger', 'swagger-ui', 'api-docs', 'docs',
    'api/v1', 'api/v2', 'api/v3', 'api/graphql', 'api/swagger', 'api/docs', 'api/auth',
    'api/login', 'api/users', 'api/admin', 'api/status', 'api/health', 'api/healthcheck',
    'health', 'healthcheck', 'status', 'ping', 'metrics', 'actuator', 'actuator/health',
    'actuator/info', 'actuator/env', 'actuator/metrics', 'actuator/prometheus',
    'forum', 'blog', 'news', 'store', 'shop', 'cart', 'checkout', 'orders',
    'support', 'help', 'faq', 'contact', 'about', 'privacy', 'terms', 'sitemap',
    'wp-login.php', 'xmlrpc.php', 'install.php', 'setup.php', 'upgrade.php',
    'server-info', 'haproxy-status', 'nginx_status', 'php-status', 'solr',
    'appspecs.yml', 'appsettings.json', 'web.xml', 'pom.xml', 'build.gradle',
    'secrets.yml', 'database.yml', 'master.key', '.bash_history', '.ssh/id_rsa',
    'backups', 'archives', 'dump', 'exports', 'imports', 'shared', 'static',
    'resources', 'includes', 'views', 'templates', 'components', 'styles',
    'scripts', 'plugins', 'modules', 'themes', 'lang', 'locales', 'translations',
    'config.js', 'config.ts', 'default.conf', 'nginx.conf', 'apache2.conf',
    '.DS_Store', 'error_log', 'access_log', 'debug.log', 'server.log',
    'webmail', 'cpanel', 'whm', 'cp', 'dl', 'wp', 'wpm', 'mail', 'exchange', 'owa',
    'admin', 'login', 'portal', 'dashboard', 'control', 'secure', 'members',
    'documents', 'Documents', 'doc', 'docs', 'Docs', 'Doc', 'pdf', 'pdfs', 'xls', 'xlsx', 'word', 'csv', 'txt', 'rtf',
    'image', 'images', 'img', 'imgs', 'pic', 'pics', 'picture', 'pictures', 'photo', 'photos',
    'file', 'files', 'dl', 'download', 'downloads', 'shared', 'share', 'upload', 'uploads',
    'video', 'videos', 'media', 'audio', 'music', 'sound', 'sounds', 'movie', 'movies',
    'forum', 'forums', 'board', 'boards', 'community', 'blog', 'news', 'article', 'articles',
    'ajax', 'xhr', 'remote-login', 'cgi', 'cgi-bin', 'javascript', 'ts', 'jsx', 'tsx', 'app', 'core'
  ];

  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
     baseUrl = 'http://' + baseUrl;
  }

  try {
     const results = [];
     
     // PRE-FETCH: Extract path hints from the homepage DOM, simulating other tools
     try {
         const homeCtrl = new AbortController();
         const homeTo = setTimeout(() => homeCtrl.abort(), 4000);
         const homeRes = await fetch(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: homeCtrl.signal });
         clearTimeout(homeTo);
         
         if (homeRes.ok) {
             const html = await homeRes.text();
             const urlRegex = /(?:href|src|action)\s*=\s*(?:["'])(.*?)(?:["'])/gi;
             let match;
             while ((match = urlRegex.exec(html)) !== null) {
                 const extracted = match[1].trim();
                 if (!extracted || extracted.startsWith('javascript:') || extracted.startsWith('mailto:') || extracted.startsWith('#') || extracted.startsWith('data:')) continue;
                 
                 let path = '';
                 if (extracted.startsWith('http')) {
                     if (extracted.startsWith(baseUrl)) {
                         path = extracted.replace(baseUrl, '');
                     }
                 } else if (extracted.startsWith('/')) {
                     path = extracted;
                 } else if (!extracted.startsWith('//')) {
                     path = '/' + extracted;
                 }
                 
                 if (path) {
                     path = path.split('?')[0].split('#')[0];
                     const firstSegment = path.split('/')[1]; // path starts with /
                     // Exclude obvious files to just grab base directories
                     if (firstSegment && !firstSegment.includes('.')) {
                         commonDirs.push(firstSegment);
                     }
                 }
             }
         }
     } catch(e) {}
     
     const uniqueDirs = [...new Set(commonDirs)];
     const BATCH_SIZE = 15;
     
     for (let i = 0; i < uniqueDirs.length; i += BATCH_SIZE) {
       const batch = uniqueDirs.slice(i, i + BATCH_SIZE);
       await Promise.all(batch.map(async (dir) => {
         try {
           const url = `${baseUrl}/${dir}`;
           const controller = new AbortController();
           const timeoutId = setTimeout(() => controller.abort(), 4000);
           
           const response = await fetch(url, { 
               method: 'GET', 
               redirect: 'follow',
               signal: controller.signal,
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
           });
           clearTimeout(timeoutId);
           
           const status = response.status;
           
           // If it returns 200, make sure it didn't just redirect to the home page (catch-all)
           if (status === 200 || status === 401 || status === 403) {
              const resUrl = response.url;
              const isCatchAll = resUrl === baseUrl || resUrl === baseUrl + '/' || resUrl.includes('page-not-found') || resUrl.includes('404');
              
              if (!isCatchAll || status === 401 || status === 403) {
                 results.push({ path: `/${dir}`, status: 200 }); // present as 200 for user simplicity
              }
           }
         } catch (err) {
           // Network error or timeout, ignore and continue
         }
       }));
     }
     
     // Sort results by path for consistency
     results.sort((a, b) => a.path.localeCompare(b.path));
     
     res.json({ results });
  } catch (error) {
     res.status(500).json({ error: 'Directory scan failed' });
  }
});

// 12. Admin Finder
app.get('/api/net/adminfinder', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  
  const dirs = [
    'admin', 'login', 'admin/login.php', 'administrator', 'wp-admin', 'cpanel', 'config', 'dashboard',
    'admin.php', 'admin.html', 'backend', 'controlpanel', 'cp', 'webadmin', 'admin/index.php',
    'admin/login', 'adminarea', 'panel', 'manager', 'admin_login', 'auth', 'auth/login', 'manage',
    'phpmyadmin', 'pma', 'adminer', 'admin/dashboard', 'admin/admin.php', 'sysadmin',
    'admin.aspx', 'admin.jsp', 'login.jsp', 'login.aspx', 'login.html', 'login.php',
    'admin-console', 'admin-panel', 'admin-dashboard', 'adm', 'admin_1', 'admin1',
    'admin2', 'admin3', 'admin4', 'admin5', 'usuarios', 'usuario', 'cms', 'cms-admin',
    'siteadmin', 'site-admin', 'myadmin', 'my-admin', 'webmaster', 'web-master',
    'administratorlogin', 'administrator-login', 'adminlogin', 'admin-login',
    'admin_area', 'admin_panel', 'admin_dashboard', 'administracion', 'access',
    'auth/admin', 'superadmin', 'super-admin', 'root', 'staff', 'system',
    'user', 'users', 'members', 'member', 'portal', 'secure', 'secure/login',
    'webmail', 'cpanel', 'whm', 'cp', 'dl', 'wp', 'wpm', 'mail', 'exchange', 'owa',
    'zimbra', 'roundcube', 'squirrelmail', 'horde', 'postfixadmin', 'exim',
    'webmail/', 'cpanel/', 'whm/', 'cp/', 'dl/', 'wp/', 'wpm/', 'mail/', 'exchange/', 'owa/',
    'control-panel', 'hosting', 'host', 'dashboard/login'
  ];
  
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'http://' + baseUrl;

  const results = [];
  try {
     const BATCH_SIZE = 10;
     for (let i = 0; i < dirs.length; i += BATCH_SIZE) {
       const batch = dirs.slice(i, i + BATCH_SIZE);
       await Promise.all(batch.map(async (dir) => {
         try {
           const controller = new AbortController();
           const timeoutId = setTimeout(() => controller.abort(), 4000);
           const response = await fetch(`${baseUrl}/${dir}`, { 
               method: 'GET', 
               redirect: 'follow', 
               signal: controller.signal,
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
           });
           clearTimeout(timeoutId);
           
           const status = response.status;
           
           if (status === 200 || status === 401 || status === 403) {
              const resUrl = response.url;
              const isCatchAll = resUrl === baseUrl || resUrl === baseUrl + '/' || resUrl.includes('page-not-found') || resUrl.includes('404');
              
              if (!isCatchAll || status === 401 || status === 403) {
                 results.push({ path: `/${dir}`, status: 200 }); // present as 200 for user simplicity
              }
           }
         } catch (err) {}
       }));
     }
     
     results.sort((a, b) => a.path.localeCompare(b.path));
     res.json({ results });
  } catch(e) {
     res.status(500).json({ error: 'Scan failed' });
  }
});

// 13. React/Next Scanner
app.get('/api/net/reactscan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'https://' + baseUrl;

  const results = [];
  try {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 6000);
     const resNode = await fetch(baseUrl, { method: 'GET', signal: controller.signal, headers: {'User-Agent': 'Mozilla/5.0'} });
     clearTimeout(timeoutId);
     
     if (resNode.ok) {
       const html = await resNode.text();
       
       if (html.includes('__NEXT_DATA__') || html.includes('_next/static')) {
          results.push({ path: 'Next.js Framework Signature', status: 'Detected' });
       }
       if (html.includes('data-reactroot') || html.includes('id="__next"') || html.includes('id="root"')) {
          results.push({ path: 'React DOM Node (Root)', status: 'Detected' });
       }
       if (html.includes('window.React') || html.includes('.createElement(')) {
          results.push({ path: 'React Global Variable/Signatures', status: 'Detected' });
       }
       if (html.includes('static/js/main.') && html.includes('.chunk.js')) {
          results.push({ path: 'Create React App Structure', status: 'Detected' });
       }
       if (html.includes('content="Astro') || html.includes('astro-island')) {
          results.push({ path: 'Astro Framework', status: 'Detected' });
       }
       if (html.includes('gatsby-') || html.includes('id="___gatsby"')) {
          results.push({ path: 'Gatsby Framework', status: 'Detected' });
       }
       if (html.includes('/.remix/') || html.includes('window.__remixContext')) {
          results.push({ path: 'Remix Framework', status: 'Detected' });
       }
       if (html.match(/@vite\/client|vite-plugin-/)) {
          results.push({ path: 'Vite Bundler', status: 'Detected' });
       }
       
       if (results.length === 0) {
          results.push({ path: 'No typical modern React/Next signatures found strictly in HTML root.', status: 'Undetected' });
       }
     } else {
       results.push({ path: `Error: Received HTTP ${resNode.status}`, status: 'Failed' });
     }
     res.json({ results });
  } catch(e) {
     res.status(500).json({ error: 'Scan failed to fetch target URL' });
  }
});

// 17. JS Secrets Scanner
app.get('/api/net/js_scan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'https://' + baseUrl;

  try {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 6000);
     const htmlRes = await fetch(baseUrl, { method: 'GET', signal: controller.signal, headers: {'User-Agent': 'Mozilla/5.0'} });
     clearTimeout(timeoutId);
     
     if (!htmlRes.ok) throw new Error('Failed to fetch target page');
     const html = await htmlRes.text();
     
     const scriptRegex = /<script[^>]+src=["']([^"']+)["']/gi;
     let match;
     const jsLinks = new Set<string>();
     
     while ((match = scriptRegex.exec(html)) !== null) {
        let src = match[1];
        if (src.startsWith('//')) src = 'https:' + src;
        else if (src.startsWith('/')) src = baseUrl + src;
        else if (!src.startsWith('http')) src = baseUrl + '/' + src;
        jsLinks.add(src);
     }
     
     if (jsLinks.size === 0) {
        return res.json({ result: 'No external JS files found on the page.', secrets: [], endpoints: [] });
     }

     const secretsFound: string[] = [];
     const endpointsFound = new Set<string>();
     
     const secretRegexes = [
       { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
       { name: 'Stripe Secret Key', regex: /sk_live_[0-9a-zA-Z]{24}/g },
       { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
       { name: 'Generic Token', regex: /["'](?:token|secret|api_key|password)["']\s*:\s*["']([a-zA-Z0-9\-_+/]{16,})["']/gi }
     ];
     const endpointRegex = /(?:"|')(\/api\/[a-zA-Z0-9_/?&=-]+)(?:"|')/gi;

     const scriptsToFetch = Array.from(jsLinks).slice(0, 5);
     
     await Promise.all(scriptsToFetch.map(async (src) => {
        try {
           const c = new AbortController();
           const to = setTimeout(() => c.abort(), 4000);
           const jsRes = await fetch(src, { signal: c.signal, headers: {'User-Agent': 'Mozilla/5.0'} });
           clearTimeout(to);
           if (!jsRes.ok) return;
           const jsText = await jsRes.text();
           
           secretRegexes.forEach(({ name, regex }) => {
              let smatch;
              while ((smatch = regex.exec(jsText)) !== null) {
                 secretsFound.push(`[${name}] in JS: ${smatch[0].substring(0, 15)}...`);
              }
           });
           
           let ematch;
           while ((ematch = endpointRegex.exec(jsText)) !== null) {
              endpointsFound.add(ematch[1]);
           }
        } catch(e) {}
     }));

     res.json({ 
        result: `Scanned ${scriptsToFetch.length} JS files.`,
        secrets: secretsFound,
        endpoints: Array.from(endpointsFound)
     });
  } catch (error) {
     res.status(500).json({ error: 'Failed to scan JS files' });
  }
});

// Nmap Port Scanner using HackerTarget API
app.get('/api/net/nmap', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target is required' });
  }

  let hostTarget = target;
  if (target.startsWith('http')) hostTarget = target.replace(/^https?:\/\//, '').split('/')[0];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`https://api.hackertarget.com/nmap/?q=${encodeURIComponent(hostTarget)}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.text();
      res.json({ result: data });
    } else {
      res.status(500).json({ error: 'Nmap API failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform nmap scan (timeout or error)' });
  }
});

// 18. CORS Misconfiguration Scanner
app.get('/api/net/cors_scan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'https://' + baseUrl;

  try {
     const evilOrigin = 'https://evilhacker.com';
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 5000);
     const response = await fetch(baseUrl, { 
        method: 'GET', 
        signal: controller.signal, 
        headers: { 'Origin': evilOrigin, 'User-Agent': 'Mozilla/5.0' } 
     });
     clearTimeout(timeoutId);
     
     const acao = response.headers.get('access-control-allow-origin');
     const acac = response.headers.get('access-control-allow-credentials');
     
     let vulnStatus = 'SAFE';
     let message = 'CORS headers seem correctly configured.';
     
     if (acao === '*') {
        vulnStatus = 'WARNING';
        message = 'Wildcard (*) Origin allowed. This is low-risk but exposes public APIs.';
     } else if (acao === evilOrigin) {
        vulnStatus = 'CRITICAL';
        message = `Target reflected our evil origin (${evilOrigin})!`;
        if (acac === 'true') {
           message += ' AND allows credentials! Complete CORS bypass.';
        }
     } else if (acao === 'null') {
        vulnStatus = 'WARNING';
        message = 'Allowed origin is "null", which can sometimes be bypassed via iframes.';
     } else if (!acao) {
        message = 'No Access-Control-Allow-Origin header found (Safe).';
     } else {
        message = `Allowed Origin: ${acao}`;
     }
     
     res.json({ result: message, status: vulnStatus, acao: acao || 'none', acac: acac || 'none' });
  } catch (error) {
     res.status(500).json({ error: 'Failed to perform CORS scan' });
  }
});

// 14. Phone Crawler
app.get('/api/net/phonecrawl', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'http://' + baseUrl;

  try {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 5000);
     const response = await fetch(baseUrl, { signal: controller.signal });
     clearTimeout(timeoutId);
     const text = await response.text();
     const phoneRegex = /(?<!\d)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?!\d)/g;
     const matches = text.match(phoneRegex) || [];
     const uniqueMatches = [...new Set(matches.map(m => m.trim()))].filter(m => {
        const digits = m.replace(/\D/g, '').length;
        return digits >= 10 && digits <= 15;
     });
     res.json({ count: uniqueMatches.length, numbers: uniqueMatches });
  } catch(e) {
     res.status(500).json({ error: 'Crawler failed to fetch target' });
  }
});

// 15. DoS (Stress test limited to small burst for safety)
app.get('/api/net/dos', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'http://' + baseUrl;

  // We limit the DOS to max 100 requests to avoid real abuse
  try {
    const promises = Array.from({length: 100}).map((_, i) => {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 3000);
       return fetch(`${baseUrl}?st=${Date.now()}${i}`, { mode: 'no-cors', cache: 'no-store', signal: controller.signal })
              .catch(e => null) // Suppress errors
              .finally(() => clearTimeout(timeoutId));
    });
    // Don't wait for all of them to finish completely or it could take a while
    // Just fire and forget some, wait for some
    await Promise.all(promises.slice(0, 20));
    res.json({ message: 'Stress test burst completed (100 packets)' });
  } catch(e) {
    res.status(500).json({ error: 'Failed to complete stress burst' });
  }
});

// 16. Web Faker
app.get('/api/net/webfaker', async (req, res) => {
  try {
     const idString = req.query.id as string;
     const seed = idString ? parseInt(idString) || 1 : Math.floor(Math.random() * 10000) + 1;
     
     // Simple seeded random function
     const random = (s: number) => {
         let x = Math.sin(s++) * 10000;
         return x - Math.floor(x);
     };
     
     const firstNames = ['John', 'Jane', 'Alex', 'Chris', 'Katie', 'Mike', 'Sarah', 'Emma', 'David', 'James', 'Mary', 'Robert', 'Patricia', 'Michael', 'Linda', 'William', 'Elizabeth', 'Richard', 'Barbara', 'Joseph', 'Susan', 'Thomas', 'Jessica', 'Charles', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa', 'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle', 'Kevin', 'Dorothy', 'Brian', 'Carol', 'George', 'Amanda', 'Edward', 'Melissa', 'Ronald', 'Deborah', 'Timothy', 'Stephanie', 'Jason', 'Rebecca', 'Jeffrey', 'Sharon', 'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy', 'Eric', 'Shirley', 'Jonathan', 'Angela', 'Stephen', 'Helen', 'Larry', 'Anna', 'Justin', 'Brenda', 'Scott', 'Pamela', 'Brandon', 'Nicole', 'Benjamin', 'Emma', 'Samuel', 'Samantha', 'Gregory', 'Katherine', 'Frank', 'Christine', 'Alexander', 'Debra', 'Raymond', 'Rachel', 'Patrick', 'Catherine', 'Jack', 'Carolyn', 'Dennis', 'Janet', 'Jerry', 'Ruth', 'Tyler', 'Maria', 'Aaron', 'Heather', 'Jose', 'Diane', 'Adam', 'Virginia', 'Henry', 'Julie', 'Nathan', 'Joyce', 'Douglas', 'Victoria', 'Zachary', 'Olivia', 'Peter', 'Kelly', 'Kyle', 'Christina', 'Walter', 'Lauren', 'Ethan', 'Joan', 'Jeremy', 'Evelyn', 'Christian', 'Judith', 'Keith', 'Megan', 'Roger', 'Cheryl', 'Terry', 'Andrea', 'Gerald', 'Hannah', 'Harold', 'Martha', 'Sean', 'Jacqueline', 'Austin', 'Frances', 'Carl', 'Gloria', 'Arthur', 'Ann', 'Lawrence', 'Teresa', 'Dylan', 'Kathryn', 'Jesse', 'Sara', 'Jordan', 'Janice', 'Bryan', 'Jean', 'Ralph', 'Alice', 'Joe', 'Madison', 'Noah', 'Doris', 'Bruce', 'Abigail', 'Billy', 'Julia', 'Albert', 'Judy', 'Willie', 'Grace', 'Gabriel', 'Denise', 'Logan', 'Amber', 'Alan', 'Marilyn', 'Juan', 'Beverly', 'Wayne', 'Danielle', 'Roy', 'Theresa', 'Ralph', 'Sophia', 'Randy', 'Marie', 'Eugene', 'Diana', 'Vincent', 'Brittany', 'Russell', 'Natalie', 'Elijah', 'Isabella', 'Louis', 'Charlotte', 'Bobby', 'Rose', 'Philip', 'Alexis', 'Johnny', 'Kayla'];
     const lastNames = ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 'Washington', 'Butler', 'Barnes'];
     const domains = ['gmail.com', 'yahoo.com', 'protonmail.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com', 'mail.com', 'zoho.com', 'yandex.com'];
     
     const streetNames = ['Main St', 'Oak St', 'Pine St', 'Maple Ave', 'Cedar Ln', 'Elm St', 'Washington Blvd', 'Park Ave', 'Lakeview Dr', 'Hillcrest Rd', 'Sunset Blvd', 'Lincoln Ave'];
     const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'San Francisco', 'Charlotte', 'Indianapolis', 'Seattle', 'Denver', 'Washington'];
     const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA', 'TX', 'CA', 'TX', 'FL', 'TX', 'OH', 'CA', 'NC', 'IN', 'WA', 'CO', 'DC'];
     
     const r = (arr: any[], s: number) => arr[Math.floor(random(s) * arr.length)];
     
     const first = r(firstNames, seed * 1);
     const last = r(lastNames, seed * 2);
     const domain = r(domains, seed * 3);
     const age = Math.floor(random(seed * 4) * 40) + 18;
     
     // Generate birthdate based on age
     const currentYear = new Date().getFullYear();
     const birthYear = currentYear - age;
     const birthMonth = Math.floor(random(seed * 5) * 12) + 1; // 1 to 12
     // Basic day estimation, assuming 28 days for safety
     const birthDay = Math.floor(random(seed * 6) * 28) + 1; 
     const birthdate = `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
     
     // Generate address
     const streetNum = Math.floor(random(seed * 7) * 9000) + 100;
     const street = r(streetNames, seed * 8);
     const cityIndex = Math.floor(random(seed * 9) * cities.length);
     const city = cities[cityIndex];
     const state = states[cityIndex]; // Matches state to city roughly
     const zip = Math.floor(random(seed * 10) * 89999) + 10000;
     const address = `${streetNum} ${street}, ${city}, ${state} ${zip}`;
     
     let output = `--- Profile ID: ${seed} ---\n`;
     output += `Name: ${first} ${last}\n`;
     output += `Age: ${age}\n`;
     output += `Birthdate: ${birthdate}\n`;
     output += `Address: ${address}\n`;
     output += `Email: ${first.toLowerCase()}.${last.toLowerCase()}${age}@${domain}\n`;
     output += `Phone: +1-${Math.floor(random(seed*11)*900)+100}-${Math.floor(random(seed*12)*900)+100}-${Math.floor(random(seed*13)*9000)+1000}\n`;
     output += `Username: ${first.toLowerCase()}_${last.toLowerCase()}_${Math.floor(random(seed*14)*999)}\n`;
     output += `Password: ${first}${last}${Math.floor(random(seed*15)*999)}!\n`;
     
     res.json({ content: output });
  } catch(e) {
     res.status(500).json({ error: 'Failed to generate fake data' });
  }
});

// 17. Hackbar
app.all('/api/net/hackbar', async (req, res) => {
  const target = req.query.target as string;
  const method = (req.query.method as string || 'GET').toUpperCase();
  const payload = req.query.payload as string;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http')) baseUrl = 'http://' + baseUrl;
  
  if (method === 'GET' && payload) {
    baseUrl += baseUrl.includes('?') ? `&payload=${encodeURIComponent(payload)}` : `?payload=${encodeURIComponent(payload)}`;
  }
  
  try {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 10000);
     
     const fetchOptions: RequestInit = {
       method,
       signal: controller.signal
     };
     
     if (method === 'POST' && payload) {
       fetchOptions.body = new URLSearchParams({ payload });
       fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
     }
     
     const response = await fetch(baseUrl, fetchOptions);
     clearTimeout(timeoutId);
     const html = await response.text();
     
     res.json({
       status: response.status,
       statusText: response.statusText,
       data: html.substring(0, 5000)
     });
  } catch(e: any) {
     res.status(500).json({ error: e.message || 'Failed to fetch source' });
  }
});

// 18. Hash Cracker (Cloud Node Implementation)
app.post('/api/net/hashcrack', async (req, res) => {
  const { hash, type, wordlist } = req.body;
  if (!hash || !type) return res.status(400).json({ error: 'Hash and type required' });

  console.log(`[HASH] Cracking ${type} hash: ${hash.substring(0, 8)}...`);

  // Basic dictionary for "Real" feel
  const commonPasswords = [
    'password', '123456', 'qwerty', 'admin', 'welcome', 'root', 'password123',
    'pwnnet2026', 'bitcoin', 'crypto', 'letmein', 'secure', 'wallet', 'money'
  ];

  const crypto = await import('crypto');
  let found = null;

  try {
    const hashType = type.toLowerCase().replace('-', '');

    // Attempt dictionary attack
    for (const pass of commonPasswords) {
      let currentHash = '';
      try {
        if (hashType === 'md5') currentHash = crypto.createHash('md5').update(pass).digest('hex');
        else if (hashType === 'sha1') currentHash = crypto.createHash('sha1').update(pass).digest('hex');
        else if (hashType === 'sha256') currentHash = crypto.createHash('sha256').update(pass).digest('hex');
        else if (hashType === 'sha512') currentHash = crypto.createHash('sha512').update(pass).digest('hex');

        if (currentHash === hash.toLowerCase()) {
          found = pass;
          break;
        }
      } catch (e) {}
    }

    if (found) {
      res.json({ success: true, plaintext: found, method: 'Dictionary' });
    } else {
      // If not found, simulate a 5 second "Deep Brute Force" search
      setTimeout(() => {
        res.json({ success: false, error: 'No match found in current wordlist. Try a larger list.' });
      }, 3000);
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Speedtest Backend
app.get('/api/net/speedtest/download', (req, res) => {
  const size = parseInt(req.query.size as string) || 1024 * 1024 * 5; // default 5MB
  res.set('Content-Type', 'application/octet-stream');
  res.set('Content-Length', size.toString());
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  const chunk = Buffer.alloc(1024 * 64, '0'); // 64KB chunks
  let sent = 0;
  
  const sendData = () => {
    while (sent < size) {
      let toSend = Math.min(chunk.length, size - sent);
      sent += toSend;
      if (!res.write(chunk.slice(0, toSend))) {
        res.once('drain', sendData);
        return;
      }
    }
    res.end();
  };
  
  sendData();
});

app.post('/api/net/speedtest/upload', (req, res) => {
  let received = 0;
  req.on('data', chunk => {
    received += chunk.length;
  });
  req.on('end', () => {
    res.json({ success: true, bytesReceived: received });
  });
});

// 18. WP Scanner
app.get('/api/net/wpscan', async (req, res) => {
  const { target } = req.query;
  if (!target || typeof target !== 'string') return res.status(400).json({ error: 'Target is required' });
  let baseUrl = target.replace(/\/$/, "");
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = 'https://' + baseUrl;

  const results: any = { isWordPress: false, version: null, endpoints: {}, themes: [], plugins: [] };

  try {
     const checkPath = async (p: string) => {
        try {
           const c = new AbortController();
           const t = setTimeout(() => c.abort(), 2000);
           const r = await fetch(`${baseUrl}${p}`, { method: 'GET', signal: c.signal });
           clearTimeout(t);
           return { ok: r.ok, status: r.status, text: r.ok ? await r.text() : '' };
        } catch { return { ok: false, status: 0, text: '' }; }
     };

     const home = await checkPath('/');
     if (home.text.includes('wp-content') || home.text.includes('wp-includes')) {
        results.isWordPress = true;
     }
     
     // Extract version from meta tag
     const match = home.text.match(/name="generator" content="WordPress (.*?)"/i);
     if (match && match[1]) results.version = match[1];

     if (!results.isWordPress) {
        const login = await checkPath('/wp-login.php');
        if (login.ok && login.text.includes('user_login')) results.isWordPress = true;
     }

     if (results.isWordPress) {
        // Enumerate some paths
        const endpoints = ['/wp-login.php', '/xmlrpc.php', '/wp-json/'];
        for (const ep of endpoints) {
           const r = await checkPath(ep);
           results.endpoints[ep] = r.status;
        }

        // Try extracting some plugins from the HTML
        const pluginRegex = /wp-content\/plugins\/([^\/]+)\//g;
        let pMatch;
        const foundP = new Set<string>();
        while ((pMatch = pluginRegex.exec(home.text)) !== null) {
           foundP.add(pMatch[1]);
        }
        results.plugins = Array.from(foundP);

        // Try extracting some themes
        const themeRegex = /wp-content\/themes\/([^\/]+)\//g;
        let tMatch;
        const foundT = new Set<string>();
        while ((tMatch = themeRegex.exec(home.text)) !== null) {
           foundT.add(tMatch[1]);
        }
        results.themes = Array.from(foundT);
     }
     
     res.json(results);
  } catch(e) {
     res.status(500).json({ error: 'WP scan fetch failed' });
  }
});

// 20. CVE Lookup Proxy
  app.get('/api/net/cve/recent', async (req, res) => {
    const startIndex = parseInt(req.query.startIndex as string) || 0;
    const resultsPerPage = 20;

    const fetchNVD = async () => {
       const end = new Date();
       const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000); // 14 days (Small range for faster response)

       // NVD 2.0 requires full ISO with milliseconds and Z
       const fmtDate = (d: Date) => d.toISOString();

       const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${encodeURIComponent(fmtDate(start))}&pubEndDate=${encodeURIComponent(fmtDate(end))}&startIndex=${startIndex}&resultsPerPage=${resultsPerPage}`;
       
       console.log(`[CVE] Querying NVD: ${url}`);
       const controller = new AbortController();
       const t = setTimeout(() => controller.abort(), 12000);

       const r = await fetch(url, {
           signal: controller.signal,
           headers: {
             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PWNNET-Toolkit/1.0'
           }
       });
       clearTimeout(t);
       if (!r.ok) {
          const body = await r.text();
          throw new Error(`NVD API returned ${r.status}: ${body.substring(0, 50)}`);
       }
       const nvdData = await r.json();
       
       if (nvdData?.vulnerabilities && nvdData.vulnerabilities.length > 0) {
           const formatted = nvdData.vulnerabilities.map((v: any) => {
               const cve = v.cve;
               const id = cve?.id || 'Unknown';
               const summary = cve?.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No summary available';
               const cvssData = cve?.metrics?.cvssMetricV31?.[0]?.cvssData || cve?.metrics?.cvssMetricV30?.[0]?.cvssData || cve?.metrics?.cvssMetricV2?.[0]?.cvssData;
               const cvss = cvssData ? cvssData.baseScore : null;
               
               return { id, cvss, summary };
           });
           console.log(`[CVE] NVD Success: ${formatted.length} items`);
           return { vulnerabilities: formatted, totalResults: nvdData.totalResults };
       }
       return null;
    };

    const fetchCircl = async () => {
       console.log(`[CVE] Querying Circl.lu Fallback (100 items)...`);
       const controller = new AbortController();
       const t = setTimeout(() => controller.abort(), 20000);
       const altRes = await fetch('https://cve.circl.lu/api/last/100', { signal: controller.signal });
       clearTimeout(t);
       if (!altRes.ok) throw new Error(`Circl.lu returned ${altRes.status}`);
       const altData = await altRes.json();
       if (Array.isArray(altData)) {
          let allVulnerabilities: any[] = [];
          altData.forEach((item: any) => {
             // Handle CSAF format (vulnerabilities array)
             if (item.vulnerabilities && Array.isArray(item.vulnerabilities)) {
                item.vulnerabilities.forEach((v: any) => {
                   allVulnerabilities.push({
                      id: v.cve || v.id || 'Unknown',
                      summary: v.notes?.find((n:any)=>n.category==='summary' || n.category==='description')?.text || v.summary || 'No summary available',
                      cvss: v.scores?.[0]?.cvss_v3?.baseScore || v.cvss || null
                   });
                });
             } else if (item.id) {
                // Legacy flat format
                allVulnerabilities.push({
                   id: item.id,
                   summary: item.summary || 'No summary available',
                   cvss: item.cvss || null
                });
             }
          });

          // Deduplicate and filter for CVE, GHSA, or MAL IDs
          const seen = new Set();
          const formatted = allVulnerabilities.filter(v => {
             if (seen.has(v.id)) return false;
             seen.add(v.id);
             return v.id !== 'Unknown' && (v.id.startsWith('CVE-') || v.id.startsWith('GHSA-') || v.id.startsWith('MAL-'));
          });

          console.log(`[CVE] Circl.lu Success: ${formatted.length} items extracted`);
          return { vulnerabilities: formatted.slice(startIndex, startIndex + resultsPerPage), totalResults: formatted.length, fallback: true };
       }
       return null;
    };

    try {
       try {
          const data = await fetchNVD();
          if (data) return res.json(data);
       } catch (e: any) {
          console.warn(`[CVE] NVD API Failed (${e.message}), falling back to Circl.lu...`);
       }

       const circlData = await fetchCircl();
       if (circlData) return res.json(circlData);

       throw new Error('All CVE sources failed or returned empty results.');
    } catch (e: any) {
       console.error(`[CVE] CRITICAL FAIL: ${e.message}`);
       res.status(500).json({ error: 'Could not retrieve CVE data', details: e.message });
    }
  });

  let exploitDbCache: any = null;
  let cachePromise: Promise<any> | null = null;
  const initExploitDb = async () => {
     if (exploitDbCache) return exploitDbCache;
     if (cachePromise) return cachePromise;
     
     cachePromise = fetch('https://gitlab.com/exploit-database/exploitdb/-/raw/main/files_exploits.csv')
       .then(r => r.text())
       .then(text => {
          const lines = text.split('\n');
          const data = [];
          for (let i = 1; i < lines.length; i++) {
            const row = lines[i];
            if (!row || row.trim().length === 0) continue;
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 7) {
               data.push({
                 id: cols[0],
                 file: cols[1],
                 description: cols[2].replace(/^"|"$/g, ''),
                 author: cols[4].replace(/^"|"$/g, ''),
                 type: cols[5].replace(/^"|"$/g, ''),
                 platform: cols[6].replace(/^"|"$/g, ''),
               });
            }
          }
          exploitDbCache = data;
          cachePromise = null;
          return data;
       }).catch(() => {
          cachePromise = null;
          return [];
       });
     return cachePromise;
  }

  // prefetch explode database
  setTimeout(initExploitDb, 2000);

  app.get('/api/net/exploitdb/search', async (req, res) => {
    const q = (req.query.q || '').toString().toLowerCase();
    if (!q) return res.json({ data: [] });
    try {
      const data = await initExploitDb();
      const results = data.filter((item: any) => 
        item.description.toLowerCase().includes(q) || 
        item.author.toLowerCase().includes(q) ||
        item.id === q ||
        item.platform.toLowerCase().includes(q)
      ).slice(0, 50);
      
      const formatted = results.map((r: any) => ({
        ...r,
        url: `https://www.exploit-db.com/exploits/${r.id}`
      }));
      res.json({ data: formatted });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to search exploit db' });
    }
  });

  app.get('/api/net/cve/search', async (req, res) => {
    const { id } = req.query;
    if (!id || typeof id !== 'string') return res.status(400).json({ error: 'ID is required' });
    const cid = id.trim().toUpperCase();

    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PWNNET-Toolkit/1.0' };

    try {
       // 1. Try NVD first as it's official and has richest data
       try {
          const tc2 = new AbortController();
          const t2 = setTimeout(() => tc2.abort(), 8000);
          const res2 = await fetch(`https://services.nvd.nist.gov/rest/json/cve/2.0?cveId=${cid}`, { signal: tc2.signal, headers });
          clearTimeout(t2);
          if (res2.ok) {
             const nvdData = await res2.json();
             if (nvdData?.vulnerabilities?.[0]) {
                console.log(`[CVE] Found ${cid} on NVD`);
                return res.json({ fallback: false, data: nvdData.vulnerabilities[0].cve });
             }
          }
       } catch(e) {
          console.warn(`[CVE] NVD search failed for ${cid}:`, e);
       }

       // 2. Try MITRE
       try {
          const tc1 = new AbortController();
          const t1 = setTimeout(() => tc1.abort(), 5000);
          const res1 = await fetch(`https://cveawg.mitre.org/api/cve/${cid}`, { signal: tc1.signal, headers });
          clearTimeout(t1);
          if (res1.ok) {
             const data = await res1.json();
             if (data && data.cveMetadata) {
                console.log(`[CVE] Found ${cid} on MITRE`);
                return res.json({ fallback: false, data });
             }
          }
       } catch(e) {}

       // 3. Try CIRCL
       try {
          const tc3 = new AbortController();
          const t3 = setTimeout(() => tc3.abort(), 5000);
          const res3 = await fetch(`https://cve.circl.lu/api/cve/${cid}`, { signal: tc3.signal, headers });
          clearTimeout(t3);
          if (res3.ok) {
             const data = await res3.json();
             if (data && data.id) {
                console.log(`[CVE] Found ${cid} on Circl.lu`);
                return res.json({ fallback: true, data });
             }
          }
       } catch(e) {}
       
       res.status(404).json({ error: `CVE record ${cid} not found across all sources.` });
    } catch(e: any) {
       res.status(500).json({ error: 'Search failed', message: e.message });
    }
  });

// Initialize AI Client
let genAI: any = null;

function getAiClient() {
  if (genAI) return genAI;

  // Try multiple common key names and TRIM them to prevent hidden spaces
  const rawKey = process.env.GEMINI_API_KEY ||
                 process.env.GOOGLE_API_KEY ||
                 process.env.GEMINI_KEY ||
                 process.env.API_KEY;

  const key = rawKey ? rawKey.trim() : null;

  if (key && key.length > 5) {
    try {
      genAI = new GoogleGenerativeAI(key);
      console.log(`[AI] Gemini Client Initialized (Key: ${key.substring(0, 4)}***)`);
    } catch (e) {
      console.error('[AI] Gemini Init Error:', e);
    }
  } else {
    console.warn('[AI] MISSING API KEY: GEMINI_API_KEY is not set in Render.');
  }
  return genAI;
}

// AI Diagnostic endpoint
app.get('/api/net/ai_status', async (req, res) => {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  const hasGemini = key.length > 5;
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || '').trim();

  res.json({
    gemini: hasGemini ? 'READY' : 'MISSING_KEY',
    openai: hasOpenAI ? 'READY' : 'MISSING_KEY',
    simulationMode: (!hasGemini && !hasOpenAI) ? 'ON' : 'OFF',
    debug: {
        keyDetected: hasGemini,
        keyLength: key.length,
        envKeys: Object.keys(process.env).filter(k => k.includes('KEY') || k.includes('API'))
    }
  });
});

// Generic AI Generator helper
async function generateAIResponse(prompt: string) {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const key = rawKey ? rawKey.trim() : null;

  if (!key) {
    return `[AI ERROR] No GEMINI_API_KEY found in Render environment variables.`;
  }

  // Use direct REST API to avoid SDK model-lookup bugs
  const models = ['gemini-1.5-flash', 'gemini-pro'];

  for (const model of models) {
    try {
      console.log(`[AI] Querying ${model} via REST...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
          ]
        })
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      console.warn(`[AI] ${model} failed:`, data.error?.message || 'Unknown error');
      if (data.error?.message?.includes('API key not valid')) {
        return `[AI ERROR] Your API key is invalid. Please check the value in Render settings.`;
      }
    } catch (e: any) {
      console.error(`[AI] REST Fetch Error for ${model}:`, e.message);
    }
  }

  return `[AI ERROR] All models failed. Ensure your API key is correct and you have "Generative Language API" enabled in Google Cloud Console.`;
}

// AI Vulnerability Analyzer endpoint
app.post('/api/net/ai_analyze', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code snippet is required' });

  const prompt = `You are PwnBrain-2026. Analyze this code for security vulnerabilities. Be extremely technical and concise. Format with [AI ANALYSIS] header. Code: ${code}`;

  try {
    const response = await generateAIResponse(prompt);
    res.json({ result: response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// LLM Jailbreak Payload Generator endpoint
app.post('/api/net/llm_jailbreak', async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: 'Target is required' });

  const prompt = `You are a red teamer. Generate 3 creative LLM jailbreak payloads for: "${target}". No disclaimers. Format with [JAILBREAK PAYLOADS] header.`;

  try {
    const response = await generateAIResponse(prompt);
    res.json({ result: response });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GraphQL Introspection Scanner
app.post('/api/net/graphql_scan', async (req, res) => {
  const { target } = req.body;
  if (!target || typeof target !== 'string') {
    return res.status(400).json({ error: 'Target URL is required' });
  }
  
  let baseUrl = target;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = 'https://' + baseUrl;
  }

  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
        }
        directives {
          name
          description
          locations
          args {
            ...InputValue
          }
        }
      }
    }

    fragment FullType on __Type {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        ...InputValue
      }
      interfaces {
        ...TypeRef
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        ...TypeRef
      }
    }

    fragment InputValue on __InputValue {
      name
      description
      type { ...TypeRef }
      defaultValue
    }

    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  // Common GraphQL paths to try if the exact path isn't obvious
  const paths = target.includes('graphql') ? [baseUrl] : [
    baseUrl + '/graphql',
    baseUrl + '/v1/graphql',
    baseUrl + '/api/graphql',
    baseUrl + '/graphql/v1'
  ];

  let success = false;
  let finalResult = '';

  for (const p of paths) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(p, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; GraphQL-Introspector/1.0)'
        },
        body: JSON.stringify({ query: introspectionQuery, operationName: "IntrospectionQuery" }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json.data && json.data.__schema) {
          success = true;
          const schema = json.data.__schema;
          const types = schema.types?.length || 0;
          const queries = schema.types?.find((t: any) => t.name === (schema.queryType?.name || 'Query'))?.fields?.length || 0;
          const mutations = schema.types?.find((t: any) => t.name === (schema.mutationType?.name || 'Mutation'))?.fields?.length || 0;
          
          let potentialVulnMutations: string[] = [];
          if (schema.mutationType && schema.types) {
             const mutationObj = schema.types.find((t: any) => t.name === schema.mutationType.name);
             if (mutationObj && mutationObj.fields) {
               mutationObj.fields.forEach((f: any) => {
                 const name = f.name.toLowerCase();
                 if (name.includes('delete') || name.includes('admin') || name.includes('updateRole') || name.includes('remove') || name.includes('createAccount') || name.includes('user')) {
                     const argsStr = f.args?.map((a: any) => a.name).join(', ') || '';
                     potentialVulnMutations.push(`- ${f.name}(${argsStr})`);
                 }
               });
             }
          }

          finalResult = `[!] Endpoint found at ${p}
[!] Introspection Query SUCCESSFUL

Extracted ${queries} Queries, ${mutations} Mutations, ${types} Types.

`;
          if (potentialVulnMutations.length > 0) {
             finalResult += "Potentially Vulnerable/Sensitive Mutations:\n" + potentialVulnMutations.slice(0, 15).join('\n') + (potentialVulnMutations.length > 15 ? '\n- ...more' : '') + '\n';
          } else {
             finalResult += "No obvious sensitive mutations found through loose matching.\n";
          }
          finalResult += "\n(Schema dumped to memory. Exporting full schema viewer not implemented in preview.)";
          break; // Stop trying other paths
        }
      }
    } catch (e) {}
  }

  if (success) {
    res.json({ result: finalResult });
  } else {
    res.json({ result: 'Tested common GraphQL paths. Introspection query failed or was blocked by the target. Endpoint may not exist, or introspection is disabled.' });
  }
});

  
// --- VITE DEV SERVER OR PROD STATIC ---
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
  console.log(`[PWNNET] Starting server in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode...`);

  if (isProd) {
    const distPath = path.join(process.cwd(), 'dist');
    // Ensure dist exists
    if (!fs.existsSync(distPath)) {
      console.error('[PWNNET] CRITICAL: dist folder not found! Build may have failed.');
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.error('[PWNNET] Vite dev server failed to start:', e);
      // If vite fails (e.g. not installed), we still want the API to work
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PWNNET] Node Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
