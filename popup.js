// ═══════════════════════════════════════════════════════════════════
// KI-VAULT POPUP CONTROLLER
// ═══════════════════════════════════════════════════════════════════

let allThreads    = [];
let activeFilter  = 'all';
let searchQuery   = '';

// ── INIT ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadAll();
  bindTabs();
  bindFilters();
  bindSearch();
  bindButtons();
});

function loadAll() {
  chrome.runtime.sendMessage({ type: 'GET_STATS' }, stats => {
    if (!stats) return;
    renderOverview(stats);
  });
  chrome.runtime.sendMessage({ type: 'GET_THREADS' }, threads => {
    if (!threads) return;
    allThreads = threads.sort((a, b) => b.savedAt - a.savedAt);
    renderThreadList();
    document.getElementById('hdr-sub').textContent =
      `${threads.length} Threads · ${threads.filter(t => t.score >= 75).length} Top-Assets`;
  });
  chrome.runtime.sendMessage({ type: 'GET_LEARNING' }, data => {
    if (data) renderLearning(data);
  });
}

// ── TABS ──────────────────────────────────────────────────────────────
function bindTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');

      if (tab.dataset.tab === 'learning') loadLearning();
    });
  });
}

// ── FILTERS ───────────────────────────────────────────────────────────
function bindFilters() {
  document.querySelectorAll('.plat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.plat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.plat;
      renderThreadList();
    });
  });
}

function bindSearch() {
  document.getElementById('thread-search').addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    renderThreadList();
  });
}

// ── BUTTONS ───────────────────────────────────────────────────────────
function bindButtons() {
  document.getElementById('btn-export').addEventListener('click', doExport);
  document.getElementById('btn-export-2').addEventListener('click', doExport);
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  document.getElementById('btn-reset-learn').addEventListener('click', () => {
    if (confirm('Alle Lerngewichte zurücksetzen?')) {
      chrome.runtime.sendMessage({ type: 'RESET_LEARNING' }, () => loadLearning());
    }
  });
}

