// ═══════════════════════════════════════════════════════════════════
// KI-VAULT SHARED CONTENT SCRIPT UTILITIES
// DOM observation, dedup, overlay injection
// ═══════════════════════════════════════════════════════════════════

window.__KiVault = window.__KiVault || {
  lastUrl:     '',
  lastHash:    '',
  scanning:    false,
  observer:    null,
};

// ── DEDUP ─────────────────────────────────────────────────────────────
function kvHash(str) {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 4000); i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

// ── SEND TO BACKGROUND ────────────────────────────────────────────────
function kvSendThread(platform, messages) {
  if (!messages.length) return;

  const fullText = messages.map(m => m.text).join('\n');
  if (fullText.split(/\s+/).length < 30) return; // too short

  const hash = kvHash(fullText);
  if (hash === window.__KiVault.lastHash) return; // same content
  window.__KiVault.lastHash = hash;

  const title = document.title.replace(/\s*[\|\-—].*$/, '').trim() || 'Thread';

  chrome.runtime.sendMessage({
    type: 'THREAD_SCAN',
    data: { title, platform, url: location.href, messages },
  }, (response) => {
    if (!response) return;
    kvShowBubble(response.score, response.category, title);
  });
}

// ── SCORE BUBBLE ──────────────────────────────────────────────────────
function kvShowBubble(score, category, title) {
  const existing = document.getElementById('ki-vault-bubble');
  if (existing) existing.remove();

  let color, label;
  if      (score >= 75) { color = '#00d4ff'; label = '🏆'; }
  else if (score >= 55) { color = '#00e5a0'; label = '💎'; }
  else if (score >= 35) { color = '#ffd166'; label = '📌'; }
  else                   { color = '#555';   label = '🗑️'; return; } // silent on trash

  const bubble = document.createElement('div');
  bubble.id = 'ki-vault-bubble';
  bubble.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:2147483647;
    background:#0d1428;border:2px solid ${color}66;border-radius:14px;
    padding:14px 18px;box-shadow:0 4px 24px rgba(0,0,0,.5);
    font-family:system-ui,sans-serif;color:#e8f0fe;
    display:flex;align-items:center;gap:14px;
    animation:kvSlide .3s ease;cursor:pointer;max-width:320px;
  `;

  const catIcons = {
    HTML_TOOLS: '🖥️', CODE: '💻', KONZEPTE: '💼',
    AUTOMATISIERUNG: '⚙️', TTT_TAUCHEN: '🤿',
  };

  bubble.innerHTML = `
    <style>@keyframes kvSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}</style>
    <div style="font-size:24px;line-height:1">${label}</div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:700;color:${color};margin-bottom:2px;">KI-Vault: ${score}/100</div>
      <div style="font-size:11px;color:#7b93c8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
        ${catIcons[category]||'📄'} ${category} · ${title.slice(0,30)}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;">
      <button data-vote="up"   style="${btnStyle('#00e5a0')}">👍</button>
      <button data-vote="down" style="${btnStyle('#ff6b6b')}">👎</button>
    </div>
    <button id="ki-bubble-close" style="position:absolute;top:6px;right:8px;background:none;border:none;color:#7b93c8;cursor:pointer;font-size:14px;line-height:1;">✕</button>
  `;

  function btnStyle(c) {
    return `background:${c}22;border:1px solid ${c}44;color:${c};border-radius:6px;padding:4px 8px;cursor:pointer;font-size:14px;`;
  }

  document.body.appendChild(bubble);

  // Auto-hide after 6s
  const timer = setTimeout(() => bubble.remove(), 6000);

  bubble.querySelector('#ki-bubble-close').onclick = e => {
    e.stopPropagation();
    clearTimeout(timer);
    bubble.remove();
  };

  // Thumbs feedback
  bubble.querySelectorAll('[data-vote]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      clearTimeout(timer);
      // Find thread by hash — background will match via recent
      chrome.runtime.sendMessage({
        type: 'FEEDBACK_LAST',
        data: { thumbs: btn.dataset.vote, hash: window.__KiVault.lastHash }
      });
      bubble.innerHTML = `<div style="padding:4px;color:${btn.dataset.vote==='up'?'#00e5a0':'#ff6b6b'};font-weight:700;">${btn.dataset.vote==='up'?'👍 Danke!':'👎 Notiert.'}</div>`;
      setTimeout(() => bubble.remove(), 1500);
    };
  });
}

// ── URL CHANGE WATCHER ────────────────────────────────────────────────
function kvWatchUrl(scanFn) {
  let lastUrl = location.href;
  const check = () => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(scanFn, 1200); // wait for DOM to settle
    }
  };
  setInterval(check, 800);
  // Also fire once on load
  setTimeout(scanFn, 2500);
}

// ── MUTATION OBSERVER (fire scan when new messages appear) ────────────
function kvObserve(containerSelector, scanFn, debounceMs = 2000) {
  let debounce;
  const fire = () => {
    clearTimeout(debounce);
    debounce = setTimeout(scanFn, debounceMs);
  };
  const connect = () => {
    const el = document.querySelector(containerSelector);
    if (el) {
      if (window.__KiVault.observer) window.__KiVault.observer.disconnect();
      window.__KiVault.observer = new MutationObserver(fire);
      window.__KiVault.observer.observe(el, { childList: true, subtree: true });
    } else {
      // retry until container appears
      setTimeout(connect, 1500);
    }
  };
  connect();
  kvWatchUrl(scanFn);
}
