import { useEffect, useCallback, useState, useMemo } from 'react';
import { useApp } from '../store';
import type { LayerElement } from '../types';
import { removeElementFromHtml, duplicateElementInHtml, getElementIdFromSelector } from '../utils/htmlManipulation';

export default function LayerPanel() {
  const {
    layers, setLayers, updateLayer, selectedElement, setSelectedElement,
    setCssOverrideProperty, codeFiles, setFileContent, setActiveRightPanel,
  } = useApp();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshLayers = useCallback(() => {
    setIsRefreshing(true);
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.contentWindow?.postMessage({ _source: 'se-mock', type: 'GET_LAYERS' }, '*');
    });
    setTimeout(() => setIsRefreshing(false), 400);
  }, []);

  const handleMessage = useCallback((e: MessageEvent) => {
    if (e.data?._source === 'se-inspector' && e.data.type === 'LAYERS_DATA') {
      setLayers(e.data.layers);
    }
  }, [setLayers]);

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    refreshLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sort front-most first for display (like Photoshop/Figma layers panel)
  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => b.zIndex - a.zIndex),
    [layers]
  );

  function handleSelectElement(element: LayerElement) {
    setSelectedElement({
      tag: element.tag,
      id: element.id,
      classes: [],
      selector: element.selector,
      styles: {},
      innerHTML: '',
      elementType: element.elementType,
    });
    setActiveRightPanel('inspector');
  }

  function moveLayer(layer: LayerElement, direction: 'up' | 'down') {
    const idx = sortedLayers.findIndex(l => l.selector === layer.selector);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sortedLayers.length) return;

    const newOrder = [...sortedLayers];
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    const total = newOrder.length;
    newOrder.forEach((l, i) => {
      setCssOverrideProperty(l.selector, 'zIndex', String(total - i));
    });
    setTimeout(refreshLayers, 150);
  }

  function toggleVisible(layer: LayerElement) {
    updateLayer(layer.id, { visible: !layer.visible });
    setCssOverrideProperty(layer.selector, 'display', layer.visible ? 'none' : '');
  }

  function toggleLocked(layer: LayerElement) {
    updateLayer(layer.id, { locked: !layer.locked });
  }

  function handleDeleteLayer(layer: LayerElement) {
    const id = getElementIdFromSelector(layer.selector);
    if (!id) {
      alert('Only elements with an id can be deleted via the layer panel.');
      return;
    }
    setFileContent('html', removeElementFromHtml(codeFiles.html.content, id));
    if (selectedElement?.selector === layer.selector) setSelectedElement(null);
    setTimeout(refreshLayers, 250);
  }

  function handleDuplicateLayer(layer: LayerElement) {
    const id = getElementIdFromSelector(layer.selector);
    if (!id) {
      alert('Only elements with an id can be duplicated via the layer panel.');
      return;
    }
    const { html } = duplicateElementInHtml(codeFiles.html.content, id);
    setFileContent('html', html);
    setTimeout(refreshLayers, 250);
  }

  const iconForTag = (tag: string, elementType?: string): string => {
    if (elementType === 'lottie') return '✨';
    if (elementType === 'video') return '🎬';
    if (elementType === 'text') return 'T';
    if (elementType === 'rectangle') return '▭';
    if (elementType === 'svg') return '◆';
    const icons: Record<string, string> = {
      div: '◻️', span: '📝', p: '¶', h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4',
      img: '🖼️', video: '🎬', svg: '🎨', canvas: '🖼️', button: '🔘',
      input: '📝', a: '🔗', ul: '📋', ol: '📋', li: '•',
    };
    return icons[tag] || '◻️';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white">Layers</h3>
            <p className="text-[10px] text-zinc-500">{layers.length} elements · top = front</p>
          </div>
          <button
            onClick={refreshLayers}
            disabled={isRefreshing}
            className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors disabled:opacity-50"
          >
            {isRefreshing ? '...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto">
        {sortedLayers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 px-4">
            <p className="text-[10px] text-center">No layers found. Add elements to your HTML.</p>
          </div>
        ) : (
          <div className="py-1">
            {sortedLayers.map((layer, idx) => (
              <div
                key={layer.id || idx}
                className={`group flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-zinc-800 transition-colors ${
                  selectedElement?.selector === layer.selector ? 'bg-zinc-800 border-l-2 border-emerald-500' : ''
                }`}
                onClick={() => handleSelectElement(layer)}
              >
                {/* Reorder Controls */}
                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer, 'up'); }}
                    className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                    title="Move forward"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveLayer(layer, 'down'); }}
                    className="p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-white"
                    title="Move backward"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Icon */}
                <span className="text-[10px] text-zinc-500 w-4 text-center shrink-0">{iconForTag(layer.tag, layer.elementType)}</span>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-300 truncate">
                    {layer.name || layer.tag}
                  </div>
                  <div className="text-[10px] text-zinc-600 font-mono truncate">
                    {layer.selector}
                  </div>
                </div>

                {/* Duplicate */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDuplicateLayer(layer); }}
                  className="p-1 rounded text-zinc-600 hover:text-white hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Duplicate"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>

                {/* Delete */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layer); }}
                  className="p-1 rounded text-zinc-600 hover:text-red-400 hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Visibility */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleVisible(layer); }}
                  className={`p-1 rounded transition-colors ${
                    layer.visible ? 'text-emerald-400 hover:bg-emerald-900/30' : 'text-zinc-600 hover:bg-zinc-800'
                  }`}
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {layer.visible ? (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </>
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>

                {/* Lock */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleLocked(layer); }}
                  className={`p-1 rounded transition-colors ${
                    layer.locked ? 'text-yellow-400 hover:bg-yellow-900/30' : 'text-zinc-600 hover:bg-zinc-800'
                  }`}
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {layer.locked ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    )}
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
