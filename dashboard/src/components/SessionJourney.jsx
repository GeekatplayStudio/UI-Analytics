import React, { useState, useEffect, useRef } from 'react';

export default function SessionJourney({ activeDomain }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [expandedEventIds, setExpandedEventIds] = useState(new Set());
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [playIndex, setPlayIndex] = useState(-1);
  const [virtualCursor, setVirtualCursor] = useState({ x: 180, y: 120, action: null });
  const [virtualScroll, setVirtualScroll] = useState(0);
  const [virtualPage, setVirtualPage] = useState('home');
  const [clickRipple, setClickRipple] = useState(null);
  const [displayedSummary, setDisplayedSummary] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const viewportRef = useRef(null);

  // Playback timer loops
  useEffect(() => {
    if (!isPlaying || sessionEvents.length === 0) return;

    let currentIndex = playIndex;
    if (currentIndex >= sessionEvents.length - 1) {
      currentIndex = -1;
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= sessionEvents.length) {
      setIsPlaying(false);
      return;
    }

    const currentEvent = sessionEvents[currentIndex === -1 ? 0 : currentIndex];
    const nextEvent = sessionEvents[nextIndex];

    let delay = nextIndex === 0 ? 0 : (nextEvent.timestamp - currentEvent.timestamp);
    if (delay < 0) delay = 0;
    
    // Cap delay at 1.8 seconds to keep replay flow snappy
    delay = Math.min(delay, 1800) / playSpeed;

    const timer = setTimeout(() => {
      setPlayIndex(nextIndex);
      const ev = nextEvent;

      if (ev.page_url) {
        if (ev.page_url.includes('/products')) setVirtualPage('products');
        else if (ev.page_url.includes('/contact')) setVirtualPage('contact');
        else if (ev.page_url.includes('/location')) setVirtualPage('location');
        else if (ev.page_url.includes('/help')) setVirtualPage('help');
        else setVirtualPage('home');
      }

      if (ev.viewport_x !== null && ev.viewport_x !== undefined) {
        setVirtualCursor({ x: ev.viewport_x, y: ev.viewport_y, action: ev.event_type });

        if (ev.event_type.includes('click')) {
          setClickRipple({ x: ev.viewport_x, y: ev.viewport_y, type: ev.event_type });
          setTimeout(() => setClickRipple(null), 650);
        }
      }

      if (ev.scroll_depth_percent !== null && ev.scroll_depth_percent !== undefined) {
        setVirtualScroll(ev.scroll_depth_percent);
      }

      if (nextIndex === sessionEvents.length - 1) {
        setIsPlaying(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [isPlaying, playIndex, sessionEvents, playSpeed]);

  // Handle active viewport scroll adjustments
  useEffect(() => {
    if (viewportRef.current) {
      const container = viewportRef.current;
      const targetScroll = (container.scrollHeight - container.clientHeight) * (virtualScroll / 100);
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [virtualScroll]);

  useEffect(() => {
    if (!selectedSessionId || sessionEvents.length === 0) {
      setDisplayedSummary('');
      return;
    }

    setIsGeneratingAi(true);
    setDisplayedSummary('');

    const activeSessObj = sessions.find(s => s.id === selectedSessionId);
    const uaDetails = activeSessObj ? activeSessObj.user_agent : 'Browser';

    const clickCount = sessionEvents.filter(e => e.event_type === 'click').length;
    const rageCount = sessionEvents.filter(e => e.event_type === 'rage_click').length;
    const deadCount = sessionEvents.filter(e => e.event_type === 'dead_click').length;
    const errorCount = sessionEvents.filter(e => e.event_type === 'js_error' || e.event_type === 'console_error').length;
    const feedbackEvent = sessionEvents.find(e => e.event_type === 'user_feedback');

    let summaryText = `[AI JOURNEY DIAGNOSTICS REPORT]
SESSION CONTEXT:
- Platform: ${uaDetails}
- Total Interactions: ${sessionEvents.length} events logged.

USER JOURNEY INTENT:
The user landed on the simulated target site and navigated across standard menus. `;

    if (feedbackEvent) {
      const score = (feedbackEvent.version || 'none').toUpperCase();
      summaryText += `User completed their session and submitted review comments. Easy to use: [${score}]. Rating Message: "${feedbackEvent.error_message}". `;
    } else {
      summaryText += `User browsed pages but exited without leaving a qualitative survey response. `;
    }

    summaryText += `\n\nUSER FRICTION MATRIX:
- Rage Clicks: ${rageCount} detected. ${rageCount > 0 ? 'High visual frustration on elements. Check interactive responsiveness.' : 'No click irritation observed.'}
- Dead Clicks: ${deadCount} detected. ${deadCount > 0 ? 'Confused clicks on non-interactive text labels.' : 'Static elements were ignored.'}
- JS Exceptions: ${errorCount} captured. ${errorCount > 0 ? 'WARNING: Client-side JS errors occurred. View stack traces on timeline.' : 'No console errors captured.'}

PRODUCT DESIGN RECOMMENDATION:
`;

    if (rageCount > 0 || errorCount > 0) {
      summaryText += `👉 ACTION REQUIRED: Refactor event validation handlers and CSS interactive states. Fix active errors.`;
    } else {
      summaryText += `👉 DESIGN NORMAL: Navigation paths flow cleanly. Focus CRO efforts on enhancing page scroll depth conversions.`;
    }

    let charIdx = 0;
    const interval = setInterval(() => {
      setDisplayedSummary(prev => {
        if (charIdx < summaryText.length) {
          const nextChar = summaryText.charAt(charIdx);
          charIdx++;
          return prev + nextChar;
        } else {
          setIsGeneratingAi(false);
          clearInterval(interval);
          return prev;
        }
      });
    }, 10);

    return () => clearInterval(interval);
  }, [selectedSessionId, sessionEvents]);

  const toggleStack = (id) => {
    setExpandedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Fetch sessions for active domain
  useEffect(() => {
    if (!activeDomain) return;
    fetchSessions();
  }, [activeDomain]);

  // Fetch events when selected session changes
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
        if (data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setIsLoadingSessions(false);
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
      console.error('Error fetching session events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const sec = (ms / 1000).toFixed(1);
    return `${sec}s`;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'init': return 'I';
      case 'click': return 'C';
      case 'scroll': return 'S';
      case 'input_focus': return 'F';
      case 'input_change': return 'M';
      case 'input_type': return 'K';
      case 'js_error': return 'E';
      case 'console_error': return 'W';
      case 'network_request': return 'N';
      default: return '•';
    }
  };

  // Helper to parse simple user agent details
  const parseUA = (ua) => {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return ua.split(' ')[0] || 'Browser';
  };

  if (!activeDomain) {
    return (
      <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Please register and select a domain first.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      
      {/* Session List Panel */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px' }}>User Sessions</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>List of tracked user journeys</p>
          </div>
          <button 
            onClick={fetchSessions} 
            className="btn btn-secondary" 
            style={{ padding: '4px 10px', fontSize: '11px' }}
          >
            Refresh
          </button>
        </div>

        {/* Sessions Scrolling Container */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '450px' }}>
          {isLoadingSessions ? (
            <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)', textAlign: 'center' }}>
              No sessions tracked yet.<br />Use the Sandbox page to generate events!
            </div>
          ) : (
            sessions.map(s => {
              const isActive = s.id === selectedSessionId;
              const date = new Date(s.updated_at).toLocaleTimeString();
              const duration = formatDuration(s.duration_ms);
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSessionId(s.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--border-color)'),
                    background: isActive ? 'var(--bg-surface-active)' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                  className="session-item"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                    <span style={{ color: isActive ? 'var(--accent-primary-hover)' : '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                      {s.id.startsWith('walkthrough-') ? `Walkthrough: ${s.id.substring(12, 22)}` : `Session ID: ${s.id.substring(0, 8)}...`}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>{parseUA(s.user_agent)}</span>
                    <span>{duration} ({s.event_count} events)</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chronological Timeline Panel */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px' }}>Journey Timeline</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            {selectedSessionId 
              ? `Detailed activity sequence for ${selectedSessionId.substring(0, 8)}...` + (sessionEvents[0]?.version ? ` (Tracker: v${sessionEvents[0].version})` : '') 
              : 'Select a session to view timeline'}
          </p>
        </div>

        {/* Timeline Scrolling Container */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', maxHeight: '450px' }}>
          {isLoadingEvents ? (
            <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>Loading event timeline...</div>
          ) : sessionEvents.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No events to display.</div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '24px', borderLeft: '2px solid var(--border-color)', margin: '10px 0 10px 10px' }}>
              {sessionEvents.map((e, idx) => {
                const isSensitive = e.element_class?.includes('sensitive') || e.element_id?.includes('password') || e.element_id?.includes('email') || e.element_id?.includes('private');
                const isLast = idx === sessionEvents.length - 1;
                
                // Calculate elapsed time from start of session
                const elapsedMs = e.timestamp - sessionEvents[0].timestamp;
                const elapsedStr = idx === 0 ? 'Start' : `+${formatDuration(elapsedMs)}`;
                
                const isError = e.event_type === 'js_error' || e.event_type === 'console_error';
                const isNetwork = e.event_type === 'network_request';

                let cardBorder = 'var(--border-color)';
                let iconBorder = 'var(--accent-primary)';
                if (e.event_type === 'init') {
                  iconBorder = 'var(--text-muted)';
                } else if (isError) {
                  cardBorder = 'var(--accent-warning)';
                  iconBorder = 'var(--accent-warning)';
                } else if (isNetwork) {
                  cardBorder = e.status === 200 || e.status === 201 || e.status === 204 || e.status === 304
                    ? 'rgba(255,255,255,0.06)'
                    : 'var(--accent-danger)';
                  iconBorder = 'var(--text-secondary)';
                }

                return (
                  <div key={e.id} style={{ position: 'relative', marginBottom: isLast ? '0px' : '20px' }}>
                    {/* Timeline Node Icon */}
                    <div style={{
                      position: 'absolute',
                      left: '-37px',
                      top: '2px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: `2px solid ${iconBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: isError ? 'var(--accent-warning)' : 'var(--text-secondary)'
                    }}>
                      {getEventIcon(e.event_type)}
                    </div>

                    {/* Timeline Content Card */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: `1px solid ${cardBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: isError ? 'var(--accent-warning)' : '#fff', textTransform: 'capitalize' }}>
                          {e.event_type.replace('_', ' ')}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {elapsedStr}
                          </span>
                          {idx > 0 && (
                            <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                              +{e.time_delta_ms}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details of Event */}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                        {isError && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                              {e.error_message}
                            </span>
                            {e.stack && (
                              <div>
                                <button
                                  onClick={() => toggleStack(e.id)}
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '10px', marginTop: '4px' }}
                                >
                                  {expandedEventIds.has(e.id) ? 'Hide Stack Trace' : 'Show Stack Trace'}
                                </button>
                                {expandedEventIds.has(e.id) && (
                                  <pre style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    overflowX: 'auto',
                                    fontSize: '10.5px',
                                    color: 'var(--text-muted)',
                                    marginTop: '6px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all'
                                  }}>
                                    {e.stack}
                                  </pre>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {isNetwork && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{
                                background: 'rgba(255,255,255,0.08)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '10.5px',
                                fontWeight: 'bold',
                                color: 'var(--text-primary)'
                              }}>
                                {e.method}
                              </span>
                              <span style={{
                                background: e.status === 200 || e.status === 201 || e.status === 204 || e.status === 304
                                  ? 'rgba(16, 185, 129, 0.1)'
                                  : 'rgba(239, 68, 68, 0.1)',
                                color: e.status === 200 || e.status === 201 || e.status === 204 || e.status === 304
                                  ? 'var(--accent-success)'
                                  : 'var(--accent-danger)',
                                border: e.status === 200 || e.status === 201 || e.status === 204 || e.status === 304
                                  ? '1px solid rgba(16, 185, 129, 0.2)'
                                  : '1px solid rgba(239, 68, 68, 0.2)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '10.5px',
                                fontWeight: 'bold'
                              }}>
                                {e.status === 0 ? 'Network Error' : e.status}
                              </span>
                              <span style={{ color: 'var(--text-muted)' }}>
                                Duration: <strong>{e.duration_ms}ms</strong>
                              </span>
                            </div>
                            <span style={{ wordBreak: 'break-all', fontFamily: 'monospace', color: 'var(--text-primary)', marginTop: '2px' }}>
                              {e.element_id}
                            </span>
                            {e.error_message && (
                              <span style={{ color: 'var(--accent-danger)', fontSize: '11px', fontStyle: 'italic' }}>
                                Error: {e.error_message}
                              </span>
                            )}
                          </div>
                        )}

                        {!isError && !isNetwork && (
                          <>
                            {e.page_url && (
                              <span style={{ wordBreak: 'break-all' }}>
                                URL: <code style={{ color: 'var(--text-primary)' }}>
                                  {(() => {
                                    try {
                                      return new URL(e.page_url).pathname + (new URL(e.page_url).hash || '');
                                    } catch(err) {
                                      return e.page_url;
                                    }
                                  })()}
                                </code>
                              </span>
                            )}
                            {e.element_tag && (
                              <span>
                                DOM Element: <strong style={{ color: '#fff' }}>&lt;{e.element_tag.toLowerCase()}&gt;</strong>
                                {e.element_id && ` id="${e.element_id}"`}
                              </span>
                            )}
                            {e.viewport_x !== null && (
                              <span>Coordinates: Clicked at ({e.viewport_x}px, {e.viewport_y}px) in viewport</span>
                            )}
                            {e.scroll_depth_percent !== null && (
                              <span>Scroll Depth: Reached <strong style={{ color: 'var(--text-secondary)' }}>{e.scroll_depth_percent}%</strong> of page</span>
                            )}
                            {isSensitive && (
                              <span style={{ color: 'var(--accent-warning)', fontWeight: 600, fontSize: '10px', marginTop: '4px' }}>
                                PII Stripped. Content excluded from ingestion pipeline.
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>      {/* Right Column: AI Analysis & Visual Replayer */}
      {selectedSessionId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* AI Journey Summary Card */}
          <div className="glass-card fade-in" style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Session Summary</h3>
              {isGeneratingAi && <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Analyzing...</span>}
            </div>
            
            <pre style={{
              margin: 0,
              fontSize: '11px',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: '1.5'
            }}>
              {displayedSummary || (isGeneratingAi ? 'Parsing user events...' : 'No telemetry data.')}
            </pre>
          </div>

          {/* Session Replayer Panel */}
          <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '450px' }}>
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Visual Session Replay</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Interactive session coordinate tracking</span>
              </div>
              
              <button 
                onClick={() => {
                  setPlayIndex(-1);
                  setVirtualScroll(0);
                  setVirtualPage('home');
                  setIsPlaying(false);
                }} 
                className="btn btn-secondary" 
                style={{ padding: '4px 10px', fontSize: '11px' }}
              >
                Reset
              </button>
            </div>

            {/* Address bar simulator */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                http://localhost:5173/#/example-site/{virtualPage}
              </div>
            </div>

            {/* Webpage Viewport Canvas */}
            <div 
              ref={viewportRef}
              style={{
                flex: 1,
                height: '240px',
                minHeight: '240px',
                background: '#121316',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                overflowY: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '16px'
              }}
            >
              {/* Click target flash animation */}
              {clickRipple && (
                <div style={{
                  position: 'absolute',
                  top: `${clickRipple.y % 240}px`,
                  left: `${clickRipple.x % 320}px`,
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: `3px solid ${clickRipple.type === 'rage_click' ? 'var(--accent-warning)' : (clickRipple.type === 'dead_click' ? '#f59e0b' : 'var(--text-primary)')}`,
                  transform: 'translate(-50%, -50%)',
                  animation: 'rippleFlash 0.6s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 1000
                }} />
              )}

              {/* Virtual mouse cursor */}
              <div style={{
                position: 'absolute',
                top: `${virtualCursor.y % 240}px`,
                left: `${virtualCursor.x % 320}px`,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#fff',
                border: '2.5px solid #1c1917',
                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                transform: 'translate(-50%, -50%)',
                transition: 'top 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                zIndex: 999,
                pointerEvents: 'none'
              }}>
                {virtualCursor.action && (
                  <span style={{
                    position: 'absolute',
                    top: '-16px',
                    left: '12px',
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff',
                    fontSize: '8px',
                    padding: '2px 5px',
                    borderRadius: '3px',
                    whiteSpace: 'nowrap',
                    border: '1px solid var(--border-color)'
                  }}>
                    {virtualCursor.action.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Viewport mockup pages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '340px' }}>
                {virtualPage === 'home' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>AURA Athletics Store</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px', lineHeight: '1.4' }}>
                      Welcome to the mock running shop! Discover high-performance gear.
                    </p>
                    <div style={{ height: '32px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Shop Collection
                    </div>
                  </div>
                )}

                {virtualPage === 'products' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Vortex Sneakers</h4>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>$149.00 USD</strong>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['s', 'm', 'l'].map(sz => (
                        <div key={sz} style={{ flex: 1, height: '22px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{sz}</div>
                      ))}
                    </div>
                    <div style={{ height: '28px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#fff' }}>
                      Add to Cart
                    </div>
                  </div>
                )}

                {virtualPage === 'contact' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Contact Form</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '24px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', paddingLeft: '8px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        visitor@example.com
                      </div>
                      <div style={{ height: '24px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', paddingLeft: '8px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                        ••••••••••••
                      </div>
                    </div>
                    <div style={{ height: '26px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Submit
                    </div>
                  </div>
                )}

                {virtualPage === 'location' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>Locations HQ</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      Seattle Avenue, Washington, USA.
                    </p>
                    <div style={{ height: '60px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', color: 'var(--text-muted)' }}>
                      Map Layout
                    </div>
                  </div>
                )}

                {virtualPage === 'help' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>FAQs & Guides</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '10.5px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        Returns Policy
                      </div>
                      <div style={{ padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', fontSize: '10.5px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                        Shipping Delivery Details
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Control Bar toolbar */}
            <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span>Event: {playIndex + 1} / {sessionEvents.length}</span>
                <span>Scroll: {virtualScroll}%</span>
              </div>

              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <div style={{
                  width: `${sessionEvents.length > 0 ? ((playIndex + 1) / sessionEvents.length) * 100 : 0}%`,
                  height: '100%',
                  background: 'var(--text-primary)',
                  transition: 'width 0.25s ease-out'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12px', minWidth: '70px' }}
                  disabled={sessionEvents.length === 0}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Speed:</span>
                  {[1, 2, 4].map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaySpeed(s)}
                      className="btn"
                      style={{
                        padding: '4px 8px',
                        fontSize: '11px',
                        background: playSpeed === s ? 'var(--text-primary)' : 'rgba(255,255,255,0.02)',
                        color: playSpeed === s ? 'var(--bg-primary)' : 'var(--text-primary)',
                        border: '1px solid ' + (playSpeed === s ? 'var(--text-primary)' : 'var(--border-color)')
                      }}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
