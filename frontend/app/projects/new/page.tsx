'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/app/firebase/config';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import EstateRegistrationForm, { EstateData } from '@/app/components/EstateRegistrationForm';

export default function NewProject() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [estateData, setEstateData] = useState<EstateData | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    try {
      // 認証をバイパスして常に表示する
      setUser({ displayName: 'テストユーザー', email: 'test@example.com', uid: 'mock-user-id' } as User);
      setLoading(false);
      
      // 認証機能は一時的に無効化
      /*
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          router.push('/auth/signin');
        }
        setLoading(false);
      });
      
      return () => unsubscribe();
      */
      return () => {}; // 空のクリーンアップ関数
    } catch (error) {
      console.error('認証エラー:', error);
      // モックデータを表示
      setUser({ displayName: 'テストユーザー', email: 'test@example.com', uid: 'mock-user-id' } as User);
      setLoading(false);
    }
  }, []);
  
  const handleEstateSubmit = (data: EstateData) => {
    setEstateData(data);
    setStep(3); // 次のステップへ進む
  };
  
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectName.trim()) {
      setFormError('プロジェクト名を入力してください');
      return;
    }
    
    if (!user) {
      setFormError('ログインが必要です');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setFormError('');
      
      // Firestoreへの保存はモック化
      console.log('プロジェクト作成（デモ）:', {
        name: projectName,
        description: projectDescription,
        createdBy: user.uid,
        members: [
          {
            uid: user.uid,
            email: user.email,
            name: user.displayName || 'ユーザー',
            role: 'owner'
          }
        ],
        estateData
      });
      
      // モックIDで成功したことにする
      const mockProjectId = Math.floor(Math.random() * 1000).toString();
      
      // 成功後、プロジェクト詳細画面に遷移
      router.push(`/projects/${mockProjectId}`);
    } catch (error) {
      console.error('プロジェクト作成エラー:', error);
      setFormError('プロジェクトの作成中にエラーが発生しました。もう一度お試しください。');
      setIsSubmitting(false);
    }
  };
  
  const nextStep = () => {
    // 現在のステップのバリデーション
    if (step === 1 && !projectName.trim()) {
      setFormError('プロジェクト名を入力してください');
      return;
    }
    
    setFormError('');
    setStep(step + 1);
  };
  
  const prevStep = () => {
    setStep(step - 1);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isLoggedIn={true} userName={user?.displayName || undefined} />
        <main className="flex-grow flex items-center justify-center">
          <p>読み込み中...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} userName={user?.displayName || undefined} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">新しい相続プロジェクトを作成</h1>
            <Link 
              href="/dashboard" 
              className="flex items-center text-cyan-600 hover:text-cyan-800"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              ダッシュボードに戻る
            </Link>
          </div>
          
          {/* ステッププログレス */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex-1 h-2 ${step >= 1 ? 'bg-cyan-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
              <div className={`flex-1 h-2 ${step >= 2 ? 'bg-cyan-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
              <div className={`flex-1 h-2 ${step >= 3 ? 'bg-cyan-500' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>3</div>
              <div className={`flex-1 h-2 ${step >= 4 ? 'bg-cyan-500' : 'bg-gray-200'}`}></div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-600">
              <div className={step >= 1 ? 'text-cyan-600 font-medium' : ''}>基本情報</div>
              <div className={step >= 2 ? 'text-cyan-600 font-medium' : ''}>不動産登録</div>
              <div className={step >= 3 ? 'text-cyan-600 font-medium' : ''}>相続人登録</div>
              <div className={step >= 4 ? 'text-cyan-600 font-medium' : ''}>確認</div>
            </div>
          </div>
          
          {/* ステップごとのフォーム */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {formError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <p>{formError}</p>
              </div>
            )}
            
            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">基本情報の入力</h2>
                <form>
                  <div className="mb-4">
                    <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                      プロジェクト名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="project-name"
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="例：山田家の遺産分割"
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                      説明（任意）
                    </label>
                    <textarea
                      id="project-description"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="プロジェクトの詳細や背景など"
                      rows={4}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors"
                    >
                      次へ
                    </button>
                  </div>
                </form>
              </div>
            )}
            
            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">不動産情報の登録</h2>
                <p className="text-gray-600 mb-6">
                  相続対象の不動産・資産情報を入力してください。この情報は後からでも編集できます。
                </p>
                
                <EstateRegistrationForm onSubmit={handleEstateSubmit} />
                
                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-600 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    戻る
                  </button>
                </div>
              </div>
            )}
            
            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">プロジェクト作成の完了</h2>
                <p className="text-gray-600 mb-6">
                  プロジェクト情報の登録が完了しました。次のステップは「相続人の招待」です。
                </p>
                
                <div className="bg-gray-50 p-4 rounded-md mb-6">
                  <h3 className="font-medium text-gray-700 mb-2">登録内容</h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-500">プロジェクト名:</span> {projectName}</p>
                    {projectDescription && (
                      <p><span className="text-gray-500">説明:</span> {projectDescription}</p>
                    )}
                    {estateData && (
                      <p><span className="text-gray-500">不動産:</span> {estateData.address}</p>
                    )}
                  </div>
                </div>
                
                <form onSubmit={handleProjectSubmit}>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="text-gray-600 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      戻る
                    </button>
                    
                    <button
                      type="submit"
                      className={`
                        bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 
                        transition-colors flex items-center
                        ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '作成中...' : 'プロジェクトを作成して次へ'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
          
          <div className="mt-8 text-center">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
