/**
 * Analyzes widget JS code to detect which StreamElements events it handles.
 * Uses string-literal extraction (not naive substring search) to avoid
 * false positives from unrelated words appearing in the code.
 */

// Map from SE "listener" values (used in onEventReceived) to our event type keys
const LISTENER_TO_TYPE: Record<string, string> = {
  'tip-latest': 'tip',
  'follower-latest': 'follower',
  'subscriber-latest': 'subscriber',
  'cheer-latest': 'cheer',
  'raid-latest': 'raid',
  'host-latest': 'host',
  'message': 'chat',
  'follower-goal': 'goal_update',
  'subscriber-goal': 'goal_update',
  'subscriber-milestone': 'sub_milestone',
};

// Map from DOM custom-event names (window.addEventListener('se-xxx', ...))
const DOM_EVENT_TO_TYPE: Record<string, string> = {
  'se-tip': 'tip',
  'se-follower': 'follower',
  'se-subscriber': 'subscriber',
  'se-cheer': 'cheer',
  'se-raid': 'raid',
  'se-chat': 'chat',
  'se-goal_update': 'goal_update',
  'se-resubscriber': 'resubscriber',
  'se-gift_subscriber': 'gift_subscriber',
};

// Map from legacy event names (legacyEvents.on('tip', ...) / se_module.events.on(...))
const LEGACY_TO_TYPE: Record<string, string> = {
  'tip': 'tip',
  'new_follower': 'follower',
  'follower': 'follower',
  'subscriber': 'subscriber',
  'resubscriber': 'resubscriber',
  'cheer': 'cheer',
  'gift_subscriber': 'gift_subscriber',
  'raid': 'raid',
  'chat': 'chat',
  'follow': 'follower',
  'goal_update': 'goal_update',
};

/** Extracts all quoted string literals ('...', "...", `...`) from JS source. */
function extractStringLiterals(code: string): string[] {
  const literals: string[] = [];
  const regex = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(code)) !== null) {
    literals.push(m[2]);
  }
  return literals;
}

export interface EventDetectionResult {
  detected: Set<string>;
  hasAnyEventHandling: boolean; // true if widget references SE event APIs at all
}

/**
 * Detects which SE event types (tip, follower, subscriber, cheer, chat, etc.)
 * the widget's JS code actually handles, based on exact string-literal matches
 * rather than loose substring search (to avoid false positives).
 */
export function detectUsedEvents(jsCode: string): EventDetectionResult {
  const detected = new Set<string>();
  if (!jsCode || !jsCode.trim()) {
    return { detected, hasAnyEventHandling: false };
  }

  const literals = extractStringLiterals(jsCode).map(l => l.toLowerCase());
  const literalSet = new Set(literals);

  for (const [listener, eventType] of Object.entries(LISTENER_TO_TYPE)) {
    if (literalSet.has(listener)) detected.add(eventType);
  }
  for (const [domEvent, eventType] of Object.entries(DOM_EVENT_TO_TYPE)) {
    if (literalSet.has(domEvent)) detected.add(eventType);
  }
  for (const [legacyName, eventType] of Object.entries(LEGACY_TO_TYPE)) {
    if (literalSet.has(legacyName)) detected.add(eventType);
  }

  // Structural markers — does the widget reference the SE event system at all?
  const lower = jsCode.toLowerCase();
  const hasAnyEventHandling =
    lower.includes('oneventreceived') ||
    lower.includes('onwidgetload') ||
    lower.includes('se_module') ||
    lower.includes('legacyevents') ||
    lower.includes('se_api') ||
    detected.size > 0;

  return { detected, hasAnyEventHandling };
}
