import { useState } from 'react';
import { useApp } from '../store';

const ENTRANCE_ANIMS = [
  { id: 'fadeIn', label: 'Fade In', css: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }', apply: 'animation: fadeIn VAR_DURATION ease forwards;' },
  { id: 'fadeInUp', label: 'Fade In Up', css: '@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }', apply: 'animation: fadeInUp VAR_DURATION ease forwards;' },
  { id: 'fadeInDown', label: 'Fade In Down', css: '@keyframes fadeInDown { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }', apply: 'animation: fadeInDown VAR_DURATION ease forwards;' },
  { id: 'fadeInLeft', label: 'Fade In Left', css: '@keyframes fadeInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }', apply: 'animation: fadeInLeft VAR_DURATION ease forwards;' },
  { id: 'fadeInRight', label: 'Fade In Right', css: '@keyframes fadeInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }', apply: 'animation: fadeInRight VAR_DURATION ease forwards;' },
  { id: 'scaleIn', label: 'Scale In', css: '@keyframes scaleIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }', apply: 'animation: scaleIn VAR_DURATION cubic-bezier(0.34,1.56,0.64,1) forwards;' },
  { id: 'bounceIn', label: 'Bounce In', css: '@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 50% { transform: scale(1.05); } 70% { transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }', apply: 'animation: bounceIn VAR_DURATION ease forwards;' },
  { id: 'slideInUp', label: 'Slide In Up', css: '@keyframes slideInUp { from { transform: translateY(100%); } to { transform: translateY(0); } }', apply: 'animation: slideInUp VAR_DURATION ease forwards;' },
  { id: 'slideInDown', label: 'Slide In Down', css: '@keyframes slideInDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }', apply: 'animation: slideInDown VAR_DURATION ease forwards;' },
  { id: 'slideInLeft', label: 'Slide In Left', css: '@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }', apply: 'animation: slideInLeft VAR_DURATION ease forwards;' },
  { id: 'slideInRight', label: 'Slide In Right', css: '@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }', apply: 'animation: slideInRight VAR_DURATION ease forwards;' },
  { id: 'rotateIn', label: 'Rotate In', css: '@keyframes rotateIn { from { opacity: 0; transform: rotate(-200deg); } to { opacity: 1; transform: rotate(0); } }', apply: 'animation: rotateIn VAR_DURATION ease forwards;' },
  { id: 'flipInX', label: 'Flip In X', css: '@keyframes flipInX { from { opacity: 0; transform: perspective(400px) rotateX(90deg); } to { opacity: 1; transform: perspective(400px) rotateX(0); } }', apply: 'animation: flipInX VAR_DURATION ease forwards;' },
  { id: 'flipInY', label: 'Flip In Y', css: '@keyframes flipInY { from { opacity: 0; transform: perspective(400px) rotateY(90deg); } to { opacity: 1; transform: perspective(400px) rotateY(0); } }', apply: 'animation: flipInY VAR_DURATION ease forwards;' },
  { id: 'zoomIn', label: 'Zoom In', css: '@keyframes zoomIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }', apply: 'animation: zoomIn VAR_DURATION ease forwards;' },
];

const EXIT_ANIMS = [
  { id: 'fadeOut', label: 'Fade Out', css: '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }', apply: 'animation: fadeOut VAR_DURATION ease forwards;' },
  { id: 'fadeOutUp', label: 'Fade Out Up', css: '@keyframes fadeOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-30px); } }', apply: 'animation: fadeOutUp VAR_DURATION ease forwards;' },
  { id: 'fadeOutDown', label: 'Fade Out Down', css: '@keyframes fadeOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(30px); } }', apply: 'animation: fadeOutDown VAR_DURATION ease forwards;' },
  { id: 'scaleOut', label: 'Scale Out', css: '@keyframes scaleOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0); } }', apply: 'animation: scaleOut VAR_DURATION ease forwards;' },
  { id: 'slideOutUp', label: 'Slide Out Up', css: '@keyframes slideOutUp { from { transform: translateY(0); } to { transform: translateY(-100%); } }', apply: 'animation: slideOutUp VAR_DURATION ease forwards;' },
  { id: 'slideOutDown', label: 'Slide Out Down', css: '@keyframes slideOutDown { from { transform: translateY(0); } to { transform: translateY(100%); } }', apply: 'animation: slideOutDown VAR_DURATION ease forwards;' },
  { id: 'slideOutLeft', label: 'Slide Out Left', css: '@keyframes slideOutLeft { from { transform: translateX(0); } to { transform: translateX(-100%); } }', apply: 'animation: slideOutLeft VAR_DURATION ease forwards;' },
  { id: 'slideOutRight', label: 'Slide Out Right', css: '@keyframes slideOutRight { from { transform: translateX(0); } to { transform: translateX(100%); } }', apply: 'animation: slideOutRight VAR_DURATION ease forwards;' },
  { id: 'rotateOut', label: 'Rotate Out', css: '@keyframes rotateOut { from { opacity: 1; transform: rotate(0); } to { opacity: 0; transform: rotate(200deg); } }', apply: 'animation: rotateOut VAR_DURATION ease forwards;' },
  { id: 'zoomOut', label: 'Zoom Out', css: '@keyframes zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.5); } }', apply: 'animation: zoomOut VAR_DURATION ease forwards;' },
];

