"""AI analyzer to extract mental health methods and effects from posts."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from openai import OpenAI


@dataclass
class ExtractedMethod:
    """Extracted mental health method from a post."""
    
    method_slug: str  # Normalized method name (e.g., "ssri", "morning-walk")
    method_display_name: str  # Display name (e.g., "SSRI再開", "朝散歩")
    action_text: str  # What the user did (e.g., "低用量SSRI再開")
    effect_text: str  # The result (e.g., "二週間で睡眠が戻った")
    effect_label: str  # positive | negative | neutral | unknown
    sentiment_score: float  # 0.0 to 1.0
    confidence: float  # Extraction confidence (0.0 to 1.0)
    spam_flag: bool  # True if likely spam/affiliate
    raw_response: Dict[str, Any]  # Full LLM response


class MethodAnalyzer:
    """Extract mental health methods and effects using OpenAI."""
    
    SYSTEM_PROMPT = """あなたはメンタルヘルスの体験談から「実践した方法」と「その効果」を抽出する専門家です。

以下のルールに従って、ユーザーの投稿から情報を抽出してください：

1. **method_slug**: 方法の正規化されたID（英数字とハイフン、小文字）
   例: "ssri", "morning-walk", "caffeine-free", "meditation"

2. **method_display_name**: 表示用の方法名（日本語OK）
   例: "SSRI再開", "朝散歩", "カフェイン断ち", "瞑想"

3. **action_text**: ユーザーが実際に行った行動
   例: "低用量SSRI再開", "午前中の散歩と日光浴", "コーヒーを完全にやめた"

4. **effect_text**: その結果として得られた効果
   例: "二週間で睡眠が戻った", "午前中の希死念慮が薄れた", "動悸と不安が落ち着いた"

5. **effect_label**: 効果の評価
   - "positive": 改善した、良くなった、救われた
   - "negative": 悪化した、副作用が出た
   - "neutral": 変化なし、まだわからない
   - "unknown": 判定不能

6. **sentiment_score**: 0.0（非常にネガティブ）〜 1.0（非常にポジティブ）

7. **confidence**: 抽出の確信度（0.0〜1.0）
   - 0.9+: 明確に記述されている
   - 0.7-0.9: やや曖昧だが推測可能
   - 0.5-0.7: 不確実
   - 0.5未満: 情報不足

8. **spam_flag**: スパム・アフィリエイトの判定
   - true: 商品リンク、アフィリエイト、広告、宣伝
   - false: 個人の体験談

出力はJSON形式で、複数の方法がある場合は配列で返してください。"""

    USER_PROMPT_TEMPLATE = """以下の投稿から、メンタルヘルスの方法と効果を抽出してください：

```
{content}
```

JSON形式で出力（複数ある場合は配列）：
{{
  "methods": [
    {{
      "method_slug": "method-id",
      "method_display_name": "表示名",
      "action_text": "実際の行動",
      "effect_text": "得られた効果",
      "effect_label": "positive|negative|neutral|unknown",
      "sentiment_score": 0.85,
      "confidence": 0.9,
      "spam_flag": false
    }}
  ]
}}"""

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        """Initialize analyzer with OpenAI API key."""
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.version = "1.0.0"

    def analyze(self, content: str) -> List[ExtractedMethod]:
        """Analyze a post and extract methods."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": self.USER_PROMPT_TEMPLATE.format(content=content)}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
            )
            
            raw_text = response.choices[0].message.content
            if not raw_text:
                return []
            
            data = json.loads(raw_text)
            methods = data.get("methods", [])
            
            return [
                ExtractedMethod(
                    method_slug=m["method_slug"],
                    method_display_name=m["method_display_name"],
                    action_text=m["action_text"],
                    effect_text=m["effect_text"],
                    effect_label=m["effect_label"],
                    sentiment_score=float(m["sentiment_score"]),
                    confidence=float(m.get("confidence", 0.8)),
                    spam_flag=bool(m.get("spam_flag", False)),
                    raw_response=m,
                )
                for m in methods
            ]
            
        except Exception as e:
            print(f"Error analyzing content: {e}")
            return []

    def analyze_batch(self, posts: List[Dict[str, Any]]) -> Dict[str, List[ExtractedMethod]]:
        """Analyze multiple posts and return results keyed by post ID."""
        results = {}
        for post in posts:
            post_id = post.get("id") or post.get("platform_id")
            content = post.get("content", "")
            if content:
                results[post_id] = self.analyze(content)
        return results
