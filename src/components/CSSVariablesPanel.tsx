import { useState } from 'react';
import { useApp } from '../store';
import type { CSSVariable } from '../types';

export default function CSSVariablesPanel() {
  const { cssVariables, addCssVariable, updateCssVariable, removeCssVariable } = useApp();
  const [newVar, setNewVar] = useState({ name: '--', value: '', type: 'color' as CSSVariable['type'] });

  function handleAdd() {
    if (!newVar.name || newVar.name === '--') return;
    const name = newVar.name.startsWith('--') ? newVar.name : `--${newVar.name}`;
    addCssVariable({ ...newVar, name });
    setNewVar({ name: '--', value: '', type: 'color' });
  }

  function getGeneratedCSS(): string {
    if (cssVariables.length === 0) return '';
    const vars = cssVariables
      .filter(v => v.value)
      .map(v => `  ${v.name}: ${v.value};`)
      .join('\n');
    return `:root {\n${vars}\n}`;
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(getGeneratedCSS());
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-white">CSS Variables</h3>
            <p className="text-[10px] text-zinc-500">Define reusable variables</p>
          </div>
          {cssVariables.length > 0 && (
            <button
              onClick={copyToClipboard}
              className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded transition-colors"
            >
              Copy CSS
            </button>
          )}
        </div>
      </div>

      {/* Generated CSS Preview */}
      {getGeneratedCSS() && (
        <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
          <pre className="text-[10px] font-mono text-emerald-400 bg-zinc-800 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
            {getGeneratedCSS()}
          </pre>
        </div>
      )}

      {/* Variable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cssVariables.length === 0 ? (
          <p className="text-[10px] text-zinc-600 text-center py-4">
            No variables defined. Add your first CSS variable below.
          </p>
        ) : (
          cssVariables.map((v, idx) => (
            <div key={idx} className="bg-zinc-800 rounded-lg p-2 space-y-2">
              <div className="flex items-center gap-2">
                {v.type === 'color' ? (
                  <input
                    type="color"
                    value={v.value || '#000000'}
                    onChange={(e) => updateCssVariable(idx, { value: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border border-zinc-700"
                  />
                ) : v.type === 'number' ? (
                  <input
                    type="number"
                    value={v.value}
                    onChange={(e) => updateCssVariable(idx, { value: e.target.value })}
                    className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200"
                  />
                ) : (
                  <input
                    type="text"
                    value={v.value}
                    onChange={(e) => updateCssVariable(idx, { value: e.target.value })}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                  />
                )}
                <button
                  onClick={() => removeCssVariable(idx)}
                  className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  title="Remove variable"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => updateCssVariable(idx, { name: e.target.value })}
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 font-mono"
                />
                <select
                  value={v.type}
                  onChange={(e) => updateCssVariable(idx, { type: e.target.value as CSSVariable['type'] })}
                  className="bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-[10px] text-zinc-400"
                >
                  <option value="color">Color</option>
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add New Variable */}
      <div className="border-t border-zinc-700 p-3 shrink-0">
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Add Variable</h4>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newVar.name}
              onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
              placeholder="--variable-name"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
            <select
              value={newVar.type}
              onChange={(e) => setNewVar({ ...newVar, type: e.target.value as CSSVariable['type'] })}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
            >
              <option value="color">Color</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
            </select>
          </div>
          <div className="flex gap-2">
            {newVar.type === 'color' && (
              <input
                type="color"
                value={newVar.value || '#000000'}
                onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border border-zinc-700"
              />
            )}
            <input
              type={newVar.type === 'number' ? 'number' : 'text'}
              value={newVar.value}
              onChange={(e) => setNewVar({ ...newVar, value: e.target.value })}
              placeholder="Default value"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
            />
            <button
              onClick={handleAdd}
              disabled={!newVar.name || newVar.name === '--'}
              className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
