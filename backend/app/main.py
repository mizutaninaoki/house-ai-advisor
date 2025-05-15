from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

from app.routers import speech, analysis, proposal

app = FastAPI(
    title="おうちのAI相談室",
    description="音声処理、感情分析、論点抽出、提案生成のためのAPI",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins="*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターの登録
app.include_router(speech.router, prefix="/api/speech", tags=["Speech"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(proposal.router, prefix="/api/proposals", tags=["Proposals"])

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "おうちのAI相談室へようこそ！"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 
