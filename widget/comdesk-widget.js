(function () {
  const CONFIG = {
    serviceName: 'Comdesk',
    apiBase: 'https://widsley-support-api-75769606959.asia-northeast1.run.app',
    serviceId: 'comdesk',
    primaryColor: '#00BCD4',
    accentColor: '#F97316',
  };

  const STORAGE_KEY = `widsley_${CONFIG.serviceId}_conversation_id`;
  const USER_KEY = `widsley_${CONFIG.serviceId}_user_id`;

  function getUserId() {
    let userId = localStorage.getItem(USER_KEY);
    if (!userId) {
      userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(USER_KEY, userId);
    }
    return userId;
  }

  function getConversationId() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  function setConversationId(id) {
    if (id) localStorage.setItem(STORAGE_KEY, id);
  }

  // --- Styles ---
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .ws-chat-fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: ${CONFIG.primaryColor};
        color: #fff;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s;
        font-size: 24px;
      }
      .ws-chat-fab:hover { transform: scale(1.1); }

      .ws-chat-panel {
        position: fixed;
        bottom: 96px;
        right: 24px;
        width: 380px;
        height: 520px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        z-index: 99999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }
      .ws-chat-panel.ws-open { display: flex; }

      .ws-chat-header {
        background: ${CONFIG.primaryColor};
        color: #fff;
        padding: 16px;
        font-weight: 600;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .ws-chat-header button {
        background: none;
        border: none;
        color: #fff;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        line-height: 1;
      }

      .ws-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ws-msg {
        max-width: 85%;
        padding: 10px 14px;
        border-radius: 12px;
        line-height: 1.5;
        word-wrap: break-word;
        white-space: pre-wrap;
      }
      .ws-msg-user {
        align-self: flex-end;
        background: ${CONFIG.primaryColor};
        color: #fff;
        border-bottom-right-radius: 4px;
      }
      .ws-msg-bot {
        align-self: flex-start;
        background: #f1f3f5;
        color: #333;
        border-bottom-left-radius: 4px;
      }

      .ws-chat-input-area {
        border-top: 1px solid #e9ecef;
        padding: 12px;
        display: flex;
        gap: 8px;
      }
      .ws-chat-input-area input {
        flex: 1;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        outline: none;
      }
      .ws-chat-input-area input:focus {
        border-color: ${CONFIG.primaryColor};
      }
      .ws-chat-input-area button {
        background: ${CONFIG.primaryColor};
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
        white-space: nowrap;
      }
      .ws-chat-input-area button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ws-contact-btn {
        display: block;
        margin: 0 12px 12px;
        padding: 10px;
        background: ${CONFIG.accentColor};
        color: #fff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        text-align: center;
      }
      .ws-contact-btn:hover { opacity: 0.9; }

      /* Modal */
      .ws-modal-overlay {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 100000;
        display: none;
        align-items: center;
        justify-content: center;
      }
      .ws-modal-overlay.ws-open { display: flex; }

      .ws-modal {
        background: #fff;
        border-radius: 12px;
        padding: 24px;
        width: 400px;
        max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .ws-modal h3 {
        margin: 0 0 16px;
        font-size: 18px;
        color: #333;
      }
      .ws-modal label {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        font-weight: 500;
        color: #555;
      }
      .ws-modal input, .ws-modal textarea {
        width: 100%;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 14px;
        margin-bottom: 12px;
        outline: none;
        box-sizing: border-box;
        font-family: inherit;
      }
      .ws-modal input:focus, .ws-modal textarea:focus {
        border-color: ${CONFIG.primaryColor};
      }
      .ws-modal textarea { resize: vertical; min-height: 80px; }
      .ws-modal-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 8px;
      }
      .ws-modal-actions button {
        padding: 8px 20px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
        border: none;
      }
      .ws-modal-cancel {
        background: #e9ecef;
        color: #333;
      }
      .ws-modal-submit {
        background: ${CONFIG.primaryColor};
        color: #fff;
      }
      .ws-modal-submit:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .ws-modal-success {
        text-align: center;
        padding: 16px 0;
        color: #2e7d32;
        font-size: 15px;
      }

      .ws-typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
      }
      .ws-typing-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #aaa;
        animation: ws-bounce 1.2s infinite ease-in-out;
      }
      .ws-typing-dot:nth-child(2) { animation-delay: 0.2s; }
      .ws-typing-dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes ws-bounce {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // --- DOM ---
  function createDOM() {
    // FAB
    const fab = document.createElement('button');
    fab.className = 'ws-chat-fab';
    fab.innerHTML = '&#128172;';
    fab.setAttribute('aria-label', `${CONFIG.serviceName} サポートチャット`);

    // Chat Panel
    const panel = document.createElement('div');
    panel.className = 'ws-chat-panel';
    panel.innerHTML = `
      <div class="ws-chat-header">
        <span>${CONFIG.serviceName} サポート</span>
        <button class="ws-chat-close" aria-label="閉じる">&times;</button>
      </div>
      <div class="ws-chat-messages"></div>
      <button class="ws-contact-btn">サポートに問い合わせる</button>
      <div class="ws-chat-input-area">
        <input type="text" placeholder="質問を入力..." />
        <button>送信</button>
      </div>
    `;

    // Modal
    const modal = document.createElement('div');
    modal.className = 'ws-modal-overlay';
    modal.innerHTML = `
      <div class="ws-modal">
        <h3>サポートに問い合わせる</h3>
        <div class="ws-modal-form">
          <label for="ws-contact-name">お名前</label>
          <input type="text" id="ws-contact-name" placeholder="山田太郎" />
          <label for="ws-contact-email">メールアドレス</label>
          <input type="email" id="ws-contact-email" placeholder="example@example.com" />
          <label for="ws-contact-message">お問い合わせ内容</label>
          <textarea id="ws-contact-message" placeholder="お問い合わせ内容をご記入ください"></textarea>
          <div class="ws-modal-actions">
            <button class="ws-modal-cancel">キャンセル</button>
            <button class="ws-modal-submit">送信</button>
          </div>
        </div>
        <div class="ws-modal-success" style="display:none;">
          お問い合わせを受け付けました。<br>担当者より折り返しご連絡いたします。
        </div>
      </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    document.body.appendChild(modal);

    return { fab, panel, modal };
  }

  // --- Chat Logic ---
  function initChat(elements) {
    const { fab, panel, modal } = elements;
    const messagesEl = panel.querySelector('.ws-chat-messages');
    const inputEl = panel.querySelector('.ws-chat-input-area input');
    const sendBtn = panel.querySelector('.ws-chat-input-area button');
    const closeBtn = panel.querySelector('.ws-chat-close');
    const contactBtn = panel.querySelector('.ws-contact-btn');
    let isStreaming = false;

    // Toggle panel
    fab.addEventListener('click', () => {
      panel.classList.toggle('ws-open');
      if (panel.classList.contains('ws-open')) {
        inputEl.focus();
      }
    });
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('ws-open');
    });

    // Send message
    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || isStreaming) return;
      inputEl.value = '';
      appendMessage(text, 'user');
      streamResponse(text);
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    function appendMessage(text, role) {
      const msg = document.createElement('div');
      msg.className = `ws-msg ws-msg-${role}`;
      msg.textContent = text;
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return msg;
    }

    function showTyping() {
      const el = document.createElement('div');
      el.className = 'ws-msg ws-msg-bot ws-typing';
      el.innerHTML = '<div class="ws-typing-dot"></div><div class="ws-typing-dot"></div><div class="ws-typing-dot"></div>';
      messagesEl.appendChild(el);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return el;
    }

    async function streamResponse(query) {
      isStreaming = true;
      sendBtn.disabled = true;
      const typingEl = showTyping();
      let botMsg = null;

      try {
        const res = await fetch(`${CONFIG.apiBase}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            conversation_id: getConversationId(),
            service_id: CONFIG.serviceId,
          }),
        });

        if (!res.ok) {
          typingEl.remove();
          botMsg = appendMessage('エラーが発生しました。もう一度お試しください。', 'bot');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const jsonStr = line.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.event === 'message' || data.event === 'agent_message') {
                if (!botMsg) {
                  typingEl.remove();
                  botMsg = appendMessage('', 'bot');
                }
                botMsg.textContent += data.answer || '';
                messagesEl.scrollTop = messagesEl.scrollHeight;
                if (data.conversation_id) {
                  setConversationId(data.conversation_id);
                }
              } else if (data.event === 'message_end') {
                if (data.conversation_id) {
                  setConversationId(data.conversation_id);
                }
              } else if (data.event === 'error') {
                botMsg.textContent += '\n[エラー] ' + (data.message || '不明なエラー');
              }
            } catch (_) {
              // ignore parse errors for incomplete chunks
            }
          }
        }
      } catch (err) {
        typingEl.remove();
        if (!botMsg) botMsg = appendMessage('', 'bot');
        botMsg.textContent = '通信エラーが発生しました。ネットワーク接続を確認してください。';
      } finally {
        isStreaming = false;
        sendBtn.disabled = false;
        if (typingEl.parentNode) typingEl.remove();
        if (botMsg && !botMsg.textContent) {
          botMsg.textContent = '回答を取得できませんでした。';
        }
      }
    }

    // --- Contact Modal ---
    contactBtn.addEventListener('click', () => {
      modal.classList.add('ws-open');
      modal.querySelector('.ws-modal-form').style.display = '';
      modal.querySelector('.ws-modal-success').style.display = 'none';
      modal.querySelector('#ws-contact-name').value = '';
      modal.querySelector('#ws-contact-email').value = '';
      modal.querySelector('#ws-contact-message').value = '';
    });

    modal.querySelector('.ws-modal-cancel').addEventListener('click', () => {
      modal.classList.remove('ws-open');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('ws-open');
    });

    const submitBtn = modal.querySelector('.ws-modal-submit');
    submitBtn.addEventListener('click', async () => {
      const name = modal.querySelector('#ws-contact-name').value.trim();
      const email = modal.querySelector('#ws-contact-email').value.trim();
      const message = modal.querySelector('#ws-contact-message').value.trim();

      if (!name || !email || !message) {
        alert('すべての項目を入力してください。');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      try {
        const res = await fetch(`${CONFIG.apiBase}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            message,
            conversation_id: getConversationId(),
            service_id: CONFIG.serviceId,
          }),
        });

        if (!res.ok) throw new Error('送信失敗');

        modal.querySelector('.ws-modal-form').style.display = 'none';
        modal.querySelector('.ws-modal-success').style.display = '';
        setTimeout(() => {
          modal.classList.remove('ws-open');
        }, 3000);
      } catch (_) {
        alert('送信に失敗しました。もう一度お試しください。');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '送信';
      }
    });
  }

  // --- Init ---
  function init() {
    injectStyles();
    const elements = createDOM();
    initChat(elements);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
