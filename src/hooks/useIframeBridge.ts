import { useCallback, useEffect, useRef } from 'react';

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DragReady {
  top: number;
  left: number;
  width: number;
  height: number;
  rect: Rect;
}

export interface SelectedInfo {
  tag: string;
  id: string;
  classes: string[];
  selector: string;
  styles: Record<string, string>;
  rect: Rect;
  elementType: string;
  innerHTML: string;
}

type PendingResolve = (value: any) => void;

/**
 * Provides a request/response bridge to the preview iframe via postMessage,
 * plus subscription helpers for events pushed from the iframe (selection, resize).
 */
export function useIframeBridge(iframeRef: React.RefObject<HTMLIFrameElement | null>) {
  const requestIdRef = useRef(0);
  const pendingRef = useRef<Map<number, PendingResolve>>(new Map());
  const selectionListenersRef = useRef<Set<(info: SelectedInfo) => void>>(new Set());
  const resizeListenersRef = useRef<Set<() => void>>(new Set());

  const send = useCallback((msg: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage({ _source: 'se-mock', ...msg }, '*');
  }, [iframeRef]);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data._source !== 'se-inspector') return;

      if (data.type === 'RECT_DATA' || data.type === 'DRAG_READY') {
        const resolve = pendingRef.current.get(data.requestId);
        if (resolve) {
          resolve(data);
          pendingRef.current.delete(data.requestId);
        }
      }

      if (data.type === 'ELEMENT_SELECTED') {
        selectionListenersRef.current.forEach(fn => fn(data as SelectedInfo));
      }

      if (data.type === 'VIEWPORT_RESIZE') {
        resizeListenersRef.current.forEach(fn => fn());
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getRect = useCallback((selector: string): Promise<Rect | null> => {
    return new Promise((resolve) => {
      const id = ++requestIdRef.current;
      pendingRef.current.set(id, (data) => resolve(data.rect));
      send({ type: 'GET_RECT', selector, requestId: id });
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          resolve(null);
        }
      }, 500);
    });
  }, [send]);

  const beginDrag = useCallback((selector: string): Promise<DragReady | null> => {
    return new Promise((resolve) => {
      const id = ++requestIdRef.current;
      pendingRef.current.set(id, (data) => resolve(data));
      send({ type: 'BEGIN_DRAG', selector, requestId: id });
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id);
          resolve(null);
        }
      }, 500);
    });
  }, [send]);

  const setLiveStyle = useCallback((selector: string, styles: Record<string, string>) => {
    send({ type: 'SET_LIVE_STYLE', selector, styles });
  }, [send]);

  const setEditMode = useCallback((enabled: boolean) => {
    send({ type: 'SET_EDIT_MODE', enabled });
  }, [send]);

  const requestLayers = useCallback(() => {
    send({ type: 'GET_LAYERS' });
  }, [send]);

  const fireEvent = useCallback((eventType: string, eventData: Record<string, unknown>) => {
    send({ type: 'FIRE_EVENT', eventType, eventData });
  }, [send]);

  const scrollIntoView = useCallback((selector: string) => {
    send({ type: 'SCROLL_INTO_VIEW', selector });
  }, [send]);

  const onSelected = useCallback((fn: (info: SelectedInfo) => void) => {
    selectionListenersRef.current.add(fn);
    return () => { selectionListenersRef.current.delete(fn); };
  }, []);

  const onViewportResize = useCallback((fn: () => void) => {
    resizeListenersRef.current.add(fn);
    return () => { resizeListenersRef.current.delete(fn); };
  }, []);

  return {
    getRect,
    beginDrag,
    setLiveStyle,
    setEditMode,
    requestLayers,
    fireEvent,
    scrollIntoView,
    onSelected,
    onViewportResize,
  };
}

export type IframeBridge = ReturnType<typeof useIframeBridge>;
