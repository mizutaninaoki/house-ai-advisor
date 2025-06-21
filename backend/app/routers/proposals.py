import os
import json
import random
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import google.generativeai as genai
from threading import Lock

from app.db import crud, schemas
from app.db.session import get_db

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

# ===== AI提案生成機能 (旧proposal.py) =====

class ProposalRequest(BaseModel):
    project_id: str
    issues: List[Dict[str, Any]]
    estate_data: Optional[Dict[str, Any]] = None
    user_preferences: Optional[Dict[str, Any]] = None

class ComparisonRequest(BaseModel):
    proposals: List[Dict[str, Any]]
    criteria: Optional[List[str]] = None

@router.post("/ai/generate", summary="論点に基づいた提案生成", tags=["AI Proposals"])
async def generate_proposals(request: ProposalRequest, user_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    抽出された論点に基づいて遺産分割の提案を生成します。
    
    - **request**: プロジェクト情報、論点、不動産データ、ユーザー選好
    
    返却値:
    - **proposals**: 生成された提案のリスト
    - **recommendation**: 最も推奨される提案ID
    """
    try:
        print(f"Gemini API ({GEMINI_MODEL}) を使用して提案生成を実行します")
        project_id = request.project_id
        issues = request.issues
        estate_data = request.estate_data or {}
        user_preferences = request.user_preferences or {}
        issues_text = "\n".join([
            f"論点{i+1}: {issue.get('title', 'タイトルなし')} - {issue.get('description', '説明なし')} "
            f"(合意度: {issue.get('agreement_score', 0)}%)"
            for i, issue in enumerate(issues)
        ])
        estate_text = "不動産データ: "
        if estate_data:
            estate_items = []
            for k, v in estate_data.items():
                estate_items.append(f"{k}: {v}")
            estate_text += ", ".join(estate_items)
        else:
            estate_text += "詳細なデータなし"
        preferences_text = "ユーザー選好: "
        if user_preferences:
            pref_items = []
            for k, v in user_preferences.items():
                pref_items.append(f"{k}: {v}")
            preferences_text += ", ".join(pref_items)
        else:
            preferences_text += "詳細な選好なし"
        prompt = f"""
あなたは遺産相続の専門家AIアシスタントです。以下の論点と情報に基づいて、最適な遺産分割の提案を**絶対に1〜3件だけ**生成し、JSONフォーマットで結果を返してください。

プロジェクトID: {project_id}

論点情報:
{issues_text}

{estate_text}

{preferences_text}

以下の情報を含む遺産分割の提案を**必ず1〜3件だけ**生成してください。**3件を超えてはいけません。4件以上は絶対に生成しないでください。**
1. id: 一意の識別子（例："proposal_1"）
2. title: 提案の短いタイトル
3. description: 提案の詳細説明
4. points: 提案のメリット・デメリット等を示すポイントのリスト（各ポイントはtype（merit, demerit, cost, effortなど）とcontentを含む）
5. support_rate: 想定される支持率（0〜100の整数）

また、最も推奨される提案のIDも特定してください。

**必ずsupport_rate（賛同率）が高い順に並べて返してください。**

レスポンスは必ず以下のJSON形式で返してください（**3件まで。4件以上は絶対にNG**）：
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
    }}
    // 追加する場合も最大2件まで。**絶対に3件を超えないこと！**
  ],
  "recommendation": "最も推奨される提案のID"
}}

遺産相続において公平性と各人の事情を考慮した提案をしてください。特に合意度が低い論点に対して有効な解決策を提示するよう心がけてください。
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
                if "proposals" not in result or "recommendation" not in result:
                    raise ValueError("APIレスポンスに必要なフィールドがありません")
                # support_rate降順でソートし、最大3件に制限
                result["proposals"] = sorted(result["proposals"], key=lambda p: p.get("support_rate", 0), reverse=True)[:3]
                # 生成された提案をDBに保存
                saved_proposals = []
                for p in result["proposals"]:
                    db_proposal = crud.create_proposal(db, schemas.ProposalCreate(
                        project_id=int(project_id),
                        title=p["title"],
                        content=p["description"],
                        is_favorite=False,
                        support_rate=p.get("support_rate", 0.0),
                        user_id=user_id  # 提案を生成したユーザーのIDを設定
                    ))
                    # ポイントも保存
                    for point in p.get("points", []):
                        crud.create_proposal_point(db, schemas.ProposalPointCreate(
                            proposal_id=db_proposal.id,
                            type=point["type"],
                            content=point["content"]
                        ))
                    saved_proposals.append(db_proposal)
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

