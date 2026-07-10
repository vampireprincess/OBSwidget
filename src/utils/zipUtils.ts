import JSZip from 'jszip';
import type { CodeFile, LeftTab } from '../types';

const TABS: LeftTab[] = ['html', 'css', 'js', 'fields', 'data'];

const LANGUAGE_MAP: Record<LeftTab, 'html' | 'css' | 'javascript' | 'json'> = {
  html: 'html',
  css: 'css',
  js: 'javascript',
  fields: 'json',
  data: 'json',
};

const LABEL_MAP: Record<LeftTab, string> = {
  html: 'HTML',
  css: 'CSS',
  js: 'JS',
  fields: 'Fields',
  data: 'Data',
};

function emptyFiles(): Record<LeftTab, CodeFile> {
  const result: Record<LeftTab, CodeFile> = {} as Record<LeftTab, CodeFile>;
  for (const tab of TABS) {
    result[tab] = {
      id: tab,
      label: LABEL_MAP[tab],
      language: LANGUAGE_MAP[tab],
      content: '',
      parseError: undefined,
    };
  }
  return result;
}

// Normalize filename for matching
function normalizeFilename(name: string): string {
  return name.toLowerCase().replace(/[-_\s]/g, '');
}

// Detect file type from filename
function detectFileType(name: string): LeftTab | null {
  const normalizedName = normalizeFilename(name);
  
  // Direct filename matches (handles common StreamElements naming)
  const directMatches: Record<string, LeftTab> = {
    'html.txt': 'html',
    'html.html': 'html',
    'css.txt': 'css',
    'css.css': 'css',
    'js.txt': 'js',
    'javascript.js': 'js',
    'fields.txt': 'fields',
    'fields.json': 'fields',
    'data.txt': 'data',
    'data.json': 'data',
  };

  // Check direct matches
  for (const [pattern, tab] of Object.entries(directMatches)) {
    if (normalizedName === normalizeFilename(pattern)) {
      return tab;
    }
  }

  // Check if filename contains the key word (for files like "main-html.txt" or "widget.js")
  const baseName = normalizedName.replace(/\.(txt|json|html|css|js)$/i, '');
  const lastPart = baseName.split('/').pop() || baseName;
  
  if (lastPart.includes('html') && !lastPart.includes('javascript')) return 'html';
  if (lastPart.includes('css') && !lastPart.includes('javascript')) return 'css';
  if (lastPart.includes('js') || lastPart.includes('javascript') || lastPart.includes('script')) return 'js';
  if (lastPart.includes('field')) return 'fields';
  if (lastPart.includes('data') || lastPart.includes('json')) return 'data';

  return null;
}

// Detect by file content
function detectByContent(content: string): LeftTab | null {
  const trimmed = content.trim();
  if (!trimmed) return null;
  
  const lower = trimmed.toLowerCase();
  
  // HTML detection
  if (lower.startsWith('<!doctype') || lower.startsWith('<html') || 
      (lower.startsWith('<') && (lower.includes('div') || lower.includes('span') || lower.includes('section')))) {
    return 'html';
  }
  
  // JavaScript detection
  if (lower.startsWith('function') || lower.startsWith('var ') || lower.startsWith('let ') || 
      lower.startsWith('const ') || lower.startsWith('(function') || lower.startsWith('window.') ||
      lower.includes('addEventListener') || lower.includes('document.') || lower.includes('console.')) {
    return 'js';
  }
  
  // JSON detection - needs more context to determine if fields or data
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      // If JSON contains 'fields' related content
      if (lower.includes('field') || lower.includes('type') || lower.includes('label')) {
        return 'fields';
      }
      return 'data'; // Default JSON to data if ambiguous
    } catch {
      return null;
    }
  }
  
  // CSS detection (fallback)
  if (lower.includes('{') && lower.includes(':') && (lower.includes(';') || lower.includes('}'))) {
    return 'css';
  }
  
  return null;
}

// Smart file finder that handles nested folders
function findWidgetFiles(entries: [string, JSZip.JSZipObject][]): Map<LeftTab, { name: string; content: string }> {
  const found = new Map<LeftTab, { name: string; content: string }>();
  
  // Filter out directories and system files
  const files = entries.filter(([name, entry]) => {
    if (entry.dir) return false;
    // Skip hidden files and common non-widget files
    const lower = name.toLowerCase();
    if (lower.includes('__macosx') || lower.includes('.ds_store') || lower.includes('thumbs.db')) {
      return false;
    }
    return true;
  });

  // Priority 1: Look for StreamElements standard naming in any folder
  for (const [name] of files) {
    const detected = detectFileType(name);
    if (detected && !found.has(detected)) {
      // We'll read content later in the extraction
      found.set(detected, { name, content: '' });
    }
  }

  // Priority 2: If we're missing files, try content detection
  // This happens asynchronously in the extract function
  return found;
}

