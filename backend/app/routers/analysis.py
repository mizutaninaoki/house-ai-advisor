import os
import json
from fastapi import APIRouter, Body, HTTPException, status
from fastapi.responses import JSONResponse
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import google.generativeai as genai
from threading import Lock

router = APIRouter()

# 環境変数からGemini APIキーを取得
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
API_MODE = os.getenv("API_MODE", "mock").lower()
USE_MOCK = API_MODE == "mock"

# 使用するGeminiモデル名
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")

# Gemini APIの初期化
lock = Lock()
try:
    if not USE_MOCK and GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        print(f"Gemini APIの初期化に成功しました (モデル: {GEMINI_MODEL})")
    else:
        print("モックモードで動作します")
except Exception as e:
    print(f"Gemini APIの初期化に失敗しました: {str(e)}")
    USE_MOCK = True
    print("モックモードに切り替えました")

class TextInput(BaseModel):
    text: str
    user_id: Optional[str] = None
    context: Optional[str] = None

class ConversationInput(BaseModel):
    messages: List[Dict[str, Any]]
    project_id: Optional[str] = None

class IssueUpdate(BaseModel):
    issue_id: str
    agreement_score: int

@router.post("/sentiment", summary="テキストの感情分析")
async def analyze_sentiment(input_data: TextInput):
    """
    テキストの感情を分析し、ポジティブ/ネガティブのスコアを返します。
    
    - **input_data**: 分析するテキストとコンテキスト情報
    
    返却値:
    - **sentiment_score**: 感情スコア（0.0〜1.0、1.0が最もポジティブ）
    - **is_positive**: ポジティブな感情かどうか
    - **keywords**: 感情に関連するキーワード
    """
    try:
        text = input_data.text
        context = input_data.context or "遺産相続に関する会話"
        
        if USE_MOCK or not GEMINI_API_KEY:
            print("モックモードで感情分析を実行します")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=_mock_sentiment_analysis(text)
            )
        
        print("Gemini APIを使用して感情分析を実行します")
        
        # Gemini APIを使用した感情分析
        prompt = f"""
あなたは感情分析AIアシスタントです。以下のテキストの感情を分析し、JSONフォーマットで結果を返してください。

コンテキスト: {context}
テキスト: {text}

1. sentiment_score: 0.0（非常にネガティブ）から1.0（非常にポジティブ）までの数値
2. is_positive: trueまたはfalseのブール値（0.5より大きければtrue）
3. keywords: 抽出された感情キーワードのリスト（各キーワードの種類（positiveまたはnegative）も含める）

レスポンスは必ず以下のJSON形式で返してください：
{{
  "sentiment_score": 数値（0.0〜1.0）,
  "is_positive": ブール値（trueまたはfalse）,
  "keywords": [
    {{ "word": "キーワード1", "type": "positive" }},
    {{ "word": "キーワード2", "type": "negative" }}
  ]
}}

説明などは不要です。JSONのみを返してください。
"""
        
        with lock:
            # Geminiモデルを使用
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            
            # レスポンステキストからJSONを抽出
            result_text = response.text.strip()
            
            # JSON文字列を解析
            try:
                # コードブロック内のJSONを抽出する可能性がある場合
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
                
                # 結果の検証
                if "sentiment_score" not in result or "is_positive" not in result or "keywords" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=result
                )
            except json.JSONDecodeError as e:
                print(f"JSONパースエラー: {e}, テキスト: {result_text}")
                raise ValueError(f"APIレスポンスをJSONにパースできませんでした: {result_text}")
        
    except Exception as e:
        print(f"感情分析中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"感情分析中にエラーが発生しました: {str(e)}"
        )

