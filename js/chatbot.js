/* =============================================
   chatbot.js — Claude API チャットボット（フロントエンド）
   バックエンド server.js の /api/chat エンドポイントと通信する
   ============================================= */

/* ウェルカムメッセージ */
const WELCOME_MESSAGE = 'こんにちは！テスト太郎 AI のアシスタントです 😊\nサービス内容・料金・技術スタックなど、なんでもお気軽にご質問ください。';

/* よく聞かれる質問のサジェスト（ユーザーが選択しやすいように） */
const SUGGESTED_QUESTIONS = [
  'サービス内容を教えてください',
  '料金はどのくらいですか？',
  '対応技術を教えてください',
  'お問い合わせ方法は？',
];

/* =============================================
   状態管理
   ============================================= */
/* 会話履歴を保持する配列（Claude API に送る messages 形式） */
let conversationHistory = [];
/* AI が応答中かどうかのフラグ（多重送信防止） */
let isResponding = false;

/* =============================================
   DOM 要素の取得
   ============================================= */
const toggleBtn    = document.getElementById('chatbot-toggle');
const panel        = document.getElementById('chatbot-panel');
const closeBtn     = document.querySelector('.chat-close');
const messagesEl   = document.getElementById('chat-messages');
const quickReplies = document.getElementById('chat-quick-replies');
const inputEl      = document.getElementById('chat-input');
const sendBtn      = document.getElementById('chat-send');

/* =============================================
   チャットパネルの開閉
   ============================================= */
toggleBtn.addEventListener('click', () => {
  const isOpen = panel.classList.toggle('open');
  /* 初回開封時のみウェルカムメッセージとサジェストを表示 */
  if (isOpen && messagesEl.children.length === 0) {
    addBotMessage(WELCOME_MESSAGE);
    renderSuggestedQuestions();
  }
  if (isOpen) {
    /* パネルが開いたら入力欄にフォーカス */
    setTimeout(() => inputEl.focus(), 250);
  }
});

closeBtn.addEventListener('click', () => {
  panel.classList.remove('open');
});

/* =============================================
   メッセージを追加する関数
   ============================================= */

/** ユーザーのメッセージをチャットに追加 */
function addUserMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-message user';
  msg.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

/**
 * ボットのメッセージをチャットに追加
 * @returns {HTMLElement} バブル要素（ストリーミング更新用）
 */
function addBotMessage(text = '') {
  const msg = document.createElement('div');
  msg.className = 'chat-message bot';
  msg.innerHTML = `
    <div class="msg-icon">🤖</div>
    <div class="bubble">${formatBotText(text)}</div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
  /* バブル要素を返してストリーミング更新できるようにする */
  return msg.querySelector('.bubble');
}

/** タイピングインジケーターを追加し、ラッパー要素を返す */
function addTypingIndicator() {
  const wrapper = document.createElement('div');
  wrapper.className = 'chat-message bot';
  wrapper.innerHTML = `
    <div class="msg-icon">🤖</div>
    <div class="typing-indicator">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

/* =============================================
   サジェストボタンを描画
   ============================================= */
function renderSuggestedQuestions() {
  quickReplies.innerHTML = '';
  SUGGESTED_QUESTIONS.forEach(q => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = q;
    btn.addEventListener('click', () => {
      if (!isResponding) handleUserInput(q);
    });
    quickReplies.appendChild(btn);
  });
}

/* =============================================
   ユーザー入力処理（テキスト入力 & サジェストクリック共通）
   ============================================= */
async function handleUserInput(text) {
  const trimmed = text.trim();
  if (!trimmed || isResponding) return;

  /* 入力欄・サジェストをリセット */
  inputEl.value = '';
  quickReplies.innerHTML = '';
  updateSendButton(true);
  isResponding = true;

  /* ユーザーメッセージを表示し、履歴に追加 */
  addUserMessage(trimmed);
  conversationHistory.push({ role: 'user', content: trimmed });

  /* タイピングインジケーターを表示 */
  const indicator = addTypingIndicator();

  try {
    /* バックエンド /api/chat に SSE リクエストを送信
       絶対 URL を使うことで file:// で開いた場合でも正しく接続できる */
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    /* タイピングインジケーターを削除し、空のボットバブルを追加 */
    indicator.remove();
    const bubble = addBotMessage('');

    /* SSE ストリームを読み込み、テキストをリアルタイム表示 */
    let fullText = '';
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      /* SSE の "data: {...}\n\n" 形式をパース */
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); /* 未完了の行をバッファに残す */

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));

          if (event.type === 'delta') {
            fullText += event.text;
            /* リアルタイムでバブルを更新 */
            bubble.innerHTML = formatBotText(fullText);
            scrollToBottom();

          } else if (event.type === 'done') {
            /* 完了：会話履歴に追加 */
            conversationHistory.push({ role: 'assistant', content: fullText });

          } else if (event.type === 'error') {
            bubble.textContent = event.message;
          }
        } catch {
          /* JSON パース失敗は無視（部分的なチャンクの可能性） */
        }
      }
    }

  } catch (err) {
    console.error('[Chatbot Error]', err);
    indicator.remove();
    addBotMessage('申し訳ありません、通信エラーが発生しました。しばらくしてから再度お試しください。');
  } finally {
    /* 応答完了：送信ボタンを復活させ、サジェストを再表示 */
    isResponding = false;
    updateSendButton(false);
    renderSuggestedQuestions();
    inputEl.focus();
  }
}

/* =============================================
   送信ボタン & Enter キーのイベント
   ============================================= */
sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));

inputEl.addEventListener('keydown', e => {
  /* Enter のみ送信（Shift+Enter は改行しない — 1行入力） */
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleUserInput(inputEl.value);
  }
});

/* =============================================
   ユーティリティ
   ============================================= */

/** メッセージエリアを最下部にスクロール */
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * ボットテキストのフォーマット処理
 * - 改行を <br> に変換
 * - **太字** を <strong> に変換（マークダウン風）
 * - XSS 対策のエスケープを先に行う
 */
function formatBotText(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

/** XSS 対策：HTML 特殊文字をエスケープ */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** 送信ボタンの有効 / 無効を切り替える */
function updateSendButton(disabled) {
  sendBtn.disabled = disabled;
}
