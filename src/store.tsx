import { createContext, useContext, useReducer, useCallback, useState, type ReactNode } from 'react';
import type {
  AppState,
  LeftTab,
  RightPanel,
  CodeFile,
  Asset,
  SelectedElementInfo,
  CSSEntry,
  LayerElement,
  CSSVariable,
  ViewMode,
} from './types';
import { validateJson } from './utils/zipUtils';

const TABS_ARR: LeftTab[] = ['html', 'css', 'js', 'fields', 'data'];

export function cleanSECdnUrls(content: string): string {
  if (!content) return content;
  // Completely bulletproof StreamElements CDN trailing slash remover
  let cleaned = content.replace(/(https:\/\/cdn\.streamelements\.com\/uploads\/[^\s\"\'\`\<\>\(\)\[\]\/]+)\//gi, '$1');
  cleaned = cleaned.replace(/(\.png|\.jpe?g|\.gif|\.webp|\.webm|\.mp4|\.json)\//gi, '$1');
  return cleaned;
}

function pushHistory(history: Array<Record<LeftTab, CodeFile>>, index: number, files: Record<LeftTab, CodeFile>) {
  const newHistory = history.slice(0, index + 1);
  newHistory.push(JSON.parse(JSON.stringify(files)));
  if (newHistory.length > 50) newHistory.shift();
  return {
    history: newHistory,
    index: newHistory.length - 1,
  };
}

function defaultFiles(): Record<LeftTab, CodeFile> {
  const map: Record<LeftTab, string> = {
    html: `<div class="event-alert" id="event-alert">
  <div class="alert-content">
    <div class="alert-icon">💰</div>
    <div class="alert-text">
      <div class="alert-username" id="username">username</div>
      <div class="alert-message" id="message">sent a tip!</div>
    </div>
    <div class="alert-amount" id="amount">$5.00</div>
  </div>
</div>`,
    css: `body {
  margin: 0;
  font-family: 'Segoe UI', Arial, sans-serif;
  background: transparent;
  overflow: hidden;
}

.event-alert {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  max-width: 400px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  opacity: 0;
  transform: translateY(-20px);
  transition: all 0.3s ease;
}

.event-alert.visible {
  opacity: 1;
  transform: translateY(0);
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.alert-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.alert-text {
  flex: 1;
  min-width: 0;
}

.alert-username {
  color: #00d4ff;
  font-weight: 700;
  font-size: 14px;
  text-transform: uppercase;
}

.alert-message {
  color: rgba(255,255,255,0.7);
  font-size: 13px;
}

.alert-amount {
  color: #00ff88;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}`,
    js: `// StreamElements Custom Widget script.
// Uses the same event flow as real SE widgets:
//   onWidgetLoad   -> fired once with fieldData (widget settings)
//   onEventReceived -> fired for tips, subs, follows, cheers, chat, etc.

var fieldData = {};

window.addEventListener('onWidgetLoad', function(obj) {
  fieldData = obj.detail.fieldData || {};

  // Apply user settings (from FIELDS.json) to the widget
  var alert = document.getElementById('event-alert');
  if (fieldData.backgroundColor) {
    alert.style.background = fieldData.backgroundColor;
  }
  if (fieldData.titleColor) {
    document.getElementById('username').style.color = fieldData.titleColor;
  }
  if (fieldData.amountColor) {
    document.getElementById('amount').style.color = fieldData.amountColor;
  }
  console.log('[Widget] Loaded with settings:', fieldData);
});

window.addEventListener('onEventReceived', function(obj) {
  var listener = obj.detail.listener;
  var event = obj.detail.event || {};
  var alert = document.getElementById('event-alert');
  var iconEl = document.querySelector('.alert-icon');

  if (listener === 'tip-latest') {
    iconEl.textContent = '💰';
    document.getElementById('username').textContent = event.name || event.user?.displayName || 'Someone';
    document.getElementById('message').textContent = 'sent a tip!';
    document.getElementById('amount').textContent = event.formattedAmount ||
      ('$' + ((event.amount || 0) / 100).toFixed(2));
  } else if (listener === 'follower-latest') {
    iconEl.textContent = '⭐';
    document.getElementById('username').textContent = event.name || event.user?.displayName || 'Someone';
    document.getElementById('message').textContent = 'is now following!';
    document.getElementById('amount').textContent = '';
  } else if (listener === 'subscriber-latest') {
    iconEl.textContent = '🎁';
    document.getElementById('username').textContent = event.name || event.user?.displayName || 'Someone';
    document.getElementById('message').textContent = 'subscribed!';
    document.getElementById('amount').textContent = event.tier ? 'Tier ' + (event.tier / 1000) : '';
  } else if (listener === 'cheer-latest') {
    iconEl.textContent = '📣';
    document.getElementById('username').textContent = event.name || event.user?.displayName || 'Someone';
    document.getElementById('message').textContent = 'cheered';
    document.getElementById('amount').textContent = (event.amount || event.bits || 0) + ' bits';
  } else {
    return;
  }

  alert.classList.add('visible');
  clearTimeout(window._alertTimer);
  window._alertTimer = setTimeout(function() {
    alert.classList.remove('visible');
  }, 5000);
});

console.log('Widget script initialized. Fire events from the Emulator "Test Events" tab!');`,
    fields: `{
  "backgroundColor": {
    "type": "colorpicker",
    "label": "Alert Background",
    "value": "#1a1a2e",
    "group": "Appearance"
  },
  "titleColor": {
    "type": "colorpicker",
    "label": "Username Color",
    "value": "#00d4ff",
    "group": "Appearance"
  },
  "amountColor": {
    "type": "colorpicker",
    "label": "Amount Color",
    "value": "#00ff88",
    "group": "Appearance"
  },
  "fontSize": {
    "type": "slider",
    "label": "Font Size",
    "value": 14,
    "min": 10,
    "max": 32,
    "step": 1,
    "group": "Typography"
  },
  "showMessage": {
    "type": "checkbox",
    "label": "Show Tip Message",
    "value": true,
    "group": "Content"
  },
  "alertDuration": {
    "type": "number",
    "label": "Alert Duration (ms)",
    "value": 5000,
    "group": "Behavior"
  }
}`,
    data: `{
  "lastTip": null,
  "totalTips": 0,
  "lastSubscriber": null
}`,
  };
  const result: Record<LeftTab, CodeFile> = {} as Record<LeftTab, CodeFile>;
  const langMap: Record<LeftTab, 'html' | 'css' | 'javascript' | 'json'> = {
    html: 'html', css: 'css', js: 'javascript', fields: 'json', data: 'json',
  };
  const labelMap: Record<LeftTab, string> = {
    html: 'HTML', css: 'CSS', js: 'JS', fields: 'Fields', data: 'Data',
  };
  for (const tab of TABS_ARR) {
    result[tab] = {
      id: tab,
      label: labelMap[tab],
      language: langMap[tab],
      content: map[tab],
      parseError: validateJson(map[tab]) ?? undefined,
    };
  }
  return result;
}

export interface CustomDialog {
  type: 'alert' | 'confirm' | 'prompt';
  title: string;
  message: string;
  defaultValue?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

const initialState: AppState & { dialog: CustomDialog | null } = {
  codeFiles: defaultFiles(),
  history: [],
  historyIndex: -1,
  cssOverrides: [],
  assets: [],
  selectedElement: null,
  activeLeftTab: 'html',
  activeRightPanel: 'inspector',
  leftPanelOpen: true,
  rightPanelOpen: true,
  previewKey: 0,
  fileName: 'Untitled Widget',
  uploadError: null,
  folderPath: undefined,
  layers: [],
  cssVariables: [],
  viewMode: 'editor',
  fieldValueOverrides: {},
  dialog: null,
};

type Action =
  | { type: 'SET_FILES'; files: Record<LeftTab, CodeFile>; folderPath?: string }
  | { type: 'SET_FILE_CONTENT'; tab: LeftTab; content: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ASSETS'; assets: Asset[] }
  | { type: 'ADD_ASSET'; asset: Asset }
  | { type: 'REMOVE_ASSET'; id: string }
  | { type: 'SET_SELECTED_ELEMENT'; element: SelectedElementInfo | null }
  | { type: 'SET_ACTIVE_LEFT_TAB'; tab: LeftTab }
  | { type: 'SET_ACTIVE_RIGHT_PANEL'; panel: RightPanel }
  | { type: 'TOGGLE_LEFT_PANEL' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'REFRESH_PREVIEW' }
  | { type: 'SET_FILE_NAME'; name: string }
  | { type: 'SET_UPLOAD_ERROR'; error: string | null }
  | { type: 'UPDATE_CSS_OVERRIDE'; selector: string; properties: Record<string, string> }
  | { type: 'SET_CSS_OVERRIDES'; overrides: CSSEntry[] }
  | { type: 'SET_LAYERS'; layers: LayerElement[] }
  | { type: 'UPDATE_LAYER'; id: string; changes: Partial<LayerElement> }
  | { type: 'MOVE_LAYER'; id: string; direction: 'up' | 'down' }
  | { type: 'SET_CSS_VARIABLES'; variables: CSSVariable[] }
  | { type: 'ADD_CSS_VARIABLE'; variable: CSSVariable }
  | { type: 'UPDATE_CSS_VARIABLE'; index: number; variable: Partial<CSSVariable> }
  | { type: 'REMOVE_CSS_VARIABLE'; index: number }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'SET_FIELD_OVERRIDE'; key: string; value: unknown }
  | { type: 'RESET_FIELD_OVERRIDES' }
  | { type: 'SET_DIALOG'; dialog: CustomDialog | null };

function reducer(state: any, action: Action): any {
  switch (action.type) {
    case 'SET_FILES': {
      const cleanedFiles = { ...action.files };
      for (const tab of Object.keys(cleanedFiles) as LeftTab[]) {
        cleanedFiles[tab] = {
          ...cleanedFiles[tab],
          content: cleanSECdnUrls(cleanedFiles[tab].content),
        };
      }
      const hist = pushHistory(state.history, state.historyIndex, cleanedFiles);
      return { 
        ...state, 
        codeFiles: cleanedFiles, 
        history: hist.history,
        historyIndex: hist.index,
        uploadError: null, 
        folderPath: action.folderPath 
      };
    }
    case 'SET_FILE_CONTENT': {
      const { tab, content } = action;
      const cleaned = cleanSECdnUrls(content);
      const file = { ...state.codeFiles[tab], content: cleaned };
      if (tab === 'fields' || tab === 'data') {
        file.parseError = validateJson(content) ?? undefined;
      }
      const nextFiles = { ...state.codeFiles, [tab]: file };
      let hist = { history: state.history, index: state.historyIndex };
      if (state.history.length === 0 || JSON.stringify(state.history[state.historyIndex]) !== JSON.stringify(nextFiles)) {
        hist = pushHistory(state.history, state.historyIndex, nextFiles);
      }
      return {
        ...state,
        codeFiles: nextFiles,
        history: hist.history,
        historyIndex: hist.index,
      };
    }
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const nextIndex = state.historyIndex - 1;
        return {
          ...state,
          codeFiles: JSON.parse(JSON.stringify(state.history[nextIndex])),
          historyIndex: nextIndex,
        };
      }
      return state;
    }
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const nextIndex = state.historyIndex + 1;
        return {
          ...state,
          codeFiles: JSON.parse(JSON.stringify(state.history[nextIndex])),
          historyIndex: nextIndex,
        };
      }
      return state;
    }
    case 'SET_ASSETS':
      return { ...state, assets: action.assets };
    case 'ADD_ASSET':
      return { ...state, assets: [...state.assets, action.asset] };
    case 'REMOVE_ASSET':
      return { ...state, assets: state.assets.filter((a: Asset) => a.id !== action.id) };
    case 'SET_SELECTED_ELEMENT':
      return { ...state, selectedElement: action.element };
    case 'SET_ACTIVE_LEFT_TAB':
      return { ...state, activeLeftTab: action.tab };
    case 'SET_ACTIVE_RIGHT_PANEL':
      return { ...state, activeRightPanel: action.panel, rightPanelOpen: true };
    case 'TOGGLE_LEFT_PANEL':
      return { ...state, leftPanelOpen: !state.leftPanelOpen };
    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelOpen: !state.rightPanelOpen };
    case 'REFRESH_PREVIEW':
      return { ...state, previewKey: state.previewKey + 1 };
    case 'SET_FILE_NAME':
      return { ...state, fileName: action.name };
    case 'SET_UPLOAD_ERROR':
      return { ...state, uploadError: action.error };
    case 'UPDATE_CSS_OVERRIDE': {
      const overrides = [...state.cssOverrides];
      const idx = overrides.findIndex((o: any) => o.selector === action.selector);
      if (idx >= 0) {
        overrides[idx] = { ...overrides[idx], properties: { ...overrides[idx].properties, ...action.properties } };
      } else {
        overrides.push({ selector: action.selector, properties: action.properties });
      }
      return { ...state, cssOverrides: overrides };
    }
    case 'SET_CSS_OVERRIDES':
      return { ...state, cssOverrides: action.overrides };
    case 'SET_LAYERS':
      return { ...state, layers: action.layers };
    case 'UPDATE_LAYER': {
      const layers = state.layers.map((l: any) =>
        l.id === action.id ? { ...l, ...action.changes } : l
      );
      return { ...state, layers };
    }
    case 'MOVE_LAYER': {
      const idx = state.layers.findIndex((l: any) => l.id === action.id);
      if (idx < 0) return state;
      const newLayers = [...state.layers];
      if (action.direction === 'up' && idx > 0) {
        [newLayers[idx], newLayers[idx - 1]] = [newLayers[idx - 1], newLayers[idx]];
      } else if (action.direction === 'down' && idx < newLayers.length - 1) {
        [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
      }
      return { ...state, layers: newLayers };
    }
    case 'SET_CSS_VARIABLES':
      return { ...state, cssVariables: action.variables };
    case 'ADD_CSS_VARIABLE':
      return { ...state, cssVariables: [...state.cssVariables, action.variable] };
    case 'UPDATE_CSS_VARIABLE': {
      const vars = [...state.cssVariables];
      vars[action.index] = { ...vars[action.index], ...action.variable };
      return { ...state, cssVariables: vars };
    }
    case 'REMOVE_CSS_VARIABLE':
      return { ...state, cssVariables: state.cssVariables.filter((_: any, i: number) => i !== action.index) };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'SET_FIELD_OVERRIDE':
      return { ...state, fieldValueOverrides: { ...state.fieldValueOverrides, [action.key]: action.value } };
    case 'RESET_FIELD_OVERRIDES':
      return { ...state, fieldValueOverrides: {} };
    case 'SET_DIALOG':
      return { ...state, dialog: action.dialog };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  dialog: CustomDialog | null;
  projectsBrowserOpen: boolean;
  setProjectsBrowserOpen: (open: boolean) => void;
  setFileContent: (tab: LeftTab, content: string) => void;
  setFiles: (files: Record<LeftTab, CodeFile>, folderPath?: string) => void;
  addAsset: (asset: Asset) => void;
  removeAsset: (id: string) => void;
  setSelectedElement: (element: SelectedElementInfo | null) => void;
  setActiveLeftTab: (tab: LeftTab) => void;
  setActiveRightPanel: (panel: RightPanel) => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  refreshPreview: () => void;
  updateCssOverride: (selector: string, properties: Record<string, string>) => void;
  setCssOverrideProperty: (selector: string, prop: string, value: string) => void;
  setFileName: (name: string) => void;
  setLayers: (layers: LayerElement[]) => void;
  updateLayer: (id: string, changes: Partial<LayerElement>) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  setCssVariables: (variables: CSSVariable[]) => void;
  addCssVariable: (variable: CSSVariable) => void;
  updateCssVariable: (index: number, variable: Partial<CSSVariable>) => void;
  removeCssVariable: (index: number) => void;
  setViewMode: (mode: ViewMode) => void;
  setFieldOverride: (key: string, value: unknown) => void;
  resetFieldOverrides: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  openDialog: (dialog: CustomDialog) => void;
  closeDialog: () => void;
  saveProject: (name: string) => void;
  loadProject: (name: string) => void;
  deleteProject: (name: string) => void;
  getSavedProjects: () => string[];
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [projectsBrowserOpen, setProjectsBrowserOpen] = useState(false);

  const setFileContent = useCallback((tab: LeftTab, content: string) => {
    dispatch({ type: 'SET_FILE_CONTENT', tab, content });
  }, []);

  const setFiles = useCallback((files: Record<LeftTab, CodeFile>, folderPath?: string) => {
    dispatch({ type: 'SET_FILES', files, folderPath });
  }, []);

  const addAsset = useCallback((asset: Asset) => {
    dispatch({ type: 'ADD_ASSET', asset });
  }, []);

  const removeAsset = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ASSET', id });
  }, []);

  const setSelectedElement = useCallback((element: SelectedElementInfo | null) => {
    dispatch({ type: 'SET_SELECTED_ELEMENT', element });
  }, []);

  const setActiveLeftTab = useCallback((tab: LeftTab) => {
    dispatch({ type: 'SET_ACTIVE_LEFT_TAB', tab });
  }, []);

  const setActiveRightPanel = useCallback((panel: RightPanel) => {
    dispatch({ type: 'SET_ACTIVE_RIGHT_PANEL', panel });
  }, []);

  const toggleLeftPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_LEFT_PANEL' });
  }, []);

  const toggleRightPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
  }, []);

  const refreshPreview = useCallback(() => {
    dispatch({ type: 'REFRESH_PREVIEW' });
  }, []);

  const updateCssOverride = useCallback((selector: string, properties: Record<string, string>) => {
    dispatch({ type: 'UPDATE_CSS_OVERRIDE', selector, properties });
  }, []);

  const setCssOverrideProperty = useCallback((selector: string, prop: string, value: string) => {
    dispatch({
      type: 'UPDATE_CSS_OVERRIDE',
      selector,
      properties: { [prop]: value },
    });
  }, []);

  const setFileName = useCallback((name: string) => {
    dispatch({ type: 'SET_FILE_NAME', name });
  }, []);

  const setLayers = useCallback((layers: LayerElement[]) => {
    dispatch({ type: 'SET_LAYERS', layers });
  }, []);

  const updateLayer = useCallback((id: string, changes: Partial<LayerElement>) => {
    dispatch({ type: 'UPDATE_LAYER', id, changes });
  }, []);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    dispatch({ type: 'MOVE_LAYER', id, direction });
  }, []);

  const setCssVariables = useCallback((variables: CSSVariable[]) => {
    dispatch({ type: 'SET_CSS_VARIABLES', variables });
  }, []);

  const addCssVariable = useCallback((variable: CSSVariable) => {
    dispatch({ type: 'ADD_CSS_VARIABLE', variable });
  }, []);

  const updateCssVariable = useCallback((index: number, variable: Partial<CSSVariable>) => {
    dispatch({ type: 'UPDATE_CSS_VARIABLE', index, variable });
  }, []);

  const removeCssVariable = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_CSS_VARIABLE', index });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', mode });
  }, []);

  const setFieldOverride = useCallback((key: string, value: unknown) => {
    dispatch({ type: 'SET_FIELD_OVERRIDE', key, value });
  }, []);

  const resetFieldOverrides = useCallback(() => {
    dispatch({ type: 'RESET_FIELD_OVERRIDES' });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const openDialog = useCallback((dialog: CustomDialog) => {
    dispatch({ type: 'SET_DIALOG', dialog });
  }, []);

  const closeDialog = useCallback(() => {
    dispatch({ type: 'SET_DIALOG', dialog: null });
  }, []);

  const saveProject = useCallback((name: string) => {
    try {
      const projects = JSON.parse(localStorage.getItem('obswidget_saved_projects') || '{}');
      projects[name] = {
        fileName: name,
        codeFiles: state.codeFiles,
        cssOverrides: state.cssOverrides,
        assets: state.assets,
        cssVariables: state.cssVariables,
        fieldValueOverrides: state.fieldValueOverrides,
      };
      localStorage.setItem('obswidget_saved_projects', JSON.stringify(projects));
      setFileName(name);
    } catch (e) {
      console.error(e);
    }
  }, [state, setFileName]);

  const loadProject = useCallback((name: string) => {
    try {
      const projects = JSON.parse(localStorage.getItem('obswidget_saved_projects') || '{}');
      const proj = projects[name];
      if (proj) {
        // Clean all URLs of the loaded project's files on the fly
        const cleanedFiles = { ...proj.codeFiles };
        for (const tab of Object.keys(cleanedFiles) as LeftTab[]) {
          cleanedFiles[tab] = {
            ...cleanedFiles[tab],
            content: cleanSECdnUrls(cleanedFiles[tab].content),
          };
        }
        setFiles(cleanedFiles);
        setFileName(proj.fileName);
        dispatch({ type: 'SET_CSS_OVERRIDES', overrides: proj.cssOverrides || [] });
        dispatch({ type: 'SET_ASSETS', assets: proj.assets || [] });
        dispatch({ type: 'SET_CSS_VARIABLES', variables: proj.cssVariables || [] });
        
        if (proj.fieldValueOverrides) {
          dispatch({ type: 'RESET_FIELD_OVERRIDES' });
          Object.entries(proj.fieldValueOverrides).forEach(([k, v]) => {
            const cleanedVal = typeof v === 'string' ? cleanSECdnUrls(v) : v;
            dispatch({ type: 'SET_FIELD_OVERRIDE', key: k, value: cleanedVal });
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [setFiles, setFileName]);

  const deleteProject = useCallback((name: string) => {
    try {
      const projects = JSON.parse(localStorage.getItem('obswidget_saved_projects') || '{}');
      delete projects[name];
      localStorage.setItem('obswidget_saved_projects', JSON.stringify(projects));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getSavedProjects = useCallback(() => {
    try {
      const projects = JSON.parse(localStorage.getItem('obswidget_saved_projects') || '{}');
      return Object.keys(projects);
    } catch {
      return [];
    }
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      projectsBrowserOpen,
      setProjectsBrowserOpen,
      setFileContent,
      setFiles,
      setFileName,
      addAsset,
      removeAsset,
      setSelectedElement,
      setActiveLeftTab,
      setActiveRightPanel,
      toggleLeftPanel,
      toggleRightPanel,
      refreshPreview,
      updateCssOverride,
      setCssOverrideProperty,
      setLayers,
      updateLayer,
      moveLayer,
      setCssVariables,
      addCssVariable,
      updateCssVariable,
      removeCssVariable,
      setViewMode,
      setFieldOverride,
      resetFieldOverrides,
      undo,
      redo,
      canUndo,
      canRedo,
      openDialog,
      closeDialog,
      saveProject,
      loadProject,
      deleteProject,
      getSavedProjects,
    }}>
      {children}
    </AppContext.Provider>
  );
}
