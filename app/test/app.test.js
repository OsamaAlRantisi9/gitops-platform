const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  server = createApp({ version: 'test-version' }).listen(0); // 0 = any free port
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

test('liveness probe returns 200', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200);
});

test('readiness probe returns 200 while running', async () => {
  const res = await fetch(`${base}/readyz`);
  assert.strictEqual(res.status, 200);
});

test('version endpoint returns the injected version', async () => {
  const res = await fetch(`${base}/api/version`);
  assert.deepStrictEqual(await res.json(), { version: 'test-version' });
});

test('hello rejects a missing name', async () => {
  const res = await fetch(`${base}/api/hello`);
  assert.strictEqual(res.status, 400);
});

test('hello greets by name', async () => {
  const res = await fetch(`${base}/api/hello?name=Osama`);
  assert.deepStrictEqual(await res.json(), { message: 'Hello, Osama!' });
});

test('metrics expose the request counter', async () => {
  const res = await fetch(`${base}/metrics`);
  assert.match(await res.text(), /http_requests_total/);
});
