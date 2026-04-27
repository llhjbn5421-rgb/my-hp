/* =============================================
   server.js — Claude API プロキシサーバー
   Vercel/ローカル両対応版
   環境変数: ANTHROPIC_API_KEY
   ============================================= */

import dotenv from 'dotenv';
dotenv.config({ override: true });

import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

/* ESM で __dirname を再現 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Anthropic クライアント初期化 */
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/* Express アプリ初期化 */
const app = express();
const PORT = process.env.PORT || 3000;

/* ─── ミドルウェア ─────────────────────────── */
app.use(express.json());

/* CORS — file:// や別オリジンから /api/chat を叩けるようにする */
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* 静的ファイル（index.html / css / js）を配信 */
app.use(express.static(__dirname));

/* ルート "/" に来たら index.html を返す */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ─── システムプロンプト ──────────────────── */
const SYSTEM_PROMPT = `あなたは「テスト太郎 AI」のサポートアシスタントです。
以下の自社情報をもとに、お客様の質問に丁寧かつ正確にお答えください。
情報にない内容は「詳しくはお問い合わせください」と案内し、憶測で回答しないでください。

━━━━━━━━━━━━━━━━━━━━━━
【サービス名】
テスト太郎AI

【サービス内容】
1. LLMソリューション開発 — RAG・エージェント・カスタムモデルの構築
2. AIシステム構築 — 業務自動化・予測分析・画像認識など
3. MLOps基盤整備 — CI/CDパイプライン・モデル監視・デプロイ自動化
4. データ分析基盤 — データレイク・BIダッシュボード・リアルタイム分析

【料金】
1. ライトプラン　月額：150,000円〜
2. スタンダード　月額：400,000円〜
3. エンタープライズ　月額：要相談（お問い合わせください）

【営業時間・連絡先】
営業時間：10:00〜17:00
電話番号：000-0000-0000
メールアドレス：aiagent@yahoo.com

【よくある質問と回答】
※ここにQ&Aを追記してください（例↓）
Q: 開発期間はどのくらいですか？
A: 規模によって1ヶ月〜6ヶ月程度です。要件定義後に詳細スケジュールをご提案します。

Q: 対応している技術スタックを教えてください。
A: Python / PyTorch / TensorFlow / LLM（Claude・GPT・Gemini）/ MLOps / RAG / AWS・GCP・Azure など幅広く対応しております。
━━━━━━━━━━━━━━━━━━━━━━

【回答のルール】
- 日本語で丁寧かつ簡潔に回答する
- 上記の自社情報に基づいて回答する。情報にないことは憶測で答えない
- 料金・詳細仕様など未記載の情報は「お問い合わせフォームよりご相談ください」と案内する
- 会社と無関係な話題（政治・宗教・競合他社の批判など）は穏やかに断る
- 回答は2〜4文程度にまとめ、読みやすくする`;

/* ─── POST /api/chat ─────────────────────── */
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages は空にできません' });
  }

  /* SSE ヘッダーを設定 */
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        sendEvent({ type: 'delta', text: chunk.delta.text });
      }
    }

    sendEvent({ type: 'done' });
    res.end();
  } catch (err) {
    console.error('[Claude API Error]', err);
    sendEvent({
      type: 'error',
      message: 'AI との通信に失敗しました。しばらくしてから再度お試しください。',
    });
    res.end();
  }
});

/* ─── ローカル用: 直接 node server.js で起動したときだけ listen ── */
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`✅ サーバー起動: http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn(
        '⚠️  ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。'
      );
    }
  });
}

/* ─── Vercel 用: アプリをエクスポート ───────────────────────── */
export default app;
