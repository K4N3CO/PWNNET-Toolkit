import { useState, useEffect } from 'react';

export function useVisualViewport() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handler = () => {
      if (window.visualViewport) {
        // The difference between the layout viewport height and the visual viewport height,
        // plus the visual viewport's offset from the top.
        const layoutHeight = window.innerHeight;
        const visualHeight = window.visualViewport.height;
        const offsetTop = window.visualViewport.offsetTop;
        
        // Normally, layoutHeight might resize (interactive-widget), but if it doesn't,
        // we use this difference to move the element up.
        // Also account for scrolling offset.
        const keyboardHeight = Math.max(0, layoutHeight - visualHeight - offsetTop);
        setOffset(keyboardHeight);
      }
    };

    window.visualViewport.addEventListener('resize', handler);
    window.visualViewport.addEventListener('scroll', handler);
    
    // Initial call
    handler();

    return () => {
      window.visualViewport?.removeEventListener('resize', handler);
      window.visualViewport?.removeEventListener('scroll', handler);
    };
  }, []);

  return offset;
}
