'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <main className="flex-grow flex items-center justify-center">
          <p>読み込み中...</p>
        </main>
      </div>
    );
  }

  // ユーザーが認証されていない場合は何も表示しない（リダイレクト中）
  if (!user) {
    return null;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
} 
