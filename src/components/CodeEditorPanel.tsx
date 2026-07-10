import Editor from '@monaco-editor/react';
import { useApp } from '../store';
import type { LeftTab } from '../types';

const TABS: { key: LeftTab; label: string; icon: string }[] = [
  { key: 'html', label: 'HTML', icon: '< >' },
  { key: 'css', label: 'CSS', icon: '#' },
  { key: 'js', label: 'JS', icon: '{ }' },
  { key: 'fields', label: 'Fields', icon: '{}' },
  { key: 'data', label: 'Data', icon: '[]' },
];

const LANG_MAP: Record<LeftTab, string> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  fields: 'json',
  data: 'json',
};

export default function CodeEditorPanel() {
  const {
    codeFiles,
    activeLeftTab,
    setFileContent,
    setActiveLeftTab,
  } = useApp();

  const currentFile = codeFiles[activeLeftTab];
  const isJson = activeLeftTab === 'fields' || activeLeftTab === 'data';

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Tabs */}
      <div className="flex border-b border-zinc-700 px-1 shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveLeftTab(tab.key)}
            className={`relative px-3 py-2 text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeLeftTab === tab.key
                ? 'text-white bg-zinc-800'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center text-[10px] font-mono bg-zinc-700 rounded px-0.5">
              {tab.icon}
            </span>
            {tab.label}
            {activeLeftTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
            {isJson && activeLeftTab === tab.key && currentFile.parseError && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* JSON Error Banner */}
      {isJson && currentFile.parseError && (
        <div className="px-3 py-1.5 bg-red-900/30 border-b border-red-800/50 text-xs text-red-400 flex items-center gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="truncate">{currentFile.parseError}</span>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={LANG_MAP[activeLeftTab]}
          theme="vs-dark"
          value={currentFile.content}
          onChange={(val) => setFileContent(activeLeftTab, val || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            padding: { top: 8, bottom: 8 },
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
              Loading editor...
            </div>
          }
        />
      </div>
    </div>
  );
}
