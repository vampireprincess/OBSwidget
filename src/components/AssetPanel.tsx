import { useRef, useState, useCallback, useMemo } from 'react';
import { useApp } from '../store';
import type { Asset } from '../types';
import { addElementToHtml } from '../utils/htmlManipulation';
import { scanCodeForAssets } from '../utils/assetScanner';

function isLottie(a: Asset): boolean { return a.name.toLowerCase().endsWith('.json') || a.name.toLowerCase().endsWith('.lottie'); }
function isVideo(a: Asset): boolean { return a.type.startsWith('video/') || a.name.toLowerCase().endsWith('.webm'); }
function isImage(a: Asset): boolean { return a.type.startsWith('image/'); }

function badge(a: Asset): string | null {
  if (isLottie(a)) return 'LOTTIE';
  if (isVideo(a)) return 'VIDEO';
  if (a.name.toLowerCase().endsWith('.svg')) return 'SVG';
  if (a.name.toLowerCase().endsWith('.gif')) return 'GIF';
  return null;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  });
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/** Downloads a remote (cross-origin) asset by fetching it as a blob, falling
 * back to simply opening it in a new tab if the fetch is blocked by CORS. */
async function downloadRemote(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

const TYPE_ICON: Record<string, string> = {
  image: '🖼️',
  video: '🎬',
  audio: '🔊',
  lottie: '✨',
  font: '🔤',
  unknown: '🔗',
};

const SOURCE_LABEL: Record<string, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JS',
  fields: 'FIELDS',
  data: 'DATA',
};

