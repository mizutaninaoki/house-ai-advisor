'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

export default function SignOut() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        router.push('/');
      } catch (error) {
        console.error('ログアウトエラー:', error);
        router.push('/');
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={false} />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800 mb-2">ログアウト中...</h1>
          <p className="text-gray-600">ご利用ありがとうございました。</p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
