import { useRef, useState } from 'react';
import { useApp } from '../store';
import { addElementToHtml, type NewElementType } from '../utils/htmlManipulation';

interface Props {
  onElementAdded: (id: string) => void;
}

const BUTTONS: { type: NewElementType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: 'T' },
  { type: 'rectangle', label: 'Shape', icon: '▭' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'video', label: 'Video', icon: '🎬' },
  { type: 'lottie', label: 'Lottie', icon: '✨' },
  { type: 'svg', label: 'SVG', icon: '◆' },
];

export default function AddElementToolbar({ onElementAdded }: Props) {
  const { codeFiles, setFileContent, assets } = useApp();
  const [showAssetPicker, setShowAssetPicker] = useState<NewElementType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeRef = useRef<NewElementType | null>(null);

  function handleAdd(type: NewElementType) {
    if (type === 'image' || type === 'video' || type === 'lottie') {
      setShowAssetPicker(type);
      return;
    }
    if (type === 'svg') {
      const svgContent = prompt(
        'Paste SVG markup (or leave default):',
        '<svg viewBox="0 0 24 24" fill="#10b981"><circle cx="12" cy="12" r="10"/></svg>'
      );
      const { html, id } = addElementToHtml(codeFiles.html.content, 'svg', { svgContent: svgContent || undefined });
      setFileContent('html', html);
      onElementAdded(id);
      return;
    }
    const { html, id } = addElementToHtml(codeFiles.html.content, type);
    setFileContent('html', html);
    onElementAdded(id);
  }

  function handleAssetSelect(assetUrl: string) {
    if (!showAssetPicker) return;
    const { html, id } = addElementToHtml(codeFiles.html.content, showAssetPicker, { assetUrl });
    setFileContent('html', html);
    onElementAdded(id);
    setShowAssetPicker(null);
  }

  function handleUploadNew(type: NewElementType) {
    pendingTypeRef.current = type;
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
      setShowAssetPicker(null);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const relevantAssets = assets.filter(a => {
    if (showAssetPicker === 'image') return a.type.startsWith('image/') && !a.name.toLowerCase().endsWith('.json');
    if (showAssetPicker === 'video') return a.type.startsWith('video/');
    if (showAssetPicker === 'lottie') return a.name.toLowerCase().endsWith('.json') || a.name.toLowerCase().endsWith('.lottie');
    return false;
  });

  return (
    <div className="relative flex items-center gap-1 px-2 py-1 bg-zinc-900/95 border border-zinc-700 rounded-lg shadow-lg backdrop-blur-sm">
      <input ref={fileInputRef} type="file" accept="image/*,video/*,.json,.lottie" className="hidden" onChange={handleFileChosen} />
      {BUTTONS.map(btn => (
        <button
          key={btn.type}
          onClick={() => handleAdd(btn.type)}
          title={`Add ${btn.label}`}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
        >
          <span className="text-sm leading-none">{btn.icon}</span>
          <span className="text-[9px]">{btn.label}</span>
        </button>
      ))}

      {/* Asset Picker Dropdown */}
      {showAssetPicker && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-2 z-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">
              Choose {showAssetPicker}
            </span>
            <button onClick={() => setShowAssetPicker(null)} className="text-zinc-500 hover:text-white">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            onClick={() => handleUploadNew(showAssetPicker)}
            className="w-full mb-2 px-2 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
          >
            Upload New File
          </button>

          {relevantAssets.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {relevantAssets.map(asset => (
                <button
                  key={asset.id}
                  onClick={() => handleAssetSelect(asset.dataUrl)}
                  className="aspect-square bg-zinc-800 rounded overflow-hidden border border-zinc-700 hover:border-emerald-500 transition-colors flex items-center justify-center"
                  title={asset.name}
                >
                  {asset.type.startsWith('image/') ? (
                    <img src={asset.dataUrl} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">📄</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-600 text-center py-2">No matching assets uploaded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
