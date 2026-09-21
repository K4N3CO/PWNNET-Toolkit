import { Capacitor } from '@capacitor/core';

export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // 1. Check for manual override first
    const override = localStorage.getItem('pwnnet_backend_url');
    if (override) return override;

    const hostname = window.location.hostname;

    // 2. AI Studio / Preview check
    if (hostname.includes('run.app') || hostname.includes('web-preview')) {
        return ''; 
    }

    // 3. Environment Check
    // If we are on Android or iOS, we MUST use the Render backend.
    if (Capacitor.isNativePlatform()) {
      return 'https://pwnnet-toolkit.onrender.com';
    }

    // ON PC BROWSER: Use local node if on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }

  // Fallback default
  return 'https://pwnnet-toolkit.onrender.com';
};
