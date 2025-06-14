'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/app/firebase/config';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  backendUserId: number | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUserId, setBackendUserId] = useState<number | null>(null);
  const router = useRouter();

  // Firebaseユーザー情報をバックエンドと同期する関数
  const syncUserWithBackend = async (firebaseUser: User) => {
    try {
      console.log('バックエンドとの同期処理を開始:', firebaseUser.uid);
      
      // バックエンドのAPI URLを設定
      // APIのベースURLを環境変数から取得（なければデフォルト値を使用）
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      console.log('API Base URL:', apiBaseUrl);
      
      // まずはFirebase UIDでユーザーを検索
      const searchUrl = `${apiBaseUrl}/api/users/firebase/${firebaseUser.uid}`;
      console.log('ユーザー検索URL:', searchUrl);
      
      try {
        const response = await fetch(searchUrl, { credentials: 'include' });
        console.log('検索レスポンス:', response.status);
        
        if (response.ok) {
          // ユーザーが見つかった場合
          const userData = await response.json();
          console.log('バックエンドユーザー検索成功:', userData);
          setBackendUserId(userData.id);
          return;
        }
        
        if (response.status === 404) {
          // ユーザーが見つからない場合は新規作成
          console.log('バックエンドユーザーが存在しないため作成します');
          const createUrl = `${apiBaseUrl}/api/users/`;
          console.log('ユーザー作成URL:', createUrl);
          
          const userData = {
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'ユーザー',
            firebase_uid: firebaseUser.uid
          };
          console.log('作成するユーザーデータ:', userData);
          
          const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
            credentials: 'include',
          });
          
          console.log('作成レスポンス:', createResponse.status);
          
          if (createResponse.ok) {
            const newUser = await createResponse.json();
            console.log('バックエンドユーザー作成成功:', newUser);
            setBackendUserId(newUser.id);
          } else {
            const errorText = await createResponse.text();
            console.error('バックエンドユーザー作成失敗:', errorText);
          }
        }
      } catch (fetchError) {
        console.error('APIリクエスト中にエラーが発生しました:', fetchError);
        console.error('接続先URL:', searchUrl);
        console.error('環境変数 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
      }
    } catch (error) {
      console.error('バックエンドとの同期エラー:', error);
    }
  };

  useEffect(() => {
    console.log('認証状態監視を開始します');
    
    // Firebase認証の状態変化を監視
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('認証状態が変化しました:', firebaseUser ? 'ログイン中' : 'ログアウト/未ログイン');
      
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // ユーザーがログインしている場合、バックエンドと同期
        await syncUserWithBackend(firebaseUser);
      } else {
        // ログアウト時やユーザーがない場合
        console.log('ユーザー情報をクリアします');
        setBackendUserId(null);
      }
      
      setLoading(false);
    });

    // クリーンアップ関数
    return () => {
      console.log('認証状態監視を終了します');
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // ログイン成功後にバックエンドと同期
      if (result.user) {
        await syncUserWithBackend(result.user);
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('ログインエラー:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('ログアウト処理を開始します');
      // 念のためFirebase認証をクリア
      await signOut(auth);
      console.log('Firebaseのログアウトが完了しました');
      
      // ローカルステートをクリア
      setUser(null);
      setBackendUserId(null);
      
      // キャッシュをクリアして確実にログアウト状態にする
      if (typeof window !== 'undefined') {
        console.log('ブラウザキャッシュをクリアします');
        sessionStorage.clear();
        // ログアウト後にホームページに遷移
        console.log('ホームページへリダイレクトします');
        router.push('/');
        router.refresh(); // ページを完全にリフレッシュ
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, backendUserId, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
