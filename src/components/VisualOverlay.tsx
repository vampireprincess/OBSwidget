import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import type { IframeBridge, Rect } from '../hooks/useIframeBridge';

interface Props {
  bridge: IframeBridge;
  editMode: boolean;
  onDelete: (selector: string) => void;
  onDuplicate: (selector: string) => void;
}

type HandleKey = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const HANDLES: { key: HandleKey; cursor: string; style: React.CSSProperties }[] = [
  { key: 'nw', cursor: 'nwse-resize', style: { top: -5, left: -5 } },
  { key: 'n', cursor: 'ns-resize', style: { top: -5, left: '50%', marginLeft: -5 } },
  { key: 'ne', cursor: 'nesw-resize', style: { top: -5, right: -5 } },
  { key: 'e', cursor: 'ew-resize', style: { top: '50%', right: -5, marginTop: -5 } },
  { key: 'se', cursor: 'nwse-resize', style: { bottom: -5, right: -5 } },
  { key: 's', cursor: 'ns-resize', style: { bottom: -5, left: '50%', marginLeft: -5 } },
  { key: 'sw', cursor: 'nesw-resize', style: { bottom: -5, left: -5 } },
  { key: 'w', cursor: 'ew-resize', style: { top: '50%', left: -5, marginTop: -5 } },
];

const MIN_SIZE = 10;

