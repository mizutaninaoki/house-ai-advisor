'use client';

import { useEffect, useState } from 'react';
import ProjectList from '../components/ProjectList';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useAuth } from '../auth/AuthContext';
import ProtectedRoute from '../auth/ProtectedRoute';

export default function ProjectsPage() {
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [pageLoading, setPageLoading] = useState(true);
  const { user, backendUserId } = useAuth();

  useEffect(() => {
    if (backendUserId) {
      setUserId(backendUserId);
      setPageLoading(false);
    } else if (!user) {
      setPageLoading(false);
    }
  }, [user, backendUserId]);

  // プロジェクト一覧のコンテンツをレンダリング
  const renderProjectsContent = () => {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={!!user} />
        <main className="flex-grow bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">プロジェクト管理</h1>
            
            {pageLoading ? (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : (
              <ProjectList userId={userId} />
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  };

  return (
    <ProtectedRoute>
      {renderProjectsContent()}
    </ProtectedRoute>
  );
} 
