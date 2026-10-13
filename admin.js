const $ = id => document.getElementById(id);
let loading = false;
async function refresh() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch('/api/sessions', { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to retrieve sessions. Open this portal on the server computer.');
    const { sessions } = await response.json();
    const groups = new Map();
    for (const s of sessions) {
      if (!groups.has(s.ip)) groups.set(s.ip, []);
      groups.get(s.ip).push(s);
    }
    $('machines').textContent = `${groups.size} machine address${groups.size === 1 ? '' : 'es'}`;
    $('sessions').textContent = `${sessions.length} browser session${sessions.length === 1 ? '' : 's'}`;
    $('rows').replaceChildren();
    for (const [ip, list] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
      const row = document.createElement('tr');
      const values = [ip, String(list.length), new Date(Math.min(...list.map(s => s.firstSeen))).toLocaleString(), new Date(Math.max(...list.map(s => s.lastSeen))).toLocaleTimeString(), [...new Set(list.map(s => s.browser))].join('\n')];
      values.forEach((value, index) => { const cell = document.createElement('td'); cell.textContent = value; if (index === 0) cell.className = 'address'; if (index === 4) cell.className = 'browser'; row.append(cell); });
      $('rows').append(row);
    }
    if (!groups.size) { const row = document.createElement('tr'), cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = 'No active application sessions.'; row.append(cell); $('rows').append(row); }
    $('status').textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } catch (error) { $('status').textContent = error.message; }
  finally { loading = false; }
}
$('refresh').onclick = refresh;
refresh(); setInterval(refresh, 5000);
