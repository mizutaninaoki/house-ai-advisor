'use client';

import { useState, useRef, useEffect } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import { transcribeAudio, analyzeSentiment } from '../utils/api';

interface PushToTalkButtonProps {
  onTranscription?: (text: string, sentiment?: number) => void;
  onAudioRecorded?: (audioBlob: Blob) => void;
  className?: string;
}

const PushToTalkButton: React.FC<PushToTalkButtonProps> = ({ 
  onTranscription, 
  onAudioRecorded,
  className = '' 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  useEffect(() => {
    // コンポーネントのマウント時にユーザーのマイクへのアクセスを確認
    const checkMicrophoneAccess = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        console.error('マイクへのアクセスが拒否されました:', error);
        setErrorMessage('マイクへのアクセスが必要です。ブラウザの設定を確認してください。');
      }
    };
    
    checkMicrophoneAccess();
    
    // クリーンアップ関数
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // 録音データの処理
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size > 0) {
          processAudioBlob(audioBlob);
        } else {
          setIsProcessing(false);
          setErrorMessage('録音データが空です。もう一度やり直してください。');
        }
        
        // ストリームのトラックを停止
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('録音開始中にエラーが発生しました:', error);
      setErrorMessage('録音を開始できませんでした。マイクへのアクセスを確認してください。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };
  
  const processAudioBlob = async (audioBlob: Blob) => {
    try {
      // 音声BlobをonAudioRecordedで親コンポーネントに渡す
      if (onAudioRecorded) {
        onAudioRecorded(audioBlob);
      }
      
      // バックエンドAPIに音声ファイルを送信して文字起こし
      const transcriptionResult = await transcribeAudio(audioBlob);
      
      if (transcriptionResult && transcriptionResult.text) {
        // 文字起こし結果のテキストを感情分析APIに送信
        const sentimentResult = await analyzeSentiment(transcriptionResult.text, undefined, '遺産分割協議');
        
        // 親コンポーネントに結果を通知
        if (onTranscription) {
          onTranscription(
            transcriptionResult.text,
            sentimentResult ? sentimentResult.sentiment_score : undefined
          );
        }
      } else {
        setErrorMessage('文字起こしができませんでした。もう一度やり直してください。');
      }
    } catch (error) {
      console.error('音声処理中にエラーが発生しました:', error);
      setErrorMessage('音声処理中にエラーが発生しました。もう一度やり直してください。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <button
        className={`flex items-center justify-center p-4 rounded-full ${
          isRecording 
            ? 'bg-red-500 text-white animate-pulse' 
            : isProcessing 
              ? 'bg-yellow-500 text-white cursor-wait' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
        } transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing || !!errorMessage}
        aria-label={isRecording ? '録音停止' : '音声入力'}
      >
        {isRecording ? (
          <StopIcon className="h-8 w-8" />
        ) : (
          <MicrophoneIcon className="h-8 w-8" />
        )}
      </button>
      
      <div className="mt-2 text-center">
        {isRecording && <p className="text-sm text-red-500 font-medium">録音中...</p>}
        {isProcessing && <p className="text-sm text-yellow-500 font-medium">処理中...</p>}
        {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
        {!isRecording && !isProcessing && !errorMessage && (
          <p className="text-sm text-gray-500">押して話す</p>
        )}
      </div>
    </div>
  );
};

export default PushToTalkButton; 
