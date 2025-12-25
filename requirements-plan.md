# Mental Collective Intelligence (仮) 要件定義・計画書

## 1. 要件定義

### 1.1 ビジョンと目的
- X (旧Twitter) 上のメンタルヘルス当事者コミュニティから「○○で症状が良くなった」という生の証言をリアルタイムで収集し、再現性の高い方法を可視化して信頼できる意思決定材料を提供する。

### 1.2 対象ユーザー
- うつ・不安障害などで苦しむ当事者やその家族 / 支援者。
- 現場の声を知りたいメンタルヘルス支援団体、当事者研究コミュニティ。

### 1.3 「真実」の定義
- 権威あるガイドラインではなく、同じメソッドで改善したと報告するユーザーの頻度・一貫性をもって信頼度を測定する。

### 1.4 技術スタックとデータソース
- **フロントエンド**: Vercel 上の Next.js (App Router)。ISR + Supabase JS クライアントでランキング取得。
- **データプラットフォーム**: Supabase (PostgreSQL + Storage + Edge Functions + Auth/RLS)。Posts/Methods/Stats を中心に設計。
- **収集・分析**: Render 常駐の FastAPI サービス（Watcher/Analyzer） + Supabase Edge Function (集計バッチ) のハイブリッド。
- **データ取得**: **note のタグ検索/RSS を主要ソース**として日本語の当事者体験記を定期収集。代表キーワード: 「うつ 治った」「パニック 改善」「不眠 克服」など。補助的に X / Mastodon など他SNSを追加できる設計を維持。
- PoC では note からタグ別に 10〜20件/日 程度の長文記事を取得し、Render 上のデータ収集ジョブ経由で Supabase に蓄積。将来的には収集間隔を短縮して準リアルタイム更新を目指す。

### 1.5 機能要件
1. **定期収集 (note)**: Watcher が note タグ検索/RSS を巡回し新着記事を取得。1日1〜2回のクロールで十分な件数を確保。
2. **AI 抽出**: LLM で Action (方法) / Effect (結果) / Spam 判定を JSON 形式で抽出。
3. **正規化**: メソッド名の揺れ (例: ナイアシンアミド=ビタミンB3) を統一する辞書・正規化ルール。
4. **スパム/アフィリエイト検知**: 商材リンク・BOT などをスコアリングし除外。
5. **集計・スコアリング**: メソッドごとに肯定/否定件数、期間別指標、信頼度メトリクスを更新。
6. **UI 提供**: Leaderboard、メソッド詳細、検索/フィルタ、エビデンス投稿引用の表示。

- 収集→Supabase→Vercel への反映遅延は note 収集間隔（最短1時間）+ ISR 更新以内を目標。速報性よりも安定した長文データ供給を重視。
- 24/7 自動稼働を Render のヘルスチェックと Supabase Edge Functions のリトライで担保。
- Secrets・API キーは Supabase/Vercel/Render の環境変数管理を徹底。PII を扱わず X の引用ポリシーを遵守。

### 1.8 アーキテクチャ概要
1. **Watcher (Render)**: APScheduler で X キーワード検索 → Supabase `raw_posts` テーブルにバルク挿入。
2. **Analyzer (Render or Supabase Edge Function)**: LLM 抽出・正規化・スパムスコア → `method_events` や `methods` 集計を更新。
3. **Supabase**: RLS 付き PostgreSQL。`raw_posts` / `method_events` / `method_stats` / `method_synonyms` テーブル、Storage に引用キャプチャ。
4. **Frontend (Vercel)**: ISR/SSG でランキングを表示、必要に応じて Supabase Edge Function を API Route 経由で呼び出し。
5. **Monitoring**: Supabase の Log Drain + Render の metrics を活用し、スパム漏れ・LLM スコアを Datadog 等でアラート化。

### 1.7 成功指標 (KPI)
- メソッドごとの「肯定証言」件数 / 期間あたりの更新頻度。
- スパム検出の精度 (手動サンプリングで 90% 以上)。
- ユーザー滞在時間、再訪率などの利用指標。

## 2. フェーズ別計画

