import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, 'database.json');

// In-memory data store structure
let db = {
  domains: [],
  sessions: [],
  events: []
};

// Helper: Save memory DB to file
function saveDb() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (error) {
    console.error('[EventFlow Database] Error saving file:', error);
  }
}

export async function initDb() {
  try {
    if (!fs.existsSync(__dirname)) {
      fs.mkdirSync(__dirname, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      const fileContent = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(fileContent);
      console.log('[EventFlow Database] Loaded database.json successfully.');
    } else {
      // Seed default domain
      db = {
        domains: [{ id: 'demo-domain-id-1234', name: 'localhost', created_at: new Date().toISOString() }],
        sessions: [],
        events: []
      };
      saveDb();
      console.log('[EventFlow Database] Created new database.json.');
    }
  } catch (error) {
    console.error('[EventFlow Database] Initialization error:', error);
  }
}

export async function registerDomain(name) {
  // Check if domain already exists
  const existing = db.domains.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;

  const newDomain = {
    id: uuidv4(),
    name,
    created_at: new Date().toISOString()
  };
  
  db.domains.push(newDomain);
  saveDb();
  return newDomain;
}

export async function getDomains() {
  return [...db.domains].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function getOrCreateSession(sessionId, domainId, userAgent, ipAddress) {
  let session = db.sessions.find(s => s.id === sessionId);
  
  if (session) {
    session.updated_at = new Date().toISOString();
    saveDb();
    return session;
  }

  session = {
    id: sessionId,
    domain_id: domainId,
    user_agent: userAgent,
    ip_address: ipAddress,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.sessions.push(session);
  saveDb();
  return session;
}

export async function insertEvents(eventsList) {
  if (!eventsList || eventsList.length === 0) return;

  eventsList.forEach(e => {
    // Generate a unique ID for each event
    const eventId = db.events.length + 1;
    db.events.push({
      id: eventId,
      session_id: e.session_id,
      event_type: e.event_type,
      timestamp: e.timestamp,
      time_delta_ms: e.time_delta_ms || 0,
      element_id: e.element_id || null,
      element_tag: e.element_tag || null,
      element_class: e.element_class || null,
      viewport_x: e.viewport_x !== undefined ? e.viewport_x : null,
      viewport_y: e.viewport_y !== undefined ? e.viewport_y : null,
      scroll_depth_percent: e.scroll_depth_percent !== undefined ? e.scroll_depth_percent : null,
      page_url: e.page_url || ''
    });
  });

  saveDb();
}

export async function getSessions(domainId) {
  // Filter sessions for domain
  const domainSessions = db.sessions.filter(s => s.domain_id === domainId);

  // Map each session to aggregate event count and duration
  const result = domainSessions.map(s => {
    const sessionEvents = db.events.filter(e => e.session_id === s.id);
    
    let duration = 0;
    if (sessionEvents.length > 0) {
      const timestamps = sessionEvents.map(e => e.timestamp);
      duration = Math.max(...timestamps) - Math.min(...timestamps);
    }

    return {
      id: s.id,
      user_agent: s.user_agent,
      ip_address: s.ip_address,
      created_at: s.created_at,
      updated_at: s.updated_at,
      event_count: sessionEvents.length,
      duration_ms: duration
    };
  });

  // Sort by last activity descending
  return result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

export async function getSessionEvents(sessionId) {
  return db.events
    .filter(e => e.session_id === sessionId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function getMetrics(domainId) {
  // Get all session IDs for this domain
  const domainSessionIds = db.sessions
    .filter(s => s.domain_id === domainId)
    .map(s => s.id);

  // Filter events belonging to these sessions
  const domainEvents = db.events.filter(e => domainSessionIds.includes(e.session_id));

  // Count occurrences of event types
  const typeCounts = {};
  domainEvents.forEach(e => {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  });
  const eventTypes = Object.entries(typeCounts).map(([event_type, count]) => ({
    event_type,
    count
  }));

  // Find top interacted elements (clicks / inputs) with IDs
  const elementCounts = {};
  domainEvents
    .filter(e => e.element_id)
    .forEach(e => {
      const key = `${e.element_id}|${e.element_tag}|${e.element_class || ''}`;
      elementCounts[key] = (elementCounts[key] || 0) + 1;
    });

  const topElements = Object.entries(elementCounts)
    .map(([key, count]) => {
      const [element_id, element_tag, element_class] = key.split('|');
      return {
        element_id,
        element_tag,
        element_class: element_class || null,
        interactions: count
      };
    })
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 10);

  // Scroll depth distribution (average max scroll depth per session)
  const maxScrollPerSession = {};
  domainEvents
    .filter(e => e.event_type === 'scroll' && e.scroll_depth_percent !== null)
    .forEach(e => {
      const currentMax = maxScrollPerSession[e.session_id] || 0;
      maxScrollPerSession[e.session_id] = Math.max(currentMax, e.scroll_depth_percent);
    });

  const scrollDepths = Object.values(maxScrollPerSession);
  const avgMaxScroll = scrollDepths.length > 0 
    ? Math.round(scrollDepths.reduce((sum, val) => sum + val, 0) / scrollDepths.length)
    : 0;

  return {
    total_sessions: domainSessionIds.length,
    total_events: domainEvents.length,
    top_elements: topElements,
    event_types: eventTypes,
    avg_max_scroll: avgMaxScroll
  };
}

export async function getFunnels(domainId, funnelSteps = []) {
  if (funnelSteps.length === 0) return [];

  // Get domain session IDs
  const domainSessionIds = db.sessions
    .filter(s => s.domain_id === domainId)
    .map(s => s.id);

  // Fetch and group events by session
  const sessions = {};
  db.events
    .filter(e => domainSessionIds.includes(e.session_id))
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach(e => {
      if (!sessions[e.session_id]) {
        sessions[e.session_id] = [];
      }
      sessions[e.session_id].push(e);
    });

  // Calculate funnel conversions
  const stepCount = funnelSteps.length;
  const results = funnelSteps.map(step => ({
    name: step.name,
    selector: step.selector,
    type: step.type,
    converted: 0,
    avg_time_to_step_ms: 0,
    times: []
  }));

  Object.values(sessions).forEach(sessionEvents => {
    let currentStepIdx = 0;
    let startTimestamp = sessionEvents[0]?.timestamp || 0;

    for (let e of sessionEvents) {
      if (currentStepIdx >= stepCount) break;

      const targetStep = funnelSteps[currentStepIdx];
      let isMatch = false;

      if (targetStep.type === 'event_type') {
        isMatch = e.event_type === targetStep.selector;
      } else if (targetStep.type === 'element_id') {
        isMatch = e.element_id === targetStep.selector;
      } else if (targetStep.type === 'element_tag') {
        isMatch = e.element_tag === targetStep.selector.toUpperCase();
      }

      if (isMatch) {
        results[currentStepIdx].converted += 1;
        const timeFromStart = e.timestamp - startTimestamp;
        results[currentStepIdx].times.push(timeFromStart);
        currentStepIdx += 1;
      }
    }
  });

  // Calculate averages
  results.forEach(res => {
    if (res.times.length > 0) {
      const sum = res.times.reduce((a, b) => a + b, 0);
      res.avg_time_to_step_ms = Math.round(sum / res.times.length);
    }
    delete res.times;
  });

  return results;
}

export async function getFrictionMetrics(domainId, sessionId = null) {
  let domainSessionIds = db.sessions
    .filter(s => s.domain_id === domainId)
    .map(s => s.id);

  if (sessionId) {
    domainSessionIds = domainSessionIds.filter(id => id === sessionId);
  }

  const events = db.events.filter(e => domainSessionIds.includes(e.session_id) && e.element_id);

  const grouped = {};
  events.forEach(e => {
    const key = e.element_id;
    if (!grouped[key]) {
      grouped[key] = {
        element_id: e.element_id,
        element_tag: e.element_tag,
        element_class: e.element_class,
        delays: []
      };
    }
    grouped[key].delays.push(e.time_delta_ms);
  });

  const results = Object.values(grouped).map(group => {
    const count = group.delays.length;
    const avgDelay = count > 0 
      ? Math.round(group.delays.reduce((sum, val) => sum + val, 0) / count)
      : 0;

    let frictionLevel = 'low';
    if (avgDelay > 8000) {
      frictionLevel = 'high';
    } else if (avgDelay > 3000) {
      frictionLevel = 'medium';
    }

    return {
      element_id: group.element_id,
      element_tag: group.element_tag,
      element_class: group.element_class,
      avg_delay_ms: avgDelay,
      interactions: count,
      friction_level: frictionLevel
    };
  });

  return results.sort((a, b) => b.avg_delay_ms - a.avg_delay_ms);
}

