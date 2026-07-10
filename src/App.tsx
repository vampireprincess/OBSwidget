import { AppProvider, useApp } from './store';
import Toolbar from './components/Toolbar';
import CodeEditorPanel from './components/CodeEditorPanel';
import PreviewPanel from './components/PreviewPanel';
import CSSInspector from './components/CSSInspector';
import EventTester from './components/EventTester';
import AssetPanel from './components/AssetPanel';
import LayerPanel from './components/LayerPanel';
import CSSVariablesPanel from './components/CSSVariablesPanel';
import TemplatesPanel from './components/TemplatesPanel';
import AnimationsPanel from './components/AnimationsPanel';
import EmulatorView from './components/EmulatorView';

function AppContent() {
  const { leftPanelOpen, rightPanelOpen, activeRightPanel, viewMode } = useApp();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-900 text-white">
      <Toolbar />

      {viewMode === 'emulator' ? (
        <div className="flex-1 overflow-hidden">
          <EmulatorView />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Code Editors */}
          <div
            className={`flex-shrink-0 transition-all duration-200 border-r border-zinc-700 overflow-hidden ${
              leftPanelOpen ? 'w-[480px]' : 'w-0'
            }`}
          >
            <CodeEditorPanel />
          </div>

          {/* Center - Preview */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <PreviewPanel />
          </div>

          {/* Right Panel - Tools */}
          <div
            className={`flex-shrink-0 transition-all duration-200 border-l border-zinc-700 overflow-hidden ${
              rightPanelOpen ? 'w-[320px]' : 'w-0'
            }`}
          >
            {activeRightPanel === 'inspector' && <CSSInspector />}
            {activeRightPanel === 'events' && <EventTester />}
            {activeRightPanel === 'assets' && <AssetPanel />}
            {activeRightPanel === 'layers' && <LayerPanel />}
            {activeRightPanel === 'variables' && <CSSVariablesPanel />}
            {activeRightPanel === 'templates' && <TemplatesPanel />}
            {activeRightPanel === 'animations' && <AnimationsPanel />}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