export async function extractZip(file: File): Promise<{
  codeFiles: Record<LeftTab, CodeFile>;
  fileName: string;
  error?: string;
  folderPath?: string;
}> {
  const zip = await JSZip.loadAsync(file);
  const files: Record<LeftTab, CodeFile> = emptyFiles();
  const found: Set<LeftTab> = new Set();
  const fileName = file.name.replace(/\.zip$/i, '');

  // Get all entries
  const entries = Object.entries(zip.files) as [string, JSZip.JSZipObject][];
  
  // First pass: find files by filename pattern
  const filenameMatches = findWidgetFiles(entries);
  
  for (const [tab, match] of filenameMatches) {
    const entry = zip.files[match.name];
    if (entry && !entry.dir) {
      const content = await entry.async('string');
      files[tab].content = content;
      files[tab].id = match.name;
      found.add(tab);
    }
  }

  // Second pass: content detection for unmatched files
  for (const [name, entry] of entries) {
    if (entry.dir || found.size >= TABS.length) continue;
    
    const content = await entry.async('string');
    
    // Skip if already found
    const detected = detectByContent(content);
    if (!detected || found.has(detected)) continue;
    
    // Additional heuristic for JSON files
    if (detected === 'data' || detected === 'fields') {
      try {
        const parsed = JSON.parse(content);
        // If we need fields and this looks like field definitions
        if (!found.has('fields') && typeof parsed === 'object' && !Array.isArray(parsed)) {
          // Check for field-like properties
          const keys = Object.keys(parsed);
          const looksLikeFields = keys.some(k => 
            k.toLowerCase().includes('type') || 
            k.toLowerCase().includes('label') ||
            k.toLowerCase().includes('value') ||
            k.toLowerCase().includes('default')
          );
          if (looksLikeFields) {
            files.fields.content = content;
            files.fields.id = name;
            found.add('fields');
            continue;
          }
        }
        // Otherwise assign to data
        if (!found.has('data')) {
          files.data.content = content;
          files.data.id = name;
          found.add('data');
          continue;
        }
      } catch {
        // Not valid JSON
      }
    } else if (!found.has(detected)) {
      files[detected].content = content;
      files[detected].id = name;
      found.add(detected);
    }
  }

  // Third pass: for any remaining JSON files, assign to missing slots
  for (const [name] of entries) {
    if (found.size >= TABS.length) continue;
    
    if (name.toLowerCase().endsWith('.json') && !found.has('fields')) {
      const entry = zip.files[name];
      if (!entry) continue;
      const content = await entry.async('string');
      try {
        JSON.parse(content);
        
        if (!found.has('fields')) {
          files.fields.content = content;
          files.fields.id = name;
          found.add('fields');
        } else if (!found.has('data')) {
          files.data.content = content;
          files.data.id = name;
          found.add('data');
        }
      } catch {
        // Not valid JSON
      }
    }
  }

  // Determine folder path if files were nested
  let folderPath: string | undefined;
  if (found.size > 0) {
    const firstFile = Array.from(found)[0];
    const fileId = files[firstFile].id;
    const pathParts = fileId.split('/');
    if (pathParts.length > 1) {
      folderPath = pathParts.slice(0, -1).join('/');
    }
  }

  const missing: LeftTab[] = TABS.filter(t => !found.has(t));
  const requiredTabs: LeftTab[] = ['html', 'css', 'js'];
  const missingRequired = missing.filter(t => requiredTabs.includes(t));

  if (missingRequired.length > 0) {
    const foundNames = Array.from(found).map(t => LABEL_MAP[t]);
    const missingNames = missingRequired.map(t => LABEL_MAP[t]);
    
    return {
      codeFiles: files,
      fileName,
      folderPath,
      error: `Could not find required: ${missingNames.join(', ')}. Found: ${foundNames.join(', ') || 'none'}`,
    };
  }

  return { codeFiles: files, fileName, folderPath };
}

export async function createZip(
  codeFiles: Record<LeftTab, CodeFile>,
  cssOverrides: string,
  assets: { id: string; name: string; dataUrl: string }[],
  folderPath?: string
): Promise<Blob> {
  const zip = new JSZip();

  // Create folder structure if needed
  const base = folderPath ? zip.folder(folderPath) : zip;

  // Add code files
  let cssContent = codeFiles.css.content;
  if (cssOverrides.trim()) {
    cssContent += '\n\n/* === Visual Editor Overrides === */\n' + cssOverrides;
  }
  
  base?.file('CSS.txt', cssContent);
  base?.file('HTML.txt', codeFiles.html.content);
  base?.file('JS.txt', codeFiles.js.content);
  base?.file('FIELDS.txt', codeFiles.fields.content);
  base?.file('DATA.txt', codeFiles.data.content);

  // Add assets in subfolder
  if (assets.length > 0) {
    const assetFolder = base?.folder('assets');
    for (const asset of assets) {
      const matches = asset.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const [, mimeType, base64Data] = matches;
        const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        const safeName = asset.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const finalName = safeName.includes('.') ? safeName : `${safeName}.${ext}`;
        const blob = new Blob(
          [Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))],
          { type: mimeType }
        );
        assetFolder?.file(finalName, blob);
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export function generateCSSOverrides(entries: Array<{ selector: string; properties: Record<string, string> }>): string {
  return entries
    .map(entry => {
      const validProps = Object.entries(entry.properties)
        .filter(([, v]) => v && v.trim() !== '');
      if (validProps.length === 0) return '';
      const props = validProps
        .map(([k, v]) => `  ${k}: ${v} !important;`)
        .join('\n');
      return `${entry.selector} {\n${props}\n}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function validateJson(content: string): string | null {
  if (!content.trim()) return null;
  try {
    JSON.parse(content);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
