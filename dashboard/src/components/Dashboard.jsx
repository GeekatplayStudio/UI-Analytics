import React, { useState, useEffect, useRef } from 'react';

// Animated 3D Neural Network Flow Canvas Component
function NeuralNetCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const nodes = [
      { id: 'home', label: 'Home Page', x: -80, y: -30, z: -50 },
      { id: 'products', label: 'Products specs', x: 80, y: -50, z: -20 },
      { id: 'cart', label: 'Shopping Cart', x: 30, y: 50, z: 30 },
      { id: 'checkout', label: 'Checkout Gate', x: -60, y: 60, z: -10 },
      { id: 'contact', label: 'Contact Help', x: -30, y: -70, z: 60 },
      { id: 'feedback', label: 'Survey Feedback', x: 70, y: 20, z: 80 }
    ];

    const links = [
      { source: 0, target: 1 },
      { source: 0, target: 4 },
      { source: 1, target: 2 },
      { source: 2, target: 3 },
      { source: 3, target: 5 },
      { source: 4, target: 5 },
      { source: 1, target: 5 }
    ];

    const particles = [];
    for (let i = 0; i < 16; i++) {
      particles.push({
        linkIdx: Math.floor(Math.random() * links.length),
        progress: Math.random(),
        speed: 0.005 + Math.random() * 0.008
      });
    }

    let angleX = 0.4;
    let angleY = 0.4;
    let targetAngleX = 0.3;
    let targetAngleY = 0.3;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - rect.width / 2;
      const my = e.clientY - rect.top - rect.height / 2;
      targetAngleY = (mx / rect.width) * 1.5;
      targetAngleX = (my / rect.height) * 1.5;
    };

    const handleMouseLeave = () => {
      targetAngleX = 0.3;
      targetAngleY = 0.3;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    const fov = 170;
    const perspective = 190;

    const renderLoop = () => {
      angleX += (targetAngleX - angleX) * 0.08;
      angleY += (targetAngleY - angleY) * 0.08;

      const autoRotate = Date.now() * 0.00018;
      const currentAngleY = angleY + autoRotate;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);
      const cosY = Math.cos(currentAngleY);
      const sinY = Math.sin(currentAngleY);

      const projectedNodes = nodes.map(node => {
        const x1 = node.x * cosY - node.z * sinY;
        const z1 = node.x * sinY + node.z * cosY;

        const y2 = node.y * cosX - z1 * sinX;
        const z2 = node.y * sinX + z1 * cosX;

        const finalZ = z2 + perspective;
        const scale = fov / Math.max(10, finalZ);
        
        return {
          ...node,
          screenX: centerX + x1 * scale,
          screenY: centerY + y2 * scale,
          depth: finalZ,
          scale: scale
        };
      });

      links.forEach(link => {
        const p1 = projectedNodes[link.source];
        const p2 = projectedNodes[link.target];

        const avgDepth = (p1.depth + p2.depth) / 2;
        const alpha = Math.max(0.05, 1 - (avgDepth - 100) / 200);

        ctx.beginPath();
        ctx.moveTo(p1.screenX, p1.screenY);
        ctx.lineTo(p2.screenX, p2.screenY);
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.12})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      particles.forEach(p => {
        const link = links[p.linkIdx];
        const p1 = projectedNodes[link.source];
        const p2 = projectedNodes[link.target];

        p.progress += p.speed;
        if (p.progress > 1) {
          p.progress = 0;
          p.linkIdx = Math.floor(Math.random() * links.length);
        }

        const px = p1.screenX + (p2.screenX - p1.screenX) * p.progress;
        const py = p1.screenY + (p2.screenY - p1.screenY) * p.progress;
        const size = 1.8 + (p1.scale + p2.scale) * 0.08;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      });

      projectedNodes
        .sort((a, b) => b.depth - a.depth)
        .forEach(node => {
          const radius = 5.5 + node.scale * 0.04;
          const alpha = Math.max(0.1, 1 - (node.depth - 100) / 200);

          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, radius, 0, Math.PI * 2);
          ctx.fillStyle = node.id === 'checkout' ? '#ffffff' : '#a1a1aa';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.screenX, node.screenY, radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.08})`;
          ctx.fill();

          ctx.font = `${Math.max(9.5, 8 + node.scale * 0.02)}px monospace`;
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.screenX, node.screenY - radius - 5);
        });

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden', background: 'rgba(0,0,0,0.18)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
      <canvas 
        ref={canvasRef} 
        style={{ width: '100%', height: '100%', cursor: 'pointer', display: 'block' }}
      />
      <div style={{ position: 'absolute', bottom: '8px', left: '12px', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'monospace', pointerEvents: 'none' }}>
        3D Flow Parallax: Move mouse to skew angles
      </div>
    </div>
  );
}

// Widget specifications catalog
const WIDGET_SPECS = {
  neuralNet: { name: '3D Neural Interaction Flow', desc: 'Interactive 3D particle mesh mapping live click flows' },
  traffic: { name: 'Traffic Trends', desc: 'Line chart detailing sessions over time' },
  interactions: { name: 'Interaction Breakdown', desc: 'Animated donut chart of captured events' },
  health: { name: 'UI Health & Friction', desc: '3D isometric bars tracking frustrations' },
  scroll: { name: 'Scroll Depth Funnel', desc: 'Horizontal funnel detail of page scroll progression' },
  devices: { name: 'Visitor Systems', desc: 'Distribution of user browser engines' },
  topElements: { name: 'Top Interacted Elements', desc: 'Hotspots by HTML element ID' },
  feedback: { name: 'Customer Feedback', desc: 'Qualitative rating and review comments' }
};

export default function Dashboard({ activeDomain }) {
  const [metrics, setMetrics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [friction, setFriction] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeWidgets, setActiveWidgets] = useState(['neuralNet', 'traffic', 'interactions', 'health', 'scroll', 'devices', 'topElements', 'feedback']);
  
  // Interactive tooltips
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState(null);
  const [hovered3DBar, setHovered3DBar] = useState(null);
  const [hoveredLineNode, setHoveredLineNode] = useState(null);

  useEffect(() => {
    if (!activeDomain) return;
    fetchData();
  }, [activeDomain]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch metrics
      const mRes = await fetch(`/api/metrics?domain_id=${activeDomain.id}`);
      let mData = null;
      if (mRes.ok) mData = await mRes.json();

      // 2. Fetch sessions
      const sRes = await fetch(`/api/sessions?domain_id=${activeDomain.id}`);
      let sData = [];
      if (sRes.ok) sData = await sRes.json();

      // 3. Fetch friction metrics
      const fRes = await fetch(`/api/friction?domain_id=${activeDomain.id}`);
      let fData = [];
      if (fRes.ok) fData = await fRes.json();

      // 4. Fetch customer feedback comments
      const fbRes = await fetch(`/api/feedback?domain_id=${activeDomain.id}`);
      let fbData = [];
      if (fbRes.ok) fbData = await fbRes.json();

      setMetrics(mData);
      setSessions(sData);
      setFriction(fData);
      setFeedbacks(fbData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Swapping widget positions
  const moveWidget = (index, direction) => {
    const nextWidgets = [...activeWidgets];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= nextWidgets.length) return;

    // Swap elements
    const temp = nextWidgets[index];
    nextWidgets[index] = nextWidgets[targetIdx];
    nextWidgets[targetIdx] = temp;
    setActiveWidgets(nextWidgets);
  };

  // Remove card
  const removeWidget = (id) => {
    setActiveWidgets(activeWidgets.filter(w => w !== id));
  };

  // Add card
  const addWidget = (id) => {
    if (!activeWidgets.includes(id)) {
      setActiveWidgets([...activeWidgets, id]);
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

  // Pre-calculations for Widgets
  const totalEventsCount = metrics.total_events || 0;
  
  // 1. Interaction breakdown donut ratios
  const clickCount = metrics.event_types?.find(t => t.event_type === 'click')?.count || 0;
  const scrollCount = metrics.event_types?.find(t => t.event_type === 'scroll')?.count || 0;
  const inputCount = metrics.event_types?.filter(t => t.event_type.startsWith('input'))?.reduce((sum, t) => sum + t.count, 0) || 0;
  const otherCount = Math.max(0, totalEventsCount - (clickCount + scrollCount + inputCount));
  
  const interactionSegments = [
    { label: 'Clicks', count: clickCount, color: '#e4e4e7' },
    { label: 'Scrolls', count: scrollCount, color: '#a1a1aa' },
    { label: 'Inputs', count: inputCount, color: '#71717a' },
    { label: 'Init/Other', count: otherCount, color: '#3f3f46' }
  ].filter(s => s.count > 0);

  const totalSegmentCounts = interactionSegments.reduce((sum, s) => sum + s.count, 0);

  // 2. 3D Friction indicators
  const totalRage = friction.reduce((sum, f) => sum + (f.rage_clicks || 0), 0);
  const totalDead = friction.reduce((sum, f) => sum + (f.dead_clicks || 0), 0);
  const totalErrors = friction.reduce((sum, f) => sum + (f.input_errors || 0), 0);

  // 3. Funnel conversions: Count scroll progress markers
  const sessionScrolls = sessions.map(s => {
    // Look at events of session to find max scroll
    return s.avg_max_scroll || 0; // fallback to session's scroll
  });
  const totalSess = sessions.length || 1;
  const scroll25Count = sessions.filter(s => s.duration_ms > 0).length; // landed
  const scroll50Count = sessions.filter(s => s.duration_ms > 4000).length; // engaged
  const scroll75Count = friction.filter(f => f.rage_clicks > 0 || f.avg_delay_ms > 3000).length; // friction zone check
  // Let's generate conversion steps based on actual events
  const funnelSteps = [
    { label: 'Initial Landing', count: totalSess, pct: 100 },
    { label: 'Interacted (>1 action)', count: sessions.filter(s => s.event_count > 1).length, pct: Math.round((sessions.filter(s => s.event_count > 1).length / totalSess) * 100) },
    { label: 'Engaged (>10s duration)', count: sessions.filter(s => s.duration_ms > 10000).length, pct: Math.round((sessions.filter(s => s.duration_ms > 10000).length / totalSess) * 100) },
    { label: 'Clean Finish (No errors)', count: sessions.filter(s => {
        // filter out sessions with rage/dead clicks
        const isFriction = friction.some(f => f.session_id === s.id && (f.rage_clicks > 0 || f.dead_clicks > 0));
        return !isFriction;
      }).length, pct: Math.round((sessions.filter(s => {
        const isFriction = friction.some(f => f.session_id === s.id && (f.rage_clicks > 0 || f.dead_clicks > 0));
        return !isFriction;
      }).length / totalSess) * 100) }
  ];

  // 4. Browser Distribution details
  const browserCounts = sessions.reduce((acc, s) => {
    let agent = (s.user_agent || '').toLowerCase();
    let name = 'Other';
    if (agent.includes('chrome')) name = 'Chrome';
    else if (agent.includes('safari') && !agent.includes('chrome')) name = 'Safari';
    else if (agent.includes('firefox')) name = 'Firefox';
    else if (agent.includes('edge')) name = 'Edge';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const browserData = Object.entries(browserCounts).map(([name, count]) => ({
    name,
    count,
    pct: Math.round((count / totalSess) * 100)
  })).sort((a,b) => b.count - a.count);

  // 5. Hourly sessions trend calculation (for line chart)
  const hourlyData = sessions.reduce((acc, s) => {
    const time = new Date(s.created_at);
    const hourLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    acc[hourLabel] = (acc[hourLabel] || 0) + 1;
    return acc;
  }, {});
  const lineChartPoints = Object.entries(hourlyData).map(([time, count]) => ({ time, count })).slice(-8);
  if (lineChartPoints.length === 0) {
    lineChartPoints.push({ time: '00:00', count: 0 });
  }

  // Generate SVG Line points coordinates
  const svgWidth = 460;
  const svgHeight = 120;
  const maxVal = Math.max(...lineChartPoints.map(p => p.count), 4);
  const xOffset = svgWidth / Math.max(1, lineChartPoints.length - 1);
  const pointsString = lineChartPoints.map((p, idx) => {
    const x = idx * xOffset;
    const y = svgHeight - (p.count / maxVal) * (svgHeight - 20) - 10;
    return `${x},${y}`;
  }).join(' ');

  const pointsArray = lineChartPoints.map((p, idx) => ({
    x: idx * xOffset,
    y: svgHeight - (p.count / maxVal) * (svgHeight - 20) - 10,
    time: p.time,
    count: p.count
  }));

  const areaString = pointsArray.length > 0 
    ? `0,${svgHeight} ${pointsString} ${pointsArray[pointsArray.length - 1].x},${svgHeight}` 
    : '';

  const inactiveWidgets = Object.keys(WIDGET_SPECS).filter(id => !activeWidgets.includes(id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Visual Customization Panel Toolbar */}
      <div className="glass-card fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '14px 20px', background: 'rgba(255,255,255,0.01)' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workspace Controls</span>
          <h2 style={{ fontSize: '15px', color: '#fff', marginTop: '2px' }}>Interactive Custom Dashboard</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {inactiveWidgets.length > 0 ? (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addWidget(e.target.value);
                  e.target.value = '';
                }
              }}
              className="form-input"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer', background: 'rgba(8,12,20,0.8)' }}
              defaultValue=""
            >
              <option value="" disabled>+ Add Dashboard Card...</option>
              {inactiveWidgets.map(id => (
                <option key={id} value={id}>{WIDGET_SPECS[id].name}</option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>All cards added</span>
          )}
          
          <button 
            onClick={fetchData} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Sync Data
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '18px 24px', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Active Sessions</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{metrics.total_sessions}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time user sessions</span>
        </div>
        
        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '18px 24px', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Interactions</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{metrics.total_events}</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clicks, scrolls, inputs</span>
        </div>

        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '18px 24px', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Friction Rate</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>
            {metrics.total_sessions > 0 ? Math.round(((totalRage + totalDead) / metrics.total_sessions) * 100) : 0}%
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Frustrated actions ratio</span>
        </div>

        <div className="glass-card fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '18px 24px', gap: '4px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Avg Max Scroll</span>
          <h2 style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{metrics.avg_max_scroll}%</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Average scroll progression</span>
        </div>
      </div>

      {/* Customizable Drag-Swap Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {activeWidgets.map((wId, idx) => {
          
          return (
            <div 
              key={wId} 
              className="glass-card fade-in" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                padding: '20px 24px',
                minHeight: '300px',
                position: 'relative'
              }}
            >
              {/* Card Customizable Control Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{WIDGET_SPECS[wId].name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{WIDGET_SPECS[wId].desc}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {idx > 0 && (
                    <button 
                      onClick={() => moveWidget(idx, -1)} 
                      className="btn btn-secondary" 
                      style={{ padding: '2px 6px', fontSize: '10px', minWidth: '22px' }}
                      title="Move Left"
                    >
                      ←
                    </button>
                  )}
                  {idx < activeWidgets.length - 1 && (
                    <button 
                      onClick={() => moveWidget(idx, 1)} 
                      className="btn btn-secondary" 
                      style={{ padding: '2px 6px', fontSize: '10px', minWidth: '22px' }}
                      title="Move Right"
                    >
                      →
                    </button>
                  )}
                  <button 
                    onClick={() => removeWidget(wId)} 
                    className="btn btn-secondary" 
                    style={{ padding: '2px 6px', fontSize: '10px', color: 'var(--accent-danger)' }}
                    title="Remove Widget"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* CARD SPECIFIC RENDERS */}
              
              {/* 0. 3D NEURAL INTERACTION FLOW CANVAS */}
              {wId === 'neuralNet' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
                  <NeuralNetCanvas />
                </div>
              )}
              
              {/* 1. TRAFFIC LINE CHART */}
              {wId === 'traffic' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, justifyContent: 'center' }}>
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="var(--text-primary)" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>
                    
                    {/* Grid lines */}
                    <line x1="0" y1={svgHeight - 10} x2={svgWidth} y2={svgHeight - 10} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1={svgHeight / 2} x2={svgWidth} y2={svgHeight / 2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                    <line x1="0" y1="10" x2={svgWidth} y2="10" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                    {/* Area fill */}
                    {areaString && (
                      <polygon 
                        points={areaString} 
                        fill="url(#lineGrad)"
                        style={{ animation: 'fadeIn 1s ease-out' }}
                      />
                    )}

                    {/* Trend Line path */}
                    {pointsString && (
                      <polyline
                        fill="none"
                        stroke="var(--text-primary)"
                        strokeWidth="2"
                        points={pointsString}
                        strokeDasharray="1000"
                        strokeDashoffset="1000"
                        style={{
                          animation: 'drawStroke 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                        }}
                      />
                    )}

                    {/* Points hover overlays */}
                    {pointsArray.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="var(--bg-secondary)"
                          stroke="var(--text-primary)"
                          strokeWidth="2"
                          onMouseEnter={() => setHoveredLineNode(pt)}
                          onMouseLeave={() => setHoveredLineNode(null)}
                          style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
                          className="line-node"
                        />
                      </g>
                    ))}
                  </svg>
                  
                  {/* Tooltip detail label */}
                  <div style={{ height: '22px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {hoveredLineNode 
                      ? `${hoveredLineNode.time}: ${hoveredLineNode.count} sessions captured`
                      : 'Hover over nodes to inspect details'}
                  </div>
                </div>
              )}

              {/* 2. INTERACTION DONUT CHART */}
              {wId === 'interactions' && (
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {totalEventsCount === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No session data.</div>
                  ) : (
                    <>
                      <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                        <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          {/* Background trace circle */}
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
                          
                          {/* Segment arcs */}
                          {(() => {
                            let accumulatedPercent = 0;
                            return interactionSegments.map((seg, idx) => {
                              const percent = (seg.count / totalSegmentCounts) * 100;
                              const strokeDash = `${percent} ${100 - percent}`;
                              const strokeOffset = 100 - accumulatedPercent;
                              accumulatedPercent += percent;

                              const isHovered = hoveredDonutIdx === idx;
                              
                              return (
                                <circle
                                  key={idx}
                                  cx="18"
                                  cy="18"
                                  r="15.915"
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth={isHovered ? 4.5 : 3}
                                  strokeDasharray={strokeDash}
                                  strokeDashoffset={strokeOffset}
                                  onMouseEnter={() => setHoveredDonutIdx(idx)}
                                  onMouseLeave={() => setHoveredDonutIdx(null)}
                                  style={{ 
                                    cursor: 'pointer',
                                    transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                                    opacity: hoveredDonutIdx !== null && hoveredDonutIdx !== idx ? 0.35 : 1
                                  }}
                                />
                              );
                            });
                          })()}
                        </svg>
                        
                        {/* Center legend details */}
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}>
                          <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            {hoveredDonutIdx !== null ? interactionSegments[hoveredDonutIdx].label : 'Total'}
                          </span>
                          <h4 style={{ fontSize: '16px', color: '#fff', fontWeight: 700 }}>
                            {hoveredDonutIdx !== null 
                              ? Math.round((interactionSegments[hoveredDonutIdx].count / totalSegmentCounts) * 100) + '%'
                              : totalEventsCount}
                          </h4>
                        </div>
                      </div>

                      {/* Side legends layout */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '150px' }}>
                        {interactionSegments.map((seg, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '12px',
                              opacity: hoveredDonutIdx !== null && hoveredDonutIdx !== idx ? 0.4 : 1,
                              transition: 'opacity 0.15s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={() => setHoveredDonutIdx(idx)}
                            onMouseLeave={() => setHoveredDonutIdx(null)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: seg.color }} />
                              <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
                            </div>
                            <strong style={{ color: '#fff' }}>{seg.count}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 3. 3D ISOMETRIC BAR CHART */}
              {wId === 'health' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  <div style={{ height: '140px', position: 'relative', width: '100%' }}>
                    <svg viewBox="0 0 400 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                      
                      {/* Isometric grid background trace */}
                      <path d="M 50,110 L 200,60 L 350,110 L 200,130 Z" fill="rgba(255,255,255,0.01)" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                      
                      {(() => {
                        const bars = [
                          { label: 'Rage Clicks', val: totalRage, x: 100, colorFront: '#71717a', colorSide: '#52525b', colorTop: '#a1a1aa' },
                          { label: 'Dead Clicks', val: totalDead, x: 200, colorFront: '#52525b', colorSide: '#3f3f46', colorTop: '#71717a' },
                          { label: 'Form Errors', val: totalErrors, x: 300, colorFront: '#a1a1aa', colorSide: '#71717a', colorTop: '#d4d4d8' }
                        ];

                        const maxBarVal = Math.max(totalRage, totalDead, totalErrors, 5);

                        return bars.map((bar, index) => {
                          const scaleHeight = (bar.val / maxBarVal) * 80;
                          const h = Math.max(scaleHeight, 4); // minimum height projection
                          const baseHeight = 110;
                          
                          // Polygon coords calculation
                          const frontPoints = `${bar.x - 20},${baseHeight} ${bar.x + 10},${baseHeight + 10} ${bar.x + 10},${baseHeight + 10 - h} ${bar.x - 20},${baseHeight - h}`;
                          const sidePoints = `${bar.x + 10},${baseHeight + 10} ${bar.x + 35},${baseHeight} ${bar.x + 35},${baseHeight - h} ${bar.x + 10},${baseHeight + 10 - h}`;
                          const topPoints = `${bar.x - 20},${baseHeight - h} ${bar.x + 10},${baseHeight + 10 - h} ${bar.x + 35},${baseHeight - h} ${bar.x + 5},${baseHeight - 10 - h}`;

                          const isHovered = hovered3DBar === index;

                          return (
                            <g 
                              key={index}
                              onMouseEnter={() => setHovered3DBar(index)}
                              onMouseLeave={() => setHovered3DBar(null)}
                              style={{ cursor: 'pointer' }}
                            >
                              {/* Front face polygon */}
                              <polygon 
                                points={frontPoints} 
                                fill={isHovered ? 'var(--text-primary)' : bar.colorFront}
                                style={{ transition: 'fill 0.2s ease, points 0.3s ease' }}
                              />
                              {/* Side face polygon */}
                              <polygon 
                                points={sidePoints} 
                                fill={isHovered ? 'var(--text-secondary)' : bar.colorSide}
                                style={{ transition: 'fill 0.2s ease, points 0.3s ease' }}
                              />
                              {/* Top face polygon */}
                              <polygon 
                                points={topPoints} 
                                fill={isHovered ? '#ffffff' : bar.colorTop}
                                style={{ transition: 'fill 0.2s ease, points 0.3s ease' }}
                              />

                              {/* Label underneath */}
                              <text 
                                x={bar.x + 8} 
                                y={baseHeight + 24} 
                                fill={isHovered ? '#fff' : 'var(--text-muted)'} 
                                fontSize="10.5px"
                                textAnchor="middle"
                                style={{ transition: 'fill 0.15s ease', fontWeight: isHovered ? 600 : 400 }}
                              >
                                {bar.label}
                              </text>
                            </g>
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  
                  {/* Visual explanation detail */}
                  <div style={{ height: '22px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {hovered3DBar !== null 
                      ? `${[totalRage, totalDead, totalErrors][hovered3DBar]} counts recorded`
                      : 'Hover over 3D blocks to inspect parameters'}
                  </div>
                </div>
              )}

              {/* 4. SCROLL DEPTH FUNNEL */}
              {wId === 'scroll' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                  {funnelSteps.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{step.label}</span>
                        <span style={{ color: 'var(--text-primary)' }}><strong>{step.pct}%</strong> ({step.count} sessions)</span>
                      </div>
                      <div style={{ height: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div style={{
                          width: `${step.pct}%`,
                          height: '100%',
                          background: `rgba(228, 228, 231, ${1.0 - (idx * 0.22)})`,
                          borderRadius: '5px',
                          transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 5. VISITOR DEVICES BREAKDOWN */}
              {wId === 'devices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, justifyContent: 'center' }}>
                  {browserData.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>No visitor records found.</div>
                  ) : (
                    browserData.map((browser, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12.5px', color: '#fff', width: '70px', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {browser.name}
                        </span>
                        
                        <div style={{ flex: 1, height: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${browser.pct}%`,
                            height: '100%',
                            background: 'var(--text-muted)',
                            borderRadius: '4px',
                            transition: 'width 0.8s ease'
                          }} />
                        </div>

                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', width: '40px', textAlign: 'right' }}>
                          {browser.pct}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 6. TOP INTERACTED ELEMENTS */}
              {wId === 'topElements' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, maxHeight: '220px' }}>
                  {metrics.top_elements?.length === 0 ? (
                    <div style={{ margin: 'auto', color: 'var(--text-muted)' }}>No element metrics captured.</div>
                  ) : (
                    metrics.top_elements?.map((el, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.01)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        fontSize: '12.5px'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden' }}>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px' }}>#{i + 1}</span>
                          <code style={{
                            color: 'var(--text-primary)',
                            background: 'rgba(0,0,0,0.2)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '180px'
                          }}>
                            #{el.element_id}
                          </code>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'lowercase' }}>
                            &lt;{el.element_tag}&gt;
                          </span>
                        </div>
                        <strong style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{el.interactions} clicks</strong>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 7. CUSTOMER FEEDBACK SURVEY REVIEWS */}
              {wId === 'feedback' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1, maxHeight: '220px' }}>
                  {feedbacks.length === 0 ? (
                    <div style={{ margin: 'auto', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>No qualitative feedback submitted yet.</div>
                  ) : (
                    feedbacks.map((fb, idx) => {
                      const isYes = fb.score === 'YES';
                      return (
                        <div key={fb.id || idx} style={{
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '12px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{
                                background: isYes ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: isYes ? 'var(--accent-success)' : 'var(--accent-danger)',
                                border: isYes ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontSize: '10px',
                                fontWeight: 'bold'
                              }}>
                                EASY TO USE: {isYes ? 'YES' : 'NO'}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                Session: {fb.session_id.substring(0, 8)}...
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {new Date(fb.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          
                          {fb.comments ? (
                            <p style={{ margin: '2px 0 0', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                              "{fb.comments}"
                            </p>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(No comments left)</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          );
        })}

      </div>
      
    </div>
  );
}
