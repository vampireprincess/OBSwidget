/**
 * Utilities for manipulating the widget's HTML string directly (DOM-based),
 * used by the visual editor to add/remove/duplicate elements while keeping
 * the raw HTML text as the single source of truth (so export always works).
 */

export type NewElementType = 'text' | 'image' | 'rectangle' | 'video' | 'lottie' | 'svg';

function parseFragment(html: string): HTMLElement {
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${html}</body></html>`, 'text/html');
  return doc.body;
}

function serializeFragment(body: HTMLElement): string {
  return body.innerHTML;
}

export function generateElementId(): string {
  return `se-el-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export interface AddElementOptions {
  assetUrl?: string;
  svgContent?: string;
  text?: string;
}

export function addElementToHtml(
  html: string,
  type: NewElementType,
  opts: AddElementOptions = {}
): { html: string; id: string } {
  const body = parseFragment(html);
  const id = generateElementId();
  let el: HTMLElement;

  switch (type) {
    case 'text': {
      el = document.createElement('div');
      el.textContent = opts.text || 'Edit this text';
      el.style.color = '#ffffff';
      el.style.fontSize = '28px';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.fontWeight = '700';
      break;
    }
    case 'image': {
      const img = document.createElement('img');
      img.src = opts.assetUrl || '';
      img.style.width = '200px';
      img.style.height = 'auto';
      img.setAttribute('draggable', 'false');
      el = img;
      break;
    }
    case 'rectangle': {
      el = document.createElement('div');
      el.style.width = '200px';
      el.style.height = '120px';
      el.style.background = '#4f46e5';
      el.style.borderRadius = '8px';
      break;
    }
    case 'video': {
      const video = document.createElement('video');
      video.src = opts.assetUrl || '';
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.style.width = '320px';
      video.style.height = 'auto';
      el = video;
      break;
    }
    case 'lottie': {
      el = document.createElement('div');
      el.setAttribute('data-lottie-src', opts.assetUrl || '');
      el.style.width = '200px';
      el.style.height = '200px';
      break;
    }
    case 'svg': {
      const wrapper = document.createElement('div');
      wrapper.style.width = '120px';
      wrapper.style.height = '120px';
      wrapper.innerHTML = opts.svgContent || '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';
      el = wrapper;
      break;
    }
    default:
      el = document.createElement('div');
  }

  el.id = id;
  el.setAttribute('data-se-element', type);
  el.style.position = 'absolute';
  el.style.top = '40px';
  el.style.left = '40px';

  body.appendChild(el);
  return { html: serializeFragment(body), id };
}

export function removeElementFromHtml(html: string, id: string): string {
  const body = parseFragment(html);
  const el = body.querySelector(`#${CSS.escape(id)}`);
  el?.remove();
  return serializeFragment(body);
}

export function duplicateElementInHtml(html: string, id: string): { html: string; newId: string | null } {
  const body = parseFragment(html);
  const el = body.querySelector(`#${CSS.escape(id)}`);
  if (!el) return { html, newId: null };
  const clone = el.cloneNode(true) as HTMLElement;
  const newId = generateElementId();
  clone.id = newId;
  // Offset the clone slightly so it's visible as a separate element
  const currentTop = parseFloat(clone.style.top || '0') || 0;
  const currentLeft = parseFloat(clone.style.left || '0') || 0;
  clone.style.position = clone.style.position || 'absolute';
  clone.style.top = `${currentTop + 20}px`;
  clone.style.left = `${currentLeft + 20}px`;
  el.after(clone);
  return { html: serializeFragment(body), newId };
}

export function updateElementAttribute(html: string, id: string, attr: string, value: string): string {
  const body = parseFragment(html);
  const el = body.querySelector(`#${CSS.escape(id)}`);
  if (el) {
    el.setAttribute(attr, value);
  }
  return serializeFragment(body);
}

export function elementExistsInHtml(html: string, id: string): boolean {
  const body = parseFragment(html);
  return !!body.querySelector(`#${CSS.escape(id)}`);
}

export function getElementIdFromSelector(selector: string): string | null {
  const match = selector.match(/^#([\w-]+)/);
  return match ? match[1] : null;
}
