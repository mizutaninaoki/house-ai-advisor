from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# Google AIの初期化
try:
    from app.services.ai_service import initialize_google_ai
    initialize_google_ai()
except Exception as e:
    print(f"Google AIの初期化エラー: {e}")

from app.routers import speech, analysis, proposals, users, projects
from app.db.session import engine
from app.db import models
from app.routers import issues  # 論点APIルーターを追加

# データベースのテーブル作成
# models.Base.metadata.create_all(bind=engine)  # Alembicを使うのでコメントアウト

app = FastAPI(
    title="おうちのAI相談室",
    description="音声処理、感情分析、論点抽出、提案生成のためのAPI",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["Proposals"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(issues.router, prefix="/api/issues", tags=["Issues"])  # 論点APIルーターを登録

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "おうちのAI相談室へようこそ！"}

# ヘルスチェック用エンドポイント
@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 
