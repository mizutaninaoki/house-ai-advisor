'use client';

import Link from 'next/link';
import { UserCircleIcon, SparklesIcon, UserIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/app/auth/AuthContext';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  isLoggedIn?: boolean;
  userName?: string;
}

export default function Header({ isLoggedIn }: HeaderProps) {
  const { user, logout } = useAuth();
  
  const isAuthenticated = typeof isLoggedIn === 'boolean' ? isLoggedIn : !!user;
  
  console.log('Header認証状態:', { isAuthenticated, user: !!user, isLoggedInProp: isLoggedIn });
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);
  
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
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold flex items-center whitespace-nowrap">
          <SparklesIcon className="h-6 w-6 mr-2" />
          おうちのAI相談室
        </Link>
        <div className="flex items-center justify-end w-full">
          {isAuthenticated ? (
            <div className="relative flex items-center" ref={menuRef}>
              <button
                className="flex items-center focus:outline-none"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                <UserCircleIcon className="h-7 w-7" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-md shadow-lg z-50 text-gray-700 py-2">
                <div className="px-4 py-2 text-sm text-gray-600 border-b">{user?.displayName || 'ユーザー'}</div>
                  <div className="py-2 px-2">
                    <div className="text-xs text-gray-400 font-semibold mb-1 pl-2"/>
                    <Link href="/dashboard/account" className="flex items-center px-2 py-2 rounded hover:bg-gray-100 text-sm">
                      <UserIcon className="h-5 w-5 text-cyan-500 mr-2" /> アカウント設定
                    </Link>
                    <Link href="/dashboard/help" className="flex items-center px-2 py-2 rounded hover:bg-gray-100 text-sm">
                      <ChatBubbleLeftRightIcon className="h-5 w-5 text-cyan-500 mr-2" /> ヘルプ
                    </Link>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm border-t"
                  >
                    ログアウト
                  </button>
                </div>
              )}
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
