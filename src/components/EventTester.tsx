import { useState, useCallback, useMemo } from 'react';
import type { FakeEvent } from '../types';
import { useApp } from '../store';
import { detectUsedEvents } from '../utils/eventDetector';

// Fake event payloads mirroring StreamElements' real event.detail.event structure.
// SE widgets read `event.name`, `event.amount`, `event.message`, `event.tier`, etc.
const EVENTS: FakeEvent[] = [
  {
    type: 'tip',
    label: 'Tip',
    icon: '💰',
    description: '$5 tip with message',
    data: {
      name: 'StreamerFan42',
      amount: 5,
      formattedAmount: '$5.00',
      message: 'Keep up the great work!',
      currency: 'USD',
      user: { login: 'streamer_fan42', displayName: 'StreamerFan42', profilePicUrl: '' },
    },
  },
  {
    type: 'follower',
    label: 'Follower',
    icon: '⭐',
    description: 'New follower',
    data: {
      name: 'NewFollower99',
      user: { login: 'newfollower99', displayName: 'NewFollower99', profilePicUrl: '' },
    },
  },
  {
    type: 'subscriber',
    label: 'Subscriber',
    icon: '🎁',
    description: 'Tier 2 sub',
    data: {
      name: 'BigSubSupporter',
      tier: '2000',
      amount: 1,
      months: 1,
      message: 'Been watching for a while, love the stream!',
      user: { login: 'big_sub_supporter', displayName: 'BigSubSupporter' },
    },
  },
  {
    type: 'gift_subscriber',
    label: 'Gift Sub',
    icon: '🎀',
    description: 'Gifted subscription',
    data: {
      name: 'GenerousGifter',
      sender: 'GenerousGifter',
      gifted: 'LuckyRecipient',
      tier: '1000',
      amount: 1,
      isCommunityGift: false,
    },
  },
  {
    type: 'cheer',
    label: 'Cheer',
    icon: '📣',
    description: '1000 bits cheer',
    data: {
      name: 'BitsFan',
      amount: 1000,
      bits: 1000,
      message: 'LETS GOOOOO! cheer1000',
      user: { login: 'bits_fan', displayName: 'BitsFan' },
    },
  },
  {
    type: 'chat',
    label: 'Chat',
    icon: '💬',
    description: 'Chat message',
    data: {
      nick: 'chat_user',
      displayName: 'ChatUser',
      text: 'LOL that was awesome!',
      color: '#FF6B6B',
      badges: [{ type: 'subscriber' }],
      emotes: [],
    },
  },
  {
    type: 'goal_update',
    label: 'Goal Update',
    icon: '🎯',
    description: 'Follower goal progress',
    data: {
      amount: { current: 850, target: 1000 },
      type: 'follower-goal',
    },
  },
  {
    type: 'raid',
    label: 'Raid',
    icon: '⚔️',
    description: '250 viewer raid',
    data: {
      name: 'RaiderChannel',
      amount: 250,
      raiders: 250,
      user: { login: 'raider_channel', displayName: 'RaiderChannel' },
    },
  },
  {
    type: 'resubscriber',
    label: 'Resub',
    icon: '🔄',
    description: '24-month resub',
    data: {
      name: 'LoyalSub',
      amount: 24,
      months: 24,
      tier: '1000',
      message: 'Another month, love it!',
      user: { login: 'loyal_sub', displayName: 'LoyalSub' },
    },
  },
];

