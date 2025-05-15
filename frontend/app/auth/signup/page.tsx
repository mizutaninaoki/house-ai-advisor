'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function SignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      
      // 認証をスキップしてダッシュボードへ直接移動
      console.log('新規登録（デモ）:', { name, email, password });
      router.push('/dashboard');
    } catch (err) {
      console.error('登録エラー:', err);
      // エラーが発生しても開発環境ではダッシュボードに移動
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={false} />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            新規登録
          </h1>
          
          <p className="text-gray-600 text-center mb-8">
            家相続AIに新規登録して、遺産分割をスムーズに進めましょう。
          </p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                氏名
              </label>
              <input
                id="name"
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例：山田太郎"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例：example@email.com"
                required
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                パスワード
              </label>
              <input
                id="password"
                type="password"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上の英数字"
                minLength={8}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`
                w-full bg-indigo-600 text-white py-3 px-4 rounded-md
                hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${loading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {loading ? '登録中...' : '登録して始める'}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-gray-600">
            すでにアカウントをお持ちの方は、<Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500">ログイン</Link>してください。
          </p>
          
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              デモ用：直接ダッシュボードへ
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
