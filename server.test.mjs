import { test } from 'node:test';
import assert from 'node:assert/strict';
import { networkInterfaces } from 'node:os';
import { createApplication } from './server.mjs';

async function start(t, options = {}) {
  const server = createApplication(options);
  await new Promise(resolve => server.listen(0, '0.0.0.0', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  return { port: server.address().port, url: `http://127.0.0.1:${server.address().port}` };
}

test('presence tracks independent tabs, refreshes timestamps, expires stale sessions and removes closed tabs', async t => {
  let time = 1000;
  const { url } = await start(t, { now: () => time });
  const a = 'a'.repeat(32), b = 'b'.repeat(32);
  const heartbeat = id => fetch(`${url}/api/presence?id=${id}`, { method: 'POST' });
  const list = async () => (await (await fetch(`${url}/api/sessions`)).json()).sessions;
  assert.equal((await heartbeat(a)).status, 204);
  time = 2000;
  assert.equal((await heartbeat(b)).status, 204);
  let sessions = await list();
  assert.equal(sessions.length, 2);
  assert.equal(sessions[0].ip, '127.0.0.1');
  assert.equal(sessions[0].firstSeen, 1000);
  time = 3000; await heartbeat(a);
  sessions = await list();
  assert.equal(sessions.find(s=>s.id===a).firstSeen, 1000);
  assert.equal(sessions.find(s=>s.id===a).lastSeen, 3000);
  time = 62500;
  assert.deepEqual((await list()).map(s=>s.id), [a]);
  assert.equal((await fetch(`${url}/api/presence?id=${a}&leave=1`, { method: 'POST' })).status, 204);
  assert.deepEqual(await list(), []);
  assert.equal((await heartbeat('invalid')).status, 400);
  assert.equal((await fetch(`${url}/api/presence?id=${a}`)).status, 405);
  assert.equal((await fetch(`${url}/api/presence?id=${a}`, {method:'POST',headers:{Origin:'https://unrelated.example'}})).status, 403);
  assert.equal((await fetch(`${url}/admin`)).status, 200);
  assert.equal((await fetch(`${url}/presence.js`)).status, 200);
  assert.equal((await fetch(`${url}/../package.json`)).status, 404);
});

test('network clients can load the app but cannot access admin pages or session data', async t => {
  const address = Object.values(networkInterfaces()).flat().find(i=>i?.family==='IPv4'&&!i.internal&&!i.address.startsWith('169.254.'))?.address;
  if (!address) { t.skip('No non-loopback IPv4 address available'); return; }
  const { port, url } = await start(t);
  const remote = `http://${address}:${port}`;
  assert.equal((await fetch(remote)).status, 200);
  for (const path of ['/admin','/admin.js','/api/sessions']) {
    assert.equal((await fetch(remote+path, {headers:{'X-Forwarded-For':'127.0.0.1'}})).status, 403);
  }
  await fetch(`${remote}/api/presence?id=${'c'.repeat(32)}`, {method:'POST'});
  const data = await (await fetch(`${url}/api/sessions`)).json();
  assert.equal(data.sessions[0].ip,address);
});
