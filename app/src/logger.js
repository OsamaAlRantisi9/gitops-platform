// Minimal structured logger: one JSON object per line on stdout.
// Kubernetes collects container stdout, and Cloud Logging turns each JSON line
// into a structured entry, reading "severity" and "message" as special fields.
function write(severity, message, fields = {}) {
  const entry = { time: new Date().toISOString(), severity, message, ...fields };
  process.stdout.write(JSON.stringify(entry) + '\n');
}

module.exports = {
  info: (message, fields) => write('INFO', message, fields),
  error: (message, fields) => write('ERROR', message, fields),
};
