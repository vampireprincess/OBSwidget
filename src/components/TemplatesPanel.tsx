import { useState } from 'react';
import { useApp } from '../store';
import { TEMPLATE_PRESETS, TEMPLATE_CATEGORIES } from '../templates/presets';

export default function TemplatesPanel() {
  const { setFileContent, setActiveLeftTab } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);

  const filteredTemplates = selectedCategory === 'All'
    ? TEMPLATE_PRESETS
    : TEMPLATE_PRESETS.filter(t => t.category === selectedCategory);

  function applyTemplate(templateId: string) {
    const template = TEMPLATE_PRESETS.find(t => t.id === templateId);
    if (!template) return;

    if (confirm(`Apply "${template.name}" template? This will replace your current HTML, CSS, and JS.`)) {
      setFileContent('html', template.html);
      setFileContent('css', template.css);
      setFileContent('js', template.js);
      setActiveLeftTab('html');
    }
  }

  const previewData = previewTemplate ? TEMPLATE_PRESETS.find(t => t.id === previewTemplate) : null;

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <h3 className="text-xs font-semibold text-white">Templates</h3>
        <p className="text-[10px] text-zinc-500">Start with a pre-built widget</p>
      </div>

      {/* Category Filter */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              selectedCategory === 'All'
                ? 'bg-emerald-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          {TEMPLATE_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            className="bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700 hover:border-zinc-600 transition-colors"
          >
            {/* Template Preview */}
            <div className="relative h-24 bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
              <span className="text-4xl">{template.icon}</span>
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setPreviewTemplate(previewTemplate === template.id ? null : template.id)}
                  className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => applyTemplate(template.id)}
                  className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-white">{template.name}</span>
                <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 bg-zinc-700 rounded">
                  {template.category}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">{template.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{previewData.icon}</span>
                <span className="text-sm font-medium text-white">{previewData.name}</span>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              {/* Preview iframe */}
              <div className="h-48 bg-zinc-800 rounded-lg mb-4 overflow-hidden">
                <iframe
                  srcDoc={`<!DOCTYPE html>
<html>
<head>
  <style>${previewData.css}</style>
</head>
<body>
  ${previewData.html}
  <script>
    // Auto-show the alert for preview
    setTimeout(function() {
      var alerts = document.querySelectorAll('[id]');
      alerts.forEach(function(el) {
        el.classList.add('visible');
      });
    }, 500);
  </script>
</body>
</html>`}
                  className="w-full h-full border-0"
                  title="Template Preview"
                />
              </div>

              {/* Code preview */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-1">HTML</h4>
                  <pre className="text-[10px] font-mono text-zinc-300 bg-zinc-800 rounded p-2 max-h-24 overflow-auto">
                    {previewData.html}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-1">CSS</h4>
                  <pre className="text-[10px] font-mono text-zinc-300 bg-zinc-800 rounded p-2 max-h-24 overflow-auto">
                    {previewData.css}
                  </pre>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-zinc-400 mb-1">JS</h4>
                  <pre className="text-[10px] font-mono text-zinc-300 bg-zinc-800 rounded p-2 max-h-24 overflow-auto">
                    {previewData.js}
                  </pre>
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-zinc-700 flex justify-end gap-2">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => { applyTemplate(previewData.id); setPreviewTemplate(null); }}
                className="px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              >
                Apply Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
