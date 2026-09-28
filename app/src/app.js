const express = require('express');
const client = require('prom-client');
const log = require('./logger');

// Builds the app without starting it, so tests can run it on a random port.
function createApp({ version = process.env.APP_VERSION || 'dev' } = {}) {
  const app = express();

  const registry = new client.Registry();
  client.collectDefaultMetrics({ register: registry }); // CPU, memory, event-loop lag
  const httpRequests = new client.Counter({
    name: 'http_requests_total',
    help: 'HTTP requests by method, route and status code',
    labelNames: ['method', 'route', 'status'],
    registers: [registry],
  });

  // Flipped to false on shutdown so Kubernetes stops routing new traffic here.
  let ready = true;

  // One structured log line and one metric per request.
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      // Use the route pattern, not the raw URL, so metric labels stay low-cardinality.
      const route = req.route ? req.route.path : 'unmatched';
      httpRequests.inc({ method: req.method, route, status: res.statusCode });
      log.info('request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      });
    });
    next();
  });

  // Liveness: is the process healthy? If not, Kubernetes restarts the container.
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  // Readiness: should this pod receive traffic right now? If not, it's removed from the Service.
  app.get('/readyz', (req, res) => {
    if (!ready) return res.status(503).json({ status: 'shutting down' });
    res.json({ status: 'ready' });
  });

  app.get('/metrics', async (req, res) => {
    res.type(registry.contentType);
    res.send(await registry.metrics());
  });

  // Returns the image version, which makes a rolling update easy to watch.
  app.get('/api/version', (req, res) => res.json({ version }));

  app.get('/api/hello', (req, res) => {
    const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
    if (!name) return res.status(400).json({ error: 'name is required' });
    res.json({ message: `Hello, ${name}!` });
  });

  app.markNotReady = () => {
    ready = false;
  };

  return app;
}

module.exports = { createApp };
