// ═══════════════════════════════════════════════════════════════════
// KI-VAULT :: CHATGPT CONTENT SCRIPT
// ═══════════════════════════════════════════════════════════════════

function scanChatGPT() {
  const messages = [];

  // Primary: article[data-testid] with role attribute
  const articles = document.querySelectorAll('article[data-testid]');
  articles.forEach(el => {
    const role = el.getAttribute('data-message-author-role')
      || el.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role')
      || (el.getAttribute('data-testid')?.includes('human') ? 'user' : 'assistant');
    const text = el.innerText?.trim();
    if (text && text.length > 15) messages.push({ role, text });
  });

  // Fallback A: turn containers
  if (!messages.length) {
    document.querySelectorAll('[data-testid^="conversation-turn"]').forEach(el => {
      const isHuman = el.querySelector('[data-message-author-role="user"]');
      const role = isHuman ? 'user' : 'assistant';
      const text = el.innerText?.trim();
      if (text && text.length > 15) messages.push({ role, text });
    });
  }

  // Fallback B: generic message classes
  if (!messages.length) {
    document.querySelectorAll('.group\\/conversation-turn, [class*="message"], .prose').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 30) messages.push({ role: 'content', text });
    });
  }

  if (messages.length) kvSendThread('ChatGPT', messages);
}

kvObserve('main', scanChatGPT, 2500);
