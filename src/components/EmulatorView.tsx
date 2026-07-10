import { useEffect, useMemo, useRef, useState } from 'react';
import lottieSrc from 'lottie-web/build/player/lottie.min.js?raw';
import { useApp } from '../store';
import { getSEMockScript } from '../utils/seMock';
import { generateCSSOverrides } from '../utils/zipUtils';
import { parseFields, buildFieldValues } from '../utils/fieldsParser';
import FieldsConfigPanel from './FieldsConfigPanel';
import EventTester from './EventTester';
import AssetPanel from './AssetPanel';
import WidgetErrorBanner from './WidgetErrorBanner';
import { useWidgetErrors } from '../hooks/useWidgetErrors';

type CanvasSize = { label: string; width: number; height: number };

const CANVAS_PRESETS: CanvasSize[] = [
  { label: '1920 × 1080 (Full HD)', width: 1920, height: 1080 },
  { label: '1280 × 720 (HD)', width: 1280, height: 720 },
  { label: '800 × 600 (Widget)', width: 800, height: 600 },
  { label: '500 × 500 (Square)', width: 500, height: 500 },
  { label: '400 × 300 (Alert)', width: 400, height: 300 },
];

type EmulatorPanel = 'settings' | 'events' | 'assets';

export default function EmulatorView() {
  const {
    codeFiles, cssOverrides, previewKey, fieldValueOverrides, fileName,
  } = useApp();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [canvas, setCanvas] = useState<CanvasSize>(CANVAS_PRESETS[0]);
  const [bgStyle, setBgStyle] = useState<'checker' | 'dark' | 'green' | 'custom'>('checker');
  const [customBg, setCustomBg] = useState('#111827');
  const [panel, setPanel] = useState<EmulatorPanel>('settings');
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);

  // Fit-to-viewport zoom calculation
  useEffect(() => {
    if (!autoFit) return;
    function updateZoom() {
      const el = stageRef.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      const availableW = parent.clientWidth - 48;
      const availableH = parent.clientHeight - 48;
      const scale = Math.min(availableW / canvas.width, availableH / canvas.height, 1);
      setZoom(scale > 0 ? scale : 0.1);
    }
    updateZoom();
    const ro = new ResizeObserver(updateZoom);
    if (stageRef.current?.parentElement) ro.observe(stageRef.current.parentElement);
    window.addEventListener('resize', updateZoom);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateZoom);
    };
  }, [autoFit, canvas]);

  // Build the effective FIELDS JSON, merging defaults + overrides.
  // This is used for LIVE PATCHING (postMessage) after initial load.
  const effectiveFieldsJson = useMemo(() => {
    const fields = parseFields(codeFiles.fields.content);
    const values = buildFieldValues(fields, fieldValueOverrides);
    return JSON.stringify(values);
  }, [codeFiles.fields.content, fieldValueOverrides]);

  // Base fields JSON (defaults only, no live overrides) — baked into the iframe
  // only once per structural reload. Live field edits are pushed via postMessage
  // so tweaking a setting doesn't reset the widget's internal JS state/timers.
  const baseFieldsJson = useMemo(() => {
    const fields = parseFields(codeFiles.fields.content);
    const values = buildFieldValues(fields, {});
    return JSON.stringify(values);
  }, [codeFiles.fields.content]);

  const srcDoc = useMemo(() => {
    const overrideCSS = generateCSSOverrides(cssOverrides);
    const seMockScript = getSEMockScript(baseFieldsJson, codeFiles.data.content, lottieSrc);
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"><\/script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
    ${codeFiles.css.content}
  </style>
  <style id="overrides">
    ${overrideCSS}
  </style>
</head>
<body>
  ${codeFiles.html.content}
  ${seMockScript}
  <script>
    if (window._seEditMode !== undefined) window._seEditMode = false;
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
  }, [codeFiles.html.content, codeFiles.css.content, codeFiles.js.content, codeFiles.data.content, baseFieldsJson, previewKey]);

  // Push the CURRENT effective field values (including overrides) right after
  // every reload, so the widget always reflects the emulator's live settings.
  useEffect(() => {
    const t = setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({
        _source: 'se-mock', type: 'UPDATE_DATA', dataKey: 'fields', dataValue: effectiveFieldsJson,
      }, '*');
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcDoc]);

  const { errors, dismiss, dismissAll } = useWidgetErrors(srcDoc);

  // Live-patch overrides so field changes update without full reload
  useEffect(() => {
    const css = generateCSSOverrides(cssOverrides);
    iframeRef.current?.contentWindow?.postMessage({ _source: 'se-mock', type: 'UPDATE_OVERRIDE_CSS', css }, '*');
  }, [cssOverrides]);

  // Push field value overrides to widget as fields data update (no reload for text changes;
  // heavy changes still trigger reload via effectiveFieldsJson in srcDoc)
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage({
      _source: 'se-mock',
      type: 'UPDATE_DATA',
      dataKey: 'fields',
      dataValue: effectiveFieldsJson,
    }, '*');
  }, [effectiveFieldsJson]);

  const bgStyles: Record<typeof bgStyle, React.CSSProperties> = {
    checker: {
      backgroundImage:
        'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)',
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#18181b',
    },
    dark: { backgroundColor: '#0a0a0a' },
    green: { backgroundColor: '#00b140' },
    custom: { backgroundColor: customBg },
  };

  return (
    <div className="flex h-full bg-zinc-950">
      {/* Left – Stage */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Emulator Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 shrink-0 bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide">Live Emulator</span>
          </div>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Canvas size */}
          <select
            value={canvas.label}
            onChange={e => setCanvas(CANVAS_PRESETS.find(c => c.label === e.target.value)!)}
            className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 focus:border-emerald-500 focus:outline-none"
          >
            {CANVAS_PRESETS.map(c => <option key={c.label}>{c.label}</option>)}
          </select>

          {/* Background style */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-zinc-500 mr-1">BG:</span>
            {(['checker', 'dark', 'green', 'custom'] as const).map(bg => (
              <button
                key={bg}
                onClick={() => setBgStyle(bg)}
                title={bg === 'green' ? 'Chroma-key green' : bg}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  bgStyle === bg ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {bg}
              </button>
            ))}
            {bgStyle === 'custom' && (
              <input
                type="color"
                value={customBg}
                onChange={e => setCustomBg(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border border-zinc-700"
              />
            )}
          </div>

          <div className="flex-1" />

          {/* Zoom controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setAutoFit(false); setZoom(z => Math.max(0.1, z - 0.1)); }}
              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              title="Zoom out"
            >−</button>
            <span className="text-[11px] text-zinc-400 font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => { setAutoFit(false); setZoom(z => Math.min(3, z + 0.1)); }}
              className="w-6 h-6 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              title="Zoom in"
            >+</button>
            <button
              onClick={() => setAutoFit(true)}
              className={`px-2 h-6 text-[10px] rounded transition-colors ${
                autoFit ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
              title="Fit to viewport"
            >Fit</button>
          </div>
        </div>

        {/* Canvas stage */}
        <div
          className="flex-1 overflow-auto flex items-center justify-center p-6 relative"
          style={bgStyles[bgStyle]}
        >
          <div
            ref={stageRef}
            className="relative shadow-2xl"
            style={{
              width: canvas.width,
              height: canvas.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              outline: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <iframe
              key={previewKey}
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-modals"
              title="Widget Emulator"
              style={{ background: 'transparent' }}
            />
          </div>

          <WidgetErrorBanner errors={errors} onDismiss={dismiss} onDismissAll={dismissAll} />
        </div>

        {/* Status bar */}
        <div className="px-3 py-1 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-zinc-500 truncate">
            <span className="text-emerald-500">●</span> {fileName} · {canvas.width}×{canvas.height} · zoom {Math.round(zoom * 100)}%
          </span>
          <span className="text-[10px] text-zinc-600">
            Fields: {Object.keys(fieldValueOverrides).length} overridden
          </span>
        </div>
      </div>

      {/* Right – Settings / Events */}
      <div className="w-80 border-l border-zinc-800 flex flex-col shrink-0">
        <div className="flex border-b border-zinc-800 shrink-0">
          <button
            onClick={() => setPanel('settings')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              panel === 'settings' ? 'bg-zinc-900 text-white border-b-2 border-emerald-500' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚙ Widget Settings
          </button>
          <button
            onClick={() => setPanel('events')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              panel === 'events' ? 'bg-zinc-900 text-white border-b-2 border-emerald-500' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚡ Events
          </button>
          <button
            onClick={() => setPanel('assets')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              panel === 'assets' ? 'bg-zinc-900 text-white border-b-2 border-emerald-500' : 'bg-zinc-950 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🖼 Assets
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {panel === 'settings' && <FieldsConfigPanel />}
          {panel === 'events' && <EventTester />}
          {panel === 'assets' && <AssetPanel />}
        </div>
      </div>
    </div>
  );
}
