'use client';

import { useState, useEffect } from 'react';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import Link from 'next/link';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import ProtectedRoute from '@/app/auth/ProtectedRoute';
import { useAuth } from '@/app/auth/AuthContext';
import { projectApi } from '@/app/utils/api';

interface ProjectMember {
  user_id: number;
  user_name?: string;
  role: string;
  relation?: string;
}

interface DashboardProject {
  id: number;
  title: string;
  created_at: string;
  status?: string;
  role?: string;
  members?: ProjectMember[];
}

export default function Dashboard() {
  const { user, backendUserId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  
  useEffect(() => {
    if (user && backendUserId !== null && backendUserId !== undefined) {
      fetchProjects();
    } else {
      setLoading(false);
    }
  }, [user, backendUserId]);
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectApi.getProjects(backendUserId ?? undefined);
      // 新しい順にソート
      const sorted = [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setProjects(sorted);
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  
  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col min-h-screen">
          <Header isLoggedIn={true} />
          <main className="flex-grow flex items-center justify-center">
            <p>読み込み中...</p>
          </main>
          <Footer />
        </div>
      );
    }
    
    return (
      <div className="flex flex-col min-h-screen">
        <Header isLoggedIn={true} />
        
        <main className="flex-grow container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">ダッシュボード</h1>
          
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">あなたの相続プロジェクト</h2>
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">まだプロジェクトがありません</p>
                  <Link 
                    href="/projects/new" 
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700"
                  >
                    新しいプロジェクトを作成
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {projects.slice(0, 2).map(project => (
                    <li key={project.id} className="py-4">
                      <Link 
                        href={`/projects/${project.id}`}
                        className="block hover:bg-gray-50 rounded-md p-2 -mx-2"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-base font-medium text-cyan-600">{project.title}</h3>
                            <p className="text-sm text-gray-500">
                              作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                            </p>
                            <div className="flex items-center mt-1">
                              <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                              <span className="text-xs text-gray-500">{project.members ? project.members.length : '-'}人</span>
                              {project.status && <><span className="mx-2 text-gray-300">|</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                project.status === 'active' ? 'bg-green-100 text-green-800' :
                                project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {project.status === 'active' ? '進行中' : 
                                 project.status === 'pending' ? '招待中' : '完了'}
                              </span></>}
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
              )}
              {/* 下部リンク分岐 */}
              {projects.length === 0 ? null : projects.length < 3 ? (
                <div className="mt-4 text-right">
                  <Link 
                    href="/projects/new" 
                    className="inline-flex items-center text-sm text-cyan-600 hover:text-cyan-800"
                  >
                    新しいプロジェクトを作成
                  </Link>
                </div>
              ) : (
                <div className="mt-4 text-right">
                  <Link 
                    href="/projects" 
                    className="inline-flex items-center text-sm text-cyan-600 hover:text-cyan-800"
                  >
                    プロジェクト一覧
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-cyan-50 rounded-lg p-6 border border-cyan-100">
            <h2 className="text-lg font-semibold text-cyan-900 mb-2">始め方</h2>
            <p className="text-cyan-700 mb-4">家族間の遺産分割を円滑に進めるための手順です:</p>
            
            <ol className="list-decimal pl-5 space-y-2 text-cyan-800">
              <li>「新しいプロジェクト」から相続案件を作成</li>
              <li>不動産情報を登録（住所、評価額など）</li>
              <li>家族メンバーを招待して情報共有</li>
              <li>AIによる法的アドバイスを参考に分割案を作成</li>
              <li>各メンバーの同意を得て最終的な分割を決定</li>
            </ol>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }
  
  return (
    <ProtectedRoute>
      {renderDashboardContent()}
    </ProtectedRoute>
  );
} 