@router.post("/issues", summary="会話から論点を抽出")
async def extract_issues(input_data: ConversationInput):
    """
    会話のメッセージから主要な論点を抽出します。
    
    - **input_data**: 会話メッセージとプロジェクト情報
    
    返却値:
    - **issues**: 抽出された論点のリスト
    - **agreement_scores**: 各論点の合意度スコア
    """
    try:
        messages = input_data.messages
        project_id = input_data.project_id
        
        if USE_MOCK or not GEMINI_API_KEY:
            print("モックモードで論点抽出を実行します")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=_mock_issue_extraction()
            )
        
        print("Gemini APIを使用して論点抽出を実行します")
        
        # 会話テキストを連結
        conversation_text = "\n".join([
            f"発言者{'（ユーザー）' if msg.get('is_user', False) else ''}: {msg.get('text', '')}"
            for msg in messages
        ])
        
        # Gemini APIを使用した論点抽出
        prompt = f"""
あなたは遺産相続に関する論点抽出AIアシスタントです。以下の会話から遺産相続に関する主要な論点を抽出し、JSONフォーマットで結果を返してください。

会話:
{conversation_text}

各論点について、以下の情報を抽出してください：
1. id: 一意の識別子（例："issue_1"）
2. title: 論点の短いタイトル
3. description: 論点の詳細説明
4. agreement_score: 会話から判断される合意度（0〜100の整数、高いほど合意度が高い）
5. related_messages: この論点に関連するメッセージのインデックス（0から始まる）

レスポンスは必ず以下のJSON形式で返してください：
{{
  "issues": [
    {{
      "id": "issue_1",
      "title": "論点のタイトル",
      "description": "論点の詳細説明",
      "agreement_score": 合意度（0〜100の整数）,
      "related_messages": [0, 2, 5]
    }},
    // 他の論点...
  ],
  "total_issues_count": 論点の総数
}}

プロジェクトID: {project_id or "なし"}

抽出する論点数は2〜5個程度が理想的です。
遺産相続において重要な論点に焦点を当ててください（例：不動産の扱い、預金の分割、相続税の負担など）。
説明などは不要です。JSONのみを返してください。
"""
        
        with lock:
            # Geminiモデルを使用
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            
            # レスポンステキストからJSONを抽出
            result_text = response.text.strip()
            
            # JSON文字列を解析
            try:
                # コードブロック内のJSONを抽出する可能性がある場合
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
                
                # 結果の検証
                if "issues" not in result or "total_issues_count" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=result
                )
            except json.JSONDecodeError as e:
                print(f"JSONパースエラー: {e}, テキスト: {result_text}")
                raise ValueError(f"APIレスポンスをJSONにパースできませんでした: {result_text}")
        
    except Exception as e:
        print(f"論点抽出中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"論点抽出中にエラーが発生しました: {str(e)}"
        )

@router.put("/issues/status", summary="論点の合意度を更新")
async def update_issue_status(updates: List[IssueUpdate]):
    """
    特定の論点の合意度スコアを更新します。
    
    - **updates**: 更新する論点IDと合意度スコアのリスト
    
    返却値:
    - **success**: 更新が成功したかどうか
    - **updated_issues**: 更新された論点のリスト
    """
    try:
        if USE_MOCK or not GEMINI_API_KEY:
            print("モックモードで論点合意度更新を実行します")
            # モック処理
            updated_issues = []
            for update in updates:
                updated_issues.append({
                    "id": update.issue_id,
                    "agreement_score": update.agreement_score,
                    "updated": True
                })
            
            response = {
                "success": True,
                "updated_issues": updated_issues
            }
            
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=response
            )
        
        print("Gemini APIを使用して論点合意度の評価を実行します")
        
        # 更新データを整形
        updates_text = "\n".join([
            f"論点ID: {update.issue_id}, 新しい合意度: {update.agreement_score}%"
            for update in updates
        ])
        
        # Gemini APIを使用した合意度の評価
        prompt = f"""
あなたは遺産相続の専門家AIアシスタントです。以下の論点の合意度更新リクエストを評価し、JSONフォーマットで結果を返してください。

合意度更新リクエスト:
{updates_text}

各更新リクエストについて、以下の情報を評価してください：
1. id: 論点ID（入力と同じ）
2. agreement_score: 新しい合意度スコア（入力と同じ）
3. updated: 更新が適切かどうかのブール値（trueまたはfalse）
4. comment: 更新に関するコメント（任意）

レスポンスは必ず以下のJSON形式で返してください：
{{
  "success": true,
  "updated_issues": [
    {{
      "id": "issue_1",
      "agreement_score": 75,
      "updated": true,
      "comment": "合意度の更新は妥当です"
    }},
    // 他の更新...
  ]
}}

合意度スコアは0〜100の範囲内であることを確認し、極端な変更（例：20%から90%への急激な変化）には注意してください。
説明などは不要です。JSONのみを返してください。
"""
        
        with lock:
            # Geminiモデルを使用
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            
            # レスポンステキストからJSONを抽出
            result_text = response.text.strip()
            
            # JSON文字列を解析
            try:
                # コードブロック内のJSONを抽出する可能性がある場合
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
                
                # 結果の検証
                if "success" not in result or "updated_issues" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=result
                )
            except json.JSONDecodeError as e:
                print(f"JSONパースエラー: {e}, テキスト: {result_text}")
                raise ValueError(f"APIレスポンスをJSONにパースできませんでした: {result_text}")
    except Exception as e:
        print(f"論点更新中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"論点更新中にエラーが発生しました: {str(e)}"
        )

