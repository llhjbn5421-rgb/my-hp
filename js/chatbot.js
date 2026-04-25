/* =============================================
   chatbot.js — FAQチャットボット
   ============================================= */

/* FAQデータ：keywords に含まれる単語でマッチング */
const FAQ_DATA = [
  {
    keywords: ['料金', '価格', '費用', 'コスト', 'いくら', '見積'],
    question:  '料金・費用について教えてください',
    answer:    'ご要件の規模により異なります。まずは無料相談からお気軽にお問い合わせください。詳細なお見積りをご提示いたします。',
  },
  {
    keywords: ['納期', '期間', 'いつ', 'どのくらい', 'スケジュール'],
    question:  '開発期間はどのくらいですか？',
    answer:    '規模によって1ヶ月〜6ヶ月程度です。要件定義後に詳細スケジュールをご提案します。まずはご相談ください。',
  },
  {
    keywords: ['技術', '言語', 'スタック', 'python', 'llm', 'ai', '対応'],
    question:  '対応技術スタックを教えてください',
    answer:    'Python / PyTorch / LLM（Claude・GPT・Gemini）/ MLOps / RAG / AWS・GCP など幅広く対応しております。',
  },
  {
    keywords: ['問い合わせ', '連絡', '相談', 'contact', 'メール'],
    question:  'お問い合わせ方法は？',
    answer:    'ページ下部の「お問い合わせ」フォームからご連絡いただけます。24時間以内にご返信いたします。',
  },
  {
    keywords: ['サービス', '何ができる', '何をしている', '業務', '提供'],
    question:  'どんなサービスを提供していますか？',
    answer:    'LLMソリューション開発・AIシステム構築・MLOps基盤整備・データ分析基盤の4つを主力サービスとして提供しています。',
  },
  {
    keywords: ['会社', '設立', '代表', 'テスト太郎', 'プロフィール'],
    question:  '会社・代表について教えてください',
    answer:    '代表の「テスト太郎」はAIエンジニア歴10年以上。機械学習・大規模言語モデルの研究から本番導入まで一気通貫で支援しています。',
  },
];

/* マッチしなかった場合のフォールバック回答 */
const FALLBACK_ANSWER = 'ご質問ありがとうございます。詳しくはページ下部の「お問い合わせ」フォームよりご連絡ください。担当者よりご回答いたします。';

/* ウェルカムメッセージ */
const WELCOME_MESSAGE = 'こんにちは！AIアシスタントです。よくあるご質問に自動でお答えします。下のボタンから選ぶか、自由に入力してください 👇';

/* =============================================
   DOM要素の取得
   ============================================= */
const toggleBtn     = document.getElementById('chatbot-toggle');
const panel         = document.getElementById('chatbot-panel');
const closeBtn      = document.querySelector('.chat-close');
const messagesEl    = document.getElementById('chat-messages');
const quickReplies  = document.getElementById('chat-quick-replies');
const inputEl       = document.getElementById('chat-input');
const sendBtn       = document.getElementById('chat-send');

/* =============================================
   チャットパネルの開閉
   ============================================= */
toggleBtn.addEventListener('click', () => {
  const isOpen = panel.classList.toggle('open');
  /* 初回開封時のみウェルカムメッセージを表示 */
  if (isOpen && messagesEl.children.length === 0) {
    addBotMessage(WELCOME_MESSAGE);
    renderQuickReplies();
  }
});

closeBtn.addEventListener('click', () => {
  panel.classList.remove('open');
});

/* =============================================
   メッセージを追加する関数
   ============================================= */
function addUserMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-message user';
  msg.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

function addBotMessage(text) {
  const msg = document.createElement('div');
  msg.className = 'chat-message bot';
  msg.innerHTML = `
    <div class="msg-icon">🤖</div>
    <div class="bubble">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(msg);
  scrollToBottom();
}

/* タイピングインジケーターを追加し、要素を返す */
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
   クイック返信ボタンを描画
   ============================================= */
function renderQuickReplies() {
  quickReplies.innerHTML = '';
  FAQ_DATA.slice(0, 4).forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'quick-reply-btn';
    btn.textContent = item.question;
    btn.addEventListener('click', () => handleUserInput(item.question));
    quickReplies.appendChild(btn);
  });
}

/* =============================================
   ユーザー入力の処理（テキスト入力 & クイック返信共通）
   ============================================= */
function handleUserInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  /* 入力欄をリセット */
  inputEl.value = '';

  /* クイック返信ボタンを一時的に非表示 */
  quickReplies.innerHTML = '';

  addUserMessage(trimmed);

  /* タイピング中表示 → 回答 */
  const indicator = addTypingIndicator();
  setTimeout(() => {
    indicator.remove();
    const answer = findAnswer(trimmed);
    addBotMessage(answer);
    renderQuickReplies();
  }, 800);
}

/* =============================================
   FAQキーワードマッチング
   ============================================= */
function findAnswer(text) {
  const lower = text.toLowerCase();
  for (const item of FAQ_DATA) {
    if (item.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return item.answer;
    }
  }
  return FALLBACK_ANSWER;
}

/* =============================================
   送信ボタン & Enterキーのイベント
   ============================================= */
sendBtn.addEventListener('click', () => handleUserInput(inputEl.value));

inputEl.addEventListener('keydown', e => {
  /* Shift+Enter は改行として扱わない（1行入力）、Enter のみ送信 */
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleUserInput(inputEl.value);
  }
});

/* =============================================
   ユーティリティ
   ============================================= */

/* メッセージエリアを最下部にスクロール */
function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* XSS対策：HTMLをエスケープ */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
