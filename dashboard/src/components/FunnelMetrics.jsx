import React, { useState, useEffect } from 'react';

export default function FunnelMetrics({ activeDomain }) {
  const [funnelData, setFunnelData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Default funnel steps matching our interactive Sandbox
  const [steps, setSteps] = useState([
    { name: '1. Session Start', type: 'event_type', selector: 'init' },
    { name: '2. Product Selected', type: 'event_type', selector: 'click' },
    { name: '3. Added to Cart', type: 'element_id', selector: 'add-to-cart-btn' },
    { name: '4. Initiated Checkout', type: 'element_id', selector: 'checkout-btn' }
  ]);

  const [newStepName, setNewStepName] = useState('');
  const [newStepType, setNewStepType] = useState('element_id');
  const [newStepSelector, setNewStepSelector] = useState('');

  useEffect(() => {
    if (!activeDomain) return;
    calculateFunnel();
  }, [activeDomain, steps]);

  const calculateFunnel = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/funnels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain_id: activeDomain.id,
          steps: steps
        })
      });
      if (res.ok) {
        const data = await res.json();
        setFunnelData(data);
      }
    } catch (error) {
      console.error('Error calculating funnel metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStep = (e) => {
    e.preventDefault();
    if (!newStepName.trim() || !newStepSelector.trim()) return;

    const newStep = {
      name: `${steps.length + 1}. ${newStepName.trim()}`,
      type: newStepType,
      selector: newStepSelector.trim()
    };

    setSteps([...steps, newStep]);
    setNewStepName('');
    setNewStepSelector('');
  };

  const handleResetFunnel = () => {
    setSteps([
      { name: '1. Session Start', type: 'event_type', selector: 'init' },
      { name: '2. Product Selected', type: 'event_type', selector: 'click' },
      { name: '3. Added to Cart', type: 'element_id', selector: 'add-to-cart-btn' },
      { name: '4. Initiated Checkout', type: 'element_id', selector: 'checkout-btn' }
    ]);
  };

  const formatTime = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (!activeDomain) {
    return (
      <div className="glass-card fade-in" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Please select a domain to calculate funnels.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      
      {/* Funnel Visualization Panel */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px' }}>Funnel Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Conversion progression and average time deltas</p>
          </div>
          <button onClick={calculateFunnel} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px' }}>
            Recalculate
          </button>
        </div>

        {/* Funnel Graph bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {isLoading ? (
            <div style={{ margin: 'auto', color: 'var(--text-secondary)' }}>Calculating conversions...</div>
          ) : funnelData.length === 0 ? (
            <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No data in funnel.</div>
          ) : (
            funnelData.map((step, idx) => {
              const prevStep = idx > 0 ? funnelData[idx - 1] : null;
              
              // Calculate conversion rate relative to the first step (overall)
              const firstStepCount = funnelData[0]?.converted || 1;
              const overallConversion = firstStepCount > 0 
                ? Math.round((step.converted / firstStepCount) * 100) 
                : 0;

              // Calculate transition rate from previous step (step-over-step)
              const stepOverStep = prevStep && prevStep.converted > 0
                ? Math.round((step.converted / prevStep.converted) * 100)
                : 100;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Step Metadata Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{step.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{step.converted}</strong> sessions ({overallConversion}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar Container */}
                  <div style={{
                    height: '24px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Glowing Progress bar */}
                    <div style={{
                      width: `${overallConversion}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                      boxShadow: 'inset 0 0 10px rgba(6, 182, 212, 0.5)',
                      transition: 'width var(--transition-normal)'
                    }} />

                    {/* Step-Over-Step Rate overlay */}
                    {idx > 0 && (
                      <div style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: stepOverStep > 0 ? 'var(--accent-secondary)' : 'var(--text-muted)'
                      }}>
                        {stepOverStep}% of prev
                      </div>
                    )}
                  </div>

                  {/* Transition Info & Averages */}
                  {idx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', paddingLeft: '8px', borderLeft: '2px solid rgba(139, 92, 246, 0.2)' }}>
                      <span>Average speed: <strong>{formatTime(step.avg_time_to_step_ms)}</strong> from start</span>
                      <span>Drop-off: <strong style={{ color: 'var(--accent-danger)' }}>{prevStep ? prevStep.converted - step.converted : 0} sessions</strong></span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Funnel Builder / Step Management */}
      <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px' }}>Configure Funnel</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Customize steps to calculate conversion</p>
          </div>
          <button 
            onClick={handleResetFunnel} 
            className="btn btn-secondary" 
            style={{ padding: '4px 10px', fontSize: '11px', color: 'var(--accent-warning)' }}
          >
            Reset Default
          </button>
        </div>

        {/* Current steps list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {steps.map((s, idx) => (
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
              <div>
                <span style={{ fontWeight: 600, color: '#fff', marginRight: '8px' }}>{s.name}</span>
                <code style={{ fontSize: '11px', color: 'var(--accent-secondary)', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                  {s.type === 'event_type' ? 'event' : s.type}: {s.selector}
                </code>
              </div>
              <button 
                onClick={() => setSteps(steps.filter((_, i) => i !== idx))} 
                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', fontSize: '16px' }}
                title="Remove step"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Add custom step form */}
        <form onSubmit={handleAddStep} style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Add Custom Funnel Step</span>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '11px' }}>Step Name</label>
            <input 
              type="text" 
              placeholder="e.g. Checked Coupon" 
              value={newStepName} 
              onChange={(e) => setNewStepName(e.target.value)}
              className="form-input"
              style={{ padding: '8px 12px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Identify By</label>
              <select 
                value={newStepType} 
                onChange={(e) => setNewStepType(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                <option value="element_id">Element HTML ID</option>
                <option value="event_type">Generic Event Type</option>
                <option value="element_tag">HTML Tag Name</option>
              </select>
            </div>

            <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>Selector / Value</label>
              <input 
                type="text" 
                placeholder={newStepType === 'element_id' ? 'e.g. checkout-btn' : newStepType === 'event_type' ? 'e.g. scroll' : 'e.g. BUTTON'} 
                value={newStepSelector} 
                onChange={(e) => setNewStepSelector(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: '4px' }}
            disabled={!newStepName.trim() || !newStepSelector.trim()}
          >
            Add Step to Funnel
          </button>
        </form>
      </div>

    </div>
  );
}
