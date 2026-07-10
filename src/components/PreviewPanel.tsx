import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import lottieSrc from 'lottie-web/build/player/lottie.min.js?raw';
import { useApp } from '../store';
import { getSEMockScript } from '../utils/seMock';
import { generateCSSOverrides } from '../utils/zipUtils';
import { useIframeBridge } from '../hooks/useIframeBridge';
import VisualOverlay from './VisualOverlay';
import AddElementToolbar from './AddElementToolbar';
import WidgetErrorBanner from './WidgetErrorBanner';
import { useWidgetErrors } from '../hooks/useWidgetErrors';
import { removeElementFromHtml, duplicateElementInHtml, getElementIdFromSelector } from '../utils/htmlManipulation';

type StageBg = 'checker' | 'dark' | 'light' | 'green' | 'custom';

const STAGE_BG_STYLES: Record<StageBg, React.CSSProperties> = {
  checker: {
    backgroundImage:
      'linear-gradient(45deg, #3f3f46 25%, transparent 25%), linear-gradient(-45deg, #3f3f46 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #3f3f46 75%), linear-gradient(-45deg, transparent 75%, #3f3f46 75%)',
    backgroundSize: '20px 20px',
    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
    backgroundColor: '#18181b',
  },
  dark: { backgroundColor: '#09090b' },
  light: { backgroundColor: '#e4e4e7' },
  green: { backgroundColor: '#00b140' },
  custom: {},
};

const PANEL_TABS = [
  { key: 'inspector' as const, label: 'Inspector' },
  { key: 'events' as const, label: 'Events' },
  { key: 'assets' as const, label: 'Assets' },
  { key: 'layers' as const, label: 'Layers' },
  { key: 'animations' as const, label: 'Animations' },
  { key: 'variables' as const, label: 'Variables' },
  { key: 'templates' as const, label: 'Templates' },
];

