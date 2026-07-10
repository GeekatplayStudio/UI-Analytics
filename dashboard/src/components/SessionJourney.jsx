import React, { useState, useEffect } from 'react';

export default function SessionJourney({ activeDomain }) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionEvents, setSessionEvents] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

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
      case 'init': return '🚀';
      case 'click': return '🖱️';
      case 'scroll': return '📜';
      case 'input_focus': return '🔍';
      case 'input_change': return '✏️';
      case 'input_type': return '⌨️';
      default: return '⚡';
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      
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
                      border: '2px solid ' + (e.event_type === 'init' ? 'var(--accent-success)' : 'var(--accent-primary)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      {getEventIcon(e.event_type)}
                    </div>

                    {/* Timeline Content Card */}
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', textTransform: 'capitalize' }}>
                          {e.event_type.replace('_', ' ')}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span className="badge badge-secondary" style={{ fontSize: '9px', padding: '2px 6px' }}>
                            {elapsedStr}
                          </span>
                          {idx > 0 && (
                            <span className="badge badge-primary" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)', border: '1px solid rgba(16,185,129,0.2)' }}>
                              ⏳ +{e.time_delta_ms}ms
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details of Event */}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                        {e.page_url && (
                          <span style={{ wordBreak: 'break-all' }}>
                            📍 URL: <code style={{ color: 'var(--accent-secondary)' }}>{new URL(e.page_url).pathname || '/'}</code>
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
                          <span>Scroll Depth: Reached <strong style={{ color: 'var(--accent-success)' }}>{e.scroll_depth_percent}%</strong> of the page height</span>
                        )}
                        {isSensitive && (
                          <span style={{ color: 'var(--accent-warning)', fontWeight: 600, fontSize: '10px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🛡️ PII Stripped. Content excluded from ingestion pipeline.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
