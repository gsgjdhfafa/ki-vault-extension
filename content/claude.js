// ═══════════════════════════════════════════════════════════════════
// KI-VAULT :: CLAUDE CONTENT SCRIPT
// ═══════════════════════════════════════════════════════════════════

function scanClaude() {
  const messages = [];

  // Primary: data-testid human/assistant turns
  document.querySelectorAll('[data-testid="human-turn"], [data-testid="assistant-turn"]').forEach(el => {
    const role = el.getAttribute('data-testid').includes('human') ? 'user' : 'assistant';
    const text = el.innerText?.trim();
    if (text && text.length > 15) messages.push({ role, text });
  });

  // Fallback A: Claude-specific class patterns
  if (!messages.length) {
    document.querySelectorAll(
      '.font-claude-message, [class*="humanTurn"], [class*="assistantTurn"], [class*="HumanMessage"], [class*="AssistantMessage"]'
    ).forEach(el => {
      const cls = el.className || '';
      const role = cls.includes('human') || cls.includes('Human') ? 'user' : 'assistant';
      const text = el.innerText?.trim();
      if (text && text.length > 15) messages.push({ role, text });
    });
  }

  // Fallback B: main prose content
  if (!messages.length) {
    document.querySelectorAll('.prose, [class*="message-content"], [class*="MessageContent"]').forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.length > 30) messages.push({ role: 'content', text });
    });
  }

  if (messages.length) kvSendThread('Claude', messages);
}

kvObserve('[data-testid="conversation-content"], main, #main-content', scanClaude, 2500);
