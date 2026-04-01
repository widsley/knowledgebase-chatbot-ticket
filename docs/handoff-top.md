# ヘルプセンタートップページ実装仕様書
## Claude Code 引き継ぎドキュメント

---

## 1. 概要

Comdesk・Uninote それぞれのヘルプセンタートップページを Cloud Run 上に実装する。
記事ページはGitBookに任せ、トップページのみ自前で構築する。

---

## 2. ドメイン構成

| サービス | トップページ | 記事ページ |
|---------|------------|----------|
| Comdesk | `help.comdesk.com/` → Cloud Run | `help.comdesk.com/docs/*` → GitBook |
| Uninote | `help.uninote.ai/` → Cloud Run | `help.uninote.ai/docs/*` → GitBook |

### ルーティング（Cloud Runで処理）

```
GET /          → トップページHTML を返す
GET /docs/*    → GitBookにリバースプロキシ（307リダイレクト）
```

---

## 3. リポジトリ

```
https://github.com/widsley/knowledgebase-chatbot-ticket.git
```

**追加するファイル構成：**

```
knowledgebase-chatbot-ticket/
├── widget/
│   ├── comdesk-widget.js
│   └── uninote-widget.js
│
├── api/                          # 既存（チャット・チケット作成API）
│   ├── main.py
│   ├── routers/
│   │   ├── chat.py
│   │   └── contact.py
│   ├── requirements.txt
│   └── Dockerfile
│
└── top/                          # ★今回追加（トップページ）
    ├── main.py                   # FastAPI（トップページ + リバースプロキシ）
    ├── templates/
    │   ├── comdesk.html          # Comdesk用トップページ
    │   └── uninote.html          # Uninote用トップページ
    ├── requirements.txt
    └── Dockerfile
```

> `api/` と `top/` は別々の Cloud Run サービスとしてデプロイする。

---

## 4. トップページ デザイン仕様

### 参考

- **ヘルプセンター（移行元）**：https://comdesklead.zendesk.com/hc/ja
- **サービスサイト**：https://comdesk.com
- **ブランドカラー**：ティール `#00BCD4`、オレンジ `#F97316`、白

### セクション構成

```
① ヒーロー
   - ティールのグラデーション背景
   - ロゴ + タイトル「Comdesk Lead サポートへようこそ」
   - サブテキスト
   - 検索バー（→ GitBookの検索ページにリダイレクト）

② ナレッジベース（カテゴリカード 3列×2行）
   - リリースノート・お知らせ
   - はじめてガイド
   - 機能一覧
   - ハードウェアについて
   - トラブルシューティング
   - 製品・プランについて

③ ピックアップ記事（左）＋ よく見られている記事（右）
   - 記事リストは手動更新（HTMLに直書き）
   - リンク先はGitBookの記事URL

④ お問い合わせ（3列カード）
   - チャット：widget.js のボタンを開く
   - 電話：03-6327-2771 / 平日10:00〜19:00
   - フォーム：（リンクは後で設定）
```

### Uninote用との違い

| 項目 | Comdesk | Uninote |
|------|---------|---------|
| ブランドカラー | `#00BCD4`（ティール） | `#7c3aed`（パープル） |
| タイトル | Comdesk Lead サポート | Uninote サポート |
| カテゴリ | Comdesk用 | Uninote用（未定・プレースホルダーでOK） |
| widget | comdesk-widget.js | uninote-widget.js |
| GitBook URL | help.comdesk.com/docs | help.uninote.ai/docs |

---

## 5. 技術仕様

### フレームワーク

```
Python + FastAPI + Jinja2テンプレート
（api/ と同じ構成で作ること）
```

### widget.js の読み込み

```html
<!-- トップページのHTMLに埋め込む -->
<script src="https://cdn.jsdelivr.net/gh/widsley/knowledgebase-chatbot-ticket@main/widget/comdesk-widget.js"></script>
```

widget.js はチャットボタン（右下FAB）を自動的にレンダリングする。
「チャットで相談」カードのクリックでウィジェットを開く動作も実装すること。

### GitBookへのリダイレクト

```python
# /docs/* へのリクエストはGitBookにリダイレクト
@app.get("/docs/{path:path}")
async def redirect_to_gitbook(path: str):
    return RedirectResponse(
        url=f"https://widsley.gitbook.io/comdesk/{path}",
        status_code=307
    )
```

> GitBookの実際のURLはデプロイ後に確定させる。

### 検索バー

```javascript
// 検索バーのsubmitでGitBookの検索ページへ遷移
function doSearch(query) {
  window.location.href = `/docs/search?q=${encodeURIComponent(query)}`;
}
```

---

## 6. 環境変数（Cloud Run に設定）

```bash
# サービス識別（comdesk or uninote）
SERVICE_ID=comdesk

# GitBookのベースURL（リダイレクト先）
GITBOOK_BASE_URL=https://widsley.gitbook.io/comdesk
```

---

## 7. デプロイ

### Comdesk用

```bash
cd top

gcloud run deploy comdesk-helpcenter-top \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "SERVICE_ID=comdesk,GITBOOK_BASE_URL=https://widsley.gitbook.io/comdesk"
```

### Uninote用

```bash
gcloud run deploy uninote-helpcenter-top \
  --source . \
  --region asia-northeast1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "SERVICE_ID=uninote,GITBOOK_BASE_URL=https://widsley.gitbook.io/uninote"
```

### デプロイ後のDNS設定

| ドメイン | CNAMEレコード変更先 |
|---------|------------------|
| `help.comdesk.com` | Cloud Runのカスタムドメイン（現在はGitBookを向いている） |
| `help.uninote.ai` | Cloud Runのカスタムドメイン（現在はGitBookを向いている） |

---

## 8. 実装上の注意点

1. **シンプルに作ること**：Jinja2テンプレートで完結させる。ReactやVueは不要

2. **レスポンシブ対応**：スマートフォンでも崩れないCSSにすること（モバイルからのアクセスが多い）

3. **widget.jsはまだ未完成**：トップページのHTML内でscriptタグを読み込む実装はするが、widget.jsの中身は `api/` 側のタスクで別途実装される。先にトップページのHTMLを完成させてよい

4. **ピックアップ記事は手動管理**：HTMLテンプレートに直書きでOK。将来的にGitBook APIで自動取得する拡張の余地を残しておく（コメントアウトで構造だけ書いておく）

5. **GitBookのURLは仮置き**：リダイレクト先URLは環境変数で管理するため、現時点では仮のURLでよい

---

## 9. 参考リンク

- FastAPI + Jinja2：https://fastapi.tiangolo.com/advanced/templates/
- Google Cloud Run：https://cloud.google.com/run/docs
- jsDelivr：https://www.jsdelivr.com/github
