import os
import json
import random
from fastapi import APIRouter, HTTPException, status
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

class ProposalRequest(BaseModel):
    project_id: str
    issues: List[Dict[str, Any]]
    estate_data: Optional[Dict[str, Any]] = None
    user_preferences: Optional[Dict[str, Any]] = None

class ComparisonRequest(BaseModel):
    proposals: List[Dict[str, Any]]
    criteria: Optional[List[str]] = None

@router.post("/generate", summary="論点に基づいた提案生成")
async def generate_proposals(request: ProposalRequest):
    """
    抽出された論点に基づいて遺産分割の提案を生成します。
    
    - **request**: プロジェクト情報、論点、不動産データ、ユーザー選好
    
    返却値:
    - **proposals**: 生成された提案のリスト
    - **recommendation**: 最も推奨される提案ID
    """
    try:
        if USE_MOCK or not GEMINI_API_KEY:
            print("モックモードで提案生成を実行します")
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=_mock_proposal_generation()
            )
        
        print(f"Gemini API ({GEMINI_MODEL}) を使用して提案生成を実行します")
        
        # リクエストデータの整形
        project_id = request.project_id
        issues = request.issues
        estate_data = request.estate_data or {}
        user_preferences = request.user_preferences or {}
        
        # 論点情報をフォーマット
        issues_text = "\n".join([
            f"論点{i+1}: {issue.get('title', 'タイトルなし')} - {issue.get('description', '説明なし')} "
            f"(合意度: {issue.get('agreement_score', 0)}%)"
            for i, issue in enumerate(issues)
        ])
        
        # 不動産データをフォーマット
        estate_text = "不動産データ: "
        if estate_data:
            estate_items = []
            for k, v in estate_data.items():
                estate_items.append(f"{k}: {v}")
            estate_text += ", ".join(estate_items)
        else:
            estate_text += "詳細なデータなし"
        
        # ユーザー選好をフォーマット
        preferences_text = "ユーザー選好: "
        if user_preferences:
            pref_items = []
            for k, v in user_preferences.items():
                pref_items.append(f"{k}: {v}")
            preferences_text += ", ".join(pref_items)
        else:
            preferences_text += "詳細な選好なし"
        
        # Gemini APIを使用した提案生成
        prompt = f"""
あなたは遺産相続の専門家AIアシスタントです。以下の論点と情報に基づいて、最適な遺産分割の提案を複数生成し、JSONフォーマットで結果を返してください。

プロジェクトID: {project_id}

論点情報:
{issues_text}

{estate_text}

{preferences_text}

以下の情報を含む遺産分割の提案を2〜3件生成してください：
1. id: 一意の識別子（例："proposal_1"）
2. title: 提案の短いタイトル
3. description: 提案の詳細説明
4. points: 提案のメリット・デメリット等を示すポイントのリスト（各ポイントはtype（merit, demerit, cost, effortなど）とcontentを含む）
5. support_rate: 想定される支持率（0〜100の整数）

また、最も推奨される提案のIDも特定してください。

レスポンスは必ず以下のJSON形式で返してください：
{{
  "proposals": [
    {{
      "id": "proposal_1",
      "title": "提案のタイトル",
      "description": "提案の詳細説明",
      "points": [
        {{ "type": "merit", "content": "このプランのメリット" }},
        {{ "type": "demerit", "content": "このプランのデメリット" }},
        {{ "type": "cost", "content": "コストに関する考慮点" }},
        {{ "type": "effort", "content": "必要な手続き" }}
      ],
      "support_rate": 支持率（0〜100の整数）
    }},
    // 他の提案...
  ],
  "recommendation": "最も推奨される提案のID"
}}

遺産相続において公平性と各人の事情を考慮した提案をしてください。特に合意度が低い論点に対して有効な解決策を提示するよう心がけてください。
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
                if "proposals" not in result or "recommendation" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=result
                )
            except json.JSONDecodeError as e:
                print(f"JSONパースエラー: {e}, テキスト: {result_text}")
                raise ValueError(f"APIレスポンスをJSONにパースできませんでした: {result_text}")
        
    except Exception as e:
        print(f"提案生成中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提案生成中にエラーが発生しました: {str(e)}"
        )

@router.post("/compare", summary="複数提案の比較")
async def compare_proposals(request: ComparisonRequest):
    """
    複数の提案を比較分析します。
    
    - **request**: 比較する提案のリストと比較基準
    
    返却値:
    - **comparison**: 各提案の比較結果
    - **recommendation**: 比較結果に基づく推奨案
    """
    try:
        if USE_MOCK or not GEMINI_API_KEY:
            print("モックモードで提案比較を実行します")
            criteria = request.criteria or ["公平性", "手続きの容易さ", "現金化", "不動産維持"]
            proposals = request.proposals
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=_mock_proposal_comparison(proposals, criteria)
            )
        
        print(f"Gemini API ({GEMINI_MODEL}) を使用して提案比較を実行します")
        
        # リクエストデータの整形
        proposals = request.proposals
        criteria = request.criteria or ["公平性", "手続きの容易さ", "現金化", "不動産維持"]
        
        # 提案情報をフォーマット
        proposals_text = "\n\n".join([
            f"提案ID: {prop.get('id', 'unknown')}\n"
            f"タイトル: {prop.get('title', '')}\n"
            f"説明: {prop.get('description', '')}\n"
            f"ポイント: {', '.join([point.get('content', '') for point in prop.get('points', [])])}"
            for prop in proposals
        ])
        
        # Gemini APIを使用した提案比較
        prompt = f"""
