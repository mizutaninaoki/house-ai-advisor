'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function SignOut() {
  const router = useRouter();
  
  useEffect(() => {
    // サインアウト処理をバイパスして直接ホームに戻る
    setTimeout(() => {
      router.push('/');
    }, 1000);
    
    // 本来のサインアウト処理はコメントアウト
    /*
    const performSignOut = async () => {
      try {
        await signOut(auth);
        router.push('/');
      } catch (err) {
        console.error('ログアウトエラー:', err);
        setError('ログアウト中にエラーが発生しました。もう一度お試しください。');
      }
    };

    performSignOut();
    */
  }, [router]);
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50 px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-4">
            ログアウト中...
          </h1>
          
          <p className="text-gray-600">
            ログアウト処理を実行中です。しばらくお待ちください。
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
