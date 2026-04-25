// ═══════════════════════════════════════════════════════════════════
// KI-VAULT BACKGROUND SERVICE WORKER
// IndexedDB · Scoring Engine · Learning · Badge · ZIP Export
// ═══════════════════════════════════════════════════════════════════

const DB_NAME    = 'KiVaultDB';
const DB_VERSION = 2;
const STORE_THREADS  = 'threads';
const STORE_SETTINGS = 'settings';
const STORE_LEARNING = 'learning';

// ── DB INIT ──────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_THREADS)) {
        const ts = db.createObjectStore(STORE_THREADS, { keyPath: 'id', autoIncrement: true });
        ts.createIndex('platform', 'platform', { unique: false });
        ts.createIndex('category', 'category', { unique: false });
        ts.createIndex('score',    'score',    { unique: false });
        ts.createIndex('savedAt',  'savedAt',  { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORE_LEARNING)) {
        db.createObjectStore(STORE_LEARNING, { keyPath: 'keyword' });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbPut(storeName, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(data);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly');
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── DEFAULT KEYWORD WEIGHTS ──────────────────────────────────────────
const DEFAULT_KEYWORDS = {
  // Code / Tech — high value
  'html':          5, 'javascript':  5, 'typescript':  5, 'python':      5,
  'css':           4, '```':         6, 'function':    4, 'async':       3,
  'await':         3, 'import':      3, 'export':      3, 'class':       3,
  'docker':        5, 'dockerfile':  5, 'bash':        4, 'script':      3,
  'npm':           3, 'git':         3, 'api':         4, 'json':        3,
  'webhook':       5, 'n8n':         6, 'workflow':    5, 'automation':  5,
  'vscode':        4, 'extension':   4, 'plugin':      4, 'supabase':    4,
  'postgresql':    4, 'sqlite':      4, 'indexeddb':   4, 'manifest':    3,
  'raspberry':     4, 'docker-compose': 6, 'linux':    4, 'ubuntu':      4,
  'cloudflare':    4, 'nginx':       4, 'ssl':         3,
  // Business / IP
  'patent':        7, 'dpma':        8, 'marke':       6, 'schutzrecht': 7,
  'geschäftsmodell': 7, 'businessplan': 7, 'masterplan': 6, 'roadmap':  5,
  'monetar':       6, 'umsatz':      5, 'revenue':     5, 'saas':       6,
  'retainer':      6, 'lizenz':      6, 'tier':        4, 'preismodell': 5,
  'ki4ki':         8, 'kunden':      4, 'akquise':     5, 'kundenwert':  5,
  // KI / Agent
  'systemprompt':  6, 'system prompt': 6, 'agent':     5, 'llm':        5,
  'prompt':        4, 'claude':      3, 'gpt':         3, 'gemini':     3,
  // TTT / Tauchen
  'ttt':           5, 'taucherteam': 6, 'triton':      5, 'tauchen':    4,
  'tauchgang':     4, 'kompressor':  4,
  // Struktur-Signale
  '###':           3, '##':          2, '---':         2, 'checkliste':  4,
  'infrastruktur': 5, 'dashboard':   5, 'sot ':        5,
  'source of truth': 6, 'deployment': 4, 'architektur': 4,
};

// Trash keywords (negative weight)
const TRASH_KEYWORDS = {
  'danke schön':   -8, 'vielen dank':  -8, 'super':       -4,
  'kannst du mir': -5, 'erkläre mir':  -5, 'was ist':     -3,
  'wie heißt':     -5, 'wie lautet':   -5, 'hallo':       -6,
  'hi ':           -6, 'hey ':         -6, 'ok ':         -4,
  'alles klar':    -5, 'perfekt':      -3, 'gut gemacht': -5,
};

// ── SCORING ENGINE ───────────────────────────────────────────────────
async function scoreThread(text, msgCount) {
  const lower = text.toLowerCase();
  const wordCount = lower.split(/\s+/).length;

  // Load learned weights from IndexedDB
  const learnedRaw = await dbGetAll(STORE_LEARNING);
  const learned = {};
  learnedRaw.forEach(r => { learned[r.keyword] = r.weight; });

  let score = 0;

  // Length bonus
  if (wordCount > 300)  score += 10;
  if (wordCount > 800)  score += 10;
  if (wordCount > 2000) score += 10;
  if (wordCount > 5000) score += 10;

  // Message count
  if (msgCount > 5)  score += 5;
  if (msgCount > 15) score += 5;
  if (msgCount > 30) score += 5;

  // Code blocks
  const codeBlocks = (lower.match(/```/g) || []).length / 2;
  score += Math.min(codeBlocks * 4, 20);

  // Gold keywords (base + learned delta)
  for (const [kw, baseWeight] of Object.entries(DEFAULT_KEYWORDS)) {
    if (lower.includes(kw.toLowerCase())) {
      const delta = learned[kw] ?? 0;
      score += (baseWeight + delta);
    }
  }

  // Trash keywords
  for (const [kw, weight] of Object.entries(TRASH_KEYWORDS)) {
    if (lower.includes(kw.toLowerCase())) {
      score += weight;
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── CATEGORY CLASSIFIER ──────────────────────────────────────────────
function classifyCategory(text) {
  const lower = text.toLowerCase();
  const scores = {
    'HTML_TOOLS':      0,
    'CODE':            0,
    'KONZEPTE':        0,
    'AUTOMATISIERUNG': 0,
    'TTT_TAUCHEN':     0,
  };

  // HTML_TOOLS
  ['html', 'css', 'dashboard', 'popup', 'interface', 'webseite', 'website', 'frontend', 'dom', 'canvas'].forEach(k => {
    if (lower.includes(k)) scores['HTML_TOOLS'] += 3;
  });
  // CODE
  ['python', 'javascript', 'typescript', 'bash', 'powershell', 'function(', '=>', 'class ', 'import ', 'const ', 'def ', 'npm', 'git', 'docker'].forEach(k => {
    if (lower.includes(k)) scores['CODE'] += 3;
  });
  // KONZEPTE
  ['businessplan', 'masterplan', 'konzept', 'roadmap', 'strategie', 'patent', 'dpma', 'marke', 'geschäftsmodell', 'preismodell', 'ki4ki', 'saas', 'monetar', 'retainer'].forEach(k => {
    if (lower.includes(k)) scores['KONZEPTE'] += 3;
  });
  // AUTOMATISIERUNG
  ['n8n', 'workflow', 'automation', 'webhook', 'trigger', 'cron', 'api', 'zap', 'make.com', 'pipedream', 'service worker', 'background', 'script', 'automat'].forEach(k => {
    if (lower.includes(k)) scores['AUTOMATISIERUNG'] += 3;
  });
  // TTT_TAUCHEN
  ['ttt', 'taucherteam', 'triton', 'tauchen', 'tauchgang', 'kompressor', 'tauchbasis', 'neopren', 'gerrit'].forEach(k => {
    if (lower.includes(k)) scores['TTT_TAUCHEN'] += 4;
  });

  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// ── BADGE UPDATER ─────────────────────────────────────────────────────
function updateBadge(tabId, score) {
  let color, text;
  if (score >= 75) { color = '#00d4ff'; text = String(score); }
  else if (score >= 55) { color = '#00e5a0'; text = String(score); }
  else if (score >= 35) { color = '#ffd166'; text = String(score); }
  else { color = '#555555'; text = ''; }

  chrome.action.setBadgeBackgroundColor({ color, tabId });
  chrome.action.setBadgeText({ text, tabId });
}

// ── HTML BUILDER ──────────────────────────────────────────────────────
function buildThreadHTML(thread) {
  const { title, platform, score, category, url, savedAt, messages } = thread;
  const date = new Date(savedAt).toLocaleString('de-DE');
  const wordCount = messages.map(m => m.text).join(' ').split(/\s+/).length;

  const valueMap = {
    75: { label: '🏆 TOP-ASSET',  color: '#00d4ff' },
    55: { label: '💎 Wertvoll',   color: '#00e5a0' },
    35: { label: '📌 Nützlich',   color: '#ffd166' },
     0: { label: '📄 Archiviert', color: '#888'    },
  };
  const vk = Object.keys(valueMap).map(Number).sort((a,b)=>b-a).find(k => score >= k);
  const vl = valueMap[vk];

  const msgsHTML = messages.map(m => {
    const isUser = m.role === 'user';
    const label  = isUser ? '👤 Du' : '🤖 KI';
    const bg     = isUser ? '#101828' : '#0d1428';
    const safe   = m.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const withCode = safe.replace(/```[\s\S]*?```/g, match =>
      `<pre style="background:#050b18;border:1px solid #00d4ff22;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;color:#a8e6ff;">${match}</pre>`
    );
    return `<div style="margin:10px 0;padding:16px;background:${bg};border:1px solid #1e2d55;border-radius:10px;">
      <div style="font-size:11px;color:#7b93c8;margin-bottom:6px;font-weight:700;">${label}</div>
      <div style="color:#e8f0fe;line-height:1.7;font-size:14px;white-space:pre-wrap;">${withCode}</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>${title} | KI-Vault</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0f1e;color:#e8f0fe;font-family:system-ui,sans-serif;padding:32px 24px;max-width:900px;margin:0 auto;line-height:1.7}h1{color:#00d4ff;font-size:22px;margin-bottom:6px}.meta{font-size:12px;color:#7b93c8;margin-bottom:24px}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-right:6px}.bar{background:#162040;border-radius:4px;height:8px;margin:8px 0 4px}.fill{height:8px;border-radius:4px;background:linear-gradient(90deg,#00e5a0,#00d4ff)}</style>
</head><body>
<h1>📄 ${title}</h1>
<div class="meta">Gespeichert: ${date} &nbsp;·&nbsp; Quelle: <a href="${url||'#'}" style="color:#00d4ff">${platform}</a> &nbsp;·&nbsp; ${wordCount.toLocaleString()} Wörter &nbsp;·&nbsp; ${messages.length} Nachrichten</div>
<div style="background:#0d1428;border:1px solid #1e2d55;border-radius:12px;padding:20px;margin-bottom:24px;">
  <span class="badge" style="background:${vl.color}22;color:${vl.color};border:1px solid ${vl.color}44">${vl.label}</span>
  <span class="badge" style="background:#1e2d5522;color:#7b93c8;border:1px solid #1e2d55">${category}</span>
  <span class="badge" style="background:#1e2d5522;color:#7b93c8;border:1px solid #1e2d55">${platform}</span>
  <div class="bar"><div class="fill" style="width:${score}%"></div></div>
  <div style="font-size:12px;color:#7b93c8">Score: ${score}/100</div>
</div>
${msgsHTML}
<div style="font-size:11px;color:#3d5490;margin-top:32px;text-align:center">KI-Vault v1.0 · Gerrit Großmaas · ${date}</div>
</body></html>`;
}

// ── MESSAGE HANDLER ───────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Content script sends extracted thread
  if (msg.type === 'THREAD_SCAN') {
    (async () => {
      const { title, platform, url, messages } = msg.data;
      const fullText = messages.map(m => m.text).join('\n');
      const score    = await scoreThread(fullText, messages.length);
      const category = classifyCategory(fullText);

      const thread = {
        title, platform, url, messages, score, category,
        savedAt: Date.now(),
        html: buildThreadHTML({ title, platform, url, messages, score, category, savedAt: Date.now() }),
        thumbs: null,
      };

      await dbPut(STORE_THREADS, thread);

      // Update badge on sender tab
      if (sender.tab?.id) updateBadge(sender.tab.id, score);

      sendResponse({ score, category });
    })();
    return true; // keep channel open
  }

  // Popup requests all threads
  if (msg.type === 'GET_THREADS') {
    dbGetAll(STORE_THREADS).then(threads => sendResponse(threads));
    return true;
  }

  // Popup requests stats
  if (msg.type === 'GET_STATS') {
    dbGetAll(STORE_THREADS).then(threads => {
      const byCategory = {};
      const byPlatform = {};
      let totalScore = 0;
      threads.forEach(t => {
        byCategory[t.category] = (byCategory[t.category] || 0) + 1;
        byPlatform[t.platform] = (byPlatform[t.platform] || 0) + 1;
        totalScore += t.score;
      });
      sendResponse({
        total: threads.length,
        avgScore: threads.length ? Math.round(totalScore / threads.length) : 0,
        topAssets: threads.filter(t => t.score >= 75).length,
        byCategory,
        byPlatform,
        recent: threads.slice(-5).reverse(),
      });
    });
    return true;
  }

  // Thumbs up/down — LEARNING ENGINE
  if (msg.type === 'FEEDBACK') {
    (async () => {
      const { threadId, thumbs } = msg.data;
      const db = await openDB();

      // Update thread
      const tx = db.transaction(STORE_THREADS, 'readwrite');
      const store = tx.objectStore(STORE_THREADS);
      const getReq = store.get(threadId);
      getReq.onsuccess = async () => {
        const thread = getReq.result;
        if (!thread) return;
        thread.thumbs = thumbs;
        store.put(thread);

        // Adjust keyword weights based on feedback
        const lower = thread.messages.map(m => m.text).join('\n').toLowerCase();
        const delta = thumbs === 'up' ? 0.5 : -0.5;

        for (const kw of Object.keys(DEFAULT_KEYWORDS)) {
          if (lower.includes(kw)) {
            const existing = await dbGet(STORE_LEARNING, kw) || { keyword: kw, weight: 0, hits: 0 };
            existing.weight = Math.max(-10, Math.min(10, existing.weight + delta));
            existing.hits   = (existing.hits || 0) + 1;
            await dbPut(STORE_LEARNING, existing);
          }
        }

        sendResponse({ ok: true });
      };
    })();
    return true;
  }

  // Export ZIP
  if (msg.type === 'EXPORT_ZIP') {
    (async () => {
      const threads = await dbGetAll(STORE_THREADS);
      const files = {};

      // Build virtual file tree
      const catMap = {
        HTML_TOOLS:      '_KAI_VAULT/01_HTML_TOOLS/',
        CODE:            '_KAI_VAULT/04_CODE/',
        KONZEPTE:        '_KAI_VAULT/03_KONZEPTE/',
        AUTOMATISIERUNG: '_KAI_VAULT/07_AUTOMATISIERUNG/',
        TTT_TAUCHEN:     '_KAI_VAULT/06_TTT_TAUCHEN/',
      };

      threads.forEach(t => {
        const dir      = catMap[t.category] || '_KAI_VAULT/05_REFERENZ/';
        const dateStr  = new Date(t.savedAt).toISOString().slice(0, 10);
        const slug     = t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/(^-|-$)/g, '');
        const filename = `${dateStr}_${t.platform}_${slug}.html`;
        files[dir + filename] = t.html;
      });

      // Index markdown
      const indexLines = ['# KI-Vault Index\n', `Exportiert: ${new Date().toLocaleString('de-DE')}\n`, '---\n'];
      threads.forEach(t => {
        const dateStr = new Date(t.savedAt).toISOString().slice(0, 10);
        indexLines.push(`- **[${t.score}]** ${t.title} · ${t.platform} · ${t.category} · ${dateStr}`);
      });
      files['_KAI_VAULT/INDEX.md'] = indexLines.join('\n');

      sendResponse({ files });
    })();
    return true;
  }

  // Delete thread
  if (msg.type === 'DELETE_THREAD') {
    dbDelete(STORE_THREADS, msg.data.id).then(() => sendResponse({ ok: true }));
    return true;
  }

  // Reset learning
  if (msg.type === 'RESET_LEARNING') {
    (async () => {
      const db = await openDB();
      const tx = db.transaction(STORE_LEARNING, 'readwrite');
      tx.objectStore(STORE_LEARNING).clear();
      tx.oncomplete = () => sendResponse({ ok: true });
    })();
    return true;
  }

  // Get all learning data for popup
  if (msg.type === 'GET_LEARNING_DATA') {
    dbGetAll(STORE_LEARNING).then(rows => sendResponse(rows));
    return true;
  }

  // Feedback by hash (from content script bubble)
  if (msg.type === 'FEEDBACK_LAST') {
    (async () => {
      const threads = await dbGetAll(STORE_THREADS);
      const sorted  = threads.sort((a, b) => b.savedAt - a.savedAt);
      const thread  = sorted[0]; // most recent
      if (!thread) { sendResponse({ ok: false }); return; }

      thread.thumbs = msg.data.thumbs;
      await dbPut(STORE_THREADS, thread);

      const lower = thread.messages.map(m => m.text).join('\n').toLowerCase();
      const delta = msg.data.thumbs === 'up' ? 0.5 : -0.5;
      for (const kw of Object.keys(DEFAULT_KEYWORDS)) {
        if (lower.includes(kw)) {
          const existing = (await dbGet(STORE_LEARNING, kw)) || { keyword: kw, weight: 0, hits: 0 };
          existing.weight = Math.max(-10, Math.min(10, existing.weight + delta));
          existing.hits   = (existing.hits || 0) + 1;
          await dbPut(STORE_LEARNING, existing);
        }
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  // GET_LEARNING (alias for popup stats)
  if (msg.type === 'GET_LEARNING') {
    dbGetAll(STORE_LEARNING).then(rows => sendResponse(rows));
    return true;
  }
});
