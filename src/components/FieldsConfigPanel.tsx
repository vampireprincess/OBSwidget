import { useMemo, useState, useRef } from 'react';
import { useApp } from '../store';
import { parseFields, groupFields, normalizeFieldType } from '../utils/fieldsParser';
import type { SEField } from '../types';

export default function FieldsConfigPanel() {
  const { codeFiles, fieldValueOverrides, setFieldOverride, resetFieldOverrides, addAsset, setFileContent, openDialog } = useApp();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [newField, setNewField] = useState({
    key: '',
    type: 'colorpicker',
    label: '',
    value: '',
    group: 'Design',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFieldRef = useRef<string | null>(null);

  const fields = useMemo(() => parseFields(codeFiles.fields.content), [codeFiles.fields.content]);
  const grouped = useMemo(() => groupFields(fields), [fields]);

  const allGroupNames = useMemo(() => grouped.map(g => g.group), [grouped]);
  const allCollapsed = allGroupNames.length > 0 && allGroupNames.every(g => collapsedGroups[g]);

  function currentValue(field: SEField): unknown {
    return fieldValueOverrides[field.key] !== undefined ? fieldValueOverrides[field.key] : field.value;
  }

  function toggleGroup(name: string) {
    setCollapsedGroups(s => ({ ...s, [name]: !s[name] }));
  }

  function toggleAll() {
    const next = !allCollapsed;
    const map: Record<string, boolean> = {};
    allGroupNames.forEach(g => { map[g] = next; });
    setCollapsedGroups(map);
  }

  const handleAddField = () => {
    if (!newField.key || !newField.label) {
      openDialog({
        type: 'alert',
        title: 'Missing Information',
        message: 'Please enter both Key and Label for tvoj new field!',
        onConfirm: () => {}
      });
      return;
    }
    try {
      let currentFields: Record<string, any> = {};
      try {
        currentFields = JSON.parse(codeFiles.fields.content || '{}');
      } catch {
        currentFields = {};
      }
      currentFields[newField.key] = {
        type: newField.type,
        label: newField.label,
        value: newField.type === 'checkbox' ? false : newField.type === 'slider' || newField.type === 'number' ? Number(newField.value) || 0 : newField.value,
        group: newField.group || 'Design',
      };
      setFileContent('fields', JSON.stringify(currentFields, null, 2));
      setIsBuilderOpen(false);
      setNewField({ key: '', type: 'colorpicker', label: '', value: '', group: 'Design' });
    } catch (e) {
      openDialog({
        type: 'alert',
        title: 'Error Saving Field',
        message: 'Error adding field: ' + (e as Error).message,
        onConfirm: () => {}
      });
    }
  };

  const handleDeleteField = (key: string) => {
    openDialog({
      type: 'confirm',
      title: 'Delete Setting',
      message: `Are you sure you want to delete tvoj custom setting "${key}"?`,
      onConfirm: () => {
        try {
          let currentFields = JSON.parse(codeFiles.fields.content || '{}');
          delete currentFields[key];
          setFileContent('fields', JSON.stringify(currentFields, null, 2));
        } catch (e) {
          openDialog({
            type: 'alert',
            title: 'Delete Failed',
            message: 'Error deleting field: ' + (e as Error).message,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  function handleFileUpload(field: SEField) {
    pendingFieldRef.current = field.key;
    fileInputRef.current?.click();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const fieldKey = pendingFieldRef.current;
    if (!file || !fieldKey) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addAsset({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        type: file.type,
        dataUrl,
      });
      setFieldOverride(fieldKey, dataUrl);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const ci = "w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none font-medium";

  function renderField(field: SEField) {
    const type = normalizeFieldType(field.type);
    const val = currentValue(field);
    const isOverridden = fieldValueOverrides[field.key] !== undefined;
    if (type === 'hidden') return null;

    let control: React.ReactNode = null;

    switch (type) {
      case 'color': {
        const strVal = typeof val === 'string' ? val : '#000000';
        control = (
          <div className="flex gap-2">
            <input type="color" value={strVal.startsWith('#') ? strVal.substring(0, 7) : '#000000'} onChange={e => setFieldOverride(field.key, e.target.value)} className="w-9 h-8 rounded cursor-pointer bg-transparent border border-zinc-700" />
            <input type="text" value={strVal} onChange={e => setFieldOverride(field.key, e.target.value)} className={`${ci} flex-1 font-mono`} />
          </div>
        );
        break;
      }
      case 'number':
        control = <input type="number" value={typeof val === 'number' ? val : Number(val) || 0} min={field.min} max={field.max} step={field.step} onChange={e => setFieldOverride(field.key, Number(e.target.value))} className={ci} />;
        break;
      case 'slider': {
        const num = typeof val === 'number' ? val : Number(val) || 0;
        control = (
          <div className="flex items-center gap-2">
            <input type="range" value={num} min={field.min ?? 0} max={field.max ?? 100} step={field.step ?? 1} onChange={e => setFieldOverride(field.key, Number(e.target.value))} className="flex-1 accent-emerald-500" />
            <input type="number" value={num} min={field.min} max={field.max} step={field.step} onChange={e => setFieldOverride(field.key, Number(e.target.value))} className={`${ci} w-16`} />
          </div>
        );
        break;
      }
      case 'checkbox':
        control = (
          <button onClick={() => setFieldOverride(field.key, !val)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${val ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
        );
        break;
      case 'dropdown': {
        const opts = field.options;
        const entries: Array<{ label: string; value: string }> = Array.isArray(opts) ? opts : opts ? Object.entries(opts).map(([value, label]) => ({ label, value })) : [];
        control = (
          <select value={String(val ?? '')} onChange={e => setFieldOverride(field.key, e.target.value)} className={ci}>
            {entries.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        );
        break;
      }
      case 'textarea':
        control = <textarea value={String(val ?? '')} onChange={e => setFieldOverride(field.key, e.target.value)} className={`${ci} h-20 font-mono resize-none`} />;
        break;
      case 'image': case 'video': case 'sound': {
        const strUrl = typeof val === 'string' ? val : '';
        control = (
          <div className="space-y-1">
            {type === 'image' && strUrl && <img src={strUrl} alt="" className="w-full max-h-24 object-contain rounded bg-zinc-800/50 border border-zinc-700" />}
            {type === 'video' && strUrl && <video src={strUrl} className="w-full max-h-24 rounded bg-zinc-800/50 border border-zinc-700" controls muted />}
            {type === 'sound' && strUrl && <audio src={strUrl} className="w-full" controls />}
            <div className="flex gap-1">
              <button onClick={() => handleFileUpload(field)} className="flex-1 px-2 py-1.5 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors">Upload {type}</button>
              {strUrl && <button onClick={() => setFieldOverride(field.key, '')} className="px-2 py-1.5 text-[11px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors">Clear</button>}
            </div>
            <input type="text" value={strUrl} onChange={e => setFieldOverride(field.key, e.target.value)} placeholder="Or paste URL" className={`${ci} font-mono text-[10px]`} />
          </div>
        );
        break;
      }
      case 'font':
        control = <input type="text" value={String(val ?? '')} onChange={e => setFieldOverride(field.key, e.target.value)} placeholder="Font name (e.g. Roboto)" className={ci} />;
        break;
      case 'button':
        control = (
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('se-field-button', { detail: { key: field.key } }));
              const iframes = document.querySelectorAll('iframe');
              iframes.forEach(iframe => {
                iframe.contentWindow?.postMessage({
                  _source: 'se-mock',
                  type: 'FIELD_BUTTON_CLICKED',
                  key: field.key
                }, '*');
              });
            }}
            className="w-full px-3 py-1.5 text-xs bg-violet-650 hover:bg-violet-600 text-white rounded transition-colors font-bold"
          >
            {field.label}
          </button>
        );
        break;
      default:
        control = <input type="text" value={String(val ?? '')} onChange={e => setFieldOverride(field.key, e.target.value)} className={ci} />;
    }

    return (
      <div key={field.key} className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
            {field.label}
            {isOverridden && <span className="ml-1 text-[9px] text-emerald-400">●</span>}
            <button
              onClick={() => handleDeleteField(field.key)}
              className="text-red-500 hover:text-red-400 text-[10px] px-1 py-0.5 rounded hover:bg-red-950/40 ml-1 transition-colors"
              title="Delete setting from fields.json"
            >
              🗑
            </button>
          </label>
          <span className="text-[9px] text-zinc-600 font-mono">{field.key}</span>
        </div>
        {control}
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 px-6 text-center space-y-3">
        <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-xs mb-1 font-medium">No fields defined in tvoj widget.</p>
        <p className="text-[10px] text-zinc-600">Add fields.json file to customize settings visually.</p>
        <button
          onClick={() => setIsBuilderOpen(true)}
          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow"
        >
          ➕ Open Fields Builder
        </button>
      </div>
    );
  }

  const hasOverrides = Object.keys(fieldValueOverrides).length > 0;

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      <input ref={fileInputRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileChosen} />

      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-white">Widget Settings</h3>
          <div className="flex items-center gap-1">
            <button onClick={toggleAll} className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-zinc-750 text-zinc-400 rounded transition-colors">
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
            {hasOverrides && (
              <button onClick={resetFieldOverrides} className="px-2 py-0.5 text-[10px] bg-zinc-800 hover:bg-red-950/50 text-zinc-400 hover:text-red-400 rounded transition-colors">
                Reset
              </button>
            )}
            <button
              onClick={() => setIsBuilderOpen(o => !o)}
              className="px-2 py-0.5 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors font-bold"
              title="Add field visually to fields.json"
            >
              {isBuilderOpen ? '✕ Close' : '➕ Add Field'}
            </button>
          </div>
        </div>
        <p className="text-[10px] text-zinc-500">{fields.length} settings fields · changes apply live</p>
      </div>

      {isBuilderOpen && (
        <div className="p-3 bg-zinc-850 border-b border-zinc-700 space-y-2.5 shrink-0">
          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Add Custom Field Setting</h4>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Key (e.g. bubbleColor)</label>
              <input
                type="text"
                value={newField.key}
                onChange={e => setNewField({ ...newField, key: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                placeholder="bubbleColor"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Control Type</label>
              <select
                value={newField.type}
                onChange={e => setNewField({ ...newField, type: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="colorpicker">Color Picker</option>
                <option value="slider">Slider (Range)</option>
                <option value="checkbox">Checkbox (Yes/No)</option>
                <option value="text">Text Input</option>
                <option value="textarea">Text Area</option>
                <option value="number">Number Input</option>
                <option value="dropdown">Dropdown Select</option>
                <option value="googlefont">Google Font Selector</option>
                <option value="image">Image Input</option>
                <option value="video">Video Input</option>
                <option value="sound">Audio Input</option>
                <option value="button">Action Button</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Label (Display Name)</label>
              <input
                type="text"
                value={newField.label}
                onChange={e => setNewField({ ...newField, label: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                placeholder="Bubble Background Color"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-400 block mb-0.5">Group</label>
              <input
                type="text"
                value={newField.group}
                onChange={e => setNewField({ ...newField, group: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                placeholder="Appearance"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] text-zinc-400 block mb-0.5">Default Value</label>
            <input
              type="text"
              value={newField.value}
              onChange={e => setNewField({ ...newField, value: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
              placeholder="#ff0000 or 14 or true"
            />
          </div>

          <button
            onClick={handleAddField}
            className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow"
          >
            Save Setting to fields.json
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {grouped.map(({ group, fields: gFields }) => {
          const collapsed = collapsedGroups[group];
          return (
            <div key={group} className="border-b border-zinc-800 last:border-b-0">
              <button onClick={() => toggleGroup(group)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-800/50 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">{group}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-600">{gFields.length}</span>
                  <svg className={`w-3 h-3 text-zinc-500 transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {!collapsed && (
                <div className="px-3 pb-3 space-y-3">
                  {gFields.map(f => renderField(f))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
