# Widsley サポートシステム実装仕様書
## Claude Code 引き継ぎドキュメント

---

## 1. プロジェクト概要

株式会社Widsleyの2サービス向けに、AIチャットボット＋チケット管理の顧客サポートシステムを構築する。

### サービス
| サービス名 | 概要 |
|-----------|------|
| **Comdesk** | コンタクトセンター・営業会社向けアウトバウンドCTI |
| **Uninote** | 商談録画＋AI-IVR＋MDMの統合データプラットフォーム（未リリース） |

---

## 2. システム全体構成図

```
┌─────────────────────────────────────────────────────────────────┐
│                        ナレッジ管理フロー                          │
│                                                                   │
│  GitBook（ドキュメント作成・編集）                                  │
│      │ Git Sync（自動）                                            │
│      ▼                                                            │
│  GitHub リポジトリ                                                 │
│  widsley/comdesklead-zendesk-knowledgebase-articles               │
│      │ GitHub Actions（mdファイル変更をトリガー）✅ 実装済み         │
│      ▼                                                            │
│  Dify Cloud（dify.ai）                                            │
│  ├── Comdesk Help ナレッジベース ✅ 同期済み                       │
│  │   Dataset ID: 7f06f34d-5180-476f-942c-5f2123dbcb3d            │
│  └── Uninote Help ナレッジベース ✅ 同期済み                       │
│      Dataset ID: fe1e416c-73cb-42ee-b0b9-fd1c148e658a            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      顧客対応フロー                                │
│                                                                   │
│  顧客                                                             │
│      │ チャットウィジェットで質問                                    │
│      ▼                                                            │
│  widget.js（jsDelivrで配信）                                      │
│  ├── comdesk-widget.js                                           │
│  └── uninote-widget.js                                           │
│      │ Dify Chatbot API を直接呼び出し（SSEストリーミング）          │
│      ▼                                                            │
│  Dify Chatbot（RAG回答）                                          │
│  ├── Comdesk用 Chatbot → Comdesk Help ナレッジを参照              │
│  └── Uninote用 Chatbot → Uninote Help ナレッジを参照              │
│      │                                                            │
│      │ 顧客が「サポートに問い合わせる」ボタンをクリック               │
│      │ モーダルが同一ページ内に開く                                  │
│      │ 名前・メール・内容を入力して送信                              │
│      ▼                                                            │
│  Google Cloud Run（バックエンドAPI）                               │
│  ① Dify APIで会話履歴を取得                                        │
│  ② Plain APIでチケット作成（会話履歴を添付）                         │
│      ▼                                                            │
│  Plain（チケット管理）                                             │
│  ├── Label: Comdesk → Slack #comdesk-support に通知               │
│  └── Label: Uninote → Slack #uninote-support に通知               │
│      ▼                                                            │
│  担当者が有人対応                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      widget.js 設置先                             │
│                                                                   │
│  GitBook（ドキュメントサイト）                                      │
│  └── ❌ GitBookはカスタムJS注入不可のため設置できない                │
│                                                                   │
│  Comdesk プロダクト（Vue / Nuxt）                                  │
│  └── app.vue 等に script タグを1行追加                             │
│                                                                   │
│  Uninote プロダクト（React）                                       │
│  └── index.html 等に script タグを1行追加                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 技術スタック

| 役割 | サービス | 備考 |
|------|---------|------|
| ウィジェット配信 | **jsDelivr + GitHub** | 無料・設定不要・GitHubにpushするだけ |
| バックエンドAPI | **Google Cloud Run** | Dockerコンテナをそのままデプロイ・ほぼ無料 |
| AIチャットボット | **Dify Cloud（Chatbot型）** | RAGで回答するのみ。Chatflow不要 |
| ナレッジベース | **Dify Cloud** | GitBookから自動同期済み |
| チケット管理 | **Plain** | 1 Workspace、Labelで2サービス分離 |
| ドキュメント | **GitBook** | Git SyncでGitHubと連携済み |
| ナレッジ同期 | **GitHub Actions** | mdファイル変更時にDify APIへ自動同期 |
| Slack通知 | **Plain Workflow** | Label別チャンネルに通知 |

---

## 4. リポジトリ

**メインリポジトリ（本タスクの作業場所）：**
```
https://github.com/widsley/knowledgebase-chatbot-ticket.git
```

**ファイル構成：**
```
knowledgebase-chatbot-ticket/
├── widget/
│   ├── comdesk-widget.js     # Comdesk用チャットウィジェット
│   └── uninote-widget.js     # Uninote用チャットウィジェット
│
└── api/                      # Cloud Run バックエンド
    ├── main.py               # FastAPI エントリーポイント
    ├── routers/
    │   ├── chat.py           # Dify APIプロキシ
    │   └── contact.py        # Plainチケット作成
    ├── requirements.txt
    └── Dockerfile
