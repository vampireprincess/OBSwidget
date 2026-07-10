import type { CodeFile, LeftTab } from '../types';
import type { Asset } from '../types';

/**
 * Scans ALL widget code files for media URLs.
 * Returns deduplicated list of external assets found in the code.
 * Special attention to StreamElements CDN URLs (cdn.streamelements.com/uploads/).
 */

interface DetectedAsset {
  url: string;
  type: 'image' | 'video' | 'audio' | 'lottie' | 'font' | 'unknown';
  source: LeftTab; // which file it was found in
  filename: string;
}

// Broad URL regex — catches any http(s) URL
const URL_RE = /https?:\/\/[^\s"'<>\])},;`]+/gi;

function classifyUrl(url: string): DetectedAsset['type'] {
  const lower = url.toLowerCase();
  // Lottie / JSON animations
  if (lower.endsWith('.json') && (lower.includes('lottie') || lower.includes('animation'))) return 'lottie';
  // Video
  if (/\.(webm|mp4|mov|avi|mkv)(\?|$)/i.test(lower)) return 'video';
  // Audio
  if (/\.(mp3|ogg|wav|flac|m4a|aac)(\?|$)/i.test(lower)) return 'audio';
  // Images
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?|$)/i.test(lower)) return 'image';
  // Fonts
  if (/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(lower)) return 'font';
  // StreamElements CDN — usually images or lottie
  if (lower.includes('cdn.streamelements.com')) {
    if (lower.endsWith('.json')) return 'lottie';
    if (/\.(webm|mp4)/.test(lower)) return 'video';
    return 'image';
  }
  // Known image hosts
  if (lower.includes('imgur.com') || lower.includes('i.redd.it') || lower.includes('pbs.twimg.com') || lower.includes('static-cdn.jtvnw.net')) return 'image';
  // Default
  return 'unknown';
}

function filenameFromUrl(url: string): string {
  try {
    // Remove query params and hash
    const clean = url.split('?')[0].split('#')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1];
    return decodeURIComponent(last) || 'asset';
  } catch {
    return 'asset';
  }
}

/**
 * Scans all code files and returns detected external assets.
 */
export function scanCodeForAssets(codeFiles: Record<LeftTab, CodeFile>): DetectedAsset[] {
  const seen = new Set<string>();
  const results: DetectedAsset[] = [];

  const tabs: LeftTab[] = ['html', 'css', 'js', 'fields', 'data'];

  for (const tab of tabs) {
    const content = codeFiles[tab]?.content || '';
    if (!content.trim()) continue;

    // Find all http(s) URLs
    const matches = content.match(URL_RE) || [];
    for (const rawUrl of matches) {
      // Clean trailing punctuation that regex might grab
      const url = rawUrl.replace(/[)\]}>;,.'"!?]+$/, '');
      if (seen.has(url)) continue;
      seen.add(url);
      results.push({
        url,
        type: classifyUrl(url),
        source: tab,
        filename: filenameFromUrl(url),
      });
    }
  }

  return results;
}

/**
 * Converts uploaded Asset[] + detected URLs into a unified asset list for display.
 * Uploaded assets (dataURL) take priority — detected URLs are supplementary.
 */
export function mergeAssets(uploaded: Asset[], detected: DetectedAsset[]): Array<{
  id: string;
  name: string;
  url: string;
  type: string;
  source: 'upload' | 'code';
  codeTab?: LeftTab;
  assetType: DetectedAsset['type'];
}> {
  const result: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    source: 'upload' | 'code';
    codeTab?: LeftTab;
    assetType: DetectedAsset['type'];
  }> = [];

  // Uploaded first
  for (const a of uploaded) {
    result.push({
      id: a.id,
      name: a.name,
      url: a.dataUrl,
      type: a.type,
      source: 'upload',
      assetType: a.type.startsWith('video/') ? 'video' : a.type.startsWith('audio/') ? 'audio' : 'image',
    });
  }

  // Detected from code — skip if already in uploaded
  const uploadedUrls = new Set(uploaded.map(a => a.dataUrl));
  for (const d of detected) {
    if (uploadedUrls.has(d.url)) continue;
    // Skip common non-asset URLs (APIs, analytics, etc.)
    if (d.url.includes('google-analytics') || d.url.includes('googletagmanager') ||
        d.url.includes('twitch.tv/irc') || d.url.includes('sentry.io') ||
        d.url.includes('api.streamelements.com') || d.url.includes('fonts.googleapis.com')) continue;

    result.push({
      id: `detected-${d.url.substring(0, 80)}`,
      name: d.filename,
      url: d.url,
      type: d.type === 'image' ? 'image/*' : d.type === 'video' ? 'video/*' : d.type === 'audio' ? 'audio/*' : 'application/octet-stream',
      source: 'code',
      codeTab: d.source,
      assetType: d.type,
    });
  }

  return result;
}
