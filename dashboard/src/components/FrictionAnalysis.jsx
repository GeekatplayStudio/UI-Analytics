import React, { useState, useEffect } from 'react';

export default function FrictionAnalysis({ activeDomain }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(''); // Empty = All Sessions
  const [frictionData, setFrictionData] = useState([]);
  const [sessionEvents, setSessionEvents] = useState([]); // Timeline events for selected session
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [heatmapMode, setHeatmapMode] = useState('hesitation'); // 'hesitation' or 'errors'

  useEffect(() => {
    if (!activeDomain) return;
    fetchSessions();
    fetchFrictionData();
  }, [activeDomain, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionEvents([]);
      return;
    }
    fetchSessionEvents(selectedSessionId);
  }, [selectedSessionId]);

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

  const fetchSessionEvents = async (sessionId) => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/events`);
      if (res.ok) {
        const data = await res.json();
        setSessionEvents(data);
      }
    } catch (error) {
      console.error('Error fetching timeline events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Determine element styling based on active Heatmap Mode
  const getElementHighlightStyle = (elementId) => {
    if (!showOverlay) return {};
    const item = frictionData.find(d => d.element_id === elementId);
    if (!item) return {};

    if (heatmapMode === 'hesitation') {
      // Color-coded glow based on delay delta
      if (item.friction_level === 'high') {
        return {
          boxShadow: '0 0 15px rgba(239, 68, 68, 0.85), inset 0 0 6px rgba(239, 68, 68, 0.3)',
          borderColor: 'var(--accent-danger)',
          animation: 'pulse-red 2.5s infinite alternate',
          position: 'relative'
        };
      } else if (item.friction_level === 'medium') {
        return {
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.8), inset 0 0 6px rgba(245, 158, 11, 0.3)',
          borderColor: 'var(--accent-warning)',
          position: 'relative'
        };
      } else {
        return {
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.5)',
          borderColor: 'var(--accent-success)',
          position: 'relative'
        };
      }
    } else {
      // Errors / Frustration Mode
      const hasErrors = item.rage_clicks > 0 || item.dead_clicks > 0 || item.input_errors > 0;
      if (!hasErrors) return {};

      // If user raged or encountered validation error, ring it in red. If dead click, orange.
      if (item.rage_clicks > 0 || item.input_errors > 0) {
        return {
          boxShadow: '0 0 16px rgba(239, 68, 68, 0.95), 0 0 0 2px rgba(239, 68, 68, 0.4)',
          borderColor: 'var(--accent-danger)',
          animation: 'pulse-error 1.5s infinite alternate',
          position: 'relative'
        };
      } else if (item.dead_clicks > 0) {
        return {
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.9)',
          borderColor: 'var(--accent-warning)',
          position: 'relative'
        };
      }
    }
    return {};
  };

  // Render floating notification badge on mock layout
  const renderOverlayBadge = (elementId) => {
    if (!showOverlay) return null;
    const item = frictionData.find(d => d.element_id === elementId);
    if (!item) return null;

    if (heatmapMode === 'hesitation') {
      const delaySec = (item.avg_delay_ms / 1000).toFixed(1);
      let badgeBg = 'rgba(16, 185, 129, 0.95)';
      let text = `✅ ${delaySec}s`;

      if (item.friction_level === 'high') {
        badgeBg = 'rgba(239, 68, 68, 0.95)';
        text = `⚠️ ${delaySec}s`;
      } else if (item.friction_level === 'medium') {
        badgeBg = 'rgba(245, 158, 11, 0.95)';
        text = `⏳ ${delaySec}s`;
      }

      return (
        <div className="overlay-badge" style={{ background: badgeBg }}>
          {text}
        </div>
      );
    } else {
      // Errors Mode
      const frustrationList = [];
      if (item.rage_clicks > 0) frustrationList.push(`😡 Rage: ${item.rage_clicks}x`);
      if (item.dead_clicks > 0) frustrationList.push(`👻 Dead: ${item.dead_clicks}x`);
      if (item.input_errors > 0) frustrationList.push(`❌ Err: ${item.input_errors}x`);

      if (frustrationList.length === 0) return null;

      const isSevere = item.rage_clicks > 0 || item.input_errors > 0;
      const badgeBg = isSevere ? 'rgba(239, 68, 68, 0.98)' : 'rgba(245, 158, 11, 0.95)';
      const badgeColor = isSevere ? '#fff' : '#000';

      return (
        <div className="overlay-badge" style={{ background: badgeBg, color: badgeColor, fontSize: '9px' }}>
          {frustrationList.join(' | ')}
        </div>
      );
    }
  };

  // Automated diagnostic reports
  const getFrictionDiagnostics = () => {
    if (frictionData.length === 0) {
      return ["No user interaction events registered yet. Use the Live Sandbox to generate activities."];
    }

    const report = [];
    
    // Check rage clicks
    const raged = frictionData.filter(d => d.rage_clicks > 0);
    if (raged.length > 0) {
      raged.forEach(item => {
        report.push(`😡 User Frustration Alert: Element #${item.element_id} triggered ${item.rage_clicks} Rage Clicks! This indicates users expect immediate responses, but experienced lag or dead endpoints.`);
      });
    }

    // Check dead clicks
    const dead = frictionData.filter(d => d.dead_clicks > 0);
    if (dead.length > 0) {
      dead.forEach(item => {
        report.push(`👻 Confusing UI Element: Static element #${item.element_id} registered ${item.dead_clicks} Dead Clicks. Users expect this element to be interactive; consider adding navigation or removing active styles.`);
      });
    }

    // Check validation input errors
    const errors = frictionData.filter(d => d.input_errors > 0);
    if (errors.length > 0) {
      errors.forEach(item => {
        const errorDetails = item.error_messages?.join(', ') || 'Validation failed';
        report.push(`❌ Layout Confusion: Form field #${item.element_id} triggered validation errors ${item.input_errors} times. Error message(s): "${errorDetails}". Review form layout, placeholders, and error cues.`);
      });
    }

    // Standard Hesitation checks
    const highFriction = frictionData.filter(d => d.friction_level === 'high' && d.rage_clicks === 0 && d.input_errors === 0);
    if (highFriction.length > 0) {
      highFriction.forEach(item => {
        const delaySec = (item.avg_delay_ms / 1000).toFixed(1);
        report.push(`⏳ Hesitation Spot: Users took an average of ${delaySec}s before selecting #${item.element_id}. Indicates layout clutter or information overhead.`);
      });
    }

    if (report.length === 0) {
      report.push("💚 High Flow Efficiency: No UI friction spikes or errors detected. User pathways are clean.");
    }

    return report;
  };

  // Sum total counts for KPI cards
  const totalRageCount = frictionData.reduce((sum, item) => sum + (item.rage_clicks || 0), 0);
  const totalDeadCount = frictionData.reduce((sum, item) => sum + (item.dead_clicks || 0), 0);
  const totalErrorCount = frictionData.reduce((sum, item) => sum + (item.input_errors || 0), 0);

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* CSS Animations block */}
      <style>{`
        @keyframes pulse-red {
          0% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
          100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.85); }
        }
        @keyframes pulse-error {
          0% { box-shadow: 0 0 8px rgba(239, 68, 68, 0.6); }
          100% { box-shadow: 0 0 22px rgba(239, 68, 68, 1), 0 0 0 3px rgba(239, 68, 68, 0.4); }
        }
        .overlay-badge {
          position: absolute;
          top: -12px;
          right: 4px;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.5);
          z-index: 10;
          pointer-events: none;
          display: flex;
          alignItems: center;
          gap: 2px;
          line-height: 1;
        }
      `}</style>

      {/* Control panel header */}
      <div className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>UX Friction & UI Health diagnostics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Unprecedented visual heatmap of clicks, hesitation lags, user rage, and input validation failures.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label className="form-label" style={{ fontSize: '10px' }}>Friction Data Source</label>
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

          <div>
            <label className="form-label" style={{ fontSize: '10px' }}>Heatmap Overlay View</label>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '2px' }}>
              <button
                onClick={() => setHeatmapMode('hesitation')}
                style={{
                  padding: '6px 12px',
                  background: heatmapMode === 'hesitation' ? 'var(--accent-primary)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                ⏱️ Lags
              </button>
              <button
                onClick={() => setHeatmapMode('errors')}
                style={{
                  padding: '6px 12px',
                  background: heatmapMode === 'errors' ? 'var(--accent-danger)' : 'transparent',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                😡 Errors
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <input
              id="toggle-overlay"
              type="checkbox"
              checked={showOverlay}
              onChange={(e) => setShowOverlay(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="toggle-overlay" style={{ fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
              Show Overlay
            </label>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--accent-danger)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rage Clicks</span>
          <h2 style={{ fontSize: '28px', color: '#fff' }}>{totalRageCount}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Repeated rapid clicks on static elements</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--accent-warning)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dead Clicks</span>
          <h2 style={{ fontSize: '28px', color: '#fff' }}>{totalDeadCount}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clicks on static elements resembling buttons</span>
        </div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '3px solid var(--accent-secondary)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Form validation errors</span>
          <h2 style={{ fontSize: '28px', color: '#fff' }}>{totalErrorCount}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Required/invalid fields blurred</span>
        </div>
      </div>

      {/* Main Analysis grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Diagnostics & Scorecard */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>Automated UI Health Scorecard</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Points of interaction friction and design weaknesses</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '420px', overflowY: 'auto' }}>
            {getFrictionDiagnostics().map((sentence, idx) => {
              let isRed = sentence.includes('😡') || sentence.includes('❌');
              let isOrange = sentence.includes('👻') || sentence.includes('⏳');
              let borderCol = 'var(--border-color)';
              let bgCol = 'rgba(255,255,255,0.01)';

              if (isRed) {
                borderCol = 'rgba(239, 68, 68, 0.2)';
                bgCol = 'rgba(239, 68, 68, 0.03)';
              } else if (isOrange) {
                borderCol = 'rgba(245, 158, 11, 0.2)';
                bgCol = 'rgba(245, 158, 11, 0.03)';
              }

              return (
                <div key={idx} style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid ' + borderCol,
                  background: bgCol,
                  fontSize: '12px',
                  lineHeight: '1.6'
                }}>
                  {sentence}
                </div>
              );
            })}
          </div>
        </div>

        {/* Replica visual overlay page */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>
              Layout Glow Overlays: {heatmapMode === 'hesitation' ? 'Hesitation Latency' : 'Frustration & Errors'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Elements highlighted based on active telemetry filter</p>
          </div>

          {/* Replica Store container */}
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            background: 'rgba(8,12,20,0.6)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {/* Header replica */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '13px', color: '#fff' }}>AURA Athletics</strong>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Target Page Mockup View</div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🛒 Cart (0)</div>
            </div>

            {/* Product Card Details */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.05)'
              }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600 }}>Vortex Running Shoes</span>
                <span style={{ color: 'var(--accent-secondary)', fontSize: '12px', fontWeight: 600 }}>$149.00</span>
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
                      ...getElementHighlightStyle(`size-${size}-btn`)
                    }}
                  >
                    {size}
                    {renderOverlayBadge(`size-${size}-btn`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Specifications Replica */}
            <div
              id="product-specifications-container"
              style={{
                height: '45px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '6px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                ...getElementHighlightStyle('product-specifications-container')
              }}
            >
              Specifications description content...
              {renderOverlayBadge('product-specifications-container')}
            </div>

            {/* Buttons Replica */}
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
                  ...getElementHighlightStyle('add-to-cart-btn')
                }}
              >
                Add to Cart
                {renderOverlayBadge('add-to-cart-btn')}
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
                  ...getElementHighlightStyle('wishlist-btn')
                }}
              >
                Wishlist
                {renderOverlayBadge('wishlist-btn')}
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
                ...getElementHighlightStyle('checkout-btn')
              }}
            >
              Instant Checkout Now
              {renderOverlayBadge('checkout-btn')}
            </div>

            {/* Inputs Replica */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                id="newsletter-email-input"
                style={{
                  padding: '8px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  ...getElementHighlightStyle('newsletter-email-input')
                }}
              >
                Newsletter Email input
                {renderOverlayBadge('newsletter-email-input')}
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
                  ...getElementHighlightStyle('sandbox-password-input')
                }}
              >
                Account Password input
                {renderOverlayBadge('sandbox-password-input')}
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
                  ...getElementHighlightStyle('private-notes-input')
                }}
              >
                Private Notes input
                {renderOverlayBadge('private-notes-input')}
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
                  ...getElementHighlightStyle('subscribe-btn')
                }}
              >
                Submit Form Button
                {renderOverlayBadge('subscribe-btn')}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Visual UX Friction Timeline for Session (Only visible when single session is selected) */}
      {selectedSessionId && (
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', color: '#fff' }}>User Frustration Timeline</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Chronological flow mapping exactly when the user encountered design blockages
            </p>
          </div>

          {isLoadingEvents ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading session events...</div>
          ) : sessionEvents.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No events recorded in this session.</div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              overflowX: 'auto',
              padding: '24px 12px',
              background: '#04060b',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              gap: '12px'
            }}>
              {sessionEvents.map((e, idx) => {
                const isRage = e.event_type === 'rage_click';
                const isDead = e.event_type === 'dead_click';
                const isError = e.event_type === 'input_error';
                const isSlow = e.time_delta_ms > 8000 && e.event_type !== 'init';
                
                let color = 'var(--accent-primary)'; // default Standard Clicks
                let emoji = '🖱️';
                let stateName = 'Interaction';

                if (e.event_type === 'init') {
                  color = 'var(--accent-success)';
                  emoji = '🚀';
                  stateName = 'Session Init';
                } else if (isRage) {
                  color = 'var(--accent-danger)';
                  emoji = '😡';
                  stateName = 'Rage Click';
                } else if (isDead) {
                  color = 'var(--accent-warning)';
                  emoji = '👻';
                  stateName = 'Dead Click';
                } else if (isError) {
                  color = 'var(--accent-danger)';
                  emoji = '❌';
                  stateName = 'Input Error';
                } else if (isSlow) {
                  color = '#e11d48'; // dark pink/red
                  emoji = '⏳';
                  stateName = 'Hesitation';
                } else if (e.event_type.startsWith('input')) {
                  color = '#06b6d4';
                  emoji = '✏️';
                  stateName = 'Input focus';
                }

                const elapsedMs = e.timestamp - sessionEvents[0].timestamp;

                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {/* Node block */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid ' + (isRage || isError || isSlow ? 'var(--accent-danger)' : isDead ? 'var(--accent-warning)' : 'var(--border-color)'),
                      borderRadius: '8px',
                      padding: '8px 12px',
                      width: '130px',
                      gap: '4px',
                      position: 'relative',
                      boxShadow: isRage || isError || isSlow ? '0 0 10px rgba(239, 68, 68, 0.25)' : 'none'
                    }}>
                      <span style={{ fontSize: '18px' }}>{emoji}</span>
                      <strong style={{ fontSize: '11px', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                        {stateName}
                      </strong>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {e.element_id ? `#${e.element_id}` : e.element_tag || 'Page'}
                      </span>
                      <span className="badge badge-secondary" style={{ fontSize: '8px', padding: '1px 4px', marginTop: '2px' }}>
                        +{formatDuration(elapsedMs)}
                      </span>

                      {/* Floating metadata delta */}
                      {idx > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '-15px',
                          background: isSlow ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.5)',
                          border: '1px solid ' + (isSlow ? 'rgba(239,68,68,0.3)' : 'var(--border-color)'),
                          borderRadius: '4px',
                          padding: '1px 4px',
                          fontSize: '8px',
                          color: isSlow ? 'var(--accent-danger)' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap'
                        }}>
                          +{e.time_delta_ms}ms
                        </div>
                      )}
                    </div>

                    {/* Connecting line */}
                    {idx < sessionEvents.length - 1 && (
                      <div style={{
                        width: '24px',
                        height: '2px',
                        background: 'linear-gradient(90deg, ' + color + ' 0%, var(--border-color) 100%)'
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
