import os
import json
from openai import OpenAI
from datetime import datetime

# 環境変数からAPIキーを取得（実際には .env ファイルなどで設定）
# client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

class EvidenceJudge:
    def __init__(self):
        # 実際の運用ではここでAPIクライアントを初期化します
        pass

    async def evaluate(self, text: str):
        """
        投稿テキストを受け取り、医学的妥当性を評価して返します。
        """
        
        # 判定用プロンプトの定義
        system_prompt = """
        あなたは精神医学・臨床心理学の専門知識を持つファクトチェッカーです。
        ユーザーから提供されるテキスト（SNSの投稿）を分析し、以下の基準で評価してください。

        1. **Classification (分類):**
           - Evidence-Based: 医学的ガイドラインや研究論文と一致する。
           - Experiential: 個人の体験談（「私はこれで良くなった」）。嘘ではないが、一般化できる医学的助言ではない。
           - Controversial: 専門家の間でも意見が分かれる、または証拠が不十分。
           - Misinformation: 医学的知見と明確に矛盾する、または有害な可能性がある。
           - Neutral: 医学的な主張を含まない。

        2. **Score (信頼性スコア):**
           0〜100の整数。
           - 80-100: 信頼できる情報源に基づく、または標準治療と一致。
           - 40-79: 個人の体験としては妥当、または一部不正確だが有害ではない。
           - 0-39: 科学的根拠がない、または有害なデマ。

        3. **Rationale (判定理由):**
           一般ユーザーにもわかるように、なぜその判定になったかを2-3文で解説してください。
           可能であれば、参照すべきガイドライン（例：厚労省、APA、NICEガイドラインなど）に言及してください。

        出力は必ずJSON形式にしてください。
        """

        # 本来はここで AI API を呼び出します。
        # 今回はデモ用のダミーレスポンスを返します（構造を示すため）。
        # 実際にAPIキーがあれば、ここのコメントアウトを外して実装します。
        
        # 簡易キーワード判定によるダミーロジック（開発用）
        text_lower = text.lower()
        if "治る" in text_lower and ("波動" in text_lower or "霊" in text_lower or "毒" in text_lower):
            return {
                "score": 10,
                "label": "Misinformation",
                "rationale": "科学的根拠のない概念（波動、霊など）を用いた治療主張は医学的に認められていません。適切な医療機関への相談を推奨します。"
            }
        elif "ssri" in text_lower or "認知行動療法" in text_lower or "休養" in text_lower:
            return {
                "score": 90,
                "label": "Evidence-Based",
                "rationale": "言及されている治療法（薬物療法、心理療法、休養）は、うつ病等の治療ガイドラインで推奨される標準的なアプローチと一致しています。"
            }
        else:
             return {
                "score": 50,
                "label": "Experiential/Neutral",
                "rationale": "具体的な医学的主張が含まれていないか、個人の体験談の範囲です。医学的な助言として受け取る際は注意が必要です。"
            }

judge = EvidenceJudge()
