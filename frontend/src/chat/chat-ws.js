/**
 * WebSocket connection manager for the chat agent.
 */
import { captureCanvas } from './chat-screenshot.js';

export function createChatConnection(chatUI, renderer) {
  let uuid = crypto.randomUUID();
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.onopen = () => {
      chatUI.setStatus('connected');
      ws.send(JSON.stringify({ type: 'init', uuid }));
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case 'config':
          const badge = document.getElementById('chat-model-badge');
          if (badge) badge.textContent = data.model;
          break;

        case 'token':
          chatUI.appendToken(data.content);
          break;

        case 'tool_start':
          chatUI.showToolIndicator(data.name);
          break;

        case 'tool_end':
          chatUI.hideToolIndicator();
          break;

        case 'screenshot_request':
          const b64 = captureCanvas(renderer);
          ws.send(JSON.stringify({ type: 'screenshot', uuid, data: b64 }));
          break;

        case 'end':
          chatUI.endStream();
          break;

        case 'error':
          chatUI.addMessage('system', `Error: ${data.message}`);
          chatUI.endStream();
          break;
      }
    };

    ws.onclose = () => {
      chatUI.setStatus('disconnected');
      // Reconnect after 3 seconds
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      chatUI.setStatus('disconnected');
    };
  }

  connect();

  return {
    send(text) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        chatUI.addMessage('user', text);
        chatUI.startStream();
        ws.send(JSON.stringify({ type: 'message', uuid, content: text }));
      } else {
        chatUI.addMessage('system', 'Not connected. Retrying...');
      }
    },
    newThread() {
      uuid = crypto.randomUUID();
      // Re-init with the new UUID so the backend gets a fresh thread
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'init', uuid }));
      }
    },
  };
}
