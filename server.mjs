import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const pdfRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const vendor = {
  '/vendor/pdf.mjs': [require.resolve('pdfjs-dist/build/pdf.mjs'), 'text/javascript'],
  '/vendor/pdf.worker.mjs': [require.resolve('pdfjs-dist/build/pdf.worker.mjs'), 'text/javascript'],
  '/vendor/pdf-lib.js': [require.resolve('pdf-lib/dist/pdf-lib.min.js'), 'text/javascript'],
};
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/geometry.mjs': ['geometry.mjs', 'text/javascript'], '/presence.js': ['presence.js', 'text/javascript'], '/admin': ['admin.html', 'text/html'], '/admin.js': ['admin.js', 'text/javascript'] };
export function createApplication({ now = () => Date.now() } = {}) {
const sessions = new Map();
const activeWindow = 60000;
function activeSessions() {
  for (const [id, session] of sessions) if (now() - session.lastSeen > activeWindow) sessions.delete(id);
  return [...sessions.values()];
}
function json(res, code, value) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
return http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;
  const ip = req.socket.remoteAddress?.replace(/^::ffff:/, '') || 'unknown';
  const local = ip === '127.0.0.1' || ip === '::1';
  if (path === '/admin' || path === '/admin.js' || path === '/api/sessions') {
    if (!local) { json(res, 403, { error: 'The admin portal is available only on the server computer using http://127.0.0.1.' }); return; }
  }
  if (path === '/api/presence') {
    if (req.method !== 'POST') { json(res, 405, { error: 'Use POST' }); return; }
    if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) {
      json(res, 403, { error: 'Origin not allowed' }); return;
    }
    const id = url.searchParams.get('id');
    if (!/^[a-f0-9]{32}$/.test(id || '')) { json(res, 400, { error: 'Invalid session' }); return; }
    activeSessions();
    if (url.searchParams.get('leave') === '1') { sessions.delete(id); res.writeHead(204); res.end(); return; }
    const previous = sessions.get(id);
    if (!previous && sessions.size >= 2000) { json(res, 503, { error: 'Session capacity reached' }); return; }
    sessions.set(id, { id, ip, browser: (req.headers['user-agent'] || 'Unknown').slice(0, 300), firstSeen: previous?.firstSeen || now(), lastSeen: now() });
    req.resume(); res.writeHead(204); res.end(); return;
  }
  if (path === '/api/sessions') {
    if (req.method !== 'GET') { json(res, 405, { error: 'Use GET' }); return; }
    json(res, 200, { sessions: activeSessions(), activeWindowSeconds: activeWindow / 1000 }); return;
  }
  const resource = /^\/vendor\/(cmaps|standard_fonts|wasm)\/([A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:bcmap|pfb|ttf|wasm|js))$/.exec(path);
  const entry = Object.hasOwn(files, path) ? files[path] : Object.hasOwn(vendor, path) ? vendor[path] : resource ? [join(pdfRoot, resource[1], resource[2]), resource[2].endsWith('.wasm') ? 'application/wasm' : resource[2].endsWith('.js') ? 'text/javascript' : 'application/octet-stream'] : null;
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(Object.hasOwn(vendor, path) || resource ? entry[0] : new URL(entry[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to load app file'); }
});
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const server = createApplication();
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3210);
server.on('error', error => { console.error(`Unable to start: ${error.message}`); process.exitCode = 1; });
server.listen(port, host, () => {
  console.log(`Image Obfuscator is ready: http://127.0.0.1:${port}\nAdmin portal (this computer only): http://127.0.0.1:${port}/admin`);
  if (host === '0.0.0.0') for (const entries of Object.values(networkInterfaces())) for (const entry of entries || []) {
    if (entry.family === 'IPv4' && !entry.internal) console.log(`Share on your organisation's network: http://${entry.address}:${port}`);
  }
  console.log('Keep this window open. Press Ctrl+C to stop.');
});
}
