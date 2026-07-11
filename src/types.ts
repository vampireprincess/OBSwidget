// Asset types
export interface Asset {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
}

// File type for code editors
export interface CodeFile {
  id: string;
  label: string;
  language: 'html' | 'css' | 'javascript' | 'json';
  content: string;
  parseError?: string;
}

// CSS property for the visual inspector
export interface CSSPropertyDef {
  name: string;
  label: string;
  type: 'text' | 'color' | 'number' | 'select';
  options?: string[];
  unit?: string;
  defaultValue: string;
}

// Selected element info from preview
export interface SelectedElementInfo {
  tag: string;
  id: string;
  classes: string[];
  selector: string;
  styles: Record<string, string>;
  innerHTML: string;
  rect?: { top: number; left: number; width: number; height: number };
  elementType?: string;
}

// Event types for the fake event tester
export interface FakeEvent {
  type: string;
  eventType?: string;
  label: string;
  icon: string;
  description: string;
  data: Record<string, unknown>;
}

// Panel states
export type LeftTab = 'html' | 'css' | 'js' | 'fields' | 'data';
export type RightPanel = 'inspector' | 'events' | 'assets' | 'layers' | 'variables' | 'templates' | 'animations';
export type ViewMode = 'editor' | 'emulator';

// SE Custom Widget field definition (from FIELDS.json)
export interface SEField {
  key: string;
  type: string;
  label: string;
  value: unknown;
  group?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, string> | Array<{ label: string; value: string }>;
  fileType?: string;
}

// App state
export interface AppState {
  codeFiles: Record<LeftTab, CodeFile>;
  history: Array<Record<LeftTab, CodeFile>>;
  historyIndex: number;
  cssOverrides: CSSEntry[];
  assets: Asset[];
  selectedElement: SelectedElementInfo | null;
  activeLeftTab: LeftTab;
  activeRightPanel: RightPanel;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  previewKey: number;
  fileName: string;
  uploadError: string | null;
  folderPath?: string;
  layers: LayerElement[];
  cssVariables: CSSVariable[];
  viewMode: ViewMode;
  fieldValueOverrides: Record<string, unknown>;
}

// CSS override entry
export interface CSSEntry {
  selector: string;
  properties: Record<string, string>;
}

// Layer element info
export interface LayerElement {
  id: string;
  tag: string;
  selector: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  name: string;
  elementType?: string;
  children?: LayerElement[];
}

// CSS Variable
export interface CSSVariable {
  name: string;
  value: string;
  type: 'color' | 'text' | 'number';
}

// Template preset
export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  html: string;
  css: string;
  js: string;
  category: string;
}
