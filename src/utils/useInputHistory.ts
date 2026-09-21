import { useState } from 'react';

export function useInputHistory(initialValue = '') {
  const [value, setValue] = useState(initialValue);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = (valToSave?: string) => {
    const v = valToSave ?? value;
    if (v.trim()) {
      setHistory(prev => [v, ...prev]);
    }
    setHistoryIndex(-1);
  };

  const historyUp = () => {
    if (history.length > 0 && historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setValue(history[nextIndex]);
    }
  };

  const historyDown = () => {
    if (historyIndex > 0) {
      const nextIndex = historyIndex - 1;
      setHistoryIndex(nextIndex);
      setValue(history[nextIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'ArrowUp') {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' && !e.ctrlKey) return;
      e.preventDefault();
      historyUp();
    } else if (e.key === 'ArrowDown') {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' && !e.ctrlKey) return;
      e.preventDefault();
      historyDown();
    }
  };

  return { value, setValue, handleKeyDown, saveToHistory, historyUp, historyDown };
}
