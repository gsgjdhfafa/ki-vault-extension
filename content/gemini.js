// ═══════════════════════════════════════════════════════════════════
// KI-VAULT :: GEMINI CONTENT SCRIPT
// ═══════════════════════════════════════════════════════════════════

function scanGemini() {
  const messages = [];

  // Primary: Gemini uses shadow DOM / web components
  // message-content is a custom element
  document.querySelectorAll('message-content').forEach(el => {
    const text = el.innerText?.trim();
    if (text && text.length > 15) messages.push({ role: 'assistant', text });
  });

  // User queries
  document.querySelectorAll('user-query, .user-query, [class*="userQuery"], .query-text').forEach(el => {
    const text = el.innerText?.trim();
    if (text && text.length > 5) messages.push({ role: 'user', text });
  });

  // Fallback: model response and user query divs
  if (!messages.length) {
    document.querySelectorAll('.model-response-text, .response-container, [class*="modelResponse"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 30) messages.push({ role: 'assistant', text });
    });
    document.querySelectorAll('[class*="inputText"], .input-area textarea').forEach(el => {
      // Only actual submitted queries, not current input
    });
  }

  // Fallback B: broad content grab
  if (!messages.length) {
    document.querySelectorAll('p, li').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 60 && el.closest('main')) {
        if (!messages.find(m => m.text === text)) messages.push({ role: 'content', text });
      }
    });
  }

  if (messages.length) kvSendThread('Gemini', messages);
}

kvObserve('chat-history, main, [class*="conversation"]', scanGemini, 3000);
