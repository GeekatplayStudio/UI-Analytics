import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  initDb,
  registerDomain,
  getDomains,
  getOrCreateSession,
  insertEvents,
  getSessions,
  getSessionEvents,
  getMetrics,
  getFunnels,
  getFrictionMetrics
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static dashboard build in production (from dashboard/dist)
app.use(express.static(join(__dirname, '../dashboard/dist')));

// Serve the tracker script
app.get('/tracker.js', (req, res) => {
  try {
    const trackerPath = join(__dirname, 'tracker.js');
    const trackerCode = readFileSync(trackerPath, 'utf8');
    res.setHeader('Content-Type', 'application/javascript');
    res.send(trackerCode);
  } catch (error) {
    console.error('Error serving tracker:', error);
    res.status(500).send('console.error("[EventFlow] Ingestion server tracker error");');
  }
});

// Ingestion API endpoint
app.post('/api/collect', async (req, res) => {
  const { domain_id, events } = req.body;

  if (!domain_id || !events || !Array.isArray(events) || events.length === 0) {
    return res.status(200).json({ status: 'ignored', reason: 'empty or invalid payload' });
  }

  try {
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Simple IP extraction
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Verify domain exists
    const domains = await getDomains();
    const domain = domains.find(d => d.id === domain_id);
    if (!domain) {
      return res.status(404).json({ error: `Domain ID ${domain_id} not registered` });
    }

    // Process sessions and collect events
    const processedEvents = [];
    const sessionsSeen = new Set();

    for (const event of events) {
      const { session_id } = event;
      if (!session_id) continue;

      // Avoid hitting DB multiple times for the same session in the same batch
      if (!sessionsSeen.has(session_id)) {
        await getOrCreateSession(session_id, domain_id, userAgent, ipAddress);
        sessionsSeen.add(session_id);
      }

      processedEvents.push({
        session_id,
        event_type: event.event_type,
        timestamp: event.timestamp || Date.now(),
        time_delta_ms: event.time_delta_ms || 0,
        element_id: event.element_id,
        element_tag: event.element_tag,
        element_class: event.element_class,
        viewport_x: event.viewport_x,
        viewport_y: event.viewport_y,
        scroll_depth_percent: event.scroll_depth_percent,
        page_url: event.page_url || ''
      });
    }

    if (processedEvents.length > 0) {
      await insertEvents(processedEvents);
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Ingestion collection error:', error);
    return res.status(500).json({ error: 'Internal server error during ingestion' });
  }
});

// Domain Routes
app.get('/api/domains', async (req, res) => {
  try {
    const list = await getDomains();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/domains', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Domain name is required' });
  }
  try {
    const result = await registerDomain(name);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session Routes
app.get('/api/sessions', async (req, res) => {
  const { domain_id } = req.query;
  if (!domain_id) {
    return res.status(400).json({ error: 'domain_id is required' });
  }
  try {
    const list = await getSessions(domain_id);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sessions/:sessionId/events', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const list = await getSessionEvents(sessionId);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics & Funnels
app.get('/api/metrics', async (req, res) => {
  const { domain_id } = req.query;
  if (!domain_id) {
    return res.status(400).json({ error: 'domain_id is required' });
  }
  try {
    const metrics = await getMetrics(domain_id);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/funnels', async (req, res) => {
  const { domain_id, steps } = req.body;
  if (!domain_id || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'domain_id and steps array are required' });
  }
  try {
    const conversions = await getFunnels(domain_id, steps);
    res.json(conversions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/friction', async (req, res) => {
  const { domain_id, session_id } = req.query;
  if (!domain_id) {
    return res.status(400).json({ error: 'domain_id is required' });
  }
  try {
    const list = await getFrictionMetrics(domain_id, session_id || null);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback to React index.html for client-side routing in dashboard production build
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dashboard/dist/index.html'), (err) => {
    if (err) {
      res.status(404).send('Dashboard not found. Please build the dashboard project.');
    }
  });
});

// Initialize database then start server
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[EventFlow Server] Running on http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