あなたは遺産相続の専門家AIアシスタントです。以下の複数の遺産分割提案を比較分析し、JSONフォーマットで結果を返してください。

複数の提案:
{proposals_text}

比較基準:
{', '.join(criteria)}

各提案について、各比較基準に対して1〜5のスコアを付けてください（5が最高評価）。
また、総合スコアとそれに基づく最も推奨される提案も特定してください。

レスポンスは必ず以下のJSON形式で返してください：
{{
  "comparison": [
    {{
      "proposal_id": "提案のID",
      "title": "提案のタイトル",
      "scores": {{
        "比較基準1": スコア（1〜5の整数）,
        "比較基準2": スコア（1〜5の整数）,
        ...
      }},
      "total_score": 総合スコア（すべての基準のスコアの合計）
    }},
    // 他の提案...
  ],
  "criteria": [比較基準のリスト],
  "recommendation": "最も推奨される提案のID"
}}

遺産相続の視点から、各提案の長所と短所を批判的に分析し、客観的な評価を行ってください。
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
                if "comparison" not in result or "criteria" not in result or "recommendation" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                
                return JSONResponse(
                    status_code=status.HTTP_200_OK,
                    content=result
                )
            except json.JSONDecodeError as e:
                print(f"JSONパースエラー: {e}, テキスト: {result_text}")
                raise ValueError(f"APIレスポンスをJSONにパースできませんでした: {result_text}")
        
    except Exception as e:
        print(f"提案比較中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"提案比較中にエラーが発生しました: {str(e)}"
        )

def _mock_proposal_generation() -> Dict[str, Any]:
    """モックの提案生成処理"""
    # 遺産相続の典型的な提案
    mock_proposals = [
        {
            "id": "proposal_1",
            "title": "実家は長男が相続し、他の相続人には現金で代償",
            "description": "実家を売却せずに長男が住み続け、その代わりに他の相続人には預貯金から多めに分配する案",
            "points": [
                {"type": "merit", "content": "実家を維持できる"},
                {"type": "merit", "content": "現金を必要とする相続人にはすぐに資金が入る"},
                {"type": "demerit", "content": "不動産評価額の算定が難しい"},
                {"type": "cost", "content": "代償金の用意が必要"}
            ],
            "support_rate": 65
        },
        {
            "id": "proposal_2",
            "title": "実家を売却して全ての資産を現金化後に分割",
            "description": "不動産を売却して現金化し、法定相続分に応じて分割する案",
            "points": [
                {"type": "merit", "content": "分かりやすく公平"},
                {"type": "merit", "content": "全員が現金を受け取れる"},
                {"type": "demerit", "content": "思い出のある実家を手放す必要がある"},
                {"type": "effort", "content": "不動産売却の手続きが必要"}
            ],
            "support_rate": 40
        }
    ]
    
    return {
        "proposals": mock_proposals,
        "recommendation": "proposal_1"
    }

def _mock_proposal_comparison(proposals: List[Dict[str, Any]], criteria: List[str]) -> Dict[str, Any]:
    """モックの提案比較処理"""
    comparison_result = []
    for proposal in proposals:
        scores = {}
        for criterion in criteria:
            # 単純なランダムスコア（実際は提案内容に基づく計算）
            scores[criterion] = random.randint(1, 5)  # 1〜5のスコア
            
        total_score = sum(scores.values())
        comparison_result.append({
            "proposal_id": proposal.get("id", "unknown"),
            "title": proposal.get("title", ""),
            "scores": scores,
            "total_score": total_score
        })
    
    # 最高スコアの提案を推奨
    recommendation = max(comparison_result, key=lambda x: x["total_score"])
    
    return {
        "comparison": comparison_result,
        "criteria": criteria,
        "recommendation": recommendation["proposal_id"]
    } 
