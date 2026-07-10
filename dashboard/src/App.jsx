import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import SessionJourney from './components/SessionJourney';
import FunnelMetrics from './components/FunnelMetrics';
import Sandbox from './components/Sandbox';
import DomainManager from './components/DomainManager';
import FrictionAnalysis from './components/FrictionAnalysis';
import SiteIntegration from './components/SiteIntegration';
import ExampleSite from './components/ExampleSite';

export default function App() {
  const [activeTab, setActiveTab] = useState('metrics');
  const [domains, setDomains] = useState([]);
  const [activeDomain, setActiveDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Fetch domains on mount
  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
        if (data.length > 0) {
          // Default to first domain (which is localhost from seed, or first registered)
          setActiveDomain(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '30px',
      flex: 1
    }}>
      
      {/* Header Panel */}
      <header className="glass-card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Logo SVG */}
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px var(--accent-primary-glow)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800 }} className="glow-text-rainbow">
              EventFlow Analytics
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>High-performance event-level tracking</p>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {activeDomain && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Tracking Site</span>
              <strong style={{ color: 'var(--accent-secondary)' }}>{activeDomain.name}</strong>
            </div>
          )}
          <button 
            className="btn btn-secondary" 
            style={{ borderColor: showConfig ? 'var(--accent-primary)' : 'var(--border-color)' }}
            onClick={() => setShowConfig(!showConfig)}
          >
            ⚙️ Snippet Setup
          </button>
        </div>
      </header>

      {/* Snippet Config Panel (Domain Manager toggle) */}
      {showConfig && (
        <DomainManager 
          activeDomain={activeDomain} 
          setActiveDomain={setActiveDomain} 
          domains={domains} 
          refreshDomains={fetchDomains} 
        />
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        gap: '4px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        {[
          { id: 'metrics', label: '📊 Stats Overview' },
          { id: 'journey', label: '🗺️ User Journeys' },
          { id: 'funnels', label: '⏳ Funnel Conversions' },
          { id: 'friction', label: '🔍 UX Friction Overlay' },
          { id: 'example', label: '🎮 Demo Walkthrough' },
          { id: 'integration', label: '🔌 Site Integration' },
          { id: 'sandbox', label: '🧪 Live Sandbox' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: '2px solid ' + (activeTab === tab.id ? 'var(--accent-primary)' : 'transparent'),
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap'
            }}
            className="tab-button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Panel */}
      <main style={{ flex: 1 }}>
        {isLoading ? (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p>Loading application domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <h2>Welcome to EventFlow Analytics</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px' }}>
              To begin, please register the domain name you wish to track. We will generate your tracking snippet.
            </p>
            <div style={{ width: '100%', maxWidth: '600px', marginTop: '10px' }}>
              <DomainManager 
                activeDomain={activeDomain} 
                setActiveDomain={setActiveDomain} 
                domains={domains} 
                refreshDomains={fetchDomains} 
              />
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'metrics' && <Dashboard activeDomain={activeDomain} />}
            {activeTab === 'journey' && <SessionJourney activeDomain={activeDomain} />}
            {activeTab === 'funnels' && <FunnelMetrics activeDomain={activeDomain} />}
            {activeTab === 'friction' && <FrictionAnalysis activeDomain={activeDomain} />}
            {activeTab === 'example' && <ExampleSite activeDomain={activeDomain} />}
            {activeTab === 'integration' && <SiteIntegration activeDomain={activeDomain} />}
            {activeTab === 'sandbox' && <Sandbox activeDomain={activeDomain} />}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '20px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <span>EventFlow Analytics Ingestion Client v1.0.0</span>
        <span>Secured with client-side PII protection filters</span>
      </footer>

    </div>
  );
}
