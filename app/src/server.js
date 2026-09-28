const { createApp } = require('./app');
const log = require('./logger');

const port = Number(process.env.PORT) || 8080;
// Time for Kubernetes to take the pod out of the Service before we stop accepting connections.
// Must stay below the pod's terminationGracePeriodSeconds (30s by default).
const shutdownDelayMs = Number(process.env.SHUTDOWN_DELAY_MS) || 5000;

const app = createApp();
const server = app.listen(port, () => log.info('server started', { port }));

// Kubernetes sends SIGTERM before it kills a pod (rollouts, scale-down, node drain).
// Graceful shutdown: fail readiness, wait for traffic to drain, finish in-flight requests, exit.
process.on('SIGTERM', () => {
  log.info('SIGTERM received, draining', { shutdownDelayMs });
  app.markNotReady();
  setTimeout(() => {
    server.close(() => {
      log.info('server closed');
      process.exit(0);
    });
  }, shutdownDelayMs);
});
