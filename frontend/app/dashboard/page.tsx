'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { HomeIcon, UserIcon, UserGroupIcon, ChatBubbleLeftRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface Project {
  id: string;
  name: string;
  createdAt: Date;
  status: 'active' | 'completed' | 'pending';
  role: 'owner' | 'member';
  members: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  
  useEffect(() => {
    try {
      // 認証をバイパスして常に表示する
      setUser({ displayName: 'テストユーザー', email: 'test@example.com' } as User);
      fetchProjects();
      setLoading(false);
      
      return () => {}; // 空のクリーンアップ関数
    } catch (error) {
      console.error('認証エラー:', error);
      // モックデータを表示
      setUser({ displayName: 'テストユーザー', email: 'test@example.com' } as User);
      fetchProjects();
      setLoading(false);
    }
  }, []);
  
  const fetchProjects = async () => {
    try {
      // ここでは仮のデータを使用
      // 実際のアプリでは、Firestoreから取得するクエリを実装する
      const mockProjects: Project[] = [
        {
          id: '1',
          name: '山田家の遺産分割',
          createdAt: new Date('2023-12-01'),
          status: 'active',
          role: 'owner',
          members: 4
        },
        {
          id: '2',
          name: '鈴木家の遺産分割',
          createdAt: new Date('2023-11-15'),
          status: 'pending',
          role: 'member',
          members: 3
        }
      ];
      
      setProjects(mockProjects);
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
    }
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">あなたの相続プロジェクト</h2>
            
            {projects.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {projects.map(project => (
                  <li key={project.id} className="py-4">
                    <Link 
                      href={`/projects/${project.id}`}
                      className="block hover:bg-gray-50 rounded-md p-2 -mx-2"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-base font-medium text-cyan-600">{project.name}</h3>
                          <p className="text-sm text-gray-500">
                            作成日: {project.createdAt.toLocaleDateString('ja-JP')}
                          </p>
                          <div className="flex items-center mt-1">
                            <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500">{project.members}人</span>
                            <span className="mx-2 text-gray-300">|</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              project.status === 'active' ? 'bg-green-100 text-green-800' :
                              project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {project.status === 'active' ? '進行中' : 
                               project.status === 'pending' ? '招待中' : '完了'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">
                            {project.role === 'owner' ? '代表者' : '参加者'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">まだプロジェクトがありません</p>
                <Link 
                  href="/projects/new" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700"
                >
                  新しいプロジェクトを作成
                </Link>
              </div>
            )}
            
            {projects.length > 0 && (
              <div className="mt-4 text-right">
                <Link 
                  href="/projects/new" 
                  className="inline-flex items-center text-sm text-cyan-600 hover:text-cyan-800"
                >
                  新しいプロジェクトを作成
                </Link>
              </div>
            )}
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">クイックアクセス</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <Link 
                href="/projects/new" 
                className="flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 p-6 rounded-lg"
              >
                <HomeIcon className="h-8 w-8 text-cyan-500 mb-2" />
                <span className="text-sm font-medium text-gray-700">新規プロジェクト</span>
              </Link>
              
              <Link 
                href="/dashboard/account" 
                className="flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 p-6 rounded-lg"
              >
                <UserIcon className="h-8 w-8 text-cyan-500 mb-2" />
                <span className="text-sm font-medium text-gray-700">アカウント設定</span>
              </Link>
              
              <Link 
                href="/dashboard/help" 
                className="flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 p-6 rounded-lg"
              >
                <ChatBubbleLeftRightIcon className="h-8 w-8 text-cyan-500 mb-2" />
                <span className="text-sm font-medium text-gray-700">ヘルプ</span>
              </Link>
              
              <Link 
                href="/dashboard/templates" 
                className="flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 p-6 rounded-lg"
              >
                <DocumentTextIcon className="h-8 w-8 text-cyan-500 mb-2" />
                <span className="text-sm font-medium text-gray-700">書類テンプレート</span>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-cyan-50 rounded-lg p-6 border border-cyan-100">
          <h2 className="text-lg font-semibold text-cyan-900 mb-2">始め方</h2>
          <p className="text-cyan-700 mb-4">家族間の遺産分割を円滑に進めるための手順です:</p>
          
          <ol className="list-decimal pl-5 space-y-2 text-cyan-800">
            <li>「新しいプロジェクト」から相続案件を作成</li>
            <li>不動産情報を登録（住所、評価額など）</li>
            <li>相続人を招待（メールアドレスを入力）</li>
            <li>Push-to-Talkで意見を表明（自分の希望や譲れない条件）</li>
            <li>システムが争点を抽出し、解決策を提案</li>
            <li>全員が同意したら署名して合意成立</li>
          </ol>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 
