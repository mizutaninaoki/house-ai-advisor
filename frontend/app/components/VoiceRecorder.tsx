'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onError = (error) => console.error('録音エラー:', error),
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 録音時間を更新するタイマー
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  // 録音開始
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);

        // マイクのストリームを停止
        stream.getTracks().forEach((track) => track.stop());
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      if (error instanceof Error) {
        onError(error);
      } else {
        onError(new Error('マイクへのアクセスに失敗しました'));
      }
    }
  }, [onRecordingComplete, onError]);

  // 録音停止
  const stopRecording = useCallback((e?: React.MouseEvent) => {
    // イベントが提供されている場合、デフォルトの動作を防ぎます
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // 録音の切り替え
  const toggleRecording = useCallback((e: React.MouseEvent) => {
    // デフォルトの動作を防ぎます
    e.preventDefault();
    
    if (isRecording) {
      stopRecording(e);
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // 録音時間のフォーマット (MM:SS)
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={toggleRecording}
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-colors ${
          isRecording ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        aria-label={isRecording ? '録音停止' : '録音開始'}
        type="button"
      >
        {isRecording ? (
          <span className="text-2xl">■</span>
        ) : (
          <span className="text-2xl">●</span>
        )}
      </button>
      <div className="text-sm text-gray-600">
        {isRecording ? (
          <span className="text-red-500 font-semibold">録音中... {formatTime(recordingTime)}</span>
        ) : (
          <span>押して録音</span>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder; 