```

**widget.js の配信URL（jsDelivr）：**
```
# Comdesk
https://cdn.jsdelivr.net/gh/widsley/knowledgebase-chatbot-ticket@main/widget/comdesk-widget.js

# Uninote
https://cdn.jsdelivr.net/gh/widsley/knowledgebase-chatbot-ticket@main/widget/uninote-widget.js
```

**設置方法（1行）：**
```html
<!-- Comdesk プロダクト（Vue/Nuxt）に追加 -->
<script src="https://cdn.jsdelivr.net/gh/widsley/knowledgebase-chatbot-ticket@main/widget/comdesk-widget.js"></script>

<!-- Uninote プロダクト（React）に追加 -->
<script src="https://cdn.jsdelivr.net/gh/widsley/knowledgebase-chatbot-ticket@main/widget/uninote-widget.js"></script>
```

> ⚠️ widget.js を更新した場合、jsDelivrのキャッシュ反映に最大7日かかる。
> 即時反映させたい場合はGitHubでバージョンタグ（v1.0.1等）を切り、URLを `@main` → `@v1.0.1` に変更する。

---

## 5. widget.js 仕様

### 機能要件
- 右下に浮かぶチャットボタン（FAB）
- クリックでチャットパネルが開く
- Dify **Chatbot** APIを直接呼び出してSSEストリーミング表示
- チャット内に「サポートに問い合わせる」ボタンを常時表示
- ボタンクリックで問い合わせモーダルが同一ページ内に開く
- モーダル入力項目：名前・メール・問い合わせ内容
- 送信時にCloud Run `/contact` エンドポイントを呼び出す
- `conversation_id` をCloud Runに渡して会話履歴を添付
- `conversation_id` はlocalStorageに保存して会話を継続

### サービスごとの設定変数
```javascript
// comdesk-widget.js
const CONFIG = {
  serviceName: 'Comdesk',
  apiBase: 'https://XXXX-an.a.run.app', // Cloud Run URL（デプロイ後に確定）
  serviceId: 'comdesk',
  primaryColor: '#00BCD4',
  accentColor: '#F97316',
}

// uninote-widget.js
const CONFIG = {
  serviceName: 'Uninote',
  apiBase: 'https://XXXX-an.a.run.app',
  serviceId: 'uninote',
  primaryColor: '#7c3aed',
  accentColor: '#F97316',
}
```

---

## 6. Cloud Run API 仕様

### エンドポイント

#### `POST /chat`
Dify Chatbot APIへのプロキシ（CORS処理のため中継）

**Request:**
```json
{
  "message": "ユーザーの質問",
  "conversation_id": "（2回目以降）",
  "service_id": "comdesk"
}
```
**Response:** DifyのSSEストリーミングをそのままパススルー

---

#### `GET /messages?conversation_id=xxx&service_id=comdesk`
Dify APIで会話履歴を取得

**Response:**
```json
{
  "log": "顧客: xxx\nBot: yyy\n..."
}
```

---

#### `POST /contact`
Plainにチケットを作成

**Request:**
```json
{
  "name": "山田太郎",
  "email": "yamada@example.com",
  "message": "お問い合わせ内容",
  "conversation_id": "dify-conversation-id",
  "service_id": "comdesk"
}
```
**Response:**
```json
{
  "success": true,
  "thread_id": "plain-thread-id"
}
```
```

