'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ProposalCard, { Proposal } from '@/app/components/ProposalCard';
import { 
  projectApi,
  proposalApi
} from '@/app/utils/api';

interface Project {
  id: number;
  title: string;
  description: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
  status?: string;
}

interface ApiProposal {
  id: number;
  title: string;
  content: string;
  support_rate: number;
  is_selected?: boolean;
  is_favorite?: boolean;
  points?: Array<{
    type: 'merit' | 'demerit' | 'cost' | 'effort';
    content: string;
  }>;
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id as string) : 0;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        // プロジェクト詳細の取得
        const projectData = await projectApi.getProject(projectId);
        setProject(projectData);
        
        // プロジェクトに関連する提案の取得
        const proposalsData: ApiProposal[] = await proposalApi.getProposals(projectId);
        // APIレスポンスを適切なProposal型に変換
        const formattedProposals = proposalsData.map(proposal => ({
          id: proposal.id.toString(),
          title: proposal.title || '無題の提案',
          description: proposal.content || '',
          supportRate: proposal.support_rate || 0,
          points: proposal.points || [],
          selected: proposal.is_selected || false
        }));
        setProposals(formattedProposals);
        
        setError(null);
      } catch (err) {
        console.error('データ取得エラー:', err);
        setError('プロジェクトデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (!isNaN(projectId) && projectId > 0) {
      fetchProjectData();
    } else {
      setError('無効なプロジェクトIDです');
      setLoading(false);
    }
  }, [projectId]);

  // 提案のお気に入り状態を切り替える
  const handleToggleFavorite = async (proposalId: number) => {
    try {
      const updatedProposal = await proposalApi.toggleFavorite(proposalId);
      
      // 提案リストを更新
      setProposals(proposals.map(p => 
        p.id === proposalId.toString() ? { ...p, selected: Boolean(updatedProposal.is_selected) } : p
      ));
    } catch (err) {
      console.error('お気に入り更新エラー:', err);
      setError('お気に入り状態の更新に失敗しました');
    }
  };

  // 提案を削除する
  const handleDeleteProposal = async (proposalId: number) => {
    if (confirm('この提案を削除してもよろしいですか？')) {
      try {
        await proposalApi.deleteProposal(proposalId);
        setProposals(proposals.filter(p => p.id !== proposalId.toString()));
      } catch (err) {
        console.error('削除エラー:', err);
        setError('提案の削除に失敗しました');
      }
    }
  };

  // 新しい提案を作成
  const handleCreateProposal = async () => {
    try {
      const newProposal = await proposalApi.createProposal({
        project_id: projectId,
        title: "新しい提案",
        content: "ここに提案内容を入力してください。",
      });
      
      // 新しい提案をProposal型に変換して追加
      const formattedProposal: Proposal = {
        id: newProposal.id.toString(),
        title: newProposal.title || '無題の提案',
        description: newProposal.content || '',
        supportRate: newProposal.support_rate || 0,
        points: newProposal.points || []
      };
      
      setProposals([...proposals, formattedProposal]);
    } catch (err) {
      console.error('提案作成エラー:', err);
      setError('新しい提案の作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={true} userName="テストユーザー" />
        <main className="flex-grow bg-gray-50 flex justify-center items-center">
          <p className="text-gray-600">読み込み中...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isLoggedIn={true} userName="テストユーザー" />
        <main className="flex-grow bg-gray-50 flex flex-col justify-center items-center p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 max-w-lg w-full">
            <p>{error || 'プロジェクトが見つかりませんでした'}</p>
          </div>
          <Link 
            href="/projects" 
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            プロジェクト一覧に戻る
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={true} userName="テストユーザー" />
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link 
                href="/projects" 
                className="text-indigo-600 hover:text-indigo-800 flex items-center mb-2"
              >
                ← プロジェクト一覧に戻る
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <p className="text-gray-600 mt-2">{project.description}</p>
              <p className="text-sm text-gray-500 mt-1">
                作成日: {new Date(project.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleCreateProposal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              新しい提案を作成
            </button>
          </div>
          
          {proposals.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">このプロジェクトにはまだ提案がありません。</p>
              <p className="text-gray-600 mt-2">上のボタンから新しい提案を作成してください。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onToggleFavorite={() => handleToggleFavorite(parseInt(proposal.id))}
                  onDelete={() => handleDeleteProposal(parseInt(proposal.id))}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
} 
