// ═══════════════════════════════════════════════════════════════════
// KI-VAULT :: PERPLEXITY CONTENT SCRIPT
// ═══════════════════════════════════════════════════════════════════

function scanPerplexity() {
  const messages = [];
  const seen = new Set();

  // Primary: prose answer blocks
  document.querySelectorAll('[class*="prose"], [class*="answer"], .col-span-8').forEach(el => {
    const text = el.innerText?.trim();
    if (text && text.length > 50 && !seen.has(text)) {
      seen.add(text);
      messages.push({ role: 'assistant', text });
    }
  });

  // User queries
  document.querySelectorAll('[class*="query"], [class*="Question"], h2, h3').forEach(el => {
    const text = el.innerText?.trim();
    if (text && text.length > 5 && text.length < 500 && !seen.has(text)) {
      seen.add(text);
      messages.push({ role: 'user', text });
    }
  });

  // Fallback
  if (!messages.length) {
    document.querySelectorAll('p').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 80 && !seen.has(text)) {
        seen.add(text);
        messages.push({ role: 'content', text });
      }
    });
  }

  if (messages.length) kvSendThread('Perplexity', messages);
}

kvObserve('main, [class*="thread"], [class*="conversation"]', scanPerplexity, 2500);