export default function PreviewPanel() {
  const {
    codeFiles,
    cssOverrides,
    previewKey,
    activeRightPanel,
    setActiveRightPanel,
    setFileContent,
    setSelectedElement,
    selectedElement,
  } = useApp();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const bridge = useIframeBridge(iframeRef);
  const [editMode, setEditMode] = useState(true);
  const [stageBg, setStageBg] = useState<StageBg>('checker');
  const [customStageBg, setCustomStageBg] = useState('#18181b');
  const [bgPickerOpen, setBgPickerOpen] = useState(false);

  // Snapshot of the override CSS at the time of the last full reload.
  // Subsequent cssOverrides changes are patched live (see effect below)
  // instead of forcing a full iframe reload, which would reset widget JS state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const srcDoc = useMemo(() => {
    const overrideCSS = generateCSSOverrides(cssOverrides);
    const seMockScript = getSEMockScript(codeFiles.fields.content, codeFiles.data.content, lottieSrc);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"><\/script>
  <style>
    ${codeFiles.css.content}
  </style>
  <style id="overrides">
    ${overrideCSS}
  </style>
</head>
<body style="margin:0;">
  ${codeFiles.html.content}
  ${seMockScript}
  <script>
    try {
      ${codeFiles.js.content}
    } catch(e) {
      console.error('[Widget JS Error]', e);
      if (window._seReportError) window._seReportError(e.message, '', 0, 0, e.stack);
    }
  </script>
</body>
</html>`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFiles.html.content, codeFiles.css.content, codeFiles.js.content, codeFiles.fields.content, codeFiles.data.content, previewKey]);

  const { errors, dismiss, dismissAll } = useWidgetErrors(srcDoc);

  // Live-patch the override stylesheet without reloading the iframe
  // (keeps widget JS state intact while dragging/resizing/inspecting).
  const isFirstOverrideRun = useRef(true);
  useEffect(() => {
    if (isFirstOverrideRun.current) {
      isFirstOverrideRun.current = false;
      return;
    }
    const css = generateCSSOverrides(cssOverrides);
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ _source: 'se-mock', type: 'UPDATE_OVERRIDE_CSS', css }, '*');
    }, 0);
    return () => clearTimeout(t);
  }, [cssOverrides]);

  // Reset the "first run" flag whenever a full reload happens
  useEffect(() => {
    isFirstOverrideRun.current = true;
  }, [srcDoc]);

  // Sync edit mode into iframe whenever it changes or preview reloads
  useEffect(() => {
    const t = setTimeout(() => bridge.setEditMode(editMode), 100);
    return () => clearTimeout(t);
  }, [editMode, previewKey, bridge]);

  // Listen for element selection from iframe
  useEffect(() => {
    return bridge.onSelected((info) => {
      setSelectedElement({
        tag: info.tag,
        id: info.id,
        classes: info.classes,
        selector: info.selector,
        styles: info.styles,
        innerHTML: info.innerHTML,
        rect: info.rect,
        elementType: info.elementType,
      });
      setActiveRightPanel('inspector');
    });
  }, [bridge, setSelectedElement, setActiveRightPanel]);

  const handleElementAdded = useCallback((id: string) => {
    // Wait for the iframe to reload with the new element, then select it
    setTimeout(() => {
      bridge.getRect(`#${id}`).then(rect => {
        if (rect) {
          setSelectedElement({
            tag: '',
            id,
            classes: [],
            selector: `#${id}`,
            styles: {},
            innerHTML: '',
            rect,
          });
          setActiveRightPanel('inspector');
        }
      });
    }, 200);
  }, [bridge, setSelectedElement, setActiveRightPanel]);

  function handleDelete(selector: string) {
    const id = getElementIdFromSelector(selector);
    if (!id) {
      alert('Only elements with an id can be deleted via the visual editor. Edit HTML directly for others.');
      return;
    }
    setFileContent('html', removeElementFromHtml(codeFiles.html.content, id));
  }

  function handleDuplicate(selector: string) {
    const id = getElementIdFromSelector(selector);
    if (!id) {
      alert('Only elements with an id can be duplicated via the visual editor. Edit HTML directly for others.');
      return;
    }
    const { html, newId } = duplicateElementInHtml(codeFiles.html.content, id);
    setFileContent('html', html);
    if (newId) handleElementAdded(newId);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-800">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs text-zinc-400 font-medium">Preview</span>

          {/* Stage background color picker */}
          <div className="relative">
            <button
              onClick={() => setBgPickerOpen(v => !v)}
              className="flex items-center gap-1 px-1.5 py-1 rounded hover:bg-zinc-700 transition-colors"
              title="Change preview background color"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-zinc-600"
                style={
                  stageBg === 'custom'
                    ? { backgroundColor: customStageBg }
                    : stageBg === 'checker'
                      ? { background: 'repeating-conic-gradient(#71717a 0% 25%, #3f3f46 0% 50%) 50% / 8px 8px' }
                      : STAGE_BG_STYLES[stageBg]
                }
              />
              <svg className="w-2.5 h-2.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {bgPickerOpen && (
              <>
              <div className="fixed inset-0 z-40" onClick={() => setBgPickerOpen(false)} />
              <div className="absolute top-full left-0 mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-2 w-44">
                <p className="text-[9px] text-zinc-500 uppercase tracking-wide mb-1.5 px-0.5">Stage Background</p>
                <div className="space-y-0.5">
                  {(['checker', 'dark', 'light', 'green'] as const).map(bg => (
                    <button
                      key={bg}
                      onClick={() => { setStageBg(bg); setBgPickerOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${
                        stageBg === bg ? 'bg-emerald-900/40 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0"
                        style={bg === 'checker' ? { background: 'repeating-conic-gradient(#71717a 0% 25%, #3f3f46 0% 50%) 50% / 8px 8px' } : STAGE_BG_STYLES[bg]}
                      />
                      <span className="capitalize">{bg === 'green' ? 'Chroma Green' : bg}</span>
                    </button>
                  ))}
                  <div className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors ${
                    stageBg === 'custom' ? 'bg-emerald-900/40 text-emerald-300' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}>
                    <input
                      type="color"
                      value={customStageBg}
                      onChange={(e) => { setCustomStageBg(e.target.value); setStageBg('custom'); }}
                      className="w-3.5 h-3.5 rounded-full cursor-pointer bg-transparent border border-zinc-600 shrink-0 p-0"
                    />
                    <span>Custom color</span>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>

          <button
            onClick={() => setEditMode(v => !v)}
            className={`ml-2 flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              editMode ? 'bg-emerald-600 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
            }`}
            title="Toggle visual edit mode (click & drag elements)"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828 9 14.586 9.414 11z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16" />
            </svg>
            {editMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {PANEL_TABS.map(panel => (
            <button
              key={panel.key}
              onClick={() => setActiveRightPanel(panel.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeRightPanel === panel.key
                  ? 'bg-zinc-600 text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Element Toolbar */}
      {editMode && (
        <div className="flex justify-center py-2 border-b border-zinc-700 shrink-0 bg-zinc-900/50">
          <AddElementToolbar onElementAdded={handleElementAdded} />
        </div>
      )}

      {/* iframe stage */}
      <div
        className="flex-1 overflow-hidden relative"
        style={stageBg === 'custom' ? { backgroundColor: customStageBg } : STAGE_BG_STYLES[stageBg]}
      >
        <div className="relative w-full h-full">
          <iframe
            key={previewKey}
            ref={iframeRef}
            srcDoc={srcDoc}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-modals"
            title="Widget Preview"
          />
          <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
            <VisualOverlay
              bridge={bridge}
              editMode={editMode}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </div>
        </div>
        <WidgetErrorBanner errors={errors} onDismiss={dismiss} onDismissAll={dismissAll} />
      </div>

      {/* Selected element quick info bar */}
      {editMode && selectedElement && (
        <div className="px-3 py-1 border-t border-zinc-700 bg-zinc-900 text-[10px] text-zinc-500 flex items-center justify-between shrink-0">
          <span className="font-mono truncate">{selectedElement.selector}</span>
          <span>Click an element to select · Drag to move · Handles to resize</span>
        </div>
      )}
    </div>
  );
}
