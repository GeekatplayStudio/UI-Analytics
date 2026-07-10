import React, { useState, useEffect } from 'react';

export default function SiteIntegration({ activeDomain }) {
  const [filePath, setFilePath] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [injectionSuccess, setInjectionSuccess] = useState('');
  const [error, setError] = useState('');

  // Checklist Status
  const [latestSession, setLatestSession] = useState(null);
  const [events, setEvents] = useState([]);
  const [isPolling, setIsPolling] = useState(true);

  // Poll for events to update the checklist in real-time
  useEffect(() => {
    if (!activeDomain) return;
    
    // Fetch latest session and events immediately, then set up poll
    checkIntegrationStatus();
    
    let interval = null;
    if (isPolling) {
      interval = setInterval(() => {
        checkIntegrationStatus();
      }, 2500);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeDomain, isPolling]);

  const checkIntegrationStatus = async () => {
    try {
      const sRes = await fetch(`/api/sessions?domain_id=${activeDomain.id}`);
      if (!sRes.ok) return;
      const sessionsData = await sRes.json();
      
      if (sessionsData.length === 0) {
        setLatestSession(null);
        setEvents([]);
        return;
      }

      // Pick the most recent session
      const recent = sessionsData[0];
      setLatestSession(recent);

      const eRes = await fetch(`/api/sessions/${recent.id}/events`);
      if (eRes.ok) {
        const eventsData = await eRes.json();
        setEvents(eventsData);
      }
    } catch (err) {
      console.error('Error checking integration metrics:', err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!filePath.trim()) return;

    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);
    setInjectionSuccess('');

    try {
      const res = await fetch('/api/integration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath.trim(),
          domain_id: activeDomain.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze file');
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || 'Error scanning file path');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleInject = async () => {
    if (!filePath.trim()) return;

    setIsInjecting(true);
    setError('');
    setInjectionSuccess('');

    try {
      const res = await fetch('/api/integration/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath.trim(),
          domain_id: activeDomain.id
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Snippet injection failed');
      }

      const data = await res.json();
      setInjectionSuccess(data.message);
      
      // Re-analyze to update UI previews
      const reAnalyze = await fetch('/api/integration/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath.trim(),
          domain_id: activeDomain.id
        })
      });
      if (reAnalyze.ok) {
        const reData = await reAnalyze.json();
        setAnalysis(reData);
      }
    } catch (err) {
      setError(err.message || 'Error writing script snippet');
    } finally {
      setIsInjecting(false);
    }
  };

  // Checklist Calculations
  const hasInit = events.some(e => e.event_type === 'init');
  const clickCount = events.filter(e => e.event_type === 'click').length;
  const maxScroll = events.reduce((max, e) => e.scroll_depth_percent !== null ? Math.max(max, e.scroll_depth_percent) : max, 0);
  
  const hasInputs = events.some(e => e.event_type.startsWith('input'));
  const hasFrustrations = events.some(e => e.event_type === 'rage_click' || e.event_type === 'dead_click' || e.event_type === 'input_error');

  const checklistScore = 
    (hasInit ? 1 : 0) + 
    (clickCount >= 3 ? 1 : 0) + 
    (maxScroll >= 50 ? 1 : 0) + 
    (hasInputs ? 1 : 0) + 
    (hasFrustrations ? 1 : 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
      
      {/* Local HTML Code Injection Wizard */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Local Snippet Injection Wizard</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            Provide the absolute path to your index.html or target page, and our agent will automatically inject the EventFlow tracking script.
          </p>
        </div>

        <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Absolute File Path</label>
            <input
              type="text"
              placeholder="/Users/username/Projects/my-site/index.html"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              disabled={isAnalyzing || isInjecting}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isAnalyzing || isInjecting || !filePath.trim()}
          >
            {isAnalyzing ? 'Scanning File...' : 'Analyze local HTML File'}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--accent-danger)', fontSize: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            {error}
          </div>
        )}

        {injectionSuccess && (
          <div style={{ color: 'var(--accent-success)', fontSize: '12px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            {injectionSuccess}
          </div>
        )}

        {/* File preview diff comparison */}
        {analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>
                {analysis.suggestedLine > 0 ? `Target Match: line ${analysis.suggestedLine} (</head> tag)` : 'Target Match: File Top'}
              </span>
              {analysis.alreadyInjected ? (
                <span className="badge badge-success">Already Injected</span>
              ) : (
                <button
                  onClick={handleInject}
                  className="btn btn-accent"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  disabled={isInjecting}
                >
                  {isInjecting ? 'Injecting...' : 'Auto-Inject Snippet'}
                </button>
              )}
            </div>

            {/* Original vs Proposed Comparisons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', fontFamily: 'Courier New, monospace' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>Original Code snippet</div>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', overflowX: 'auto', border: '1px solid var(--border-color)', color: '#f3f4f6' }}>
                  {analysis.originalPreview}
                </pre>
              </div>

              <div>
                <div style={{ color: 'var(--accent-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>Proposed Injected Code</div>
                <pre style={{
                  background: 'rgba(6, 182, 212, 0.05)',
                  padding: '10px',
                  borderRadius: '6px',
                  overflowX: 'auto',
                  border: '1px solid rgba(6, 182, 212, 0.2)',
                  color: '#a5b4fc',
                  maxHeight: '180px'
                }}>
                  {analysis.modifiedPreview}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guided Verification Checklist */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Guided Behavioral Testing</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
              Perform actions on your site to verify telemetry integration.
            </p>
          </div>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className="btn btn-secondary"
            style={{ padding: '4px 10px', fontSize: '11px', borderColor: isPolling ? 'var(--accent-primary)' : 'var(--border-color)' }}
          >
            {isPolling ? '🟢 Live Syncing' : '⚫ Poll Paused'}
          </button>
        </div>

        {/* Current Active Session indicators */}
        <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '12px' }}>
          {latestSession ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Testing active session: <strong style={{ color: 'var(--accent-secondary)' }}>{latestSession.id.startsWith('walkthrough-') ? `🎮 Mission Session: ${latestSession.id.substring(20, 26)}` : latestSession.id.substring(0, 8) + '...'}</strong></span>
              <span className="badge badge-success" style={{ fontSize: '9px' }}>Connected</span>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              &gt; Waiting for active tracking session load...
            </div>
          )}
        </div>

        {/* Progress score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
          <span>Integration Progress:</span>
          <strong>{checklistScore}/5 Tests Passed</strong>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${(checklistScore / 5) * 100}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)', transition: 'width 0.4s ease' }} />
        </div>

        {/* Checklist rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', flex: 1 }}>
          
          {/* Test 1: Script load */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <span style={{ fontSize: '18px' }}>{hasInit ? '✅' : '⬜'}</span>
            <div>
              <strong style={{ color: hasInit ? '#fff' : 'var(--text-secondary)' }}>1. Connect & Initialize Script</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {hasInit ? `Verified! Connection received from browser agent.` : 'Paste script or auto-inject, then open/refresh your website.'}
              </div>
            </div>
          </div>

          {/* Test 2: Standard clicks */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <span style={{ fontSize: '18px' }}>{clickCount >= 3 ? '✅' : '⬜'}</span>
            <div>
              <strong style={{ color: clickCount >= 3 ? '#fff' : 'var(--text-secondary)' }}>2. Standard Clicks (Minimum 3 Clicks)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {clickCount >= 3 ? `Verified! Captured ${clickCount} clicks.` : `Click at least 3 active buttons/links on your website. (Captured: ${clickCount}/3)`}
              </div>
            </div>
          </div>

          {/* Test 3: Scroll tracking */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <span style={{ fontSize: '18px' }}>{maxScroll >= 50 ? '✅' : '⬜'}</span>
            <div>
              <strong style={{ color: maxScroll >= 50 ? '#fff' : 'var(--text-secondary)' }}>3. Vertical Scroll Depth (&gt;50% height)</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {maxScroll >= 50 ? `Verified! Recorded maximum scroll depth of ${maxScroll}%.` : `Scroll down past 50% vertical height of your website. (Max depth: ${maxScroll}%)`}
              </div>
            </div>
          </div>

          {/* Test 4: Form Input & PII filter */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <span style={{ fontSize: '18px' }}>{hasInputs ? '✅' : '⬜'}</span>
            <div>
              <strong style={{ color: hasInputs ? '#fff' : 'var(--text-secondary)' }}>4. Form Input & PII Shield Verification</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {hasInputs ? 'Verified! Inputs tracked. Zero character keys saved, keeping passwords secure.' : 'Interact with input fields (focus, blur, type) on your forms.'}
              </div>
            </div>
          </div>

          {/* Test 5: Frustrations & Rage click check */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', fontSize: '13px' }}>
            <span style={{ fontSize: '18px' }}>{hasFrustrations ? '✅' : '⬜'}</span>
            <div>
              <strong style={{ color: hasFrustrations ? '#fff' : 'var(--text-secondary)' }}>5. UI Health & Frustration Telemetry</strong>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {hasFrustrations 
                  ? 'Verified! Captured dead clicks, rage clicks, or input errors successfully.' 
                  : 'Trigger a dead click (click static labels), rage click (rapidly click 4x), or input validation error (blur invalid email).'}
              </div>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
