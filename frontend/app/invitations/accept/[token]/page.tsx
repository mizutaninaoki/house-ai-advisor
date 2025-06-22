'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/auth/AuthContext';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface InvitationData {
  project_id: number;
  project_title: string;
  invitee_email: string;
  invitee_name: string;
  relation: string;
  token: string;
}

export default function AcceptInvitation({ params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = use(params);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const { user, backendUserId, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const verifyInvitation = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/invitations/accept/${resolvedParams.token}`);
        
        if (!response.ok) {
          if (response.status === 400) {
            setError('招待リンクが無効または期限切れです');
          } else {
            setError('招待の確認中にエラーが発生しました');
          }
          return;
        }
        
        const data = await response.json();
        setInvitationData(data);
      } catch (err) {
        console.error('招待確認エラー:', err);
        setError('招待の確認中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    verifyInvitation();
  }, [resolvedParams.token]);

  // ログイン後の自動処理
  useEffect(() => {
    if (user && invitationData && backendUserId) {
      handleAutoAcceptInvitation();
    }
  }, [user, invitationData, backendUserId]);

  const handleAutoAcceptInvitation = async () => {
    if (!invitationData || !user) return;

    // メールアドレスが一致するかチェック
    if (user.email !== invitationData.invitee_email) {
      setError(`この招待は ${invitationData.invitee_email} 宛てです。現在 ${user.email} でログイン中です。正しいGoogleアカウントでログインし直してください。`);
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // 招待を完了する
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/invitations/complete/${resolvedParams.token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            name: user.displayName || invitationData.invitee_name,
            firebase_uid: user.uid
          }),
        }
      );

      if (response.ok) {
        // プロジェクト詳細ページにリダイレクト
        router.push(`/projects/${invitationData.project_id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || '招待の処理中にエラーが発生しました');
      }
    } catch (err) {
      console.error('招待処理エラー:', err);
      setError('招待の処理中にエラーが発生しました');
    } finally {
      setProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!invitationData) return;

    try {
      setProcessing(true);
      await signInWithGoogle();
      // ログイン成功後は useEffect で自動処理される
    } catch (err) {
      console.error('Googleログインエラー:', err);
      setError('Googleログインに失敗しました。もう一度お試しください。');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={!!user} />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">招待を確認中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={!!user} />
        <main className="flex-grow flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <h2 className="font-bold text-lg mb-2">エラー</h2>
              <p>{error}</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={() => router.push('/')}
                className="bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors"
              >
                ホームに戻る
              </button>
              {user && (
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
                >
                  再読み込み
                </button>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!invitationData) {
    return null;
  }

  // ログイン済みで処理中の場合
  if (user && processing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={!!user} />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p className="text-gray-600">プロジェクトに参加中...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={!!user} />
      <main className="flex-grow flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">プロジェクトへの招待</h1>
            <div className="w-16 h-1 bg-cyan-600 mx-auto"></div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="font-semibold text-gray-700 mb-2">プロジェクト情報</h2>
              <p className="text-lg font-bold text-cyan-600">{invitationData.project_title}</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">招待された方</h3>
              <p><span className="font-medium">お名前:</span> {invitationData.invitee_name}</p>
              <p><span className="font-medium">続柄:</span> {invitationData.relation}</p>
              <p><span className="font-medium">メールアドレス:</span> {invitationData.invitee_email}</p>
            </div>

            {!user && (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>ご注意:</strong> プロジェクトに参加するには、<strong>{invitationData.invitee_email}</strong> でGoogleアカウントにログインする必要があります。
                </p>
              </div>
            )}
          </div>

          <div className="text-center">
            {user ? (
              <div className="space-y-4">
                <p className="text-green-600 font-medium">
                  ✓ {user.email} でログイン済み
                </p>
                <p className="text-sm text-gray-600">
                  自動的にプロジェクトに参加します...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={processing}
                  className={`w-full py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2 ${
                    processing
                      ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {processing ? (
                    <span>処理中...</span>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Googleでログインしてプロジェクトに参加
                    </>
                  )}
                </button>

                <p className="text-sm text-gray-500">
                  <strong>{invitationData.invitee_email}</strong> のGoogleアカウントでログインしてください。
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 
