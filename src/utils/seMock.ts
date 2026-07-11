/**
 * Mock StreamElements environment injected into the preview iframe.
 * Simulates the se_module API, legacy event system, and the visual editor
 * bridge (hover highlight, selection, drag/resize helpers, lottie init).
 */

const STYLE_PROPS = [
  'position', 'width', 'height', 'top', 'left', 'right', 'bottom', 'color', 'backgroundColor',
  'background', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat',
  'fontFamily', 'fontSize', 'fontWeight', 'borderRadius',
  'opacity', 'transform', 'display', 'margin', 'padding', 'border', 'overflow',
  'textAlign', 'lineHeight', 'letterSpacing', 'boxShadow', 'textShadow', 'cursor',
  'zIndex', 'flex', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
  'fill', 'stroke', 'strokeWidth', 'objectFit',
];

export function getSEMockScript(fieldsData: string, dataJson: string, lottieSrc: string): string {
  const safeFields = fieldsData.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const safeData = dataJson.replace(/'/g, "\\'").replace(/\n/g, '\\n');
  const propsJson = JSON.stringify(STYLE_PROPS);

  return `
<script>
${lottieSrc}
</script>
<script>
(function() {
  var STYLE_PROPS = ${propsJson};
  window._seEditMode = true;

  // ---------- Force pointer events in Editor mode ----------
  // Guarantees all elements are selectable and draggable even if CSS specifies pointer-events: none!
  var pointerStyle = document.createElement('style');
  pointerStyle.textContent = 'body._se-edit-mode, body._se-edit-mode * { pointer-events: auto !important; cursor: pointer !important; }';
  document.head.appendChild(pointerStyle);
  document.body.classList.add('_se-edit-mode');

  // ---------- Runtime error capture ----------
  var _reportedErrors = {};
  function reportError(message, source, lineno, colno, stack) {
    var key = message + '|' + lineno + '|' + colno;
    if (_reportedErrors[key]) return;
    _reportedErrors[key] = true;
    try {
      parent.postMessage({
        _source: 'se-inspector',
        type: 'WIDGET_ERROR',
        message: String(message || 'Unknown error'),
        source: source || '',
        lineno: lineno || 0,
        colno: colno || 0,
        stack: stack || ''
      }, '*');
    } catch(e) {}
  }
  window.addEventListener('error', function(e) {
    reportError(e.message, e.filename, e.lineno, e.colno, e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason;
    var msg = reason && reason.message ? reason.message : String(reason);
    reportError('Unhandled promise rejection: ' + msg, '', 0, 0, reason && reason.stack);
  });
  window._seReportError = reportError;

  // Parse initial data
  var _fields = {};
  var _data = {};
  try { _fields = JSON.parse('${safeFields}'); } catch(e) {}
  try { _data = JSON.parse('${safeData}'); } catch(e) {}

  // Mock StreamElements module
  window.se_module = {
    options: _fields,
    api: {
      call: function(endpoint, params, callback) {
        console.log('[SE Mock API] Call:', endpoint, params);
        if (typeof callback === 'function') callback({ success: true, data: null });
      },
      getOption: function(key) { return _fields[key] !== undefined ? _fields[key] : null; },
      setOption: function(key, value) { _fields[key] = value; }
    },
    data: _data,
    channel: {
      username: 'demo_streamer',
      apiToken: 'mock-token',
      providerId: '000000',
      avatar: '',
    },
    session: {
      data: _data,
      settings: _fields,
    },
    events: {
      _handlers: {},
      on: function(event, handler) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(handler);
      },
      once: function(event, handler) {
        var self = this;
        var wrapped = function() {
          handler.apply(null, arguments);
          var idx = self._handlers[event].indexOf(wrapped);
          if (idx > -1) self._handlers[event].splice(idx, 1);
        };
        this.on(event, wrapped);
      },
      emit: function(event, data) {
        var handlers = this._handlers[event] || [];
        for (var i = 0; i < handlers.length; i++) {
          try { handlers[i](data); } catch(e) { console.error('[SE Event Error]', e); }
        }
      },
      emitAll: function(data) {
        for (var event in this._handlers) {
          if (this._handlers.hasOwnProperty(event)) {
            this._handlers[event].forEach(function(h) { try { h(data); } catch(e) {} });
          }
        }
      }
    },
    utils: {
      parseJSON: function(str) { try { return JSON.parse(str); } catch(e) { return null; } },
      currencyFormat: function(amount, currency, decimals) {
        try {
          return (amount / 100).toLocaleString(undefined, {
            minimumFractionDigits: decimals || 2, maximumFractionDigits: decimals || 2
          });
        } catch(e) { return String(amount / 100); }
      }
    },
    css: { add: function() {}, remove: function() {} }
  };

  window.legacyEvents = {
    _listeners: {},
    on: function(event, handler) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(handler);
    },
    trigger: function(event, data) {
      var listeners = this._listeners[event] || [];
      for (var i = 0; i < listeners.length; i++) {
        try { listeners[i](data); } catch(e) { console.error('[Legacy Event Error]', e); }
      }
    }
  };

  // SE_API global alias
  window.SE_API = {
    counters: {
      get: function(name, cb) { if (typeof cb === 'function') cb({ counter: name, value: 0 }); },
    },
    store: {
      get: function(key, cb) {
        var val = null;
        try { val = JSON.parse(localStorage.getItem('se_mock_' + key) || 'null'); } catch(e) {}
        if (typeof cb === 'function') cb(val);
      },
      set: function(key, value, cb) {
        try { localStorage.setItem('se_mock_' + key, JSON.stringify(value)); } catch(e) {}
        if (typeof cb === 'function') cb({ success: true });
      }
    },
    resumeQueue: function() {},
    sanitize: function(payload, cb) { if (typeof cb === 'function') cb({ result: { input: payload, sanitized: payload, skipped: [] } }); },
    getOverlayStatus: function() { return { muted: false, isEditorMode: false }; },
    setField: function(key, value) { _fields[key] = value; },
  };

  // ---------- Selector generation ----------
  function generateSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id) return '#' + el.id;
    if (el.tagName === 'BODY') return 'body';
    var parts = [];
    var current = el;
    while (current && current.nodeType === 1 && current.tagName !== 'HTML') {
      var part = current.tagName.toLowerCase();
      if (current.id) { part = '#' + current.id; parts.unshift(part); break; }
      var cls = current.className;
      if (cls && typeof cls === 'string' && cls.trim()) {
        var classes = cls.trim().split(/\\s+/).filter(Boolean);
        if (classes.length > 0) part += '.' + classes[0];
      }
      if (current.parentNode) {
        var siblings = Array.from(current.parentNode.children).filter(function(s) { return s.tagName === current.tagName; });
        if (siblings.length > 1) part += ':nth-child(' + (siblings.indexOf(current) + 1) + ')';
      }
      parts.unshift(part);
      current = current.parentNode;
    }
    return parts.join(' > ');
  }

  function findElement(selector) {
    try { return document.querySelector(selector); } catch(e) { return null; }
  }

  // ---------- Hover highlight box ----------
  var hoverBox = document.createElement('div');
  hoverBox.style.cssText = 'position:fixed;pointer-events:none;border:1.5px dashed rgba(16,185,129,0.9);background:rgba(16,185,129,0.08);z-index:2147483000;display:none;box-sizing:border-box;';
  document.documentElement.appendChild(hoverBox);

  function getRect(el) {
    var r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function collectStyles(el) {
    var cs = window.getComputedStyle(el);
    var styles = {};
    for (var i = 0; i < STYLE_PROPS.length; i++) {
      styles[STYLE_PROPS[i]] = cs.getPropertyValue(STYLE_PROPS[i]) || '';
    }
    return styles;
  }

  function elementInfo(el) {
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: el.className ? (typeof el.className === 'string' ? el.className.split(' ').filter(Boolean) : []) : [],
      selector: generateSelector(el),
      styles: collectStyles(el),
      rect: getRect(el),
      elementType: el.getAttribute('data-se-element') || '',
      innerHTML: el.outerHTML ? el.outerHTML.substring(0, 500) : ''
    };
  }

  document.addEventListener('mouseover', function(e) {
    if (!window._seEditMode) return;
    var el = e.target;
    if (el === document.body || el === document.documentElement || el === hoverBox) { hoverBox.style.display = 'none'; return; }
    var r = getRect(el);
    hoverBox.style.display = 'block';
    hoverBox.style.top = r.top + 'px';
    hoverBox.style.left = r.left + 'px';
    hoverBox.style.width = r.width + 'px';
    hoverBox.style.height = r.height + 'px';
  }, true);

  document.addEventListener('mouseout', function() {
    hoverBox.style.display = 'none';
  }, true);

  // ---------- Click to select ----------
  document.addEventListener('click', function(e) {
    if (!window._seEditMode) return;
    var el = e.target;
    if (el === document.body || el === document.documentElement) return;
    e.preventDefault();
    e.stopPropagation();
    var info = elementInfo(el);
    info._source = 'se-inspector';
    info.type = 'ELEMENT_SELECTED';
    parent.postMessage(info, '*');
  }, true);

  // ---------- Lottie auto-init ----------
  function initLotties() {
    if (!window.lottie) return;
    var nodes = document.querySelectorAll('[data-lottie-src]:not([data-lottie-ready])');
    nodes.forEach(function(node) {
      var src = node.getAttribute('data-lottie-src');
      if (!src) return;
      node.setAttribute('data-lottie-ready', '1');
      node.innerHTML = '';
      try {
        var animData = null;
        if (src.indexOf('data:') === 0) {
          var base64Part = src.split(',')[1];
          var jsonStr = decodeURIComponent(escape(atob(base64Part)));
          animData = JSON.parse(jsonStr);
        }
        if (animData) {
          window.lottie.loadAnimation({
            container: node,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            animationData: animData
          });
        }
      } catch(err) { console.error('[Lottie Init Error]', err); }
    });
  }

  // ---------- Layer list ----------
  function sendLayers() {
    var layers = [];
    var elements = document.querySelectorAll('body > *');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el === hoverBox) continue;
      var cs = window.getComputedStyle(el);
      layers.push({
        id: el.id || ('layer-' + i),
        tag: el.tagName.toLowerCase(),
        selector: generateSelector(el),
        zIndex: parseInt(cs.zIndex) || 0,
        visible: cs.display !== 'none' && cs.visibility !== 'hidden',
        locked: false,
        elementType: el.getAttribute('data-se-element') || '',
        name: el.id || el.tagName.toLowerCase()
      });
    }
    parent.postMessage({ _source: 'se-inspector', type: 'LAYERS_DATA', layers: layers }, '*');
  }

  var layerRefreshTimeout = null;
  function scheduleLayersRefresh() {
    if (layerRefreshTimeout) clearTimeout(layerRefreshTimeout);
    layerRefreshTimeout = setTimeout(sendLayers, 150);
  }

  try {
    var observer = new MutationObserver(function() {
      scheduleLayersRefresh();
      initLotties();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
  } catch(e) {}

  // ---------- postMessage bridge ----------
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data._source !== 'se-mock') return;
    var msg = e.data;

    if (msg.type === 'FIELD_BUTTON_CLICKED') {
      var fieldKey = msg.key;
      var btnEvent = new CustomEvent('onEventReceived', {
        detail: {
          listener: 'field-button',
          event: {
            field: fieldKey,
            name: fieldKey,
            value: fieldKey
          }
        }
      });
      window.dispatchEvent(btnEvent);
      window.dispatchEvent(new CustomEvent('se-field-button', { detail: { key: fieldKey } }));
    }

    if (msg.type === 'FIRE_EVENT') {
      var eventType = msg.eventType;
      var eventData = msg.eventData || {};
      if (window.se_module && window.se_module.events) window.se_module.events.emit(eventType, eventData);
      if (window.legacyEvents) {
        var legacyMap = {
          'tip': 'tip', 'follower': 'new_follower', 'subscriber': 'subscriber',
          'resubscriber': 'resubscriber', 'cheer': 'cheer', 'gift_subscriber': 'gift_subscriber',
          'prime_subscriber': 'prime_subscriber', 'raid': 'raid', 'follow': 'follow',
          'chat': 'chat', 'goal_update': 'goal_update', 'sub_milestone': 'sub_milestone'
        };
        window.legacyEvents.trigger(legacyMap[eventType] || eventType, eventData);
      }
      var customEvent = new CustomEvent('se-' + eventType, { detail: eventData });
      window.dispatchEvent(customEvent);

      var listenerMap = {
        'tip': 'tip-latest',
        'follower': 'follower-latest',
        'subscriber': 'subscriber-latest',
        'resubscriber': 'subscriber-latest',
        'gift_subscriber': 'subscriber-latest',
        'prime_subscriber': 'subscriber-latest',
        'cheer': 'cheer-latest',
        'raid': 'raid-latest',
        'follow': 'follower-latest',
        'chat': 'message',
        'goal_update': 'follower-goal',
        'sub_milestone': 'subscriber-milestone'
      };
      var listener = listenerMap[eventType] || (eventType + '-latest');
      var finalEvent = eventData;
      if (listener === 'message') {
        var BADGE_URLS = {
          'moderator': 'https://static-cdn.jtvnw.net/badges/v1/3262bbd7-e4bf-4b12-89cd-e61c5550a1d3/3',
          'subscriber': 'https://static-cdn.jtvnw.net/badges/v1/5d27b58c-7f8e-43ae-890d-275d3db953b3/3',
          'broadcaster': 'https://static-cdn.jtvnw.net/badges/v1/552730c2-f34a-4fd9-87a7-33f7ccaa60a3/3',
          'vip': 'https://static-cdn.jtvnw.net/badges/v1/b81c956d-1347-434b-b4f0-d0b2f3559d1e/3'
        };
        var mappedBadges = [];
        if (eventData.badges) {
          mappedBadges = eventData.badges.map(function(b) {
            return {
              type: b.type,
              version: b.version || '1',
              url: BADGE_URLS[b.type] || ''
            };
          });
        } else if (eventData.tags && eventData.tags.badges) {
          var parts = eventData.tags.badges.split(',');
          parts.forEach(function(p) {
            var spl = p.split('/');
            if (spl[0]) {
              mappedBadges.push({
                type: spl[0],
                version: spl[1] || '1',
                url: BADGE_URLS[spl[0]] || ''
              });
            }
          });
        }
        finalEvent = {
          data: {
            time: Date.now(),
            tags: eventData.tags || {
              badges: eventData.badges ? eventData.badges.map(function(b) { return b.type + '/1'; }).join(',') : '',
              color: eventData.color || '#ffffff',
              'display-name': eventData.displayName || eventData.nick,
              mod: eventData.type === 'chat-mod' || eventData.type === 'chat-admin' ? '1' : '0',
              subscriber: eventData.type === 'chat-subscriber' ? '1' : '0',
              vip: eventData.type === 'chat-vip' ? '1' : '0'
            },
            nick: eventData.nick,
            text: eventData.text,
            displayName: eventData.displayName || eventData.nick,
            badges: mappedBadges
          }
        };
      }
      var seEvent = new CustomEvent('onEventReceived', {
        detail: {
          listener: listener,
          event: finalEvent
        }
      });
      window.dispatchEvent(seEvent);
    }

    if (msg.type === 'UPDATE_DATA') {
      if (msg.dataKey === 'fields') {
        try {
          var parsed = JSON.parse(msg.dataValue || '{}');
          for (var k in window.se_module.options) delete window.se_module.options[k];
          Object.assign(window.se_module.options, parsed);
          _fields = window.se_module.options;
          if (window.se_module.session) window.se_module.session.settings = _fields;
        } catch(e) {}
      } else if (msg.dataKey === 'data') {
        try {
          Object.assign(window.se_module.data, JSON.parse(msg.dataValue || '{}'));
          _data = window.se_module.data;
        } catch(e) {}
      }
      if (typeof window._seRefireWidgetLoad === 'function') {
        try { window._seRefireWidgetLoad(); } catch(e) { console.error(e); }
      }
    }

    if (msg.type === 'GET_LAYERS') sendLayers();

    if (msg.type === 'UPDATE_OVERRIDE_CSS') {
      var styleTag = document.getElementById('overrides');
      if (styleTag) styleTag.textContent = msg.css || '';
    }

    if (msg.type === 'SET_EDIT_MODE') {
      window._seEditMode = !!msg.enabled;
      if (window._seEditMode) {
        document.body.classList.add('_se-edit-mode');
      } else {
        document.body.classList.remove('_se-edit-mode');
        hoverBox.style.display = 'none';
      }
    }

    if (msg.type === 'GET_RECT') {
      var el1 = findElement(msg.selector);
      if (el1) {
        parent.postMessage({ _source: 'se-inspector', type: 'RECT_DATA', selector: msg.selector, rect: getRect(el1), requestId: msg.requestId }, '*');
      }
    }

    if (msg.type === 'BEGIN_DRAG') {
      var el2 = findElement(msg.selector);
      if (!el2) return;
      var cs2 = window.getComputedStyle(el2);
      var r2 = getRect(el2);
      var parentEl = el2.offsetParent || document.body;
      var pRect = parentEl.getBoundingClientRect();
      if (cs2.position !== 'absolute' && cs2.position !== 'fixed') {
        el2.style.setProperty('position', 'absolute', 'important');
        el2.style.setProperty('top', (r2.top - pRect.top) + 'px', 'important');
        el2.style.setProperty('left', (r2.left - pRect.left) + 'px', 'important');
        el2.style.setProperty('margin', '0', 'important');
      }
      if (!cs2.width || cs2.width === 'auto') {
        el2.style.setProperty('width', r2.width + 'px', 'important');
      }
      if (!cs2.height || cs2.height === 'auto') {
        el2.style.setProperty('height', r2.height + 'px', 'important');
      }
      var finalRect = getRect(el2);
      var finalCs = window.getComputedStyle(el2);
      parent.postMessage({
        _source: 'se-inspector', type: 'DRAG_READY', selector: msg.selector,
        rect: finalRect,
        top: parseFloat(finalCs.top) || 0,
        left: parseFloat(finalCs.left) || 0,
        width: parseFloat(finalCs.width) || finalRect.width,
        height: parseFloat(finalCs.height) || finalRect.height,
        requestId: msg.requestId
      }, '*');
    }

    if (msg.type === 'SET_LIVE_STYLE') {
      var el3 = findElement(msg.selector);
      if (el3 && msg.styles) {
        for (var prop in msg.styles) {
          if (msg.styles.hasOwnProperty(prop)) {
            try { el3.style.setProperty(prop, msg.styles[prop], 'important'); } catch(e) {}
          }
        }
      }
    }

    if (msg.type === 'SCROLL_INTO_VIEW') {
      var el4 = findElement(msg.selector);
      if (el4 && el4.scrollIntoView) el4.scrollIntoView({ block: 'center', inline: 'center' });
    }
  });

  window.addEventListener('resize', function() {
    parent.postMessage({ _source: 'se-inspector', type: 'VIEWPORT_RESIZE' }, '*');
  });

  // ---------- Fire the SE onWidgetLoad event ----------
  function fireWidgetLoad() {
    var payload = {
      channel: {
        username: 'demo_streamer',
        apiToken: 'mock-token',
        providerId: '000000',
        avatar: ''
      },
      session: { data: _data, settings: _fields },
      fieldData: _fields,
      currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
      recents: [],
      overlay: { muted: false, isEditorMode: false }
    };
    var evt = new CustomEvent('onWidgetLoad', { detail: payload });
    window.dispatchEvent(evt);
    if (window.se_module && window.se_module.events) {
      window.se_module.events.emit('widget:load', payload);
    }
    if (window.legacyEvents) {
      window.legacyEvents.trigger('widget:load', payload);
    }
  }

  // ---------- Re-fire widget:load when fields change ----------
  function refireOnFieldsUpdate() {
    fireWidgetLoad();
    var evt = new CustomEvent('onSessionUpdate', {
      detail: { session: { data: _data, settings: _fields } }
    });
    window.dispatchEvent(evt);
  }

  window.addEventListener('load', function() {
    initLotties();
    sendLayers();
    setTimeout(fireWidgetLoad, 30);
  });
  setTimeout(function() { initLotties(); sendLayers(); }, 50);

  window._seRefireWidgetLoad = refireOnFieldsUpdate;

  console.log('[SE Mock] Initialized with fields:', _fields, 'data:', _data);
})();
</script>
  `;
}