export default function EventTester() {
  const { codeFiles } = useApp();
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [customEventData, setCustomEventData] = useState('{\n  "message": "Custom event"\n}');
  const [customEventType, setCustomEventType] = useState('custom_event');
  const [showAll, setShowAll] = useState(false);

  const { detected, hasAnyEventHandling } = useMemo(
    () => detectUsedEvents(codeFiles.js.content),
    [codeFiles.js.content]
  );

  const detectedEvents = useMemo(
    () => EVENTS.filter(e => detected.has(e.type)),
    [detected]
  );
  const otherEvents = useMemo(
    () => EVENTS.filter(e => !detected.has(e.type)),
    [detected]
  );

  // If nothing was specifically detected, fall back to showing everything by default
  const effectiveShowAll = showAll || detectedEvents.length === 0;

  const fireEvent = useCallback((eventType: string, data: Record<string, unknown>) => {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of Array.from(iframes)) {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          _source: 'se-mock',
          type: 'FIRE_EVENT',
          eventType,
          eventData: data,
        }, '*');
      }
    }
    setLastEvent(`${eventType} @ ${new Date().toLocaleTimeString()}`);
  }, []);

  const fireCustomEvent = () => {
    try {
      const parsed = JSON.parse(customEventData);
      fireEvent(customEventType || 'custom', parsed);
    } catch {
      alert('Invalid JSON in custom event data');
    }
  };

  function renderEventButton(event: FakeEvent, highlighted: boolean) {
    return (
      <button
        key={event.type}
        onClick={() => fireEvent(event.type, event.data)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 border rounded-lg transition-colors text-left group ${
          highlighted
            ? 'bg-emerald-900/20 border-emerald-700/50 hover:bg-emerald-900/30 hover:border-emerald-600'
            : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
        }`}
      >
        <span className="text-lg">{event.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-zinc-200 group-hover:text-white flex items-center gap-1.5">
            {event.label}
            {highlighted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Detected in widget code" />}
          </div>
          <div className="text-[10px] text-zinc-500 truncate">{event.description}</div>
        </div>
        <svg className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Header */}
      <div className="px-3 py-2 border-b border-zinc-700 shrink-0">
        <h3 className="text-xs font-semibold text-white mb-0.5">Event Tester</h3>
        <p className="text-[10px] text-zinc-500">Fire fake SE events to the preview</p>
        {lastEvent && (
          <p className="text-[10px] text-emerald-400 mt-1">Last: {lastEvent}</p>
        )}
      </div>

      {/* Detection status banner */}
      <div className="px-3 py-2 border-b border-zinc-800 shrink-0">
        {detectedEvents.length > 0 ? (
          <p className="text-[10px] text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            Detected {detectedEvents.length} event type{detectedEvents.length > 1 ? 's' : ''} used by this widget
          </p>
        ) : hasAnyEventHandling ? (
          <p className="text-[10px] text-yellow-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
            Widget handles events, but type couldn't be identified — showing all
          </p>
        ) : (
          <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
            No event handlers detected in this widget's JS — showing all for manual testing
          </p>
        )}
      </div>

      {/* Event Buttons */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {detectedEvents.length > 0 && (
          <>
            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide px-0.5">
              Used by this widget
            </p>
            {detectedEvents.map(e => renderEventButton(e, true))}
          </>
        )}

        {detectedEvents.length > 0 && otherEvents.length > 0 && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full text-center py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {showAll ? '▲ Hide other events' : `▼ Show ${otherEvents.length} other events`}
          </button>
        )}

        {effectiveShowAll && otherEvents.length > 0 && (
          <>
            {detectedEvents.length > 0 && (
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide px-0.5 pt-1">
                Other events
              </p>
            )}
            {otherEvents.map(e => renderEventButton(e, false))}
          </>
        )}
      </div>

      {/* Custom Event */}
      <div className="border-t border-zinc-700 p-3 shrink-0">
        <h4 className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Custom Event</h4>
        <input
          type="text"
          value={customEventType}
          onChange={e => setCustomEventType(e.target.value)}
          placeholder="Event type..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none mb-2"
        />
        <textarea
          value={customEventData}
          onChange={e => setCustomEventData(e.target.value)}
          placeholder='{"message": "..."}'
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none resize-none h-16 mb-2"
        />
        <button
          onClick={fireCustomEvent}
          className="w-full py-1.5 text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded transition-colors"
        >
          Fire Custom Event
        </button>
      </div>
    </div>
  );
}
