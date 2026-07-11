import { useRef, useState } from 'react';
import { useApp } from '../store';
import { addElementToHtml, type NewElementType } from '../utils/htmlManipulation';

interface Props {
  onElementAdded: (id: string) => void;
}

const BUTTONS: { type: NewElementType; label: string; icon: string; desc: string }[] = [
  { type: 'text', label: 'Text', icon: '📝', desc: 'Add customizable overlay text' },
  { type: 'rectangle', label: 'Shape', icon: '◻️', desc: 'Add shapes or background containers' },
  { type: 'image', label: 'Image', icon: '🖼️', desc: 'Add images from assets' },
  { type: 'video', label: 'Video', icon: '🎬', desc: 'Add animated MP4/WebM videos' },
  { type: 'lottie', label: 'Lottie', icon: '✨', desc: 'Add highly detailed Lottie animations' },
  { type: 'svg', label: 'SVG', icon: '⚡', desc: 'Add scalable custom vectors' },
];

export default function AddElementToolbar({ onElementAdded }: Props) {
  const { codeFiles, setFileContent, assets } = useApp();
  const [modalOpen, setModalOpen] = useState<NewElementType | null>(null);
  const [svgContentInput, setSvgContentInput] = useState('<svg viewBox="0 0 24 24" fill="#10b981"><circle cx="12" cy="12" r="10"/></svg>');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<NewElementType | null>(null);

  function handleAdd(type: NewElementType) {
    if (type === 'image' || type === 'video' || type === 'lottie' || type === 'svg') {
      setModalOpen(type);
      return;
    }
    const { html, id } = addElementToHtml(codeFiles.html.content, type);
    setFileContent('html', html);
    onElementAdded(id);
  }

  function handleSvgSubmit() {
    const { html, id } = addElementToHtml(codeFiles.html.content, 'svg', { svgContent: svgContentInput });
    setFileContent('html', html);
    onElementAdded(id);
    setModalOpen(null);
  }

  function handleAssetSelect(assetUrl: string) {
    if (!modalOpen) return;
    const { html, id } = addElementToHtml(codeFiles.html.content, modalOpen, { assetUrl });
    setFileContent('html', html);
    onElementAdded(id);
    setModalOpen(null);
  }

  function handleUploadNew() {
    if (!modalOpen) return;
    pendingTypeRef.current = modalOpen;
    fileInputRef.current?.click();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const type = pendingTypeRef.current;
    if (!file || !type) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const { html, id } = addElementToHtml(codeFiles.html.content, type, { assetUrl: dataUrl });
      setFileContent('html', html);
      onElementAdded(id);
      setModalOpen(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const relevantAssets = assets.filter(a => {
    if (modalOpen === 'image') return a.type.startsWith('image/') && !a.name.toLowerCase().endsWith('.json');
    if (modalOpen === 'video') return a.type.startsWith('video/');
    if (modalOpen === 'lottie') return a.name.toLowerCase().endsWith('.json') || a.name.toLowerCase().endsWith('.lottie');
    return false;
  });

  return (
    <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
      <input ref={fileInputRef} type="file" accept="image/*,video/*,.json,.lottie" className="hidden" onChange={handleFileChosen} />
      
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mr-2 select-none border-r border-zinc-800 pr-3">
        Add Element:
      </span>

      {BUTTONS.map(btn => (
        <button
          key={btn.type}
          onClick={() => handleAdd(btn.type)}
          title={btn.desc}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 rounded-lg hover:scale-105 active:scale-95 transition-all"
        >
          <span className="text-sm">{btn.icon}</span>
          <span className="text-[11px] font-bold">{btn.label}</span>
        </button>
      ))}

      {/* Unified Custom Fixed Modal Popup for Asset Picker (Guarantees NO clipping!) */}
      {modalOpen && modalOpen !== 'svg' && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[75vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Select {modalOpen} asset
              </span>
              <button onClick={() => setModalOpen(null)} className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-850 transition-colors">
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <button
                onClick={handleUploadNew}
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md shadow-emerald-600/10 hover:scale-102 active:scale-98"
              >
                Upload New File
              </button>

              {relevantAssets.length > 0 ? (
                <div className="grid grid-cols-3 gap-2.5 pt-2">
                  {relevantAssets.map(asset => (
                    <button
                      key={asset.id}
                      onClick={() => handleAssetSelect(asset.dataUrl)}
                      className="aspect-square bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 hover:border-emerald-500 hover:scale-105 transition-all flex items-center justify-center p-1"
                      title={asset.name}
                    >
                      {asset.type.startsWith('image/') ? (
                        <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-xl">📄</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 space-y-1 select-none">
                  <span className="text-2xl block">📁</span>
                  <p className="text-[11px] font-semibold">No assets found</p>
                  <p className="text-[10px] text-zinc-600">Please upload a file or use the Assets library.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 flex justify-end shrink-0">
              <button
                onClick={() => setModalOpen(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Custom Fixed Modal Popup for SVG Import (Guarantees NO native popup!) */}
      {modalOpen === 'svg' && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Import SVG Vector</h3>
              <button onClick={() => setModalOpen(null)} className="text-zinc-500 hover:text-white text-xs font-bold">
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-400 font-medium">Paste tvoj raw XML SVG markup below:</p>
            <textarea
              value={svgContentInput}
              onChange={e => setSvgContentInput(e.target.value)}
              className="w-full h-44 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-300 font-mono focus:outline-none focus:border-emerald-500 resize-none font-medium"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalOpen(null)}
                className="px-4 py-2 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSvgSubmit}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow"
              >
                Insert SVG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
