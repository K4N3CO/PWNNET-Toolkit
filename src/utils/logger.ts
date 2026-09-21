export interface LogEntry {
  id: string;
  time: string;
  module: string;
  event: string;
  target: string;
  status: 'OK' | 'WARN' | 'FAIL' | 'SYSTEM';
  details: string;
}

type LogListener = (logs: LogEntry[]) => void;

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  
  constructor() {
    try {
      const stored = localStorage.getItem('pwnnet_logs');
      if (stored) {
        const parsedLogs: LogEntry[] = JSON.parse(stored);
        
        const seenIds = new Set<string>();
        this.logs = parsedLogs.filter(log => {
          if (seenIds.has(log.id)) {
            log.id = `LOG-${Math.random().toString(36).substring(2, 9)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
          }
          seenIds.add(log.id);
          return true;
        });
      }
    } catch (e) {
      console.error('Failed to load logs', e);
    }
  }

  getLogs() {
    return this.logs;
  }

  addLog(entry: Omit<LogEntry, 'id' | 'time'>) {
    const newLog: LogEntry = {
      ...entry,
      id: `LOG-${Math.random().toString(36).substring(2, 9)}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      time: new Date().toISOString().replace('T', ' ').substring(11, 19) + ' UTC',
    };
    // Prepend to array
    this.logs = [newLog, ...this.logs].slice(0, 500); // keep max 500 logs
    this.save();
    this.notify();
  }

  clearLogs() {
    this.logs = [];
    this.save();
    this.notify();
  }

  private save() {
    try {
      localStorage.setItem('pwnnet_logs', JSON.stringify(this.logs));
    } catch (e) {
      console.error('Failed to save logs', e);
    }
  }

  subscribe(listener: LogListener) {
    this.listeners.add(listener);
    listener(this.logs);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.logs);
    }
  }
}

export const logService = new Logger();
