(function() {
  // Prevent duplicate initialization
  if (window.__eventflow_initialized) return;
  window.__eventflow_initialized = true;

  const TRACKER_VERSION = '1.2.0';

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
    let currentSessionId = sessionStorage.getItem('ef_session_id');
    if (!currentSessionId) {
      currentSessionId = generateUUID();
      sessionStorage.setItem('ef_session_id', currentSessionId);
    }
    return currentSessionId;
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
      version: TRACKER_VERSION,
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

    // Listen to hash change to capture SPA navigation events
    window.addEventListener('hashchange', function() {
      queueEvent('page_view', {
        page_url: window.location.href
      });
    });

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

    // JS Exceptions Capture
    window.addEventListener('error', function(e) {
      queueEvent('js_error', {
        error_message: e.message || 'Uncaught Exception',
        stack: e.error ? e.error.stack : `${e.message} at ${e.filename}:${e.lineno}:${e.colno}`
      });
    });

    // Console Errors Overrides
    const originalConsoleError = console.error;
    console.error = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(arg => {
        if (arg instanceof Error) return arg.message + '\n' + arg.stack;
        if (typeof arg === 'object') {
          try { return JSON.stringify(arg); } catch(err) { return String(arg); }
        }
        return String(arg);
      }).join(' ');

      queueEvent('console_error', {
        error_message: message || 'Console error'
      });
      originalConsoleError.apply(console, args);
    };

    // Fetch API Roundtrip Interception
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');
      const method = (init && init.method) || (input instanceof Request ? input.method : 'GET');

      if (url.includes('/api/collect')) {
        return originalFetch.apply(this, arguments);
      }

      const startTime = Date.now();
      try {
        const response = await originalFetch.apply(this, arguments);
        const duration = Date.now() - startTime;

        queueEvent('network_request', {
          page_url: window.location.href,
          element_id: url.substring(0, 120),
          method: method.toUpperCase(),
          status: response.status,
          duration_ms: duration
        });

        return response;
      } catch (err) {
        const duration = Date.now() - startTime;
        queueEvent('network_request', {
          page_url: window.location.href,
          element_id: url.substring(0, 120),
          method: method.toUpperCase(),
          status: 0,
          duration_ms: duration,
          error_message: err.message || 'Fetch connection error'
        });
        throw err;
      }
    };
  }

  // Handle EventFlow queued calls before tracker loaded
  function processCommandQueue() {
    const o = window['EventFlowObject'] || 'ef';
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

  // Inject visual slide-out feedback HTML button and form widgets
  function initFeedbackWidget() {
    if (document.getElementById('ef-feedback-tab')) return;

    const tab = document.createElement('div');
    tab.id = 'ef-feedback-tab';
    tab.innerText = 'Feedback';
    tab.style.position = 'fixed';
    tab.style.bottom = '20px';
    tab.style.right = '20px';
    tab.style.background = '#27272a';
    tab.style.color = '#f4f4f5';
    tab.style.border = '1px solid #3f3f46';
    tab.style.borderRadius = '6px';
    tab.style.padding = '8px 14px';
    tab.style.fontSize = '12px';
    tab.style.fontWeight = '600';
    tab.style.cursor = 'pointer';
    tab.style.zIndex = '99999';
    tab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    tab.style.transition = 'background 0.2s';
    
    tab.onmouseover = function() { tab.style.background = '#3f3f46'; };
    tab.onmouseout = function() { tab.style.background = '#27272a'; };

    const modal = document.createElement('div');
    modal.id = 'ef-feedback-modal';
    modal.style.position = 'fixed';
    modal.style.bottom = '70px';
    modal.style.right = '20px';
    modal.style.width = '280px';
    modal.style.background = '#18181b';
    modal.style.border = '1px solid #27272a';
    modal.style.borderRadius = '8px';
    modal.style.padding = '16px';
    modal.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
    modal.style.zIndex = '99999';
    modal.style.display = 'none';
    modal.style.flexDirection = 'column';
    modal.style.gap = '12px';
    modal.style.fontFamily = 'sans-serif';
    modal.style.color = '#f4f4f5';

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #27272a;padding-bottom:8px;">
        <span style="font-size:13px;font-weight:600;">Share Feedback</span>
        <span id="ef-feedback-close" style="cursor:pointer;font-size:14px;color:#a1a1aa;">&times;</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:11px;color:#a1a1aa;">Was this page easy to use?</span>
        <div style="display:flex;gap:8px;">
          <button id="ef-btn-yes" type="button" style="flex:1;background:#27272a;border:1px solid #3f3f46;color:#f4f4f5;border-radius:4px;padding:6px;font-size:11.5px;cursor:pointer;outline:none;">Yes</button>
          <button id="ef-btn-no" type="button" style="flex:1;background:#27272a;border:1px solid #3f3f46;color:#f4f4f5;border-radius:4px;padding:6px;font-size:11.5px;cursor:pointer;outline:none;">No</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <span style="font-size:11px;color:#a1a1aa;">Tell us details (optional):</span>
        <textarea id="ef-feedback-text" placeholder="Explain your experience..." style="width:100%;height:60px;background:#09090b;border:1px solid #27272a;border-radius:4px;color:#f4f4f5;padding:6px;font-size:11.5px;resize:none;outline:none;box-sizing:border-box;"></textarea>
      </div>
      <button id="ef-feedback-submit" type="button" style="width:100%;background:#f4f4f5;border:none;color:#18181b;border-radius:4px;padding:8px;font-size:12px;font-weight:600;cursor:pointer;">Submit</button>
    `;

    document.body.appendChild(tab);
    document.body.appendChild(modal);

    let rating = null;
    const btnYes = modal.querySelector('#ef-btn-yes');
    const btnNo = modal.querySelector('#ef-btn-no');
    
    btnYes.onclick = function() {
      rating = 'yes';
      btnYes.style.background = '#f4f4f5';
      btnYes.style.color = '#18181b';
      btnNo.style.background = '#27272a';
      btnNo.style.color = '#f4f4f5';
    };

    btnNo.onclick = function() {
      rating = 'no';
      btnNo.style.background = '#f4f4f5';
      btnNo.style.color = '#18181b';
      btnYes.style.background = '#27272a';
      btnYes.style.color = '#f4f4f5';
    };

    modal.querySelector('#ef-feedback-close').onclick = function() {
      modal.style.display = 'none';
    };

    tab.onclick = function() {
      modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    };

    modal.querySelector('#ef-feedback-submit').onclick = function() {
      const comments = modal.querySelector('#ef-feedback-text').value || '';
      queueEvent('user_feedback', {
        page_url: window.location.href,
        element_id: 'feedback-modal-submission',
        error_message: comments.substring(0, 500),
        version: rating || 'none'
      });

      modal.innerHTML = `
        <div style="text-align:center;padding:16px 0;font-size:12px;color:#a1a1aa;">
          Thank you for sharing your feedback!
        </div>
      `;

      setTimeout(() => {
        modal.style.display = 'none';
        tab.style.display = 'none';
      }, 1800);
    };
  }

  // Boot the tracker
  initListeners();
  processCommandQueue();
  initFeedbackWidget();

  console.log('[EventFlow] Tracker initialized and listening.');
})();
