// One identifier per open tab. No document names, selections or content are sent.
const id = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
const url = `/api/presence?id=${id}`;
function heartbeat() { fetch(url, { method: 'POST', cache: 'no-store' }).catch(() => {}); }
heartbeat();
setInterval(heartbeat, 15000);
window.addEventListener('pageshow', heartbeat);
window.addEventListener('pagehide', () => { navigator.sendBeacon(`${url}&leave=1`); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) heartbeat(); });
