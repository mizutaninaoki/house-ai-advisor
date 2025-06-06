'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/AuthContext';
import { userApi } from '@/app/utils/api';

export default function AccountSettings() {
  const { user, backendUserId, logout } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteAccount = useCallback(async () => {
    if (!backendUserId) {
      setError('ユーザー情報が取得できませんでした');
      return;
    }
    if (!confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) return;
    setDeleting(true);
    setError(null);
    try {
      await userApi.deleteUser(backendUserId);
      await logout();
      router.push('/');
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('アカウント削除に失敗しました');
      }
    } finally {
      setDeleting(false);
    }
  }, [backendUserId, logout, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} userName={user?.displayName || undefined} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">アカウント設定</h1>
          <Link 
            href="/dashboard" 
            className="flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">プロフィール情報</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                氏名
              </label>
              <input
                id="name"
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={user?.displayName || ''}
                readOnly
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={user?.email || ''}
                readOnly
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
              disabled
            >
              デモモードでは編集できません
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">通知設定</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">メール通知</h3>
                <p className="text-sm text-gray-500">プロジェクトの更新をメールで受け取る</p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="email-notifications" 
                  className="sr-only" 
                  defaultChecked 
                  title="メール通知"
                  aria-label="メール通知を有効にする"
                />
                <div className="block h-6 bg-gray-300 rounded-full w-12"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-6"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">プッシュ通知</h3>
                <p className="text-sm text-gray-500">アプリ内の通知を受け取る</p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input 
                  type="checkbox" 
                  id="push-notifications" 
                  className="sr-only" 
                  defaultChecked 
                  title="プッシュ通知"
                  aria-label="プッシュ通知を有効にする"
                />
                <div className="block h-6 bg-gray-300 rounded-full w-12"></div>
                <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform translate-x-6"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">アカウント管理</h2>
          
          <div className="space-y-4">
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            <button
              className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
              onClick={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? '削除中...' : 'アカウントを削除する'}
            </button>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
