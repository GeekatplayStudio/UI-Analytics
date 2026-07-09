import React, { useState, useEffect } from 'react';

export default function Dashboard({ activeDomain }) {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeDomain) return;
    fetchMetrics();
  }, [activeDomain]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/metrics?domain_id=${activeDomain.id}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeDomain) {
    return (
      <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Please select a domain to load metrics.</p>
      </div>
    );
  }

  if (isLoading || !metrics) {
    return (
      <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Loading analytics metrics...</p>
      </div>
    );
  }

  // Calculate percentages for event breakdown
  const totalEventsCount = metrics.total_events || 0;
  const clickCount = metrics.event_types?.find(t => t.event_type === 'click')?.count || 0;
  const scrollCount = metrics.event_types?.find(t => t.event_type === 'scroll')?.count || 0;
  const inputCount = metrics.event_types?.filter(t => t.event_type.startsWith('input'))?.reduce((sum, t) => sum + t.count, 0) || 0;
  const otherCount = totalEventsCount - (clickCount + scrollCount + inputCount);

  const clickPercent = totalEventsCount > 0 ? Math.round((clickCount / totalEventsCount) * 100) : 0;
  const scrollPercent = totalEventsCount > 0 ? Math.round((scrollCount / totalEventsCount) * 100) : 0;
  const inputPercent = totalEventsCount > 0 ? Math.round((inputCount / totalEventsCount) * 100) : 0;
  const otherPercent = totalEventsCount > 0 ? Math.round((otherCount / totalEventsCount) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Metrics Row (Total Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Total Sessions */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total Sessions</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{metrics.total_sessions}</h2>
          <div style={{ fontSize: '12px', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⚡ Active and recording</span>
          </div>
        </div>

        {/* Card 2: Total Events */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Total Interaction Events</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-secondary)' }}>{metrics.total_events}</h2>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>Average {metrics.total_sessions > 0 ? Math.round(metrics.total_events / metrics.total_sessions) : 0} interactions/session</span>
          </div>
        </div>

        {/* Card 3: Avg Scroll Depth */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Avg Max Scroll Depth</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--accent-primary-hover)' }}>{metrics.avg_max_scroll}%</h2>
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${metrics.avg_max_scroll}%`, height: '100%', background: 'var(--accent-primary)' }} />
          </div>
        </div>

      </div>

      {/* Main Charts & Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
        
        {/* Interaction Breakdown Card */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px' }}>Interaction Breakdown</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Distribution of captured event types</p>
          </div>

          {/* Stacked Chart bar */}
          {totalEventsCount === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No interaction data recorded.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
              <div style={{
                height: '32px',
                width: '100%',
                borderRadius: '8px',
                overflow: 'hidden',
                display: 'flex',
                border: '1px solid var(--border-color)'
              }}>
                {clickPercent > 0 && <div style={{ width: `${clickPercent}%`, background: 'var(--accent-primary)', title: `Clicks: ${clickPercent}%` }} />}
                {scrollPercent > 0 && <div style={{ width: `${scrollPercent}%`, background: 'var(--accent-secondary)', title: `Scrolls: ${scrollPercent}%` }} />}
                {inputPercent > 0 && <div style={{ width: `${inputPercent}%`, background: 'var(--accent-success)', title: `Inputs: ${inputPercent}%` }} />}
                {otherPercent > 0 && <div style={{ width: `${otherPercent}%`, background: 'var(--text-muted)', title: `Others: ${otherPercent}%` }} />}
              </div>

              {/* Legend List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-primary)' }} />
                  <span>Clicks: <strong>{clickPercent}%</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-secondary)' }} />
                  <span>Scrolls: <strong>{scrollPercent}%</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent-success)' }} />
                  <span>Form Inputs: <strong>{inputPercent}%</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--text-muted)' }} />
                  <span>Others (Init): <strong>{otherPercent}%</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Interacted Elements (by ID) Card */}
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px' }}>Top Interacted Elements</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Most clicked/focused HTML elements by ID</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1, maxHeight: '250px' }}>
            {metrics.top_elements?.length === 0 ? (
              <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No element metrics captured.</div>
            ) : (
              metrics.top_elements?.map((el, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px'
                }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '12px' }}>#{idx + 1}</span>
                    <code style={{
                      color: 'var(--accent-secondary)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      maxWidth: '220px'
                    }}>
                      #{el.element_id}
                    </code>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'lowercase' }}>
                      &lt;{el.element_tag}&gt;
                    </span>
                  </div>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>{el.interactions} clicks</strong>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
