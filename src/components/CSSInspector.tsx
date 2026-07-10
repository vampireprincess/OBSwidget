import { useApp } from '../store';
import { generateCSSOverrides } from '../utils/zipUtils';

const CSS_PROPS = [
  { name: 'position', label: 'Position', type: 'select' as const, options: ['static', 'relative', 'absolute', 'fixed', 'sticky'] },
  { name: 'top', label: 'Top', type: 'number' as const, unit: 'px' },
  { name: 'left', label: 'Left', type: 'number' as const, unit: 'px' },
  { name: 'right', label: 'Right', type: 'number' as const, unit: 'px' },
  { name: 'bottom', label: 'Bottom', type: 'number' as const, unit: 'px' },
  { name: 'width', label: 'Width', type: 'text' as const },
  { name: 'height', label: 'Height', type: 'text' as const },
  { name: 'display', label: 'Display', type: 'select' as const, options: ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'] },
  { name: 'flexDirection', label: 'Flex Dir', type: 'select' as const, options: ['row', 'column', 'row-reverse', 'column-reverse'] },
  { name: 'justifyContent', label: 'Justify', type: 'select' as const, options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
  { name: 'alignItems', label: 'Align Items', type: 'select' as const, options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
  { name: 'color', label: 'Color', type: 'color' as const },
  { name: 'backgroundColor', label: 'Background', type: 'color' as const },
  { name: 'backgroundImage', label: 'BG Image', type: 'text' as const },
  { name: 'backgroundSize', label: 'BG Size', type: 'select' as const, options: ['auto', 'cover', 'contain'] },
  { name: 'backgroundPosition', label: 'BG Position', type: 'select' as const, options: ['center', 'top', 'bottom', 'left', 'right'] },
  { name: 'objectFit', label: 'Object Fit', type: 'select' as const, options: ['fill', 'contain', 'cover', 'none', 'scale-down'] },
  { name: 'fontFamily', label: 'Font Family', type: 'text' as const },
  { name: 'fontSize', label: 'Font Size', type: 'number' as const, unit: 'px' },
  { name: 'fontWeight', label: 'Font Weight', type: 'select' as const, options: ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'] },
  { name: 'borderRadius', label: 'Border Radius', type: 'number' as const, unit: 'px' },
  { name: 'opacity', label: 'Opacity', type: 'number' as const, unit: '' },
  { name: 'transform', label: 'Transform', type: 'text' as const },
  { name: 'margin', label: 'Margin', type: 'text' as const },
  { name: 'padding', label: 'Padding', type: 'text' as const },
  { name: 'border', label: 'Border', type: 'text' as const },
  { name: 'textAlign', label: 'Text Align', type: 'select' as const, options: ['left', 'center', 'right', 'justify'] },
  { name: 'lineHeight', label: 'Line Height', type: 'text' as const },
  { name: 'boxShadow', label: 'Box Shadow', type: 'text' as const },
  { name: 'zIndex', label: 'Z-Index', type: 'number' as const, unit: '' },
  { name: 'overflow', label: 'Overflow', type: 'select' as const, options: ['visible', 'hidden', 'auto', 'scroll'] },
];

const SVG_PROPS = [
  { name: 'fill', label: 'Fill', type: 'color' as const },
  { name: 'stroke', label: 'Stroke', type: 'color' as const },
  { name: 'strokeWidth', label: 'Stroke Width', type: 'number' as const, unit: '' },
];

export default function CSSInspector() {
  const {
    selectedElement,
    cssOverrides,
    setCssOverrideProperty,
    updateCssOverride,
    setSelectedElement,
  } = useApp();

  const selector = selectedElement?.selector || '';
  const overrideEntry = cssOverrides.find(o => o.selector === selector);
  const currentValues = overrideEntry?.properties || {};
  const hasOverrides = Object.keys(currentValues).length > 0;

  function handleChange(prop: string, value: string) {
    if (!selectedElement) return;
    setCssOverrideProperty(selectedElement.selector, prop, value);
  }

  function clearProperty(prop: string) {
    if (!selectedElement) return;
    setCssOverrideProperty(selectedElement.selector, prop, '');
  }

  function clearAllOverrides() {
    if (!selectedElement) return;
    const cleared = { ...currentValues };
    Object.keys(cleared).forEach(k => { cleared[k] = ''; });
    updateCssOverride(selectedElement.selector, cleared);
  }

  if (!selectedElement) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 px-4">
        <svg className="w-12 h-12 mb-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <p className="text-xs text-center">Click any element in the preview to inspect its styles</p>
        <p className="text-[10px] text-zinc-600 text-center mt-2">Use the Inspector to edit CSS visually</p>
      </div>
    );
  }

  const generatedCSS = generateCSSOverrides(cssOverrides);
  const SVG_TAGS = ['svg', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'g'];
  const isSvgLike = SVG_TAGS.includes(selectedElement.tag);

  function renderProp(prop: { name: string; label: string; type: 'text' | 'color' | 'number' | 'select'; options?: string[]; unit?: string }) {
    const value = currentValues[prop.name] || '';
    const defaultValue = selectedElement!.styles[prop.name] || '';
    const displayValue = value || defaultValue;
    const hasOverride = value !== '' && value !== defaultValue;

    return (
      <div key={prop.name}>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-zinc-400 uppercase tracking-wide font-medium">{prop.label}</label>
          {hasOverride && (
            <button
              onClick={() => clearProperty(prop.name)}
              className="text-[9px] text-red-400 hover:text-red-300 transition-colors px-1 py-0.5 rounded hover:bg-red-900/30"
              title="Clear override"
            >
              ×
            </button>
          )}
        </div>
        {prop.type === 'select' ? (
          <select
            value={displayValue}
            onChange={e => handleChange(prop.name, e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">(inherited)</option>
            {prop.options?.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        ) : prop.type === 'color' ? (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || (defaultValue.startsWith('rgb') ? '#000000' : defaultValue || '#000000')}
              onChange={e => handleChange(prop.name, e.target.value)}
              className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-700"
            />
            <input
              type="text"
              value={displayValue}
              onChange={e => handleChange(prop.name, e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        ) : prop.type === 'number' ? (
          <div className="flex gap-1">
            <input
              type="number"
              value={displayValue.replace(/[^0-9.]/g, '') || ''}
              onChange={e => handleChange(prop.name, prop.unit ? `${e.target.value}${prop.unit}` : e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
            {prop.unit && <span className="text-[10px] text-zinc-500 self-center">{prop.unit}</span>}
          </div>
        ) : (
          <input
            type="text"
            value={displayValue}
            onChange={e => handleChange(prop.name, e.target.value)}
            className={`w-full border rounded px-2 py-1.5 text-xs font-mono focus:outline-none transition-colors ${
              hasOverride
                ? 'bg-emerald-900/20 border-emerald-700/50 text-emerald-300 focus:border-emerald-500'
                : 'bg-zinc-800 border-zinc-700 text-zinc-200 focus:border-emerald-500'
            }`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Element Info */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-emerald-900/50 text-emerald-400 rounded">
            {selectedElement.tag}
          </span>
          {selectedElement.id && (
            <span className="text-[10px] text-zinc-400 font-mono">#{selectedElement.id}</span>
          )}
          <span className="text-[10px] text-zinc-500 font-mono truncate">
            {selectedElement.classes.map(c => `.${c}`).join(' ')}
          </span>
        </div>
        <div className="text-[10px] text-zinc-500 font-mono truncate bg-zinc-800 rounded px-2 py-1 mb-1">
          {selector}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setSelectedElement(null)}
            className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5"
          >
            Clear selection
          </button>
          {hasOverrides && (
            <button
              onClick={clearAllOverrides}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors px-1.5 py-0.5"
            >
              Clear overrides
            </button>
          )}
        </div>
      </div>

      {/* Generated CSS Preview */}
      {generatedCSS.trim() && (
        <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium mb-1">Override CSS</div>
          <pre className="text-[10px] font-mono text-emerald-400 bg-zinc-800 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
            {generatedCSS}
          </pre>
        </div>
      )}

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isSvgLike && (
          <div className="pb-2 mb-1 border-b border-zinc-800">
            <p className="text-[9px] text-emerald-500 uppercase tracking-wide font-semibold mb-2">SVG Properties</p>
            <div className="space-y-2.5">
              {SVG_PROPS.map(prop => renderProp(prop))}
            </div>
          </div>
        )}
        {CSS_PROPS.map(prop => renderProp(prop))}
      </div>
    </div>
  );
}
