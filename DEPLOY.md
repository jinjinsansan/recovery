# デプロイガイド

## Vercelにフロントエンドをデプロイ

### 1. Vercelにログイン

https://vercel.com にアクセスしてログイン（GitHubアカウントで連携）

### 2. 新規プロジェクト作成

1. **"Add New..." → "Project"** をクリック
2. GitHubリポジトリを選択: **jinjinsansan/recovery**
3. **"Import"** をクリック

### 3. プロジェクト設定

#### Configure Project

- **Framework Preset**: Next.js
- **Root Directory**: `frontend` （※重要！）
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

#### 環境変数の設定

**Environment Variables** セクションで以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL=https://qppndhghygomdxiljgox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabaseのanon key>
```

### 4. デプロイ

**"Deploy"** ボタンをクリック

デプロイが完了すると、URLが表示されます（例：`https://recovery-xxx.vercel.app`）

---

## Supabase CORS設定（重要）

Vercelからのアクセスを許可するため、Supabaseで設定が必要な場合があります：

1. Supabaseダッシュボード → **Project Settings** → **API**
2. **"API Settings"** セクションの **"Site URL"** を確認
3. 必要に応じて、Vercelのデプロイ完了後のURLを追加

---

## トラブルシューティング

### エラー: "Error: Failed to connect to Supabase"

**原因**: Supabase REST APIが404を返している

**解決方法**:
1. Supabaseダッシュボード → **Project Settings** → **General**
2. 一番下の **"Pause project"** → 確認 → 数秒待つ → **"Resume project"**
3. 2〜3分待ってからVercelで再デプロイ（**"Redeploy"** ボタン）

### エラー: "Build failed"

**原因**: frontendディレクトリが正しく設定されていない

**解決方法**:
1. Vercel Project Settings → **General**
2. **"Root Directory"** を `frontend` に設定
3. **Save** → 再デプロイ

---

## デプロイ後の確認

✅ リーダーボードが表示される
✅ 3つの方法が表示される（SSRI再開、カフェイン断ち、高照度ライト）
✅ 各方法をクリックすると詳細ページが表示される
✅ ユーザー体験談が表示される

---

## 次のステップ

- [ ] カスタムドメイン設定
- [ ] バックエンド定期実行の設定（GitHub Actions / Render cron）
- [ ] X API実データ収集の実装
- [ ] モニタリング設定
