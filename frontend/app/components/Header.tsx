'use client';

import Link from 'next/link';
import { UserCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/auth/AuthContext';

interface HeaderProps {
  userName?: string;
  isLoggedIn?: boolean;
}

export default function Header({ userName, isLoggedIn }: HeaderProps) {
  const { user, logout } = useAuth();
  
  const isAuthenticated = isLoggedIn !== undefined ? isLoggedIn : !!user;
  const displayName = userName || user?.displayName || 'ユーザー';
  
  console.log('Header認証状態:', { isAuthenticated, user: !!user, isLoggedInProp: isLoggedIn });
  
  const handleLogout = async () => {
    try {
      console.log('ヘッダーからログアウト処理を開始');
      await logout();
      console.log('ログアウト完了、ホームページへ移動します');
      // ログアウト後のリダイレクトはAuthContextで処理されますが、
      // 念のためこちらでも設定しておきます
      window.location.href = '/';
    } catch (error) {
      console.error('ログアウトエラー:', error);
      alert('ログアウトに失敗しました。もう一度お試しください。');
    }
  };
  
  return (
    <header className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold flex items-center">
          <SparklesIcon className="h-6 w-6 mr-2" />
          おうちのAI相談室
        </Link>
        
        <div className="flex items-center">
          {isAuthenticated ? (
            <div className="flex items-center">
              <UserCircleIcon className="h-6 w-6 mr-2" />
              <span className="mr-4">{displayName}</span>
              <button 
                onClick={handleLogout}
                className="bg-white text-cyan-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition-all duration-300 shadow-sm"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <Link 
              href="/auth/signin" 
              className="bg-white text-cyan-600 px-4 py-2 rounded-full text-sm font-medium hover:bg-blue-50 transition-all duration-300 shadow-sm"
            >
              ログイン
            </Link>
          )}
        </div>
      </div>
    </header>
  );
} 
