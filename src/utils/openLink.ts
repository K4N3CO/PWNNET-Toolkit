import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const openExternalLink = async (url: string) => {
  if (Capacitor.isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch (e) {
      console.error('Capacitor Browser failed, falling back', e);
    }
  }

  // Fallback for web or if plugin fails
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
