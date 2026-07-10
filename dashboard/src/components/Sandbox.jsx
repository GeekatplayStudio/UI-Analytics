import React, { useState, useEffect, useRef } from 'react';

export default function Sandbox({ activeDomain }) {
  const [logs, setLogs] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [selectedSize, setSelectedSize] = useState('M');
  const [cartCount, setCartCount] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (!activeDomain) return;

    // Load tracker script
    let script = document.getElementById('eventflow-tracker');
    if (!script) {
      script = document.createElement('script');
      script.id = 'eventflow-tracker';
      script.src = '/tracker.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Initialize EventFlow tracker
    window.ef = window.ef || function() {
      (window.ef.q = window.ef.q || []).push(arguments);
    };
    window.ef('init', activeDomain.id);

    // Listen to tracked events for live console output
    const handleTrackedEvent = (e) => {
      const eventData = e.detail;
      setLogs((prev) => [...prev, {
        id: Math.random(),
        type: eventData.event_type,
        time: new Date(eventData.timestamp).toLocaleTimeString(),
        delta: eventData.time_delta_ms,
        elId: eventData.element_id,
        elTag: eventData.element_tag,
        elClass: eventData.element_class,
        depth: eventData.scroll_depth_percent,
        coords: eventData.viewport_x !== null ? `(${eventData.viewport_x}, ${eventData.viewport_y})` : null,
        errorMessage: eventData.error_message,
        stack: eventData.stack,
        method: eventData.method,
        status: eventData.status,
        duration: eventData.duration_ms
      }]);
    };

    window.addEventListener('eventflow-tracked', handleTrackedEvent);

    return () => {
      window.removeEventListener('eventflow-tracked', handleTrackedEvent);
    };
  }, [activeDomain]);

  useEffect(() => {
    // Scroll to bottom of console logs
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const clearConsole = () => {
    setLogs([]);
  };

  if (!activeDomain) {
    return (
      <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Please register and select a domain first to unlock the interactive sandbox.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
      
      {/* Target Webpage Simulation */}
      <div className="glass-card fade-in" style={{ border: '1px dashed var(--border-color-hover)', position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '20px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Sandbox target site: {activeDomain.name}
        </div>

        {/* Mock Store Header */}
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>AURA Athletics</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mock Store Sandbox</span>
          </div>
          <div style={{ position: 'relative', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px' }}>
            <span>Cart: <strong style={{ color: 'var(--text-primary)' }}>{cartCount}</strong></span>
            <span style={{ color: 'var(--border-color)' }}>|</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setWishlisted(!wishlisted)}>
              {wishlisted ? 'Saved' : 'Save'}
            </span>
          </div>
        </div>

        {/* Mock Product Layout */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* SVG Shoes Illustration */}
            <div style={{
              width: '100px',
              height: '100px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--accent-secondary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-2.02-2.02m2.02 2.02h9.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '18px', color: '#fff' }}>Vortex Running Shoes</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 8px' }}>High-performance athletic gear.</p>
              <strong style={{ color: 'var(--accent-secondary)', fontSize: '16px' }}>$149.00</strong>
            </div>
          </div>

          {/* Size Selectors */}
          <div>
            <label className="form-label" style={{ fontSize: '11px' }}>Select Size</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {['S', 'M', 'L', 'XL'].map(size => (
                <button
                  key={size}
                  id={`size-${size.toLowerCase()}-btn`}
                  onClick={() => setSelectedSize(size)}
                  className="btn"
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    flex: 1,
                    background: selectedSize === size ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                    color: selectedSize === size ? '#fff' : 'var(--text-primary)',
                    border: '1px solid ' + (selectedSize === size ? 'var(--accent-primary)' : 'var(--border-color)')
                  }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Long Scroll Description (Triggering scroll events) */}
          <div>
            <label className="form-label" style={{ fontSize: '11px' }}>Product Specifications (Scroll to read)</label>
            <div 
              id="product-specifications-container"
              style={{
                height: '80px',
                overflowY: 'auto',
                padding: '8px 12px',
                background: 'rgba(8,12,20,0.5)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                marginTop: '6px'
              }}
            >
              <p style={{ marginBottom: '10px' }}>
                Engineered with VortexMesh™ technology, these sneakers deliver maximum breathability and support for long-distance marathon running.
              </p>
              <p style={{ marginBottom: '10px' }}>
                Featuring ReactGlow™ dual-density foam midsoles, each stride is cushioned with energy-returning compression to reduce fatigue.
              </p>
              <p style={{ marginBottom: '10px' }}>
                The rubber outsole is molded with multi-directional traction patterns, providing exceptional grip on both dry pavements and wet asphalt.
              </p>
              <p>
                A dynamic fit collar accommodates natural ankle flex, ensuring a snug, blister-free fit for athletes of all experience levels.
              </p>
            </div>
          </div>

          {/* Add to Cart and Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              id="add-to-cart-btn"
              className="btn btn-primary"
              style={{ flex: 2 }}
              onClick={() => setCartCount(c => c + 1)}
            >
              Add to Cart
            </button>
            <button
              id="wishlist-btn"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setWishlisted(!wishlisted)}
            >
              {wishlisted ? 'Saved' : 'Wishlist'}
            </button>
          </div>

          {/* Checkout Button (Funnel Step) */}
          <button
            id="checkout-btn"
            className="btn btn-accent"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => alert('Demo checkout completed! Event tracked successfully.')}
          >
            Instant Checkout Now
          </button>

          {/* Input Fields to verify PII Filtering */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>PII Protection Validation Form</span>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Newsletter Email (PII Sensitive)</label>
              <input
                id="newsletter-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Account Password (PII Masked)</label>
              <input
                id="sandbox-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Private Notes (Data-Private Attribute)</label>
              <input
                id="private-notes-input"
                type="text"
                data-private="true"
                placeholder="This input has data-private='true'"
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px', fontSize: '13px' }}
              />
            </div>
            
            <button id="subscribe-btn" className="btn btn-secondary" style={{ padding: '8px', fontSize: '13px' }} type="button">
              Submit Form
            </button>

            {/* Developer Diagnostics sandbox panel */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Developer Diagnostics Sandbox</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Click buttons below to trigger diagnostic events:</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  id="trigger-console-error-btn"
                  onClick={() => console.error("Telemetry validation: Database token expired")}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '11px', flex: 1, minWidth: '120px' }}
                >
                  Log Console Error
                </button>
                <button
                  id="trigger-js-exception-btn"
                  onClick={() => {
                    setTimeout(() => {
                      throw new Error("ReferenceError: activeDomainContext is not defined");
                    }, 10);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '11px', flex: 1, minWidth: '120px', color: 'var(--accent-warning)', borderColor: 'rgba(217, 119, 6, 0.2)' }}
                >
                  Throw JS Exception
                </button>
                <button
                  id="trigger-failed-fetch-btn"
                  onClick={() => fetch('/api/v1/simulated-broken-api-route')}
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '11px', flex: 1, minWidth: '120px' }}
                >
                  Trigger 404 Fetch
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Tracker Log Console */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Tracker Live Console</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Captured events in this session</span>
          </div>
          <button 
            onClick={clearConsole} 
            className="btn btn-secondary" 
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Clear
          </button>
        </div>

        {/* Console Box */}
        <div style={{
          flex: 1,
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          padding: '12px',
          fontFamily: 'monospace',
          fontSize: '12.5px',
          color: 'var(--text-primary)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxHeight: '450px'
        }}>
          {logs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
              &gt; Waiting for user interaction... <br />
              (Click, scroll or type in the sandbox)
            </div>
          ) : (
            logs.map(log => {
              const isSensitive = log.elClass?.includes('sensitive') || log.elId?.includes('password') || log.elId?.includes('email') || log.elId?.includes('private');
              const isErrorLog = log.type === 'js_error' || log.type === 'console_error';
              const isNetworkLog = log.type === 'network_request';

              return (
                <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: isErrorLog ? 'var(--accent-warning)' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    <span>event_type: {log.type}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{log.time}</span>
                  </div>
                  <div style={{ paddingLeft: '12px', marginTop: '2px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {isErrorLog && (
                      <>
                        <span style={{ color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                          {log.errorMessage}
                        </span>
                        {log.stack && (
                          <pre style={{
                            background: 'rgba(0,0,0,0.2)',
                            padding: '6px',
                            borderRadius: '4px',
                            fontSize: '9.5px',
                            color: 'var(--text-muted)',
                            overflowX: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all'
                          }}>
                            {log.stack}
                          </pre>
                        )}
                      </>
                    )}

                    {isNetworkLog && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ color: '#fff', wordBreak: 'break-all' }}>
                          url: <code style={{ color: 'var(--text-primary)' }}>{log.elId}</code>
                        </span>
                        <span>
                          method: <strong>{log.method}</strong> | status: <strong style={{ color: log.status === 200 || log.status === 304 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{log.status === 0 ? 'Failed' : log.status}</strong> | duration: <strong>{log.duration}ms</strong>
                        </span>
                        {log.errorMessage && <span style={{ color: 'var(--accent-danger)' }}>error: {log.errorMessage}</span>}
                      </div>
                    )}

                    {!isErrorLog && !isNetworkLog && (
                      <>
                        {log.elTag && <span>tag: <strong style={{ color: '#fff' }}>{log.elTag}</strong></span>}
                        {log.elId && <span>id: <strong style={{ color: 'var(--text-primary)' }}>{log.elId}</strong></span>}
                        {log.elClass && (
                          <span>classes: <strong style={{ color: 'var(--text-muted)' }}>{log.elClass}</strong></span>
                        )}
                        {log.coords && <span>coordinates: {log.coords}</span>}
                        {log.depth !== undefined && <span>scroll_depth: {log.depth}%</span>}
                        {log.delta !== undefined && <span>time_delta: <strong>+{log.delta}ms</strong></span>}
                        {isSensitive && (
                          <span style={{ color: 'var(--accent-warning)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', marginTop: '2px' }}>
                            PII PROTECTION ENFORCED (NO VALUE CAPTURED)
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
      
    </div>
  );
}