@router.post("/ai/compare", summary="複数提案の比較", tags=["AI Proposals"])
async def compare_proposals(request: ComparisonRequest):
    """
    複数の提案を比較分析します。
    
    - **request**: 比較する提案のリストと比較基準
    
    返却値:
    - **comparison**: 各提案の比較結果
    - **recommendation**: 比較結果に基づく推奨案
    """
    try:
        print(f"Gemini API ({GEMINI_MODEL}) を使用して提案比較を実行します")
        proposals = request.proposals
        criteria = request.criteria or ["公平性", "手続きの容易さ", "現金化", "不動産維持"]
        proposals_text = "\n\n".join([
            f"提案ID: {prop.get('id', 'unknown')}\n"
            f"タイトル: {prop.get('title', '')}\n"
            f"説明: {prop.get('description', '')}\n"
            f"ポイント: {', '.join([point.get('content', '') for point in prop.get('points', [])])}"
            for prop in proposals
        ])
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
                if "comparison" not in result or "recommendation" not in result:
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

# ===== データベース提案管理機能 (旧proposals_db.py) =====

@router.post("/", response_model=schemas.Proposal, tags=["DB Proposals"])
def create_proposal(proposal: schemas.ProposalCreate, db: Session = Depends(get_db)):
    """新しい提案を作成する"""
    return crud.create_proposal(db=db, proposal=proposal)

@router.get("/", response_model=List[schemas.Proposal], tags=["DB Proposals"])
def read_proposals(project_id: Optional[int] = None, user_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """提案一覧を取得する（プロジェクトIDとユーザーIDによるフィルタリング可能）"""
    proposals = crud.get_proposals(db, project_id=project_id, user_id=user_id, skip=skip, limit=limit)
    return proposals

@router.get("/{proposal_id}", response_model=schemas.Proposal, tags=["DB Proposals"])
def read_proposal(proposal_id: int, db: Session = Depends(get_db)):
    """特定の提案を取得する"""
    db_proposal = crud.get_proposal(db, proposal_id=proposal_id)
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="提案が見つかりません")
    return db_proposal

@router.put("/{proposal_id}", response_model=schemas.Proposal, tags=["DB Proposals"])
def update_proposal(proposal_id: int, proposal_data: dict, db: Session = Depends(get_db)):
    """提案を更新する"""
    db_proposal = crud.update_proposal(db, proposal_id=proposal_id, proposal_data=proposal_data)
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="提案が見つかりません")
    return db_proposal

@router.put("/{proposal_id}/favorite", response_model=schemas.Proposal, tags=["DB Proposals"])
def toggle_favorite(proposal_id: int, db: Session = Depends(get_db)):
    """提案のお気に入り状態を切り替える"""
    db_proposal = crud.get_proposal(db, proposal_id=proposal_id)
    if db_proposal is None:
        raise HTTPException(status_code=404, detail="提案が見つかりません")
    
    # お気に入り状態を反転
    update_data = {"is_favorite": not db_proposal.is_favorite}
    return crud.update_proposal(db, proposal_id=proposal_id, proposal_data=update_data)

@router.delete("/{proposal_id}", response_model=bool, tags=["DB Proposals"])
def delete_proposal(proposal_id: int, db: Session = Depends(get_db)):
    """提案を削除する"""
    success = crud.delete_proposal(db, proposal_id=proposal_id)
    if not success:
        raise HTTPException(status_code=404, detail="提案が見つかりません")
    return success

# ===== 提案ポイント（ProposalPoint）API =====
@router.get("/{proposal_id}/points", response_model=List[schemas.ProposalPoint], tags=["DB ProposalPoints"])
def get_proposal_points(proposal_id: int, db: Session = Depends(get_db)):
    """指定した提案のポイント一覧を取得"""
    return crud.get_proposal_points(db, proposal_id=proposal_id)

@router.post("/{proposal_id}/points", response_model=schemas.ProposalPoint, tags=["DB ProposalPoints"])
def create_proposal_point(proposal_id: int, point: schemas.ProposalPointCreate, db: Session = Depends(get_db)):
    """提案にポイントを追加"""
    if point.proposal_id != proposal_id:
        raise HTTPException(status_code=400, detail="proposal_idが一致しません")
    return crud.create_proposal_point(db, point=point)

@router.put("/points/{point_id}", response_model=schemas.ProposalPoint, tags=["DB ProposalPoints"])
def update_proposal_point(point_id: int, point_data: dict, db: Session = Depends(get_db)):
    """ポイントを更新"""
    db_point = crud.update_proposal_point(db, point_id=point_id, point_data=point_data)
    if db_point is None:
        raise HTTPException(status_code=404, detail="ポイントが見つかりません")
    return db_point

@router.delete("/points/{point_id}", response_model=bool, tags=["DB ProposalPoints"])
def delete_proposal_point(point_id: int, db: Session = Depends(get_db)):
    """ポイントを削除"""
    success = crud.delete_proposal_point(db, point_id=point_id)
    if not success:
        raise HTTPException(status_code=404, detail="ポイントが見つかりません")
    return success 
