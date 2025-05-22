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
# 使用するGeminiモデル名
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-preview-04-17")

# Gemini APIの初期化
lock = Lock()
try:
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
        print(f"Gemini APIの初期化に成功しました (モデル: {GEMINI_MODEL})")
    else:
        print("Gemini APIキーが設定されていません")
        raise RuntimeError("Gemini APIキーが設定されていません")
except Exception as e:
    print(f"Gemini APIの初期化に失敗しました: {str(e)}")
    raise

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
        print("Gemini APIを使用して感情分析を実行します")
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
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```", 1)[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
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
        print("Gemini APIを使用して論点抽出を実行します")
        conversation_text = "\n".join([
            f"発言者{'（ユーザー）' if msg.get('is_user', False) else ''}: {msg.get('text', '')}"
            for msg in messages
        ])
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
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```", 1)[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
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
        print("Gemini APIを使用して論点合意度の評価を実行します")
        updates_text = "\n".join([
            f"論点ID: {update.issue_id}, 新しい合意度: {update.agreement_score}%"
            for update in updates
        ])
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
            model = genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            result_text = response.text.strip()
            try:
                if "```json" in result_text:
                    json_str = result_text.split("```json")[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                elif "```" in result_text:
                    json_str = result_text.split("```", 1)[1].split("```", 1)[0].strip()
                    result = json.loads(json_str)
                else:
                    result = json.loads(result_text)
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