### フェーズ 1: 検証とプロトタイプ (PoC)
1. **データ収集テスト**: キーワード検索で 100〜500 件の投稿を取得し、取得精度と速度を確認。
2. **AI 抽出精度検証**: GPT-4o / Claude 3.5 で Action・Effect・Spam の 3 項目抽出を評価、評価指標/テンプレートを作成。
3. **正規化ロジック構築**: メソッド辞書、同義語マッピング、形態素ベースの正規化ルールを作成。

### フェーズ 2: 基盤開発 (Supabase + Render)
4. **Supabase スキーマ定義**: `raw_posts` / `method_events` / `method_stats` / `method_synonyms` を SQL で設計、RLS・index・マテビューを整備。Storage バケット(引用キャプチャ)も作成。
5. **Render Watcher サービス**: FastAPI + APScheduler で定期収集、取得データを Supabase REST もしくは pg client 経由で書き込み。Render cron ジョブ設定・ヘルスチェック導入。
6. **Analyzer / Aggregator**: Render サービスまたは Supabase Edge Function で LLM 推論・正規化・スパム除外・集計更新を行う。LLM 呼び出しキーは Render 側の secrets で管理。

### フェーズ 3: ユーザーインターフェース (Vercel)
7. **ランキング表示**: Next.js App Router + Supabase JS クライアントで `method_stats` を取得。期間別フィルタは Edge Function 経由でサーバーフィルタ。
8. **詳細分析ページ**: Supabase Vector/JSONB を活用し、肯定/否定比率、トレンド折れ線、引用ツイートを SSR or ISR で描画。Storage のキャプチャ画像を参照。
9. **検索・フィルタ**: Supabase の全文検索 (pg_trgm) や RPC で症状/方法検索、Vercel Edge Middleware でロケール最適化。

### フェーズ 4: 公開と運用 (Vercel + Supabase + Render)
10. **デプロイ**: Render (backend) + Vercel (frontend) + Supabase (DB) の本番環境を IaC メモ + 手順化。Vercel Git インテグレーション、Supabase プロジェクト設定、Render の autoscaling/cron をセット。
11. **モニタリング/改善**: Supabase Log/Edge Function Metrics + Render 健康チェック + Vercel Analytics を統合。スパム検出/LLM 精度を定期レビューし、Synonym 辞書やプロンプトを Supabase 管理画面から更新可能にする。

## 3. note 収集への切り替え計画（ステップバイステップ）

1. **要件整理とタグ定義**
   - note で追跡するタグ／キーワード（例: `うつ`, `パニック`, `不眠`）を確定。
   - 記事本文の引用範囲・著作権表記ポリシーをドキュメント化。

2. **Collector 実装**
   - `backend/collectors/note_scraper.py` を追加し、タグ検索ページ or RSS をスクレイピング。
   - User-Agent やアクセス間隔を設定し、1タグごとに 10 件程度を取得。
   - 記事 ID を `platform_id`, URL を `url`, 冒頭 300〜500文字を `content` に格納。

3. **CLI/Watcher 統合**
   - `backend/scripts/collect_samples.py` に `--mode note` を追加し、Collector を切り替えられるようにする。
   - Render 常駐タスク（Watcher）にも note Collector を組み込み、APScheduler で1〜2時間ごとに実行。

4. **Supabase への保存**
   - `ingestion_source="note_scraper"` として `raw_posts` に投入。
   - メタデータに `{"tag": "うつ"}` のようなタグ情報を保持し、後続のフィルタリングに活用。

5. **Analyzer/集計の調整**
   - 長文コンテンツ向けに LLM プロンプトを微調整（例: 記事冒頭だけ渡す／要約してから抽出）。
   - `method_events` / `method_stats` の更新フローは既存の集計SQLを再利用。

6. **UI の表記更新**
   - フロントエンドに “情報源: note” を表示し、X と混在する場合はフィルタを追加。
   - ISR 再生成トリガーは note 収集ジョブ完了時に Webhook で通知し、最新ランキングに反映。

7. **運用・モニタリング**
   - note 側のHTML構造変更を検知するアラート（解析失敗時に Slack/メール通知）を用意。
   - 取得件数・失敗率・LLM コストをダッシュボード化し、月次でチューニング。
