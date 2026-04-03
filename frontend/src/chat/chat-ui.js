/**
 * Chat UI — attaches to the sidebar chat tab.
 */
import { markdownToHtml } from './chat-markdown.js';

export function createChatPanel() {
  // Elements are already in the HTML sidebar
  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const toolIndicator = document.getElementById('chat-tool-indicator');
  const toolText = document.getElementById('tool-indicator-text');

  let streaming = false;
  let currentStreamEl = null;
  let currentStreamText = '';
  let onSend = null;
  let onNewChat = null;

  // Auto-resize textarea (up to 4 lines)
  function autoResizeInput() {
    inputEl.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 4;
    inputEl.style.height = Math.min(inputEl.scrollHeight, maxHeight) + 'px';
  }

  inputEl.addEventListener('input', autoResizeInput);

  // Send message
  function submitMessage() {
    const text = inputEl.value.trim();
    if (!text || streaming) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
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
    onNewChat(fn) { onNewChat = fn; },

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
        dsn_status: 'Querying Deep Space Network...',
        tdrs_status: 'Querying TDRS constellation...',
        calculate: 'Calculating...',
      };
      toolText.textContent = labels[name] || `Using ${name}...`;
      toolIndicator.style.display = 'flex';
    },

    hideToolIndicator() {
      toolIndicator.style.display = 'none';
    },

    setStatus(status) {
      // Update the chat tab indicator
      const chatTab = document.querySelector('.sidebar-tab[data-tab="chat"]');
      if (chatTab) {
        chatTab.classList.toggle('connected', status === 'connected');
      }
    },
  };

  return api;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