### デプロイコマンド

```bash
cd api

gcloud run deploy widsley-support-api \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "DIFY_API_KEY_COMDESK=app-xxx,DIFY_API_KEY_UNINOTE=app-xxx,PLAIN_API_KEY=xxx,PLAIN_LABEL_ID_COMDESK=lt_xxx,PLAIN_LABEL_ID_UNINOTE=lt_xxx"
```

---

## 7. 既存の実装済み内容

### GitHub Actions（GitBook → Dify 自動同期）✅
- リポジトリ：`widsley/comdesklead-zendesk-knowledgebase-articles`
- ファイル：`.github/workflows/blank.yml`
- トリガー：mainブランチのmdファイル変更時 + 手動実行
- ステータス：動作確認済み（406ファイル同期完了）

### Dify Cloud ✅
- URL：https://app.dify.ai
- Comdesk Help Dataset ID：`7f06f34d-5180-476f-942c-5f2123dbcb3d`
- Uninote Help Dataset ID：`fe1e416c-73cb-42ee-b0b9-fd1c148e658a`
- **アプリ型：Chatbot**（Chatflowではない）
- ChatbotアプリのApp APIキー：デプロイ前に取得が必要

### Plain ⚠️
- Workspace名：Widsley
- Slack連携：設定済み
- Label「Comdesk」「Uninote」：未作成（要手動作成後にIDを取得）

---

## 8. 未完了タスク一覧

| # | タスク | 方法 |
|---|--------|------|
| 5 | **widget/comdesk-widget.js を実装** | Claude Code |
| 6 | **widget/uninote-widget.js を実装** | Claude Code |
| 7 | **api/ バックエンドAPIを実装（FastAPI + Dockerfile）** | Claude Code |
| 8 | **Google Cloud Run にデプロイ** | Claude Code |
| 9 | widget.js の apiBase を Cloud Run の URL に更新 | Claude Code |
| 10 | GitHubにpush → jsDelivrで配信確認 | Claude Code |
| 11 | Comdesk（Vue/Nuxt）にscriptタグを設置 | 手動 |
| 12 | Uninote（React）にscriptタグを設置 | 手動 |

---

## 9. 実装上の注意点

1. **CORS**：widget.jsはComdesk・Uninote等の外部ドメインから呼ばれるためCloud Run側でCORSヘッダーを全ドメイン許可で設定すること

2. **DifyのApp APIキー**：Knowledge APIキー（`dataset-`始まり）とは別物。ChatbotアプリのOverview画面のAPI Keyから取得する（`app-`始まり）

3. **Dify ChatbotはChatflowではない**：分岐・HTTPリクエストノード等は不要。RAGで回答するだけ。チケット作成ロジックはwidget.js + Cloud Runで処理する

4. **Difyストリーミング**：Dify Chatbot APIはSSE（Server-Sent Events）で返答する。widget.jsでストリーミング表示に対応すること

5. **conversation_id管理**：初回は空で送信し、レスポンスの`conversation_id`をlocalStorageに保存して2回目以降に使用する

6. **widget.jsのサービス分離**：comdesk-widget.jsとuninote-widget.jsはCONFIGオブジェクトの値だけ異なる。共通ロジックは関数化して重複を避ける

7. **jsDelivr キャッシュ**：widget.js更新後に即時反映が必要な場合はGitHubでバージョンタグを切ること

8. **GitBookへの設置は不可**：GitBookはカスタムJS注入を一切サポートしていないため、widget.jsの設置対象外

---

## 10. 参考リンク

- Dify API docs：https://docs.dify.ai
- Plain API docs：https://www.plain.com/docs
- Plain Workflow Actions：https://plain.support.site/article/workflow-actions
- Google Cloud Run docs：https://cloud.google.com/run/docs
- jsDelivr GitHub CDN：https://www.jsdelivr.com/github
