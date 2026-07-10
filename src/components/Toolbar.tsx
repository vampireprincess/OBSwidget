import { useRef } from 'react';
import { useApp } from '../store';
import { extractZip, createZip, generateCSSOverrides } from '../utils/zipUtils';

export default function Toolbar() {
  const {
    fileName,
    uploadError,
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel,
    refreshPreview,
    setFiles,
    setFileName,
    setActiveLeftTab,
    codeFiles,
    cssOverrides,
    assets,
    folderPath,
    viewMode,
    setViewMode,
    resetFieldOverrides,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await extractZip(file);
      if (result.error) {
        alert('Error: ' + result.error);
        return;
      }
      setFiles(result.codeFiles, result.folderPath);
      setFileName(result.fileName);
      setActiveLeftTab('html');
      resetFieldOverrides();
      // Auto-switch to Emulator so the user immediately sees their widget "as on stream"
      setViewMode('emulator');
    } catch (err) {
      alert('Failed to extract ZIP: ' + (err as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleExport() {
    try {
      const cssOverrideText = generateCSSOverrides(cssOverrides);
      const blob = await createZip(codeFiles, cssOverrideText, assets, folderPath);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}_edited.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export: ' + (err as Error).message);
    }
  }

  return (
    <header className="flex h-12 items-center gap-2 bg-zinc-900 px-3 border-b border-zinc-700 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-white tracking-tight hidden sm:block">
          SE Widget Editor
        </span>
      </div>

      {/* Editor / Emulator Mode Switch */}
      <div className="flex items-center bg-zinc-800 rounded-md p-0.5">
        <button
          onClick={() => setViewMode('editor')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
            viewMode === 'editor' ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Code + visual editor"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Editor
        </button>
        <button
          onClick={() => setViewMode('emulator')}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${
            viewMode === 'emulator' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Preview widget as it appears on stream, with settings & event tester"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Emulator
        </button>
      </div>

      <div className="h-5 w-px bg-zinc-700" />

      {/* Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleUpload}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Upload ZIP
      </button>

      {/* Refresh Preview */}
      <button
        onClick={refreshPreview}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-md transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>

      {/* Toggle Panels — only in editor mode */}
      {viewMode === 'editor' && (
        <>
          <button
            onClick={toggleLeftPanel}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              leftPanelOpen ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Toggle Code Editors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Code</span>
          </button>

          <button
            onClick={toggleRightPanel}
            className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
              rightPanelOpen ? 'bg-zinc-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Toggle Right Panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Tools</span>
          </button>
        </>
      )}

      {/* File Name */}
      <span className="text-xs text-zinc-500 mx-2 truncate max-w-[150px]">
        {fileName}.zip
      </span>

      {/* Upload Error */}
      {uploadError && (
        <span className="text-xs text-red-400 truncate max-w-[200px]">
          {uploadError}
        </span>
      )}

      <div className="flex-1" />

      {/* Export */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export ZIP
      </button>
    </header>
  );
}
