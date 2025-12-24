# セッション引き継ぎメモ

**日時**: 2025-12-24  
**プロジェクト**: Mental Collective Intelligence (recovery)  
**デプロイURL**: https://recovery-sable.vercel.app/  
**GitHubリポジトリ**: https://github.com/jinjinsansan/recovery

---

## 📊 現在の状況

### ✅ 完了したこと

1. **Supabaseデータベース構築**
   - プロジェクトID: `qppndhghygomdxiljgox`
   - スキーマ: `raw_posts`, `method_events`, `method_stats`, `method_synonyms` テーブル作成済み
   - スキーマファイル: `supabase/schema-simple.sql`

2. **テストデータ投入**
   - 9件のraw_posts（mockデータ）
   - 5件のmethod_events（AI分析済み）
   - 3件のmethod_stats（集計済み）
   - **重要**: Supabase Table EditorではデータがすべてSQL経由で正常に見えている

3. **AI分析機能**
   - OpenAI GPT-4o-miniで方法抽出
   - `backend/analyzer.py`実装完了
   - `backend/scripts/analyze_posts.py`でテスト成功

4. **フロントエンド実装**
   - Next.js 16.1.1 + TypeScript + Tailwind CSS
   - リーダーボードページ: `frontend/app/page.tsx`
   - 方法詳細ページ: `frontend/app/method/[slug]/page.tsx`
   - Supabaseクライアント: `frontend/lib/supabase.ts`

5. **Vercelデプロイ成功**
   - URL: https://recovery-sable.vercel.app/
   - ビルド成功（TypeScriptエラー修正済み）
   - 環境変数設定済み

---

## ⚠️ 既知の問題

### PostgREST API 404エラー（最重要）

**症状**:
- Supabase Table Editorではデータが見える
- REST API経由（`/rest/v1/raw_posts`）でアクセスすると404が返る
- Pythonスクリプト `backend/scripts/check_tables.py` で確認可能

**原因**:
- PostgRESTのスキーマキャッシュが更新されていない

**解決方法（未実施）**:
1. Supabaseダッシュボード → Project Settings → General
2. "Pause project" → 確認 → "Resume project"
3. 2〜3分待つ
4. Vercel → Deployments → 最新デプロイの "Redeploy"

**確認コマンド**:
```bash
cd /mnt/e/dev/Cusor/tape2/mental-insight
.venv/bin/python backend/scripts/check_tables.py
```
成功すると全テーブルに "✓ EXISTS" が表示される。

---

## 🔐 環境変数

### Supabase情報

**プロジェクト**: `qppndhghygomdxiljgox`

- `SUPABASE_URL`: https://qppndhghygomdxiljgox.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: （backend/.envに保存済み）
- `SUPABASE_ANON_KEY`: （frontend/.env.localとbackend/.envに保存済み）
- `SUPABASE_DB_PASSWORD`: （backend/.envに保存済み）

### OpenAI

- `OPENAI_API_KEY`: （backend/.envに保存済み）

### ファイル場所

- Backend: `/mnt/e/dev/Cusor/tape2/mental-insight/backend/.env`
- Frontend: `/mnt/e/dev/Cusor/tape2/mental-insight/frontend/.env.local`

---

## 📁 プロジェクト構造

```
mental-insight/
├── backend/
│   ├── .env                        # 環境変数（Git除外）
│   ├── analyzer.py                 # AI分析エンジン
│   ├── postgres_client.py          # PostgreSQL直接接続
│   ├── supabase_client.py          # Supabase REST API
│   ├── collectors/
│   │   └── twitter_search.py       # X API収集（未動作）
│   └── scripts/
│       ├── analyze_posts.py        # AI分析テスト
│       ├── check_tables.py         # テーブル存在確認
│       ├── aggregate_stats.sql     # 集計SQL
│       └── generate_insert_sql.py  # SQL INSERT生成
├── frontend/
│   ├── .env.local                  # 環境変数（Git除外）
│   ├── app/
│   │   ├── page.tsx               # リーダーボード
│   │   └── method/[slug]/page.tsx # 方法詳細
│   └── lib/
│       └── supabase.ts            # Supabaseクライアント
├── supabase/
│   ├── schema.sql                 # オリジナルスキーマ
│   └── schema-simple.sql          # 使用中スキーマ
├── SETUP.md                       # セットアップガイド
├── DEPLOY.md                      # デプロイガイド
└── SESSION_SUMMARY.md             # このファイル
```