export default function AssetPanel() {
  const {
    assets, addAsset, removeAsset, selectedElement, setCssOverrideProperty,
    codeFiles, setFileContent, setSelectedElement, setActiveRightPanel,
  } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const replaceTargetRef = useRef<string | null>(null);

  // Scan ALL uploaded code files (HTML, CSS, JS, FIELDS, DATA) for referenced media URLs,
  // with special priority given to StreamElements CDN uploads.
  const detected = useMemo(() => scanCodeForAssets(codeFiles), [codeFiles]);

  const streamElementsAssets = useMemo(
    () => detected.filter(d => d.url.toLowerCase().includes('cdn.streamelements.com/uploads/')),
    [detected]
  );
  const otherDetectedAssets = useMemo(
    () => detected.filter(d => !d.url.toLowerCase().includes('cdn.streamelements.com/uploads/')),
    [detected]
  );

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        addAsset({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: file.type,
          dataUrl: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addAsset]);

  function handleReplace(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = replaceTargetRef.current;
    if (!file || !targetId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const oldAsset = assets.find(a => a.id === targetId);
      if (oldAsset) {
        removeAsset(targetId);
        addAsset({ id: targetId, name: file.name, type: file.type, dataUrl: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    replaceTargetRef.current = null;
  }

  function handleCopyUrl(text: string, id: string) {
    copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleOpenInBrowser(asset: Asset) {
    const w = window.open();
    if (w) {
      if (asset.dataUrl.startsWith('data:image') || asset.dataUrl.startsWith('data:video')) {
        w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh">${
          asset.dataUrl.startsWith('data:video')
            ? `<video src="${asset.dataUrl}" controls autoplay style="max-width:100%;max-height:100vh"/>`
            : `<img src="${asset.dataUrl}" style="max-width:100%;max-height:100vh"/>`
        }</body></html>`);
      } else {
        w.document.write(`<pre style="background:#111;color:#eee;padding:20px;font-size:12px;white-space:pre-wrap">${asset.dataUrl.substring(0, 5000)}</pre>`);
      }
    }
  }

  function setBackground(asset: Asset) {
    if (!selectedElement) {
      alert('Click an element in the preview first to set a background image.');
      return;
    }
    setCssOverrideProperty(selectedElement.selector, 'backgroundImage', `url("${asset.dataUrl}")`);
    setCssOverrideProperty(selectedElement.selector, 'backgroundSize', 'cover');
    setCssOverrideProperty(selectedElement.selector, 'backgroundPosition', 'center');
  }

  function setBackgroundFromUrl(url: string) {
    if (!selectedElement) {
      alert('Click an element in the preview first to set a background image.');
      return;
    }
    setCssOverrideProperty(selectedElement.selector, 'backgroundImage', `url("${url}")`);
    setCssOverrideProperty(selectedElement.selector, 'backgroundSize', 'cover');
    setCssOverrideProperty(selectedElement.selector, 'backgroundPosition', 'center');
  }

  function insertAsElement(asset: Asset) {
    const type = isLottie(asset) ? 'lottie' : isVideo(asset) ? 'video' : 'image';
    const { html, id } = addElementToHtml(codeFiles.html.content, type, { assetUrl: asset.dataUrl });
    setFileContent('html', html);
    setTimeout(() => {
      setSelectedElement({ tag: '', id, classes: [], selector: `#${id}`, styles: {}, innerHTML: '' });
      setActiveRightPanel('inspector');
    }, 250);
  }

  function insertUrlAsElement(url: string, assetType: string) {
    const type = assetType === 'lottie' ? 'lottie' : assetType === 'video' ? 'video' : 'image';
    const { html, id } = addElementToHtml(codeFiles.html.content, type, { assetUrl: url });
    setFileContent('html', html);
    setTimeout(() => {
      setSelectedElement({ tag: '', id, classes: [], selector: `#${id}`, styles: {}, innerHTML: '' });
      setActiveRightPanel('inspector');
    }, 250);
  }

  function startReplace(assetId: string) {
    replaceTargetRef.current = assetId;
    replaceInputRef.current?.click();
  }

  function renderDetectedRow(d: (typeof detected)[number], idx: number, prefix: string) {
    const rowId = `${prefix}-${idx}`;
    const isImg = d.type === 'image';
    return (
      <div key={rowId} className="flex items-center gap-2 bg-zinc-800/60 rounded p-1.5 border border-zinc-800 group hover:border-zinc-600 transition-colors">
        <div className="w-9 h-9 rounded bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {isImg ? (
            <img src={d.url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span className="text-sm">{TYPE_ICON[d.type]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-[10px] text-zinc-300 truncate">{d.filename}</p>
            <span className="px-1 py-0 text-[8px] font-bold bg-zinc-700 text-zinc-300 rounded shrink-0">{SOURCE_LABEL[d.source]}</span>
          </div>
          <p className="text-[9px] text-zinc-600 font-mono truncate">{d.url}</p>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => handleCopyUrl(d.url, rowId)} title="Copy URL" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700">
            {copiedId === rowId
              ? <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            }
          </button>
          <a href={d.url} target="_blank" rel="noopener noreferrer" title="Open in browser" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <button onClick={() => downloadRemote(d.url, d.filename)} title="Download" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
          {(d.type === 'image' || d.type === 'lottie' || d.type === 'video') && (
            <button onClick={() => insertUrlAsElement(d.url, d.type)} title="Insert as element" className="p-1 rounded text-zinc-500 hover:text-violet-400 hover:bg-violet-900/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
          {d.type === 'image' && (
            <button onClick={() => setBackgroundFromUrl(d.url)} title="Set as background of selected element" className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-900/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <input ref={fileInputRef} type="file" accept="image/*,.gif,.webp,video/*,.webm,.svg,.json,.lottie" multiple className="hidden" onChange={handleUpload} />
      <input ref={replaceInputRef} type="file" accept="image/*,.gif,.webp,video/*,.webm,.svg,.json,.lottie" className="hidden" onChange={handleReplace} />

      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <h3 className="text-xs font-semibold text-white mb-0.5">Assets</h3>
        <p className="text-[10px] text-zinc-500">{assets.length} uploaded · {detected.length} found in code</p>
      </div>

      {/* Upload Button */}
      <div className="p-3 shrink-0">
        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-600 hover:border-zinc-500 rounded-lg transition-colors">
          <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          <span className="text-xs text-zinc-400">Upload images, video, SVG, Lottie...</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {/* StreamElements CDN assets — highest priority per user request */}
        {streamElementsAssets.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              StreamElements CDN Uploads ({streamElementsAssets.length})
            </p>
            <div className="space-y-1">
              {streamElementsAssets.map((d, i) => renderDetectedRow(d, i, 'se-cdn'))}
            </div>
          </div>
        )}

        {/* Uploaded Assets (local file uploads, kept in-app for export) */}
        {assets.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Uploaded Assets</p>
            <div className="space-y-1.5">
              {assets.map(asset => {
                const b = badge(asset);
                return (
                  <div
                    key={asset.id}
                    className="relative group flex items-center gap-2 bg-zinc-800 rounded-lg p-2 border border-zinc-700 hover:border-zinc-500 transition-colors"
                    onMouseEnter={() => setHoveredId(asset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <div className="w-12 h-12 rounded bg-zinc-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-700">
                      {isImage(asset) ? (
                        <img src={asset.dataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{isLottie(asset) ? '✨' : isVideo(asset) ? '🎬' : '📄'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-xs text-zinc-200 truncate">{asset.name}</span>
                        {b && <span className="px-1 py-0 text-[8px] font-bold bg-emerald-700/80 text-white rounded">{b}</span>}
                      </div>
                      <div className="text-[10px] text-zinc-600 font-mono truncate">
                        {asset.dataUrl.startsWith('data:') ? `data:${asset.type}` : asset.dataUrl.substring(0, 60)}
                      </div>
                    </div>
                    <div className={`flex items-center gap-0.5 transition-opacity ${hoveredId === asset.id ? 'opacity-100' : 'opacity-0'}`}>
                      <button onClick={() => handleCopyUrl(asset.dataUrl, asset.id)} title="Copy data URL" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors">
                        {copiedId === asset.id
                          ? <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                        }
                      </button>
                      <button onClick={() => handleOpenInBrowser(asset)} title="Open in new tab" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </button>
                      <button onClick={() => downloadDataUrl(asset.dataUrl, asset.name)} title="Download" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      <button onClick={() => startReplace(asset.id)} title="Replace with different file" className="p-1 rounded text-zinc-500 hover:text-yellow-400 hover:bg-yellow-900/30 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                      <button onClick={() => insertAsElement(asset)} title="Insert as element in widget" className="p-1 rounded text-zinc-500 hover:text-violet-400 hover:bg-violet-900/30 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                      </button>
                      {!isVideo(asset) && !isLottie(asset) && (
                        <button onClick={() => setBackground(asset)} title="Set as background of selected element" className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-900/30 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" /></svg>
                        </button>
                      )}
                      <button onClick={() => removeAsset(asset.id)} title="Delete" className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-900/30 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other detected assets (non-SE CDN URLs referenced in code) */}
        {otherDetectedAssets.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Other Detected URLs</p>
            <div className="space-y-1">
              {otherDetectedAssets.map((d, i) => renderDetectedRow(d, i, 'other'))}
            </div>
          </div>
        )}

        {assets.length === 0 && detected.length === 0 && (
          <p className="text-[10px] text-zinc-600 text-center py-8">No assets found. Upload files or reference images/video URLs in your widget code.</p>
        )}
      </div>
    </div>
  );
}
