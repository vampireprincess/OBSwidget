import { useEffect, useState, useCallback } from 'react';

export interface WidgetError {
  id: string;
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  time: number;
}

/**
 * Listens for WIDGET_ERROR messages relayed from the preview/emulator iframe
 * (via seMock.ts's window.onerror capture) and keeps a rolling list of them.
 */
export function useWidgetErrors(resetKey: unknown) {
  const [errors, setErrors] = useState<WidgetError[]>([]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data._source !== 'se-inspector' || data.type !== 'WIDGET_ERROR') return;
      setErrors(prev => {
        // De-dupe identical messages
        if (prev.some(err => err.message === data.message && err.lineno === data.lineno)) return prev;
        const next: WidgetError = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          message: data.message,
          source: data.source,
          lineno: data.lineno,
          colno: data.colno,
          stack: data.stack,
          time: Date.now(),
        };
        return [...prev, next].slice(-5); // keep last 5
      });
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Clear errors whenever the widget code fully reloads
  useEffect(() => {
    setErrors([]);
  }, [resetKey]);

  const dismiss = useCallback((id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id));
  }, []);

  const dismissAll = useCallback(() => setErrors([]), []);

  return { errors, dismiss, dismissAll };
}