---

## 🚀 次回の作業（優先順位順）

### 1. PostgREST API問題の解決【最優先】

**目的**: フロントエンドにデータを表示

**手順**:
1. https://recovery-sable.vercel.app/ にアクセス
2. データが表示されているか確認
3. 表示されていない場合:
   - Supabaseプロジェクトを再起動（Pause → Resume）
   - 2〜3分待つ
   - Vercelで再デプロイ
4. 開発者ツール（F12）のNetworkタブで `/rest/v1/method_stats` のレスポンス確認

**確認SQL**（Supabase SQL Editor）:
```sql
NOTIFY pgrst, 'reload schema';
SELECT * FROM method_stats;
```

### 2. カスタムドメイン設定【オプション】

Vercel → Project Settings → Domains

### 3. バックエンド自動化

**目標**: 定期的にX APIからデータ収集 → AI分析 → 集計

**方法**:
- GitHub Actionsで定期実行（cron）
- または Render.com にデプロイしてcron設定

**必要な作業**:
- X API接続問題の解決（現在404エラー）
- `backend/collectors/twitter_search.py` の修正
- または別のデータ収集方法の検討

### 4. データ追加

より多くのmockデータを追加して動作確認:

```bash
cd /mnt/e/dev/Cusor/tape2/mental-insight
.venv/bin/python backend/scripts/generate_insert_sql.py
```

生成されたSQLをSupabase SQL Editorで実行。

---

## 🔍 デバッグコマンド集

### Supabase接続確認
```bash
cd /mnt/e/dev/Cusor/tape2/mental-insight
.venv/bin/python backend/scripts/check_tables.py
```

### AI分析テスト
```bash
.venv/bin/python backend/scripts/analyze_posts.py
```

### フロントエンド型チェック
```bash
cd frontend
npx tsc --noEmit
```

### Git状態確認
```bash
cd /mnt/e/dev/Cusor/tape2/mental-insight
git status
git log --oneline -5
```

---

## 📝 重要な注意事項

1. **X API収集は未動作**
   - `collectors/twitter_search.py` は404エラー
   - 現在はmockデータのみ使用
   - ブラウザからのcURL exportが必要だが未完了

2. **Supabase REST APIのキャッシュ問題**
   - Table Editorではデータが見えるが、REST APIで404
   - プロジェクト再起動が必要
   - これが解決しないとフロントエンドにデータが表示されない

3. **WSL環境でnpm build失敗**
   - Bus errorが発生
   - Vercelでのビルドは成功
   - ローカル開発サーバー起動も問題なし（npm run dev）

4. **環境変数の場所**
   - Backend: `backend/.env`
   - Frontend: `frontend/.env.local`
   - 両方ともGitに含まれていない（.gitignore）

---

## 📞 サポート情報

- **GitHubリポジトリ**: https://github.com/jinjinsansan/recovery
- **Vercel URL**: https://recovery-sable.vercel.app/
- **Supabaseダッシュボード**: https://supabase.com/dashboard/project/qppndhghygomdxiljgox

---

## 🎯 セッション終了時点の最優先タスク

**Webサイトにアクセスしてデータ表示を確認すること。**

もし「まだデータがありません」と表示される場合:
→ Supabaseプロジェクトを再起動してPostgREST APIキャッシュをリフレッシュ

これが解決すれば、基本機能はすべて動作する状態になります。

---

**最終コミット**: 52f94e5  
**最終push**: 2025-12-24 03:28頃  
**Vercelデプロイ**: 成功（Build完了）
