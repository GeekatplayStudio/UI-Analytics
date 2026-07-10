import React, { useState, useEffect, useRef } from 'react';

// Walkthrough Missions Definitions
const MISSIONS = [
  {
    id: 'product_researcher',
    title: 'Mission: Product Researcher',
    description: 'Explore our catalog, examine product specs, and select your sneakers.',
    steps: [
      { id: 'nav_products', label: 'Navigate to the Products page', check: (evs) => evs.some(e => e.page_url?.includes('#/example-site/products')) },
      { id: 'view_three', label: 'View descriptions of 3 different products', check: (evs) => {
          const viewed = new Set(evs.filter(e => e.event_type === 'click' && e.element_id?.startsWith('prod-link-')).map(e => e.element_id));
          return viewed.size >= 3;
        } 
      },
      { id: 'add_to_cart', label: 'Add sneakers to your cart', check: (evs) => evs.some(e => e.event_type === 'click' && e.element_id === 'ex-add-to-cart-btn') }
    ]
  },
  {
    id: 'customer_support',
    title: 'Mission: Customer Support Inquiry',
    description: 'Find our local store hours and submit an inquiry about a product shipment.',
    steps: [
      { id: 'nav_location', label: 'Navigate to the Location page', check: (evs) => evs.some(e => e.page_url?.includes('#/example-site/location')) },
      { id: 'nav_contact', label: 'Navigate to the Contact Us page', check: (evs) => evs.some(e => e.page_url?.includes('#/example-site/contact')) },
      { id: 'input_email', label: 'Type in the required Email input field', check: (evs) => evs.some(e => e.event_type === 'input_focus' && e.element_id === 'ex-email-input') },
      { id: 'submit_message', label: 'Submit the Contact request form', check: (evs) => evs.some(e => e.event_type === 'click' && e.element_id === 'ex-contact-submit-btn') }
    ]
  },
  {
    id: 'ux_frustration_test',
    title: 'Mission: Telemetry Frustration Test',
    description: 'Intentionally trigger UX warning logs to verify error validation highlights.',
    steps: [
      { id: 'nav_help', label: 'Navigate to the Help / FAQ page', check: (evs) => evs.some(e => e.page_url?.includes('#/example-site/help')) },
      { id: 'faq_rage', label: 'Trigger a Rage Click by clicking rapidly on a FAQ title (3+ clicks)', check: (evs) => evs.some(e => e.event_type === 'rage_click' && e.element_id?.startsWith('faq-title-')) },
      { id: 'nav_products', label: 'Go to the Products page', check: (evs) => evs.some(e => e.page_url?.includes('#/example-site/products')) },
      { id: 'checkout_click', label: 'Click the Checkout button', check: (evs) => evs.some(e => e.event_type === 'click' && e.element_id === 'ex-checkout-btn') }
    ]
  }
];

