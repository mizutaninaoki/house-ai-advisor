import os
import io
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse
from typing import BinaryIO, Dict, Any, Optional
from google.cloud import speech
from google.cloud.speech import RecognitionConfig, RecognitionAudio

router = APIRouter()

# 音声設定の取得
AUDIO_SAMPLE_RATE = int(os.getenv("AUDIO_SAMPLE_RATE", "48000"))
AUDIO_ENCODING = os.getenv("AUDIO_ENCODING", "WEBM_OPUS")
SPEECH_LANGUAGE_CODE = os.getenv("SPEECH_TO_TEXT_LANGUAGE_CODE", "ja-JP")

# Speech-to-Textクライアントの初期化
try:
    speech_client = speech.SpeechClient()
    print("Google Cloud Speech-to-Text クライアントの初期化に成功しました")
except Exception as e:
    print(f"Speech-to-Textクライアントの初期化に失敗しました: {str(e)}")
    raise

@router.post("/transcribe", summary="音声をテキストに変換")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    アップロードされた音声ファイルをテキストに変換します。
    
    - **file**: 音声ファイル（WAV, MP3, OGG, WebM形式）
    
    返却値:
    - **text**: 変換されたテキスト
    - **confidence**: 変換の信頼度（0.0〜1.0）
    """
    try:
        # ファイル形式のチェック
        if file.content_type is None or not file.content_type.startswith('audio/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="音声ファイルのみアップロード可能です。"
            )
        print("Google Cloud Speech-to-Text APIを使用して文字起こしを実行します")
        result = await _real_transcribe(file.file, SPEECH_LANGUAGE_CODE)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=result
        )
    except Exception as e:
        print(f"文字起こし処理中にエラーが発生しました: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文字起こし処理中にエラーが発生しました: {str(e)}"
        )

async def _real_transcribe(audio_file: BinaryIO, language_code: str) -> Dict[str, Any]:
    """Google Cloud Speech-to-Textを使用した実装"""
    try:
        # ファイルのコンテンツを読み込む
        content = audio_file.read()
        content_size = len(content)
        print(f"音声データを受信しました。サイズ: {content_size}バイト")
        if content_size == 0:
            return {
                "text": "音声データが空です。録音が正しく行われているか確認してください。",
                "confidence": 0.0,
                "error": "Empty audio content"
            }
        audio = RecognitionAudio(content=content)
        encoding_map = {
            "LINEAR16": RecognitionConfig.AudioEncoding.LINEAR16,
            "FLAC": RecognitionConfig.AudioEncoding.FLAC,
            "MP3": RecognitionConfig.AudioEncoding.MP3,
            "WEBM_OPUS": RecognitionConfig.AudioEncoding.WEBM_OPUS,
            "OGG_OPUS": RecognitionConfig.AudioEncoding.OGG_OPUS
        }
        encoding = encoding_map.get(
            AUDIO_ENCODING, 
            RecognitionConfig.AudioEncoding.WEBM_OPUS
        )
        config = RecognitionConfig(
            encoding=encoding,  
            sample_rate_hertz=AUDIO_SAMPLE_RATE,
            language_code=language_code,
            enable_automatic_punctuation=True,  # 句読点を自動で追加
            model="latest_long",  # 最新の長時間認識モデル
        )
        print(f"Google Cloud Speech-to-Text APIにリクエストを送信します (言語: {language_code}, エンコーディング: {AUDIO_ENCODING}, サンプルレート: {AUDIO_SAMPLE_RATE}Hz)")
        response = speech_client.recognize(config=config, audio=audio)
        transcript = ""
        confidence = 0.0
        if not response.results:
            print("認識結果が空です")
            return {
                "text": "音声を認識できませんでした。もう一度試すか、別の音声ファイルをお試しください。",
                "confidence": 0.0
            }
        for result in response.results:
            transcript += result.alternatives[0].transcript
            confidence = max(confidence, result.alternatives[0].confidence)
        print(f"文字起こし完了: {transcript[:30]}... (信頼度: {confidence})")
        return {
            "text": transcript,
            "confidence": confidence
        }
    except Exception as e:
        print(f"Speech-to-Text処理中にエラーが発生しました: {str(e)}")
        return {
            "text": f"音声認識中にエラーが発生しました: {str(e)}",
            "confidence": 0.0,
            "error": str(e)
        } 
