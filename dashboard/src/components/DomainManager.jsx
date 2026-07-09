import React, { useState, useEffect } from 'react';

export default function DomainManager({ activeDomain, setActiveDomain, domains, refreshDomains }) {
  const [newDomainName, setNewDomainName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trackerHost = window.location.origin; // Vite proxy or production host
  
  const snippet = activeDomain 
    ? `<!-- EventFlow Analytics -->\n<script>\n  (function(w,d,s,o,f,js,fjs){\n    w['EventFlowObject']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};\n    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];\n    js.id='eventflow-tracker';js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);\n  }(window,document,'script','ef','${trackerHost}/tracker.js'));\n  ef('init', '${activeDomain.id}');\n</script>\n<!-- End EventFlow Analytics -->`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddDomain = async (e) => {
    e.preventDefault();
    if (!newDomainName.trim()) return;

    setError('');
    setIsSubmitting(true);

    try {
      const hostname = newDomainName.trim()
        .replace(/^(https?:\/\/)?(www\.)?/, '') // strip http/https/www
        .split('/')[0]; // get hostname only

      const res = await fetch('/api/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hostname })
      });

      if (!res.ok) {
        throw new Error('Failed to register domain');
      }

      const registered = await res.json();
      setNewDomainName('');
      await refreshDomains();
      setActiveDomain(registered);
    } catch (err) {
      setError(err.message || 'Error registering domain');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '18px', marginBottom: '4px' }}>Domain Management</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Select or add a domain to get your tracking code and view analytics.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label className="form-label">Active Domain</label>
          <select 
            value={activeDomain?.id || ''} 
            onChange={(e) => {
              const selected = domains.find(d => d.id === e.target.value);
              setActiveDomain(selected || null);
            }}
            className="form-input"
            style={{ width: '100%', cursor: 'pointer', background: 'rgba(8, 12, 20, 0.8)' }}
          >
            {domains.length === 0 ? (
              <option value="">No domains registered</option>
            ) : (
              domains.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))
            )}
          </select>
        </div>

        <form onSubmit={handleAddDomain} style={{ flex: '2 1 300px', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Register New Domain</label>
            <input 
              type="text" 
              placeholder="example.com" 
              value={newDomainName}
              onChange={(e) => setNewDomainName(e.target.value)}
              className="form-input"
              style={{ width: '100%' }}
              disabled={isSubmitting}
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ height: '45px', minWidth: '120px' }}
            disabled={isSubmitting || !newDomainName.trim()}
          >
            {isSubmitting ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-danger)', fontSize: '13px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          {error}
        </div>
      )}

      {activeDomain && (
        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent-secondary)' }}>
              Tracking Snippet for <code style={{ color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{activeDomain.name}</code>
            </span>
            <button 
              onClick={handleCopy} 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
          <pre style={{
            background: '#04060b',
            padding: '16px',
            borderRadius: '8px',
            overflowX: 'auto',
            border: '1px solid var(--border-color)',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#a5b4fc',
            fontFamily: 'Courier New, Courier, monospace'
          }}>
            {snippet}
          </pre>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-success)', boxShadow: '0 0 8px var(--accent-success)' }} />
            <span>Paste this script into the <code>&lt;head&gt;</code> of your website to start collecting interactions.</span>
          </div>
        </div>
      )}
    </div>
  );
}