export default function VisualOverlay({ bridge, editMode, onDelete, onDuplicate }: Props) {
  const { selectedElement, setSelectedElement, setCssOverrideProperty, updateCssOverride, layers } = useApp();
  const isLocked = !!layers.find(l => l.selector === selectedElement?.selector)?.locked;
  const [box, setBox] = useState<Rect | null>(null);
  const dragStateRef = useRef<{
    mode: 'move' | 'resize';
    handle?: HandleKey;
    startX: number;
    startY: number;
    baseTop: number;
    baseLeft: number;
    baseWidth: number;
    baseHeight: number;
  } | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [dimsLabel, setDimsLabel] = useState<string | null>(null);

  // Sync box position from selectedElement.rect whenever selection changes
  useEffect(() => {
    if (selectedElement?.rect) {
      setBox(selectedElement.rect);
    } else {
      setBox(null);
    }
  }, [selectedElement]);

  // Refresh rect on viewport resize
  useEffect(() => {
    return bridge.onViewportResize(() => {
      if (selectedElement) {
        bridge.getRect(selectedElement.selector).then(rect => {
          if (rect) setBox(rect);
        });
      }
    });
  }, [bridge, selectedElement]);

  const commitFinalStyles = useCallback((selector: string, styles: Record<string, string>) => {
    updateCssOverride(selector, styles);
  }, [updateCssOverride]);

  const startInteraction = useCallback(async (
    e: React.MouseEvent,
    mode: 'move' | 'resize',
    handle?: HandleKey
  ) => {
    if (!selectedElement || !editMode || isLocked) return;
    e.preventDefault();
    e.stopPropagation();

    const ready = await bridge.beginDrag(selectedElement.selector);
    if (!ready) return;

    dragStateRef.current = {
      mode,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      baseTop: ready.top,
      baseLeft: ready.left,
      baseWidth: ready.width,
      baseHeight: ready.height,
    };
    setBox(ready.rect);
    setIsInteracting(true);

    function handleMouseMove(ev: MouseEvent) {
      const state = dragStateRef.current;
      if (!state || !selectedElement) return;
      const dx = ev.clientX - state.startX;
      const dy = ev.clientY - state.startY;

      let { baseTop: top, baseLeft: left, baseWidth: width, baseHeight: height } = state;

      if (state.mode === 'move') {
        top = state.baseTop + dy;
        left = state.baseLeft + dx;
      } else if (state.mode === 'resize' && state.handle) {
        const h = state.handle;
        if (h.includes('n')) {
          const newHeight = Math.max(MIN_SIZE, state.baseHeight - dy);
          top = state.baseTop + (state.baseHeight - newHeight);
          height = newHeight;
        }
        if (h.includes('s')) {
          height = Math.max(MIN_SIZE, state.baseHeight + dy);
        }
        if (h.includes('w')) {
          const newWidth = Math.max(MIN_SIZE, state.baseWidth - dx);
          left = state.baseLeft + (state.baseWidth - newWidth);
          width = newWidth;
        }
        if (h.includes('e')) {
          width = Math.max(MIN_SIZE, state.baseWidth + dx);
        }
      }

      const styles: Record<string, string> = {};
      if (state.mode === 'move') {
        styles.top = `${top}px`;
        styles.left = `${left}px`;
      } else {
        styles.top = `${top}px`;
        styles.left = `${left}px`;
        styles.width = `${width}px`;
        styles.height = `${height}px`;
      }

      bridge.setLiveStyle(selectedElement.selector, styles);
      setBox({ top, left, width, height });
      setDimsLabel(`${Math.round(width)} × ${Math.round(height)}`);
    }

    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      setIsInteracting(false);
      setDimsLabel(null);

      const state = dragStateRef.current;
      if (state && selectedElement) {
        // Read final box state via closure trick: use latest setBox value from ref
        setBox(currentBox => {
          if (currentBox) {
            const styles: Record<string, string> = {
              position: 'absolute',
              top: `${Math.round(currentBox.top)}px`,
              left: `${Math.round(currentBox.left)}px`,
            };
            if (state.mode === 'resize') {
              styles.width = `${Math.round(currentBox.width)}px`;
              styles.height = `${Math.round(currentBox.height)}px`;
            }
            commitFinalStyles(selectedElement.selector, styles);
          }
          return currentBox;
        });
      }
      dragStateRef.current = null;
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [bridge, selectedElement, editMode, commitFinalStyles]);

  function handleBringToFront() {
    if (!selectedElement) return;
    setCssOverrideProperty(selectedElement.selector, 'zIndex', '9999');
  }

  function handleSendToBack() {
    if (!selectedElement) return;
    setCssOverrideProperty(selectedElement.selector, 'zIndex', '-1');
  }

  if (!editMode || !selectedElement || !box) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: box.top, left: box.left, width: box.width, height: box.height, zIndex: 999999 }}
    >
      {/* Selection border */}
      <div
        className={`absolute inset-0 border-2 pointer-events-auto ${
          isLocked ? 'border-yellow-500 cursor-not-allowed' : 'border-emerald-500 cursor-move'
        }`}
        onMouseDown={(e) => startInteraction(e, 'move')}
      />

      {isLocked && (
        <div className="absolute -top-7 left-0 px-1.5 py-0.5 bg-yellow-600 text-white text-[10px] rounded font-mono whitespace-nowrap flex items-center gap-1">
          🔒 Locked
        </div>
      )}

      {/* Dimension label */}
      {(isInteracting && dimsLabel) && (
        <div className="absolute -top-7 left-0 px-1.5 py-0.5 bg-emerald-600 text-white text-[10px] rounded font-mono whitespace-nowrap">
          {dimsLabel}
        </div>
      )}

      {/* Resize handles */}
      {!isLocked && HANDLES.map(h => (
        <div
          key={h.key}
          onMouseDown={(e) => startInteraction(e, 'resize', h.key)}
          className="absolute w-2.5 h-2.5 bg-white border-2 border-emerald-500 rounded-sm pointer-events-auto"
          style={{ ...h.style, cursor: h.cursor }}
        />
      ))}

      {/* Floating toolbar */}
      {!isInteracting && (
        <div className="absolute -top-9 right-0 flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-1 py-1 shadow-xl pointer-events-auto">
          <button
            onClick={() => handleBringToFront()}
            title="Bring to front"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
          <button
            onClick={() => handleSendToBack()}
            title="Send to back"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
          <div className="w-px h-4 bg-zinc-700 mx-0.5" />
          <button
            onClick={() => onDuplicate(selectedElement.selector)}
            title="Duplicate"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={() => { onDelete(selectedElement.selector); setSelectedElement(null); }}
            title="Delete"
            className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
