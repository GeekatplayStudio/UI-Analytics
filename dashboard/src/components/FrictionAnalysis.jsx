import React, { useState, useEffect } from 'react';

export default function FrictionAnalysis({ activeDomain }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(''); // Empty = All Sessions
  const [frictionData, setFrictionData] = useState([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  // Mock states to simulate the Sandbox appearance in read-only visual overlay mode
  const [selectedSize, setSelectedSize] = useState('M');
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    if (!activeDomain) return;
    fetchSessions();
    fetchFrictionData();
  }, [activeDomain, selectedSessionId]);

  const fetchSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await fetch(`/api/sessions?domain_id=${activeDomain.id}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const fetchFrictionData = async () => {
    setIsLoadingMetrics(true);
    try {
      let url = `/api/friction?domain_id=${activeDomain.id}`;
      if (selectedSessionId) {
        url += `&session_id=${selectedSessionId}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFrictionData(data);
      }
    } catch (error) {
      console.error('Error fetching friction data:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const getFrictionStyle = (elementId) => {
    if (!showOverlay) return {};
    const item = frictionData.find(d => d.element_id === elementId);
    if (!item) return {};

    if (item.friction_level === 'high') {
      return {
        boxShadow: '0 0 15px rgba(239, 68, 68, 0.8), inset 0 0 8px rgba(239, 68, 68, 0.4)',
        borderColor: 'var(--accent-danger)',
        animation: 'pulse-red 2s infinite alternate',
        position: 'relative'
      };
    } else if (item.friction_level === 'medium') {
      return {
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.8), inset 0 0 8px rgba(245, 158, 11, 0.4)',
        borderColor: 'var(--accent-warning)',
        position: 'relative'
      };
    } else if (item.friction_level === 'low') {
      return {
        boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
        borderColor: 'var(--accent-success)',
        position: 'relative'
      };
    }
    return {};
  };

  const renderBadge = (elementId) => {
    if (!showOverlay) return null;
    const item = frictionData.find(d => d.element_id === elementId);
    if (!item) return null;

    const delaySec = (item.avg_delay_ms / 1000).toFixed(1);
    
    let badgeColor = 'var(--accent-success)';
    let badgeBg = 'rgba(16, 185, 129, 0.9)';
    let prefix = '✅';

    if (item.friction_level === 'high') {
      badgeColor = '#fff';
      badgeBg = 'rgba(239, 68, 68, 0.95)';
      prefix = '⚠️';
    } else if (item.friction_level === 'medium') {
      badgeColor = '#000';
      badgeBg = 'rgba(245, 158, 11, 0.95)';
      prefix = '⏳';
    }

    return (
      <div style={{
        position: 'absolute',
        top: '-12px',
        right: '4px',
        background: badgeBg,
        color: badgeColor,
        fontSize: '10px',
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        zIndex: 10,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        lineHeight: '1'
      }}>
        {prefix} {delaySec}s ({item.interactions}x)
      </div>
    );
  };

  // Run analytical diagnostics to return clear UX improvement sentences
  const getDiagnostics = () => {
    if (frictionData.length === 0) {
      return ["No user interaction events registered yet. Use the Live Sandbox to generate activities."];
    }

    const sentences = [];
    const highFriction = frictionData.filter(d => d.friction_level === 'high');
    const mediumFriction = frictionData.filter(d => d.friction_level === 'medium');

    if (highFriction.length > 0) {
      highFriction.forEach(item => {
        const delaySec = (item.avg_delay_ms / 1000).toFixed(1);
        if (item.element_id === 'sandbox-password-input') {
          sentences.push(`🔴 Password input (#${item.element_id}) shows high hesitation (${delaySec}s). This is typical for credential fields as users recall or generate passwords, but confirm placeholder details are clear.`);
        } else if (item.element_id === 'checkout-btn') {
          sentences.push(`🔴 The Checkout button (#${item.element_id}) shows severe hesitation (${delaySec}s). Users are taking a long time before committing to purchase, which could indicate price hesitation or shipping policy uncertainty.`);
        } else if (item.element_id === 'subscribe-btn' || item.element_id === 'newsletter-email-input') {
          sentences.push(`🔴 Newsletter subscription elements (#${item.element_id}) have a high friction score (${delaySec}s). This suggests users hesitate to sign up, possibly fearing email spam or value proposition ambiguity.`);
        } else if (item.element_id === 'private-notes-input') {
          sentences.push(`🔴 Notes field (#${item.element_id}) exhibits friction (${delaySec}s). Consider if instructions are too complex or if users are typing long-form replies.`);
        } else {
          sentences.push(`🔴 The element #${item.element_id} was a high-friction hotspot (average hesitation: ${delaySec}s). Users spent substantial time on the page before executing this interaction.`);
        }
      });
    }

    if (mediumFriction.length > 0) {
      mediumFriction.slice(0, 2).forEach(item => {
        const delaySec = (item.avg_delay_ms / 1000).toFixed(1);
        sentences.push(`🟠 Medium Friction: #${item.element_id} average delay was ${delaySec}s. This indicates minor user hesitation or reading time before interaction.`);
      });
    }

    if (sentences.length === 0) {
      sentences.push("💚 High Flow Efficiency: No significant bottlenecks found! All interaction points have low hesitation times (under 3 seconds).");
    }

    return sentences;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Tab Header Controls */}
      <div className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Friction Analysis & Red Zones</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Identify where users take the longest time (hesitation latency) before interacting with specific elements.
          </p>
        </div>

        {/* Filters and Toggle */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label className="form-label" style={{ fontSize: '10px' }}>Analyze Data Source</label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="form-input"
              style={{ padding: '8px 12px', background: 'rgba(8,12,20,0.8)', cursor: 'pointer' }}
            >
              <option value="">All Sessions (Aggregate Average)</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>Session: {s.id.substring(0, 8)}... ({s.event_count} events)</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <input
              id="toggle-heatmap"
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="toggle-heatmap" style={{ fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
              Show Heatmap Overlay
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Diagnostic Report Panel */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>UX Friction Insights</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Automated analysis of hesitation hotspots</p>
          </div>

          {/* Diagnostic sentences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            {getDiagnostics().map((sentence, idx) => {
              let isRed = sentence.startsWith('🔴');
              let isOrange = sentence.startsWith('🟠');
              let borderCol = 'var(--border-color)';
              let bgCol = 'rgba(255, 255, 255, 0.01)';

              if (isRed) {
                borderCol = 'rgba(239, 68, 68, 0.2)';
                bgCol = 'rgba(239, 68, 68, 0.03)';
              } else if (isOrange) {
                borderCol = 'rgba(245, 158, 11, 0.2)';
                bgCol = 'rgba(245, 158, 11, 0.03)';
              }

              return (
                <div key={idx} style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid ' + borderCol,
                  background: bgCol,
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: 'var(--text-primary)'
                }}>
                  {sentence}
                </div>
              );
            })}
          </div>

          {/* Legend Summary */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-danger)' }} />
              High (&gt;8s)
            </span>
            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-warning)' }} />
              Medium (3s - 8s)
            </span>
            <span style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-success)' }} />
              Low (&lt;3s)
            </span>
          </div>
        </div>

        {/* Visual Replica Sandbox with glowing Heatmap Overlays */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Page Layout Red Zones</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Visual element outline glow mapped from user action latency</p>
          </div>

          {/* Keyframes inject style block */}
          <style>{`
            @keyframes pulse-red {
              0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
              100% { box-shadow: 0 0 20px rgba(239, 68, 68, 1); }
            }
          `}</style>

          {/* replica shop box */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(8,12,20,0.6)',
            pointerEvents: 'none', // Read-only overlay mode
            opacity: 0.9,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {/* Header replica */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '14px', color: '#fff' }}>AURA Athletics</strong>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Visual Mockup Layout</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>🛒 Cart (0)</div>
            </div>

            {/* Product Card Details */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.05)'
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>Vortex Running Shoes</span>
                <span style={{ color: 'var(--accent-secondary)', fontSize: '13px', fontWeight: 600 }}>$149.00</span>
              </div>
            </div>

            {/* Size Options Replica */}
            <div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['s', 'm', 'l', 'xl'].map(size => (
                  <div
                    key={size}
                    id={`size-${size}-btn`}
                    style={{
                      flex: 1,
                      padding: '6px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      textAlign: 'center',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      ...getFrictionStyle(`size-${size}-btn`)
                    }}
                  >
                    {size}
                    {renderBadge(`size-${size}-btn`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications Replica */}
            <div
              id="product-specifications-container"
              style={{
                height: '50px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '6px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                ...getFrictionStyle('product-specifications-container')
              }}
            >
              Specifications description content...
              {renderBadge('product-specifications-container')}
            </div>

            {/* Ingestion Buttons Replica */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div
                id="add-to-cart-btn"
                style={{
                  flex: 2,
                  padding: '8px',
                  background: 'rgba(139, 92, 246, 0.4)',
                  borderRadius: '6px',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  textAlign: 'center',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  ...getFrictionStyle('add-to-cart-btn')
                }}
              >
                Add to Cart
                {renderBadge('add-to-cart-btn')}
              </div>
              <div
                id="wishlist-btn"
                style={{
                  flex: 1,
                  padding: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center',
                  fontSize: '12px',
                  ...getFrictionStyle('wishlist-btn')
                }}
              >
                Wishlist
                {renderBadge('wishlist-btn')}
              </div>
            </div>

            <div
              id="checkout-btn"
              style={{
                padding: '10px',
                background: 'rgba(6, 182, 212, 0.4)',
                borderRadius: '6px',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                textAlign: 'center',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                ...getFrictionStyle('checkout-btn')
              }}
            >
              Instant Checkout Now
              {renderBadge('checkout-btn')}
            </div>

            {/* PII Input Replica */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                id="newsletter-email-input"
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  ...getFrictionStyle('newsletter-email-input')
                }}
              >
                Newsletter Email input
                {renderBadge('newsletter-email-input')}
              </div>

              <div
                id="sandbox-password-input"
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  ...getFrictionStyle('sandbox-password-input')
                }}
              >
                Account Password input
                {renderBadge('sandbox-password-input')}
              </div>

              <div
                id="private-notes-input"
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  ...getFrictionStyle('private-notes-input')
                }}
              >
                Private Notes input
                {renderBadge('private-notes-input')}
              </div>

              <div
                id="subscribe-btn"
                style={{
                  padding: '8px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  textAlign: 'center',
                  fontSize: '11px',
                  ...getFrictionStyle('subscribe-btn')
                }}
              >
                Submit Form Button
                {renderBadge('subscribe-btn')}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
