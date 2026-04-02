/**
 * Collapsible chat panel UI — pure DOM construction.
 */
import { markdownToHtml } from './chat-markdown.js';

export function createChatPanel() {
  // Toggle button
  const toggle = document.createElement('button');
  toggle.id = 'chat-toggle';
  toggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>';
  toggle.title = 'Mission Assistant';
  document.body.appendChild(toggle);

  // Chat panel
  const panel = document.createElement('div');
  panel.id = 'chat-panel';
  panel.classList.add('collapsed');
  panel.innerHTML = `
    <div class="chat-header">
      <span class="chat-title">Mission Assistant</span>
      <span class="chat-status-dot" id="chat-status-dot"></span>
    </div>
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-tool-indicator" id="chat-tool-indicator" style="display:none">
      <span class="tool-spinner">⟳</span> <span id="tool-indicator-text">Using tool...</span>
    </div>
    <div class="chat-input-row">
      <textarea id="chat-input" placeholder="Ask about the mission..." autocomplete="off" rows="1"></textarea>
      <button id="chat-send">→</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Elements
  const messagesEl = panel.querySelector('#chat-messages');
  const inputEl = panel.querySelector('#chat-input');
  const sendBtn = panel.querySelector('#chat-send');
  const statusDot = panel.querySelector('#chat-status-dot');
  const toolIndicator = panel.querySelector('#chat-tool-indicator');
  const toolText = panel.querySelector('#tool-indicator-text');

  let expanded = false;
  let streaming = false;
  let currentStreamEl = null;
  let currentStreamText = '';
  let onSend = null;

  // Toggle expand/collapse
  toggle.addEventListener('click', () => {
    expanded = !expanded;
    panel.classList.toggle('collapsed', !expanded);
    panel.classList.toggle('expanded', expanded);
    toggle.classList.toggle('active', expanded);
    if (expanded) inputEl.focus();
  });

  // Auto-resize textarea (up to 4 lines)
  function autoResizeInput() {
    inputEl.style.height = 'auto';
    const lineHeight = 20; // matches CSS
    const maxHeight = lineHeight * 4;
    inputEl.style.height = Math.min(inputEl.scrollHeight, maxHeight) + 'px';
  }

  inputEl.addEventListener('input', autoResizeInput);

  // Send message
  function submitMessage() {
    const text = inputEl.value.trim();
    if (!text || streaming) return;
    inputEl.value = '';
    inputEl.style.height = 'auto'; // reset height after send
    if (onSend) onSend(text);
  }

  sendBtn.addEventListener('click', submitMessage);
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  });

  // Public API
  const api = {
    onSend(fn) { onSend = fn; },

    addMessage(role, content) {
      const div = document.createElement('div');
      div.className = `chat-msg chat-msg-${role}`;
      div.innerHTML = role === 'user' ? escapeHtml(content) : markdownToHtml(content);
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    startStream() {
      streaming = true;
      currentStreamText = '';
      currentStreamEl = document.createElement('div');
      currentStreamEl.className = 'chat-msg chat-msg-assistant';
      currentStreamEl.innerHTML = '<span class="typing-dots">●●●</span>';
      messagesEl.appendChild(currentStreamEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    appendToken(text) {
      if (!currentStreamEl) return;
      currentStreamText += text;
      currentStreamEl.innerHTML = markdownToHtml(currentStreamText);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    endStream() {
      streaming = false;
      if (currentStreamEl && !currentStreamText) {
        currentStreamEl.remove();
      }
      currentStreamEl = null;
      currentStreamText = '';
      toolIndicator.style.display = 'none';
    },

    showToolIndicator(name) {
      const labels = {
        horizons_query: 'Querying Horizons...',
        read_telemetry: 'Reading telemetry...',
        inspect_telemetry: 'Inspecting telemetry...',
        web_search: 'Searching the web...',
        analyze_screenshot: 'Analyzing screenshot...',
        analyze_live_feed: 'Capturing NASA live feed...',
        mission_timeline: 'Checking timeline...',
        calculate: 'Calculating...',
      };
      toolText.textContent = labels[name] || `Using ${name}...`;
      toolIndicator.style.display = 'flex';
    },

    hideToolIndicator() {
      toolIndicator.style.display = 'none';
    },

    setStatus(status) {
      statusDot.className = `chat-status-dot ${status}`;
    },
  };

  return api;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
