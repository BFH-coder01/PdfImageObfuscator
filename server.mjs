import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const pdfRoot = dirname(require.resolve('pdfjs-dist/package.json'));
const vendor = {
  '/vendor/pdf.mjs': [require.resolve('pdfjs-dist/build/pdf.mjs'), 'text/javascript'],
  '/vendor/pdf.worker.mjs': [require.resolve('pdfjs-dist/build/pdf.worker.mjs'), 'text/javascript'],
  '/vendor/pdf-lib.js': [require.resolve('pdf-lib/dist/pdf-lib.min.js'), 'text/javascript'],
};
const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/geometry.mjs': ['geometry.mjs', 'text/javascript'] };
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const resource = /^\/vendor\/(cmaps|standard_fonts|wasm)\/([A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:bcmap|pfb|ttf|wasm|js))$/.exec(path);
  const entry = Object.hasOwn(files, path) ? files[path] : Object.hasOwn(vendor, path) ? vendor[path] : resource ? [join(pdfRoot, resource[1], resource[2]), resource[2].endsWith('.wasm') ? 'application/wasm' : resource[2].endsWith('.js') ? 'text/javascript' : 'application/octet-stream'] : null;
  if (!entry) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(Object.hasOwn(vendor, path) || resource ? entry[0] : new URL(entry[0], import.meta.url));
    res.writeHead(200, { 'Content-Type': entry[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Unable to load app file'); }
});
server.on('error', error => { console.error(`Unable to start: ${error.message}`); process.exitCode = 1; });
server.listen(3210, '127.0.0.1', () => console.log('Image Obfuscator is ready: http://127.0.0.1:3210\nKeep this window open. Press Ctrl+C to stop.'));
