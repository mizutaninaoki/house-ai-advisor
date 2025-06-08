import React, { useState, useEffect } from 'react';
import { projectApi } from '../utils/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// プロジェクトの型定義
interface Project {
  id: number;
  title: string;
  description: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
}

// プロジェクト作成フォームのprops
interface ProjectFormProps {
  onSubmit: (title: string, description: string) => void;
  onCancel: () => void;
}

// プロジェクト作成フォーム
const ProjectForm: React.FC<ProjectFormProps> = ({ onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSubmit(title, description);
      setTitle('');
      setDescription('');
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">新しいプロジェクトを作成</h3>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">タイトル</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">説明</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            作成
          </button>
        </div>
      </form>
    </div>
  );
};

// プロジェクト一覧コンポーネントのProps
interface ProjectListProps {
  userId?: number;
}

// プロジェクト一覧コンポーネント
const ProjectList: React.FC<ProjectListProps> = ({ userId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  // プロジェクト一覧の取得
  const fetchProjects = async () => {
    try {
      setLoading(true);
      console.log('プロジェクト一覧を取得します。ユーザーID:', userId);
      
      if (!userId) {
        console.log('ユーザーIDが未設定のため、プロジェクト取得をスキップします');
        setLoading(false);
        return;
      }
      
      const data = await projectApi.getProjects(userId);
      console.log('取得したプロジェクト:', data);
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('プロジェクトの取得に失敗しました:', err);
      setError('プロジェクトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントのマウント時にプロジェクト一覧を取得
  useEffect(() => {
    if (userId) {
      console.log('ユーザーIDが設定されたため、プロジェクト一覧を取得します:', userId);
      fetchProjects();
    } else {
      console.log('ユーザーIDが未設定のため、プロジェクト取得を待機します');
      setLoading(false); // ユーザーIDがなければロード完了とする
    }
  }, [userId]);

  // プロジェクトの作成
  const handleCreateProject = async (title: string, description: string) => {
    if (!userId) {
      setError('ユーザーIDが必要です');
      return;
    }

    try {
      const newProject = await projectApi.createProject({
        title,
        description,
        user_id: userId
      });
      setProjects([...projects, newProject]);
      setShowForm(false);
    } catch (err) {
      setError('プロジェクトの作成に失敗しました');
      console.error(err);
    }
  };

  // プロジェクトの削除
  const handleDeleteProject = async (projectId: number) => {
    if (confirm('このプロジェクトを削除してもよろしいですか？')) {
      try {
        await projectApi.deleteProject(projectId);
        setProjects(projects.filter(project => project.id !== projectId));
      } catch (err) {
        const error = err as Error & { code?: number };
        if (error.code === 409 || error.message === '関連データが残っているため削除できません') {
          setError('関連データが残っているため削除できません');
        } else {
          setError('プロジェクトの削除に失敗しました');
        }
        console.error(err);
      }
    }
  };

  // プロジェクト詳細ページへの遷移
  const handleProjectClick = (projectId: number) => {
    router.push(`/projects/${projectId}`);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">プロジェクト一覧</h2>
        <Link
          href="/projects/new"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          新規プロジェクト
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {showForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowForm(false)}
        />
      )}
      
      {loading ? (
        <div className="text-center py-4">
          <p>読み込み中...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">プロジェクトがありません。新しいプロジェクトを作成してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{project.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{project.description}</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    作成日: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleProjectClick(project.id)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none"
                    >
                      詳細
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList; 