type AnimType = typeof ENTRANCE_ANIMS[number];

export default function AnimationsPanel() {
  const { selectedElement, codeFiles, setFileContent } = useApp();
  const [duration, setDuration] = useState('0.5s');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewAnim, setPreviewAnim] = useState<string | null>(null);
  const [tab, setTab] = useState<'entrance' | 'exit'>('entrance');

  const anims = tab === 'entrance' ? ENTRANCE_ANIMS : EXIT_ANIMS;

  function applyCSSOnly(anim: AnimType) {
    const cssCode = anim.css + '\n' + (selectedElement ? `${selectedElement.selector} { ${anim.apply.replace('VAR_DURATION', duration)} }` : `/* Apply to your element:\n   .your-element { ${anim.apply.replace('VAR_DURATION', duration)} }\n*/`);
    const current = codeFiles.css.content;
    if (!current.includes(anim.css)) {
      setFileContent('css', current + '\n\n/* Animation: ' + anim.label + ' */\n' + cssCode);
    }
  }

  function copyCSS(anim: AnimType) {
    const code = anim.css + '\n.animated { ' + anim.apply.replace('VAR_DURATION', duration) + ' }';
    navigator.clipboard.writeText(code);
    setCopiedId(anim.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function generateJSSnippet(entrance: AnimType | null, exit: AnimType | null): string {
    const lines: string[] = ['// Animation helper – paste into your JS'];
    lines.push(`function showElement(el) {`);
    if (entrance) {
      lines.push(`  el.style.animation = '${entrance.id} ${duration} ease forwards';`);
    } else {
      lines.push(`  el.style.opacity = '1';`);
    }
    lines.push(`}`);
    lines.push('');
    lines.push(`function hideElement(el) {`);
    if (exit) {
      lines.push(`  el.style.animation = '${exit.id} ${duration} ease forwards';`);
    } else {
      lines.push(`  el.style.opacity = '0';`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }

  function previewAnimation(anim: AnimType) {
    setPreviewAnim(anim.id);
    const iframes = document.querySelectorAll('iframe');
    if (selectedElement) {
      iframes.forEach(iframe => {
        iframe.contentWindow?.postMessage({
          _source: 'se-mock',
          type: 'SET_LIVE_STYLE',
          selector: selectedElement.selector,
          styles: { animation: `${anim.id} ${duration} ease forwards` },
        }, '*');
      });
    }
    setTimeout(() => setPreviewAnim(null), 2000);
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <h3 className="text-xs font-semibold text-white">Animations</h3>
        <p className="text-[10px] text-zinc-500">Entrance & exit animations for widget elements</p>
      </div>

      {/* Duration */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-zinc-400">Duration:</label>
          <select value={duration} onChange={e => setDuration(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300 focus:outline-none">
            <option value="0.2s">0.2s</option>
            <option value="0.3s">0.3s</option>
            <option value="0.5s">0.5s</option>
            <option value="0.8s">0.8s</option>
            <option value="1s">1s</option>
            <option value="1.5s">1.5s</option>
            <option value="2s">2s</option>
          </select>
          {selectedElement && <span className="text-[9px] text-zinc-600 truncate">Target: {selectedElement.selector}</span>}
        </div>
      </div>

      {/* Entrance / Exit Tabs */}
      <div className="flex border-b border-zinc-700 shrink-0">
        <button onClick={() => setTab('entrance')} className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === 'entrance' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
          ↘ Entrance
        </button>
        <button onClick={() => setTab('exit')} className={`flex-1 py-1.5 text-xs font-medium transition-colors ${tab === 'exit' ? 'text-red-400 border-b-2 border-red-500 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}>
          ↗ Exit
        </button>
      </div>

      {/* Animation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {anims.map(anim => (
          <div key={anim.id} className={`group flex items-center gap-2 px-2 py-2 rounded-lg border transition-colors ${
            previewAnim === anim.id ? 'border-emerald-500 bg-emerald-900/20' : 'border-zinc-800 hover:border-zinc-600 bg-zinc-800/50 hover:bg-zinc-800'
          }`}>
            <span className="text-xs text-zinc-300 flex-1">{anim.label}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {selectedElement && (
                <button onClick={() => previewAnimation(anim)} title="Preview on selected element" className="p-1 rounded text-zinc-500 hover:text-emerald-400 hover:bg-emerald-900/30">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
              <button onClick={() => applyCSSOnly(anim)} title="Add CSS to widget" className="p-1 rounded text-zinc-500 hover:text-violet-400 hover:bg-violet-900/30">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              </button>
              <button onClick={() => copyCSS(anim)} title="Copy CSS" className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-700">
                {copiedId === anim.id
                  ? <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                }
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Generate JS Snippet */}
      <div className="px-3 py-2 border-t border-zinc-700 shrink-0">
        <button
          onClick={() => {
            const snippet = generateJSSnippet(
              tab === 'entrance' ? anims[0] : null,
              tab === 'exit' ? anims[0] : null
            );
            navigator.clipboard.writeText(snippet);
          }}
          className="w-full py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
        >
          Copy JS animation helper snippet
        </button>
      </div>
    </div>
  );
}
