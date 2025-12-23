import asyncio
from fastapi import FastAPI
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime

# アプリケーションの状態管理（簡易DB）
# 本番環境ではPostgreSQLなどを使用しますが、プロトタイプではメモリまたはJSONファイルを使用します
collected_data = []

# --- 1. Watcher (監視ボット) ---
async def watch_target_accounts():
    """
    定期的に実行されるタスク。
    設定されたアカウントリストやキーワードを監視し、新しい投稿を取得します。
    """
    print(f"[{datetime.now()}] Watcher: Checking for new posts...")
    
    # デモ用のダミーデータ生成（ランダム性を持たせる）
    import random
    
    topics = [
        ("うつ病は甘えではなく脳の機能障害です。薬物療法と休養が大切。", "Evidence-Based"),
        ("断薬こそが唯一の治療法！薬は毒です！", "Misinformation"),
        ("今日は天気が良くて気分がいい。散歩してきた。", "Neutral"),
        ("認知行動療法を始めてから、少しずつ考え方の癖が変わってきた気がする。", "Evidence-Based"),
        ("波動水でチャクラを整えれば全ての精神疾患は完治します。", "Misinformation")
    ]
    
    # 30%の確率で新しい投稿があったとする
    if random.random() > 0.3:
        content, _ = random.choice(topics)
        new_post = {
            "id": str(int(datetime.now().timestamp())),
            "user": f"@User_{random.randint(1000, 9999)}",
            "content": content,
            "timestamp": datetime.now()
        }
        await judge_content(new_post)

# --- 2. Judge (裁判官ボット) ---
async def judge_content(post):
    """
    取得した投稿を医療エビデンスと照合し、判定します。
    """
    print(f"[{datetime.now()}] Judge: Analyzing post by {post['user']}...")
    
    # judgeモジュールを使用
    from judge import judge
    analysis = await judge.evaluate(post["content"])

    result = {
        **post,
        "analysis": {
            "score": analysis["score"],
            "label": analysis["label"],
            "rationale": analysis["rationale"],
            "analyzed_at": datetime.now()
        }
    }
    
    # 最新50件のみ保持
    collected_data.insert(0, result)
    if len(collected_data) > 50:
        collected_data.pop()
        
    print(f"  -> Result: {analysis['label']} (Score: {analysis['score']})")

# --- Scheduler Setup ---
scheduler = AsyncIOScheduler()
# 10秒ごとに監視を実行（デモ用）
scheduler.add_job(watch_target_accounts, 'interval', seconds=10)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 起動時にスケジューラーを開始
    scheduler.start()
    yield
    # 終了時にスケジューラーを停止
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"status": "Mental Insight System is Running", "watcher_status": "Active"}

@app.get("/feed")
def get_feed():
    """フロントエンド用のAPI: 解析済みデータを返します"""
    # 最新順にソートして返す
    return sorted(collected_data, key=lambda x: x["timestamp"], reverse=True)