export default function ExampleSite({ activeDomain }) {
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'products' | 'about' | 'location' | 'contact' | 'help'
  const [activeMission, setActiveMission] = useState(MISSIONS[0]);
  const [completedSteps, setCompletedSteps] = useState({});
  const [sessionEvents, setSessionEvents] = useState([]);
  const [showCongrats, setShowCongrats] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('order');
  
  // Product Database
  const productsList = [
    { id: 'prod-link-vortex', name: 'Vortex Sneakers', price: '$149.00', desc: 'Lightweight marathon running sneakers with ReactGlow cushioning foam.', details: 'The Vortex Sneakers are built with multi-density compression soles and carbon-fiber plates for maximum energy-return. Ideal for long-distance training.' },
    { id: 'prod-link-helium', name: 'Helium Air Cushion', price: '$179.00', desc: 'Breathable training sneakers with full-length air capsules.', details: 'Engineered with HeliumMesh technology, these sneakers provide optimal ventilation and support for rapid movements.' },
    { id: 'prod-link-trail', name: 'Trail Blazer boots', price: '$199.00', desc: 'Durable all-terrain hiking footwear with deep lug traction.', details: 'Gore-Tex lining offers waterproof protection. The Vibram outsole delivers superior grip on mud, wet logs, and steep gravel.' }
  ];

  // Initialize special Walkthrough Session ID
  useEffect(() => {
    if (!activeDomain) return;

    let sessId = sessionStorage.getItem('ef_session_id');
    if (!sessId || !sessId.startsWith('walkthrough-')) {
      const generated = 'walkthrough-session-' + Math.random().toString(36).substring(2, 11);
      sessionStorage.setItem('ef_session_id', generated);
    }

    // Dynamic snippet boot
    let script = document.getElementById('eventflow-tracker');
    if (!script) {
      script = document.createElement('script');
      script.id = 'eventflow-tracker';
      script.src = '/tracker.js';
      script.async = true;
      document.head.appendChild(script);
    }

    window.ef = window.ef || function() {
      (window.ef.q = window.ef.q || []).push(arguments);
    };
    window.ef('init', activeDomain.id);

    // Initial page load hash
    window.location.hash = `#/example-site/${currentTab}`;

    // Select random mission on load
    const randIdx = Math.floor(Math.random() * MISSIONS.length);
    setActiveMission(MISSIONS[randIdx]);
    setCompletedSteps({});
    setSessionEvents([]);
    setCartCount(0);
    setShowCongrats(false);

    // Event listener for telemetry tracking checks
    const handleTrackedEvent = (e) => {
      const ev = e.detail;
      setSessionEvents((prev) => {
        const next = [...prev, ev];
        verifyMissionProgress(next);
        return next;
      });
    };

    window.addEventListener('eventflow-tracked', handleTrackedEvent);

    return () => {
      window.removeEventListener('eventflow-tracked', handleTrackedEvent);
    };
  }, [activeDomain]);

  // Navigate internal page
  const handleNav = (tabName) => {
    setCurrentTab(tabName);
    setSelectedProduct(null);
    window.location.hash = `#/example-site/${tabName}`;
  };

  // Run validation code across session events to mark checklist items
  const verifyMissionProgress = (eventsList) => {
    const updated = {};
    let allFinished = true;

    activeMission.steps.forEach(step => {
      const checked = step.check(eventsList);
      updated[step.id] = checked;
      if (!checked) {
        allFinished = false;
      }
    });

    setCompletedSteps(updated);

    if (allFinished && eventsList.length > 0 && !showCongrats) {
      setShowCongrats(true);
    }
  };

  const handleResetMission = () => {
    const randIdx = Math.floor(Math.random() * MISSIONS.length);
    setActiveMission(MISSIONS[randIdx]);
    setCompletedSteps({});
    setSessionEvents([]);
    setCartCount(0);
    setShowCongrats(false);
    handleNav('home');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Floating Mission Task Panel */}
      <div className="glass-card fade-in" style={{ border: '1px solid var(--border-color)', background: 'rgba(255, 255, 255, 0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Active Walkthrough Mission</span>
            <h2 style={{ fontSize: '16px', color: '#fff', marginTop: '2px' }}>{activeMission.title}</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{activeMission.description}</p>
          </div>
          <button 
            onClick={handleResetMission} 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            Next Mission
          </button>
        </div>

        {/* Mission Steps Checklist */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {activeMission.steps.map(step => {
            const isDone = completedSteps[step.id];
            return (
              <div 
                key={step.id} 
                style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center', 
                  fontSize: '12.5px',
                  background: isDone ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid ' + (isDone ? 'rgba(255, 255, 255, 0.15)' : 'var(--border-color)')
                }}
              >
                <span style={{ fontSize: '12px', fontFamily: 'monospace', color: isDone ? 'var(--text-primary)' : 'var(--text-muted)' }}>{isDone ? '[x]' : '[ ]'}</span>
                <span style={{ color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)', textDecoration: isDone ? 'line-through' : 'none' }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Embedded Website Layout Container */}
      <div className="glass-card fade-in" style={{ padding: '0px', overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
        
        {/* Mock Site Navbar */}
        <nav style={{
          background: '#111827',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} id="ex-logo-container">
            <span style={{ fontSize: '20px' }}>⚡</span>
            <strong style={{ color: '#fff', fontSize: '15px', letterSpacing: '-0.02em' }}>AURA Athletics</strong>
          </div>

          <div style={{ display: 'flex', gap: '12px' }} id="ex-nav-links">
            {[
              { id: 'home', label: 'Home' },
              { id: 'products', label: 'Products' },
              { id: 'about', label: 'About' },
              { id: 'location', label: 'Location' },
              { id: 'contact', label: 'Contact' },
              { id: 'help', label: 'Help/FAQ' }
            ].map(tab => (
              <button
                key={tab.id}
                id={`ex-nav-${tab.id}-link`}
                onClick={() => handleNav(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTab === tab.id ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: currentTab === tab.id ? 600 : 500,
                  padding: '4px 8px'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: '13px', color: '#fff', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px' }}>
            🛒 Cart: <strong>{cartCount}</strong>
          </div>
        </nav>

        {/* Mock Site Pages Content */}
        <div style={{ padding: '30px', background: '#0e1320', minHeight: '300px', color: 'var(--text-primary)' }}>
          
          {/* HOME PAGE */}
          {currentTab === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '24px', color: '#fff' }} id="ex-hero-title">Step Into the Future of Speed</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }} id="ex-hero-desc">
                AURA Athletics builds ultra-durable, premium, carbon-fiber running sneakers designed to maximize energy return and support natural flex.
              </p>
              <div>
                <button 
                  id="ex-home-shop-btn" 
                  className="btn btn-primary" 
                  onClick={() => handleNav('products')}
                  style={{ display: 'inline-flex' }}
                >
                  Shop Sneakers Catalog
                </button>
              </div>
            </div>
          )}

          {/* PRODUCTS CATALOG PAGE */}
          {currentTab === 'products' && (
            <div>
              {selectedProduct ? (
                // Individual Product details view
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                  <div style={{ height: '160px', background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button 
                      onClick={() => setSelectedProduct(null)} 
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '12px' }}
                    >
                      ← Back to sneakers
                    </button>
                    <h4 style={{ fontSize: '18px', color: '#fff' }} id="ex-prod-name">{selectedProduct.name}</h4>
                    <strong style={{ color: 'var(--accent-secondary)' }}>{selectedProduct.price}</strong>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{selectedProduct.details}</p>
                    
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <button
                        id="ex-add-to-cart-btn"
                        className="btn btn-primary"
                        onClick={() => {
                          setCartCount(c => c + 1);
                          alert(`${selectedProduct.name} added to cart!`);
                        }}
                      >
                        Add to Cart
                      </button>
                      <button
                        id="ex-checkout-btn"
                        className="btn btn-accent"
                        onClick={() => alert('Purchase simulation completed!')}
                      >
                        Instant Checkout
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Catalog grid view
                <div>
                  <h3 style={{ fontSize: '16px', marginBottom: '16px', color: '#fff' }}>Sneakers Collection</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {productsList.map(prod => (
                      <div 
                        key={prod.id} 
                        style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <h4 style={{ fontSize: '14px', color: '#fff' }}>{prod.name}</h4>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{prod.desc}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px' }}>
                          <strong style={{ color: 'var(--accent-secondary)', fontSize: '13px' }}>{prod.price}</strong>
                          <button
                            id={prod.id}
                            onClick={() => setSelectedProduct(prod)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            View Specs
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ABOUT US PAGE */}
          {currentTab === 'about' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Our Biography</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }} id="ex-about-text">
                Founded in 2021, AURA Athletics was born out of a desire to create marathon gear that does not compromise on styling. We work with materials science laboratories to implement compression fabrics and dual-density rubbers that cushion impacts and extend foot joint health.
              </p>
            </div>
          )}

          {/* LOCATION PAGE */}
          {currentTab === 'location' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Office & Retail Location</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Visit us in Seattle, Washington:</p>
              <div style={{
                height: '120px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '12px'
              }} id="ex-map-box">
                🗺️ [Mock Map Visual: 1420 Pine Street, Seattle, WA]
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                <strong>Store Hours:</strong> Monday - Saturday: 9:00 AM - 8:00 PM
              </div>
            </div>
          )}

          {/* CONTACT PAGE */}
          {currentTab === 'contact' && (
            <div style={{ maxWidth: '400px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '12px' }}>Contact Support</h3>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Support ticket submitted successfully!');
                setEmail('');
                setMessage('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Email Address (Required)</label>
                  <input
                    type="email"
                    id="ex-email-input"
                    required
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px 12px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Category</label>
                  <select 
                    id="ex-subject-select"
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px 12px', background: 'rgba(8,12,20,0.8)' }}
                  >
                    <option value="order">Order Status</option>
                    <option value="product">Product Inquiries</option>
                    <option value="returns">Returns & Exchanges</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Message Body</label>
                  <textarea
                    id="ex-message-textarea"
                    rows="3"
                    placeholder="Explain your request details..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="form-input"
                    style={{ padding: '8px 12px', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <button
                  type="submit"
                  id="ex-contact-submit-btn"
                  className="btn btn-primary"
                  style={{ marginTop: '4px' }}
                >
                  Submit Inquiry
                </button>

              </form>
            </div>
          )}

          {/* HELP PAGE */}
          {currentTab === 'help' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>Help & Frequently Asked Questions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { q: 'How long does shipping take?', a: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days.' },
                  { q: 'What is your return policy?', a: 'We accept returns on all unworn items within 30 days of purchase. Free shipping is provided for returns.' },
                  { q: 'Do you offer size exchanges?', a: 'Yes! Select the size exchange option in your account portal or submit an exchange request form.' }
                ].map((faq, idx) => (
                  <div 
                    key={idx} 
                    style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}
                  >
                    <h4 
                      id={`faq-title-${idx}`} 
                      style={{ fontSize: '13px', color: 'var(--accent-secondary)', cursor: 'pointer' }}
                    >
                      {faq.q}
                    </h4>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4' }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Mock Site Footer */}
        <footer style={{
          background: '#0a0d17',
          padding: '16px 24px',
          borderTop: '1px solid var(--border-color)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>© 2026 AURA Athletics Inc. All rights reserved.</span>
          <span>Security Verified</span>
        </footer>

      </div>

      {/* Congratulations Mission Modal */}
      {showCongrats && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(8, 12, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease'
        }}>
          <div className="glass-card" style={{ maxWidth: '400px', textAlign: 'center', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '18px', color: '#fff' }}>Mission Completed</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              You have completed the walkthrough sequence. The tracking telemetry has been captured and compiled in the database.
            </p>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
              Session Tagged: <strong>{sessionStorage.getItem('ef_session_id')?.substring(0, 18)}...</strong>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              You can now switch tabs (User Journeys, UX Friction Overlay) and select this mission session to inspect your own clicking spots, hesitation delays, and errors!
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setShowCongrats(false)} 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
              >
                Close View
              </button>
              <button 
                onClick={handleResetMission} 
                className="btn btn-primary" 
                style={{ flex: 1 }}
              >
                Try Next Mission
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
