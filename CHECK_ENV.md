# 環境変数の確認と修正

## 問題

現在、2つの異なるSupabaseプロジェクトURLが混在しています：
- `veklxmosegqkjtvjbksd` - データが入っているプロジェクト
- `qppndhghygomdxiljgox` - 新しいプロジェクト（テーブルなし）

## 解決方法

### オプション1: veklxmosegqkjtvjbksd を使用（推奨）

このプロジェクトにはすでに以下のデータが入っています：
- 9件のraw_posts（mockデータ）
- 5件のmethod_events（AI分析結果）
- 3件のmethod_stats（集計済みリーダーボード）

**手順：**

1. `backend/.env` を編集：
```bash
SUPABASE_URL=https://veklxmosegqkjtvjbksd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<veklxmosegqkjtvjbksd のservice role key>
SUPABASE_ANON_KEY=<veklxmosegqkjtvjbksd のanon key>
```

2. `frontend/.env.local` を編集：
```bash
NEXT_PUBLIC_SUPABASE_URL=https://veklxmosegqkjtvjbksd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<veklxmosegqkjtvjbksd のanon key>
```

3. Supabaseダッシュボードで `veklxmosegqkjtvjbksd` プロジェクトを開き、API keysを確認

### オプション2: qppndhghygomdxiljgox を使用

新しいプロジェクトを使う場合は、以下を再実行：

1. Supabase SQL Editorで `supabase/schema-simple.sql` を実行
2. スキーマキャッシュをリロード（Project Settings → Restart project）
3. テストデータを挿入（前回のSQL INSERTステートメントを再実行）
4. AI分析とmethod_eventsの挿入を再実行
5. 集計SQLを実行

## 確認コマンド

どちらのプロジェクトを使用しているか確認：
```bash
cd backend
../.venv/bin/python scripts/check_tables.py
```

成功すれば、全テーブルに "EXISTS" が表示されます。
