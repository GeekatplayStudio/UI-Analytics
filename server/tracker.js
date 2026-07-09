(function() {
  // Prevent duplicate initialization
  if (window.__eventflow_initialized) return;
  window.__eventflow_initialized = true;

  // Configuration and state
  let domainId = null;
  let sessionId = null;
  let lastEventTime = Date.now();
  let eventQueue = [];
  let maxScrollDepth = 0;
  let lastScrollDepth = 0;
  let clickHistory = [];

  // Auto-detect Ingestion Endpoint based on script source
  const scriptTag = document.getElementById('eventflow-tracker') || document.currentScript;
  const scriptUrl = scriptTag ? scriptTag.src : 'http://localhost:3001/tracker.js';
  const collectUrl = new URL('/api/collect', scriptUrl).href;

  // Helper: Generate UUID v4 (Simple client-side implementation)
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Helper: Get or create session ID
  function getSessionId() {
    if (!sessionId) {
      sessionId = sessionStorage.getItem('ef_session_id');
      if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem('ef_session_id', sessionId);
      }
    }
    return sessionId;
  }

  // Helper: Extract element descriptors safely
  function getElementDetails(el) {
    if (!el) return { tag: null, id: null, classes: null };
    
    // Fallback if target is a text node
    if (el.nodeType === 3) el = el.parentNode;

    return {
      tag: el.tagName || null,
      id: el.id || null,
      classes: el.className && typeof el.className === 'string' ? el.className.trim().split(/\s+/).join('.') : null
    };
  }

  // Helper: Determine if an element contains sensitive PII
  function isSensitiveElement(el) {
    if (!el) return false;
    
    const type = (el.getAttribute('type') || '').toLowerCase();
    const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
    const name = (el.getAttribute('name') || '').toLowerCase();
    const id = (el.id || '').toLowerCase();

    // Check for password types, CCs, sensitive identifiers, or custom data attributes
    if (
      type === 'password' ||
      type === 'email' ||
      type === 'tel' ||
      autocomplete.includes('cc-') ||
      autocomplete.includes('card') ||
      autocomplete.includes('password') ||
      name.includes('password') ||
      name.includes('card') ||
      name.includes('email') ||
      id.includes('password') ||
      id.includes('card') ||
      id.includes('email') ||
      el.hasAttribute('data-private') ||
      el.hasAttribute('data-sensitive')
    ) {
      return true;
    }
    return false;
  }

  // Queue event for batching
  function queueEvent(type, details = {}) {
    if (!domainId) return; // Wait for init

    const now = Date.now();
    const timeDelta = now - lastEventTime;
    lastEventTime = now;

    const event = {
      session_id: getSessionId(),
      event_type: type,
      timestamp: now,
      time_delta_ms: timeDelta,
      page_url: window.location.href,
      ...details
    };

    eventQueue.push(event);

    // Dispatch local event for sandbox visualization
    try {
      window.dispatchEvent(new CustomEvent('eventflow-tracked', { detail: event }));
    } catch (e) {}
  }

  // Transmit queued events
  function transmitEvents(sync = false) {
    if (eventQueue.length === 0 || !domainId) return;

    const payload = JSON.stringify({
      domain_id: domainId,
      events: eventQueue
    });

    // Clear local queue immediately to prevent duplicate sends
    const eventsToSend = [...eventQueue];
    eventQueue = [];

    if (sync && navigator.sendBeacon) {
      // Use sendBeacon for reliable unloading
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(collectUrl, blob);
    } else {
      // Use standard fetch
      fetch(collectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      }).catch(err => {
        console.error('[EventFlow] Transmission failed, prepending events back to queue', err);
        // Prepend events back to retry
        eventQueue = eventsToSend.concat(eventQueue);
      });
    }
  }

  // Throttled Scroll Tracking
  let scrollTimeout = null;
  function handleScroll() {
    if (scrollTimeout) return;

    scrollTimeout = setTimeout(function() {
      scrollTimeout = null;
      
      const docHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
      const winHeight = window.innerHeight;
      const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      
      const depth = Math.min(100, Math.round(((scrollTop + winHeight) / docHeight) * 100));
      
      if (depth > maxScrollDepth) {
        maxScrollDepth = depth;
        // Only queue scroll events when depth changes significantly (e.g. by 5%) to avoid cluttering DB
        if (maxScrollDepth - lastScrollDepth >= 5) {
          queueEvent('scroll', { scroll_depth_percent: maxScrollDepth });
          lastScrollDepth = maxScrollDepth;
        }
      }
    }, 200);
  }

  function isInteractive(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'a' || tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'option') {
      return true;
    }
    if (el.hasAttribute('onclick') || el.getAttribute('role') === 'button') {
      return true;
    }
    let parent = el.parentNode;
    let depth = 0;
    while (parent && depth < 3) {
      if (parent.tagName) {
        const pTag = parent.tagName.toLowerCase();
        if (pTag === 'button' || pTag === 'a' || parent.hasAttribute('onclick') || parent.getAttribute('role') === 'button') {
          return true;
        }
      }
      parent = parent.parentNode;
      depth++;
    }
    try {
      const style = window.getComputedStyle(el);
      if (style && style.cursor === 'pointer') {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Global listeners
  function initListeners() {
    // Clicks (Detecting Dead Clicks & Rage Clicks)
    document.addEventListener('click', function(e) {
      const el = e.target;
      const details = getElementDetails(el);
      const now = Date.now();

      const clickEventDetails = {
        element_id: details.id,
        element_tag: details.tag,
        element_class: details.classes,
        viewport_x: e.clientX,
        viewport_y: e.clientY
      };

      // 1. Queue standard click
      queueEvent('click', clickEventDetails);

      // 2. Dead Click Detection
      if (!isInteractive(el)) {
        queueEvent('dead_click', clickEventDetails);
      }

      // 3. Rage Click Detection
      clickHistory.push({ el: el, time: now });
      if (clickHistory.length > 3) {
        clickHistory.shift();
      }
      if (clickHistory.length === 3) {
        const c1 = clickHistory[0];
        const c2 = clickHistory[1];
        const c3 = clickHistory[2];
        if (c1.el === c2.el && c2.el === c3.el && (c3.time - c1.time) < 1500) {
          queueEvent('rage_click', clickEventDetails);
          clickHistory = []; // Clear
        }
      }
    }, true);

    // Scroll
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Inputs (Tracking interaction, focusing, changes - with PII Protection)
    document.addEventListener('focusin', function(e) {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const details = getElementDetails(el);
        const sensitive = isSensitiveElement(el);
        
        queueEvent('input_focus', {
          element_id: details.id,
          element_tag: details.tag,
          element_class: details.classes,
          // Indicate if sensitive for UI reporting
          element_class: details.classes ? details.classes + (sensitive ? '.sensitive' : '') : (sensitive ? 'sensitive' : null)
        });
      }
    }, true);

    document.addEventListener('change', function(e) {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        const details = getElementDetails(el);
        const sensitive = isSensitiveElement(el);
        
        queueEvent('input_change', {
          element_id: details.id,
          element_tag: details.tag,
          element_class: details.classes,
          element_class: details.classes ? details.classes + (sensitive ? '.sensitive' : '') : (sensitive ? 'sensitive' : null)
        });
      }
    }, true);

    // Keystroke (Throttled, just logs activity, NO PII values are saved)
    let inputTimeout = null;
    document.addEventListener('input', function(e) {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (inputTimeout) return;
        
        inputTimeout = setTimeout(function() {
          inputTimeout = null;
          const details = getElementDetails(el);
          const sensitive = isSensitiveElement(el);
          
          queueEvent('input_type', {
            element_id: details.id,
            element_tag: details.tag,
            element_class: details.classes ? details.classes + (sensitive ? '.sensitive' : '') : (sensitive ? 'sensitive' : null)
          });
        }, 1000); // Only log typing events at most once per second per element
      }
    }, true);

    // Send data when page is hidden or unloaded
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        transmitEvents(true);
      }
    });

    window.addEventListener('beforeunload', function() {
      transmitEvents(true);
    });

    // Periodic Ingestion (Every 2 seconds)
    setInterval(function() {
      transmitEvents(false);
    }, 2000);

    // Form Field Validation Error Tracking (PII Protected)
    document.addEventListener('focusout', function(e) {
      const el = e.target;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        setTimeout(function() {
          if (el.checkValidity && !el.checkValidity()) {
            const details = getElementDetails(el);
            queueEvent('input_error', {
              element_id: details.id,
              element_tag: details.tag,
              element_class: details.classes ? details.classes + '.error' : 'error',
              error_message: el.validationMessage || 'Invalid value'
            });
          }
        }, 150);
      }
    }, true);
  }

  // Handle EventFlow queued calls before tracker loaded
  function processCommandQueue() {
    const o = window['EventFlowObject'];
    if (o && window[o]) {
      const queue = window[o].q || [];
      // Replace window function with direct execution
      window[o] = function() {
        const args = Array.prototype.slice.call(arguments);
        executeCommand(args);
      };

      // Process existing queue items
      for (let i = 0; i < queue.length; i++) {
        executeCommand(queue[i]);
      }
    }
  }

  function executeCommand(args) {
    const action = args[0];
    if (action === 'init') {
      domainId = args[1];
      queueEvent('init');
      transmitEvents(); // Send init event immediately
    }
  }

  // Boot the tracker
  initListeners();
  processCommandQueue();

  console.log('[EventFlow] Tracker initialized and listening.');
})();