def _mock_sentiment_analysis(text: str) -> Dict[str, Any]:
    """モックの感情分析処理（LLMベース）"""
    # テキストの内容を評価（実際にはLLMを使用）
    # ここではより洗練されたルールベースの処理を実装
    
    # 遺産分割における典型的なシナリオに対応するルール
    
    # 強い否定を示す可能性がある表現
    strong_negative_patterns = [
        "絶対に", "断固", "拒否", "100%", "全部", "すべて自分", "全て自分", 
        "譲れない", "渡さない", "認めない", "する気はない", "する気はありません"
    ]
    
    # 比較的否定的な表現
    negative_patterns = [
        "反対", "嫌", "不満", "不公平", "不平等", "不当", "不快", "不安", 
        "困る", "迷惑", "損", "怒り", "憤り", "悔しい"
    ]
    
    # 要求や条件を示す表現
    requirement_patterns = [
        "必要", "絶対条件", "譲れない条件", "必ず", "しなければならない", 
        "要求", "条件", "ベき"
    ]
    
    # 妥協や譲歩を示す表現
    compromise_patterns = [
        "妥協", "譲歩", "調整", "検討", "相談", "考慮", "折り合い", 
        "調和", "協力", "柔軟", "理解"
    ]
    
    # ポジティブな感情や合意を示す表現
    positive_patterns = [
        "賛成", "同意", "納得", "了承", "合意", "満足", "嬉しい", 
        "感謝", "ありがとう", "良い", "適切", "公平", "公正"
    ]
    
    # 否定表現と肯定表現の文脈分析
    negative_context = False
    for pattern in strong_negative_patterns:
        if pattern in text:
            if "相続" in text or "遺産" in text or "財産" in text:
                # 強い否定表現が相続関連のコンテキストで使われている
                if "100%" in text or "全部" in text or "すべて" in text or "全て" in text:
                    # 特に強い独占的主張
                    return {
                        "sentiment_score": 0.15,
                        "is_positive": False,
                        "keywords": [
                            {"word": "強い拒否", "type": "negative"},
                            {"word": "独占的主張", "type": "negative"}
                        ]
                    }
                return {
                    "sentiment_score": 0.2,
                    "is_positive": False,
                    "keywords": [
                        {"word": "強い拒否", "type": "negative"},
                        {"word": pattern, "type": "negative"}
                    ]
                }
    
    # 通常の否定表現の検出
    negative_count = sum(1 for pattern in negative_patterns if pattern in text)
    requirement_count = sum(1 for pattern in requirement_patterns if pattern in text)
    compromise_count = sum(1 for pattern in compromise_patterns if pattern in text)
    positive_count = sum(1 for pattern in positive_patterns if pattern in text)
    
    # 総合評価
    total_score = 0.5  # デフォルトは中立
    
    # 各カテゴリのパターン検出に重み付け
    score_delta = 0
    if negative_count > 0:
        score_delta -= 0.15 * negative_count
    if requirement_count > 0:
        score_delta -= 0.1 * requirement_count
    if compromise_count > 0:
        score_delta += 0.1 * compromise_count
    if positive_count > 0:
        score_delta += 0.15 * positive_count
    
    # 最終スコア計算（0.0〜1.0の範囲に収める）
    total_score = max(0.1, min(0.9, 0.5 + score_delta))
    
    # 検出されたキーワードを収集
    keywords = []
    if negative_count > 0:
        for pattern in negative_patterns:
            if pattern in text:
                keywords.append({"word": pattern, "type": "negative"})
    if requirement_count > 0:
        for pattern in requirement_patterns:
            if pattern in text:
                keywords.append({"word": pattern, "type": "negative"})
    if compromise_count > 0:
        for pattern in compromise_patterns:
            if pattern in text:
                keywords.append({"word": pattern, "type": "positive"})
    if positive_count > 0:
        for pattern in positive_patterns:
            if pattern in text:
                keywords.append({"word": pattern, "type": "positive"})
    
    # 「私は絶対に遺産を他の人にする気はありません。自分が100% 相続すると思っています。」のような
    # 特定のフレーズを検出するための特別ケース
    if ("遺産" in text and "他の人" in text and ("する気はありません" in text or "する気はない" in text)) or \
       ("100%" in text and "相続" in text) or \
       ("相続" in text and "すべて自分" in text) or \
       ("相続" in text and "全て自分" in text):
        return {
            "sentiment_score": 0.15,
            "is_positive": False,
            "keywords": [
                {"word": "遺産独占", "type": "negative"},
                {"word": "強い拒否", "type": "negative"}
            ]
        }
    
    return {
        "sentiment_score": total_score,
        "is_positive": total_score > 0.5,
        "keywords": keywords
    }

def _mock_issue_extraction() -> Dict[str, Any]:
    """モックの論点抽出処理"""
    # 遺産相続の典型的な論点
    mock_issues = [
        {
            "id": "issue_1",
            "title": "実家の扱い",
            "description": "実家を売却するか、家族が住み続けるか",
            "agreement_score": 40,
            "related_messages": [0, 2, 5]
        },
        {
            "id": "issue_2",
            "title": "預金の分割方法",
            "description": "均等に分けるか、必要性に応じて分けるか",
            "agreement_score": 75,
            "related_messages": [1, 4]
        },
        {
            "id": "issue_3",
            "title": "相続税の負担",
            "description": "誰がどのように負担するか",
            "agreement_score": 20,
            "related_messages": [3]
        }
    ]
    
    return {
        "issues": mock_issues,
        "total_issues_count": len(mock_issues)
    } 
