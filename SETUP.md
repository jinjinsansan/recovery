# Mental Collective Intelligence - セットアップガイド

## 🎯 プロジェクト概要

X（旧Twitter）からメンタルヘルスの回復体験談をリアルタイムで収集し、AI分析によって効果的な方法をランキング化するプラットフォーム。

## 📋 前提条件

- Python 3.12+
- Node.js 18+
- Supabase アカウント
- OpenAI API キー

## 🚀 セットアップ手順

### 1. リポジトリクローン

```bash
git clone https://github.com/jinjinsansan/recovery.git
cd recovery
```

### 2. Supabaseセットアップ

1. [Supabase](https://supabase.com)でプロジェクト作成
2. SQL Editorで `supabase/schema-simple.sql` を実行
3. Project Settings → API から以下を取得：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

### 3. バックエンドセットアップ

```bash
cd backend

# 仮想環境作成
python3 -m venv ../.venv
source ../.venv/bin/activate  # Windows: ..\.venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# 環境変数設定
cp .env.example .env
# .envファイルを編集して以下を設定：
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - OPENAI_API_KEY
```

### 4. フロントエンドセットアップ

```bash
cd ../frontend

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localファイルを編集して以下を設定：
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 5. 開発サーバー起動

#### フロントエンド（Next.js）

```bash
cd frontend
npm run dev
```

→ http://localhost:3000 でアクセス

#### バックエンド（Python）

```bash
cd backend
../.venv/bin/python scripts/collect_samples.py --mode mock --upload
../.venv/bin/python scripts/analyze_and_save_sql.py
```

## 📊 データフロー

1. **データ収集**: X APIから投稿を収集 → `raw_posts`テーブル
2. **AI分析**: OpenAI GPT-4で方法と効果を抽出 → `method_events`テーブル
3. **集計**: 方法ごとに統計を計算 → `method_stats`テーブル
4. **表示**: Next.jsフロントエンドでリーダーボード表示

## 🧪 テストデータ投入

Supabase SQL Editorで以下を実行してテストデータを投入：

```bash
cd backend
../.venv/bin/python scripts/generate_insert_sql.py
```

生成されたSQLをSupabase SQL Editorにコピペして実行。

## 📁 プロジェクト構造

```
mental-insight/
├── backend/
│   ├── analyzer.py              # AI分析ロジック
│   ├── postgres_client.py       # PostgreSQL直接接続
│   ├── supabase_client.py       # Supabase REST API
│   ├── collectors/              # データ収集
│   └── scripts/                 # ユーティリティスクリプト
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # リーダーボード
│   │   └── method/[slug]/      # 方法詳細ページ
│   └── lib/
│       └── supabase.ts         # Supabaseクライアント
├── supabase/
│   ├── schema.sql              # データベーススキーマ（オリジナル）
│   └── schema-simple.sql       # シンプル版スキーマ
└── requirements-plan.md         # 要件定義書
```

## 🔧 トラブルシューティング

### Supabase接続エラー（404）

```bash
cd backend
../.venv/bin/python scripts/test_supabase.py
```

PostgRESTスキーマキャッシュをリロード：
- Supabaseダッシュボード → Project Settings → API → Restart project

### フロントエンドでデータが表示されない

1. `.env.local`の`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_ANON_KEY`を確認
2. Supabase Table EditorでRLSポリシーが正しく設定されているか確認
3. ブラウザの開発者ツールでネットワークエラーを確認

### npm installがタイムアウト

WSL環境の場合、別のターミナル（PowerShell等）で実行：

```bash
cd frontend
npm cache clean --force
npm install
```

## 📝 次のステップ

- [ ] Render.comにバックエンドデプロイ
- [ ] Vercelにフロントエンドデプロイ
- [ ] X API実データ収集の実装
- [ ] 定期実行の設定（cron/GitHub Actions）

## 🆘 サポート

問題が発生した場合は、GitHubのIssuesで報告してください。
