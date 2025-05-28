'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import EstateRegistrationForm, { EstateData } from '@/app/components/EstateRegistrationForm';
import { projectApi } from '@/app/utils/api';
import { useAuth } from '@/app/auth/AuthContext';

// Heir型を簡素化
interface Heir {
  id: string;
  name: string;
  relation: string;
  email: string;
}

// ProjectMember型（user_idを含む場合も許容）
type ProjectMemberInput = {
  email: string;
  name: string;
  relation: string;
  user_id?: number;
};

export default function NewProject() {
  const { user, loading: authLoading, backendUserId } = useAuth();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [estateData, setEstateData] = useState<EstateData | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [heirs, setHeirs] = useState<Heir[]>([
    { id: Date.now().toString(), name: '', relation: '', email: '' }
  ]);
  const router = useRouter();
  
  useEffect(() => {
    // AuthContextからのユーザー情報を利用するため、ローディング状態を更新
    if (!authLoading) {
      setLoading(false);
      if (!user) {
        // ログインしていなければログイン画面にリダイレクト
        router.push('/auth/signin');
      } else {
        // デバッグ用: ユーザー情報をコンソールに表示
        console.log('現在のユーザー情報:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      }
    }
  }, [user, authLoading, router]);
  
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

    if (!backendUserId) {
      setFormError('ユーザー情報が取得できませんでした。再度ログインしてください。');
      console.error('バックエンドユーザーIDがnullです。ログイン処理が正しく完了していない可能性があります。');
      return;
    }

    console.log('プロジェクト作成処理を開始:', {
      projectName,
      projectDescription,
      backendUserId,
      firebaseUser: {
        uid: user.uid,
        email: user.email
      }
    });
    
    try {
      setIsSubmitting(true);
      setFormError('');
      
      // プロジェクト作成データの準備
      const projectData = {
        title: projectName,
        description: projectDescription,
        user_id: backendUserId,
        members: [
          {
            user_id: backendUserId,
            email: user.email || '',
            name: user.displayName || '',
            relation: '本人'
          },
          ...heirs.map(h => ({
            email: h.email,
            name: h.name,
            relation: h.relation
          }))
        ] as ProjectMemberInput[]
      };
      console.log('プロジェクト作成リクエストデータ:', projectData);
      
      // バックエンドAPIを使用してプロジェクトを作成
      const newProject = await projectApi.createProject(projectData);
      
      console.log('プロジェクト作成成功:', newProject);
      
      // 成功後、プロジェクト詳細画面に遷移
      router.push(`/projects/${newProject.id}`);
    } catch (error) {
      console.error('プロジェクト作成エラー:', error);
      
      // エラーメッセージをより詳細に設定
      if (error instanceof Error) {
        setFormError(`プロジェクトの作成中にエラーが発生しました: ${error.message}`);
      } else {
        setFormError('プロジェクトの作成中に不明なエラーが発生しました。もう一度お試しください。');
      }
      
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
  
  // 相続人入力変更
  const handleHeirChange = (index: number, field: keyof Heir, value: string) => {
    setHeirs(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  // 相続人追加
  const handleAddHeir = () => {
    setHeirs(prev => [...prev, { id: Date.now().toString(), name: '', relation: '', email: '' }]);
  };

  // 相続人削除
  const handleDeleteHeir = (index: number) => {
    if (heirs.length === 1) return; // 1人は必須
    setHeirs(prev => prev.filter((_, i) => i !== index));
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isLoggedIn={!!user} userName={user?.displayName || undefined} />
        <main className="flex-grow flex items-center justify-center">
          <p>読み込み中...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={!!user} userName={user?.displayName || undefined} />
      
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'}`}>4</div>
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
                <h2 className="text-xl font-semibold text-gray-800 mb-4">相続人登録</h2>
                <p className="text-gray-600 mb-6">相続人の氏名・続柄・メールアドレスを入力してください。1人以上必須、複数人登録できます。</p>
                <div className="mb-6">
                  <div className="flex font-semibold text-gray-700 border-b pb-2 mb-2">
                    <div className="w-1/4">氏名</div>
                    <div className="w-1/4">続柄</div>
                    <div className="w-1/3">メールアドレス</div>
                    <div className="w-1/6 text-right">操作</div>
                  </div>
                  {/* ログインユーザー自身を先頭に表示 */}
                  <div className="flex items-center mb-2 opacity-80">
                    <input
                      type="text"
                      className="w-1/4 p-2 border border-gray-300 rounded-md mr-2 bg-gray-100"
                      value={user?.displayName || ''}
                      disabled
                      title="ご本人の氏名"
                      placeholder="ご本人の氏名"
                    />
                    <input
                      type="text"
                      className="w-1/4 p-2 border border-gray-300 rounded-md mr-2 bg-gray-100"
                      value="本人"
                      disabled
                      title="ご本人の続柄"
                      placeholder="本人"
                    />
                    <input
                      type="email"
                      className="w-1/3 p-2 border border-gray-300 rounded-md mr-2 bg-gray-100"
                      value={user?.email || ''}
                      disabled
                      title="ご本人のメールアドレス"
                      placeholder="ご本人のメールアドレス"
                    />
                    <div className="w-1/6 text-right">
                      <button type="button" className="text-gray-400 cursor-not-allowed" disabled>削除</button>
                    </div>
                  </div>
                  {/* 以降、heirs.mapで他の相続人を表示 */}
                  {heirs.map((heir, idx) => (
                    <div key={heir.id} className="flex items-center mb-2">
                      <input
                        type="text"
                        className="w-1/4 p-2 border border-gray-300 rounded-md mr-2"
                        placeholder="例：山田太郎"
                        value={heir.name}
                        onChange={e => handleHeirChange(idx, 'name', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className="w-1/4 p-2 border border-gray-300 rounded-md mr-2"
                        placeholder="例：長男"
                        value={heir.relation}
                        onChange={e => handleHeirChange(idx, 'relation', e.target.value)}
                        required
                      />
                      <input
                        type="email"
                        className="w-1/3 p-2 border border-gray-300 rounded-md mr-2"
                        placeholder="例：example@email.com"
                        value={heir.email}
                        onChange={e => handleHeirChange(idx, 'email', e.target.value)}
                        required
                      />
                      <div className="w-1/6 text-right">
                        <button
                          type="button"
                          className={`text-red-500 hover:underline ${heirs.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleDeleteHeir(idx)}
                          disabled={heirs.length === 1}
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mt-2 bg-indigo-600 text-white py-1 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                    onClick={handleAddHeir}
                  >
                    ＋相続人を追加
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ※操作しているご本人（ログインユーザー）は必ず相続人として登録されます（編集・削除不可）
                </p>
                <div className="flex justify-between mt-6">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="text-gray-600 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    戻る
                  </button>
                  <button
                    type="button"
                    className={`bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors ${(heirs.some(h => !h.name.trim() || !h.relation.trim() || !h.email.trim())) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => { if (heirs.every(h => h.name.trim() && h.relation.trim() && h.email.trim())) setStep(4); }}
                    disabled={heirs.some(h => !h.name.trim() || !h.relation.trim() || !h.email.trim())}
                  >
                    次へ
                  </button>
                </div>
              </div>
            )}
            
            {step === 4 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">プロジェクト内容の確認</h2>
                <p className="text-gray-600 mb-6">下記の内容で新しい相続プロジェクトを作成します。内容に誤りがないかご確認のうえ、「プロジェクトを作成」ボタンを押してください。</p>
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
                    <div>
                      <span className="text-gray-500">相続人:</span>
                      <ul className="list-disc ml-6">
                        {heirs.map(h => (
                          <li key={h.id}>{h.name}（{h.relation}）{h.email && ` - ${h.email}`}</li>
                        ))}
                      </ul>
                    </div>
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
                      className={`bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 transition-colors flex items-center ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? '作成中...' : 'プロジェクトを作成'}
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