// ── OVERVIEW ──────────────────────────────────────────────────────────
function renderOverview(stats) {
  document.getElementById('stat-total').textContent = stats.total;
  document.getElementById('stat-top').textContent   = stats.topAssets;
  document.getElementById('stat-avg').textContent   = stats.avgScore;

  // Category bars
  const catEl = document.getElementById('cat-bars');
  const catMax = Math.max(...Object.values(stats.byCategory), 1);
  const catIcons = { HTML_TOOLS:'🖥️', CODE:'💻', KONZEPTE:'💼', AUTOMATISIERUNG:'⚙️', TTT_TAUCHEN:'🤿' };
  catEl.innerHTML = Object.entries(stats.byCategory)
    .sort((a,b) => b[1]-a[1])
    .map(([cat, count]) => `
      <div class="cat-row">
        <div class="cat-label">${catIcons[cat]||'📄'} ${cat}</div>
        <div class="cat-bar-wrap"><div class="cat-bar" style="width:${Math.round(count/catMax*100)}%"></div></div>
        <div class="cat-count">${count}</div>
      </div>
    `).join('');

  // Platform bars
  const platEl = document.getElementById('plat-bars');
  const platMax = Math.max(...Object.values(stats.byPlatform), 1);
  const platColors = { ChatGPT:'#10a37f', Claude:'#e87d2b', Gemini:'#4285f4', Perplexity:'#20b2aa' };
  platEl.innerHTML = Object.entries(stats.byPlatform)
    .sort((a,b) => b[1]-a[1])
    .map(([plat, count]) => `
      <div class="cat-row">
        <div class="cat-label">${plat}</div>
        <div class="cat-bar-wrap">
          <div class="cat-bar" style="width:${Math.round(count/platMax*100)}%;background:${platColors[plat]||'#00d4ff'}"></div>
        </div>
        <div class="cat-count">${count}</div>
      </div>
    `).join('');

  // Recent
  const recentEl = document.getElementById('recent-list');
  recentEl.innerHTML = (stats.recent || []).map(t => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #1e2d5533;">
      ${scorePill(t.score)}
      <div style="flex:1;font-size:11px;color:#e8f0fe;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(t.title)}</div>
      <div style="font-size:11px;color:#7b93c8;">${t.platform}</div>
    </div>
  `).join('') || '<div style="font-size:12px;color:#3d5490;text-align:center;padding:12px">Noch keine Threads</div>';
}

// ── THREAD LIST ───────────────────────────────────────────────────────
function renderThreadList() {
  const list = document.getElementById('thread-list');
  let filtered = allThreads;

  if (activeFilter !== 'all') {
    filtered = filtered.filter(t => t.platform === activeFilter);
  }
  if (searchQuery) {
    filtered = filtered.filter(t =>
      t.title.toLowerCase().includes(searchQuery) ||
      t.category.toLowerCase().includes(searchQuery) ||
      t.platform.toLowerCase().includes(searchQuery)
    );
  }

  if (!filtered.length) {
    list.innerHTML = `<div class="empty"><div class="icon">🔍</div><p>Keine Threads gefunden.</p></div>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const date = new Date(t.savedAt).toLocaleDateString('de-DE');
    const thumbIcon = t.thumbs === 'up' ? '👍' : t.thumbs === 'down' ? '👎' : '';
    return `
      <div class="thread-item" data-id="${t.id}">
        <div class="thread-header">
          ${scorePill(t.score)}
          <div class="thread-title">${esc(t.title)} ${thumbIcon}</div>
        </div>
        <div class="thread-meta">
          <span>${t.platform}</span>
          <span>${t.category}</span>
          <span>${date}</span>
          <span>${t.messages?.length||0} Nachrichten</span>
        </div>
        <div class="thread-actions">
          <button class="btn-sm btn-vote-up"   data-action="up"   data-id="${t.id}">👍</button>
          <button class="btn-sm btn-vote-down" data-action="down" data-id="${t.id}">👎</button>
          <button class="btn-sm btn-dl"        data-action="dl"   data-id="${t.id}">💾 Speichern</button>
          <button class="btn-sm btn-del"       data-action="del"  data-id="${t.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Bind actions
  list.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id     = parseInt(btn.dataset.id);
      const action = btn.dataset.action;
      const thread = allThreads.find(t => t.id === id);
      if (!thread) return;

      if (action === 'up' || action === 'down') {
        chrome.runtime.sendMessage({ type: 'FEEDBACK', data: { threadId: id, thumbs: action } }, () => {
          thread.thumbs = action;
          renderThreadList();
        });
      }
      if (action === 'dl') downloadThread(thread);
      if (action === 'del') {
        chrome.runtime.sendMessage({ type: 'DELETE_THREAD', data: { id } }, () => {
          allThreads = allThreads.filter(t => t.id !== id);
          renderThreadList();
        });
      }
    });
  });
}

// ── LEARNING ──────────────────────────────────────────────────────────
function loadLearning() {
  // Get from background via IndexedDB readall
  chrome.runtime.sendMessage({ type: 'GET_LEARNING_DATA' }, data => {
    if (data) renderLearning(data);
  });
}

function renderLearning(rows) {
  const el = document.getElementById('learn-list');
  if (!rows || !rows.length) {
    el.innerHTML = `<div class="empty"><div class="icon">🧠</div><p>Noch keine Lerndaten.<br>Bewerte Threads mit 👍/👎 um das System zu trainieren.</p></div>`;
    // Update stat
    document.getElementById('stat-learned').textContent = '0';
    return;
  }
  document.getElementById('stat-learned').textContent = rows.length;
  const sorted = [...rows].sort((a,b) => Math.abs(b.weight) - Math.abs(a.weight)).slice(0, 20);
  el.innerHTML = sorted.map(r => {
    const color = r.weight > 0 ? '#00e5a0' : r.weight < 0 ? '#ff6b6b' : '#7b93c8';
    const sign  = r.weight > 0 ? '+' : '';
    return `<div class="learn-row">
      <span class="learn-kw">${esc(r.keyword)}</span>
      <span class="learn-hits">${r.hits} Bewertungen</span>
      <span class="learn-delta" style="color:${color}">${sign}${r.weight.toFixed(1)}</span>
    </div>`;
  }).join('');
}

// ── EXPORT ZIP ────────────────────────────────────────────────────────
function doExport() {
  chrome.runtime.sendMessage({ type: 'EXPORT_ZIP' }, async ({ files }) => {
    if (!files || !Object.keys(files).length) {
      alert('Keine Threads zum Exportieren.');
      return;
    }

    // Build ZIP using JSZip-free approach: data URI per file in a self-extracting HTML
    // Since we can't bundle JSZip easily without a build step, we create a
    // "download all" HTML page that auto-downloads each file
    const date = new Date().toISOString().slice(0, 10);
    const fileEntries = Object.entries(files);
    const totalSize   = fileEntries.reduce((s, [,c]) => s + c.length, 0);

    // Create index HTML with download links
    const linksHTML = fileEntries.map(([path, content]) => {
      const blob    = new Blob([content], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const fname   = path.split('/').pop();
      return `<a href="${blobUrl}" download="${fname}" style="display:block;padding:6px 0;color:#00d4ff;font-size:12px;">📄 ${path}</a>`;
    }).join('');

    const indexHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>KI-Vault Export ${date}</title>
<style>body{background:#0a0f1e;color:#e8f0fe;font-family:system-ui,sans-serif;padding:32px;max-width:800px;margin:0 auto}
h1{color:#00d4ff;margin-bottom:8px}p{color:#7b93c8;font-size:13px;margin-bottom:24px}
.section{background:#0d1428;border:1px solid #1e2d55;border-radius:12px;padding:20px;margin-bottom:16px}
.btn{display:inline-block;padding:10px 20px;background:#00d4ff;color:#0a0f1e;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:16px;cursor:pointer;border:none;font-size:14px}
</style></head><body>
<h1>🏛️ KI-Vault Export</h1>
<p>Exportiert: ${new Date().toLocaleString('de-DE')} · ${fileEntries.length} Dateien · ${Math.round(totalSize/1024)} KB</p>
<button class="btn" onclick="downloadAll()">📦 Alle ${fileEntries.length} Dateien herunterladen</button>
<div class="section">${linksHTML}</div>
<script>
function downloadAll() {
  document.querySelectorAll('a').forEach((a,i) => setTimeout(() => a.click(), i * 300));
}
</script></body></html>`;

    const indexBlob = new Blob([indexHTML], { type: 'text/html' });
    const indexUrl  = URL.createObjectURL(indexBlob);
    const a = document.createElement('a');
    a.href     = indexUrl;
    a.download = `KI-Vault-Export-${date}.html`;
    a.click();
  });
}

// ── DOWNLOAD SINGLE THREAD ────────────────────────────────────────────
function downloadThread(thread) {
  const date  = new Date(thread.savedAt).toISOString().slice(0, 10);
  const slug  = thread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/(^-|-$)/g, '');
  const fname = `${date}_${thread.platform}_${slug}.html`;
  const blob  = new Blob([thread.html], { type: 'text/html' });
  const a     = document.createElement('a');
  a.href      = URL.createObjectURL(blob);
  a.download  = fname;
  a.click();
}

// ── HELPERS ───────────────────────────────────────────────────────────
function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function scorePill(score) {
  let bg, color, label;
  if      (score >= 75) { bg = '#00d4ff'; color = '#0a0f1e'; label = `🏆 ${score}`; }
  else if (score >= 55) { bg = '#00e5a0'; color = '#0a0f1e'; label = `💎 ${score}`; }
  else if (score >= 35) { bg = '#ffd166'; color = '#0a0f1e'; label = `📌 ${score}`; }
  else                   { bg = '#334';   color = '#888';    label = `📄 ${score}`; }
  return `<span class="score-pill" style="background:${bg};color:${color};">${label}</span>`;
}
