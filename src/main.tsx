import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept fetch for Android / html2app environment to point to deployed backend
const originalFetch = window.fetch;
Object.defineProperty(window, 'fetch', {
  value: async function (...args: any[]) {
    let [resource, config] = args;
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      if (window.location.protocol === 'file:' || window.location.hostname.includes('html2app') || window.location.hostname === 'localhost') {
        // Fallback relative backend to the shared preview link
        resource = `https://ais-pre-wyyvit24ko355j5q5txewh-224473533913.us-west1.run.app${resource}`;
      }
    }
    return originalFetch.apply(window, [resource, config] as any);
  },
  configurable: true,
  writable: true
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
