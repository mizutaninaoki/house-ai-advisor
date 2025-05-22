'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ProposalCard, { Proposal } from '@/app/components/ProposalCard';
import VoiceRecorder from '@/app/components/VoiceRecorder';
import { 
  projectApi,
  proposalApi,
  conversationApi,
  issueApi
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

// 会話メッセージの型定義
interface Message {
  id: number;
  content: string;
  speaker: string;
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative'; // 感情分析結果
}

// 論点の型定義
interface Issue {
  id: number;
  content: string;
  type: 'positive' | 'negative' | 'neutral' | 'requirement';
  agreement_level?: 'high' | 'medium' | 'low';
  related_messages?: number[]; // 関連メッセージのID
  topic?: string; // 論点のトピック（例：「相続の分割割合」）
  summary?: string; // 論点の要約
  status?: 'agreed' | 'disagreed' | 'discussing'; // 合意状態
  priority?: 'high' | 'medium' | 'low'; // 優先度
  classification?: 'agreed' | 'disagreed' | 'discussing'; // 分類
}

// 署名情報の型定義
interface Signature {
  id: number;
  user_name: string;
  signed_at: string;
  status: 'pending' | 'signed';
}

// タブの型定義
type TabType = 'conversation' | 'discussion' | 'proposal' | 'signature';

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id ? parseInt(params.id as string) : 0;
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('conversation'); // デフォルトは会話タブ
  const [messages, setMessages] = useState<Message[]>([]); // 会話メッセージ
  const [transcription, setTranscription] = useState(''); // 文字起こしテキスト
  const [issues, setIssues] = useState<Issue[]>([]); // 抽出された論点
  const [signatures, setSignatures] = useState<Signature[]>([]); // 署名情報
  const [signingPin, setSigningPin] = useState(''); // 署名PIN
  const [isAiProcessing, setIsAiProcessing] = useState(false); // AI処理中フラグ
  const [isExtractingIssues, setIsExtractingIssues] = useState(false); // 論点生成中フラグ
  
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
        
        // 会話履歴の取得
        try {
          const conversationData = await conversationApi.getConversation(projectId);
          
          // バックエンドでソート済みのデータをそのまま使用
          setMessages(conversationData);
          
          // 会話履歴がない場合、最初のAIメッセージを表示
          if (conversationData.length === 0) {
            setTimeout(() => {
              displayInitialAiMessage(projectData);
            }, 1000); // 少し遅延させて表示
          }
        } catch (convErr) {
          console.error('会話データ取得エラー:', convErr);
          // 会話データが取得できなくても、初期メッセージを表示
          setTimeout(() => {
            displayInitialAiMessage(projectData);
          }, 1000);
        }
        
        // 論点データの取得
        try {
          const issuesData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/issues?project_id=${projectId}`);
          if (issuesData.ok) {
            const issues = await issuesData.json();
            setIssues(issues);
          }
        } catch (issueErr) {
          console.error('論点データ取得エラー:', issueErr);
          // 論点データが取得できなくても、他の機能は使えるようにエラーをスローしない
        }
        
        // 署名情報の取得
        try {
          const signaturesData = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/signatures?project_id=${projectId}`);
          if (signaturesData.ok) {
            const signatures = await signaturesData.json();
            setSignatures(signatures);
          }
        } catch (signErr) {
          console.error('署名データ取得エラー:', signErr);
          // 署名データが取得できなくても、他の機能は使えるようにエラーをスローしない
        }
        
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

  // プロジェクト情報を基に初期AIメッセージを表示
  const displayInitialAiMessage = (projectData: Project) => {
    const initialMessage: Message = {
      id: Date.now(),
      content: getInitialGreeting(projectData),
      speaker: "AI相談員",
      timestamp: new Date().toISOString(),
      sentiment: 'neutral'
    };
    
    setMessages([initialMessage]);
    
    // メッセージをDBに保存
    conversationApi.saveMessage({
      project_id: projectId,
      content: initialMessage.content,
      speaker: initialMessage.speaker,
      sentiment: initialMessage.sentiment
    }).catch(err => console.error('初期メッセージの保存に失敗:', err));
  };

  // プロジェクト情報に基づいた初期挨拶を生成
  const getInitialGreeting = (projectData: Project): string => {
    const projectTitle = projectData.title || '相続に関する相談';
    
    // プロジェクトタイトルに「相続」が含まれる場合
    if (projectTitle.includes('相続')) {
      return `${projectTitle}についてお聞かせください。実家の処分方法や、資産分割でお考えのことはありますか？`;
    }
    
    // プロジェクトタイトルに「実家」が含まれる場合
    if (projectTitle.includes('実家')) {
      return `${projectTitle}についてお聞かせください。実家をどのようにしたいとお考えですか？売却をお考えですか、それとも誰かが住み続けることをお考えですか？`;
    }
    
    // プロジェクトタイトルに「遺産」が含まれる場合
    if (projectTitle.includes('遺産')) {
      return `${projectTitle}についてお聞かせください。遺産分割でどのようなことをお考えですか？特に不動産や預貯金の分け方について気になることはありますか？`;
    }
    
    // デフォルトの挨拶
    return `${projectTitle}について、お手伝いさせていただきます。まずは現在のお考えや状況について教えていただけますか？`;
  };

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

  // 録音完了時の処理
  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      // 音声処理中の状態を設定
      setTranscription('音声を処理中...');
      
      // 音声データを送信して文字起こし
      const result = await conversationApi.transcribeAndSave(
        projectId,
        audioBlob,
        'テストユーザー' // 実際のユーザー名を使用
      );
      
      // メッセージリストに追加
      if (result.message) {
        // バックエンドから最新メッセージリストを取得して更新
        const updatedMessages = await conversationApi.getConversation(projectId);
        setMessages(updatedMessages);
        
        // AIの応答を自動生成
        generateAiResponse(updatedMessages, result.message.content);
      }
      
      setTranscription(result.text || '');
    } catch (err) {
      console.error('文字起こしエラー:', err);
      setError('音声の文字起こしに失敗しました');
      // エラー時も処理は続行（リロードせず）
      setTranscription('音声の処理中にエラーが発生しました。もう一度お試しください。');
    }
  };

  // AIの応答を生成する関数
  const generateAiResponse = async (currentMessages: Message[], userMessage: string) => {
    // 既にAI処理中の場合は実行しない
    if (isAiProcessing) return;
    
    try {
      setIsAiProcessing(true);
      
      // ユーザーのメッセージを分析して適切な応答を生成
      // 本来はここでバックエンドのAI応答生成APIを呼び出すべきですが、
      // モックとして会話コンテキストに基づく応答生成ロジックを実装
      const aiResponse = await simulateAiResponseGeneration(userMessage, currentMessages);
      
      // メッセージをDBに保存
      await conversationApi.saveMessage({
        project_id: projectId,
        content: aiResponse,
        speaker: "AI相談員",
        sentiment: 'neutral'
      });
      
      // 保存後に最新のメッセージリストを取得
      const updatedMessages = await conversationApi.getConversation(projectId);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('AI応答生成エラー:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // モックAI応答生成（実際の実装ではバックエンドのAI APIを使用）
  const simulateAiResponseGeneration = async (userMessage: string, conversationHistory: Message[]): Promise<string> => {
    // 実際の実装では、この関数はバックエンドのAI APIを呼び出すべき
    // ここではコンテキストに基づく簡易応答ロジックを実装
    
    // コンテキストに応じた応答を生成するために、最新のメッセージの内容を解析
    const lowerMessage = userMessage.toLowerCase();
    
    // 少し遅延させてAI応答を返す（非同期処理のシミュレーション）
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 実家に関する言及がある場合
    if (lowerMessage.includes('実家') || lowerMessage.includes('家')) {
      if (lowerMessage.includes('売却') || lowerMessage.includes('売る')) {
        return '実家の売却をお考えなのですね。売却する場合、他の相続人との合意は取れていますか？また、売却後の資金分配についてはどのようにお考えですか？';
      }
      if (lowerMessage.includes('住む') || lowerMessage.includes('住み続け')) {
        return '実家に住み続けることをお考えですね。どなたが住まれる予定ですか？また、住み続ける方と他の相続人との間で、資産バランスの調整について話し合いはされていますか？';
      }
      return '実家についてのお考えをお聞かせいただきありがとうございます。他の財産、例えば預貯金や有価証券などの分割についてはどのようにお考えですか？';
    }
    
    // 財産や資産に関する言及がある場合
    if (lowerMessage.includes('財産') || lowerMessage.includes('資産') || lowerMessage.includes('お金') || lowerMessage.includes('預金')) {
      if (lowerMessage.includes('平等') || lowerMessage.includes('公平') || lowerMessage.includes('均等')) {
        return '財産を平等に分けることをお考えなのですね。法定相続分に従った分割をお考えでしょうか？それとも各相続人の状況に応じた分け方をお考えですか？';
      }
      return '資産についてのお考えをお聞かせいただきありがとうございます。相続人の中で特に経済的支援が必要な方はいらっしゃいますか？';
    }
    
    // 家族関係に関する言及がある場合
    if (lowerMessage.includes('兄弟') || lowerMessage.includes('姉妹') || lowerMessage.includes('子供') || lowerMessage.includes('親')) {
      return 'ご家族の状況を教えていただきありがとうございます。相続について家族間で話し合いは行われていますか？もし行われているなら、現時点での主な意見の相違点はどのような点でしょうか？';
    }
    
    // 感情的な表現が含まれる場合
    if (lowerMessage.includes('不安') || lowerMessage.includes('心配') || lowerMessage.includes('怖い')) {
      return 'ご不安に思われていることがあるのですね。具体的にどのような点が心配ですか？少しでも不安を軽減できるよう、一緒に考えていきましょう。';
    }
    
    if (lowerMessage.includes('争い') || lowerMessage.includes('揉め') || lowerMessage.includes('対立')) {
      return 'ご家族間の対立を避けたいとお考えですね。それはとても大切なことです。相続によって家族関係が損なわれないよう、どのような点に特に配慮されたいですか？';
    }
    
    // 初期段階でのデフォルト応答
    if (conversationHistory.length <= 2) {
      return '状況を教えていただきありがとうございます。相続に関する具体的なご希望やお考えはありますか？例えば、実家の取り扱いや資産分割の方法などについて、理想的な形があれば教えてください。';
    }
    
    // 中盤以降のデフォルト応答
    if (conversationHistory.length > 4) {
      return 'ありがとうございます。これまでの会話を踏まえると、相続に関して特に重要視されているのは公平性と家族関係の維持ですね。他に考慮すべき重要な要素はありますか？また、現時点でのご質問はありますか？';
    }
    
    // 一般的なフォローアップ質問
    return 'ご意見をお聞かせいただきありがとうございます。他に何か気になる点や、相続に関してお考えのことはありますか？';
  };

  // 論点抽出処理
  const handleExtractIssues = async () => {
    try {
      setActiveTab('discussion'); // まず論点タブに切り替え
      setIsExtractingIssues(true); // すぐローディング表示
      setError(null);
      // バックエンドAPIを呼び出して会話から論点を抽出
      const result = await issueApi.extractAndSaveIssues(projectId);
      // 抽出された論点データを取得
      const extractedIssues = await issueApi.getIssues(projectId);
      setIssues(extractedIssues);
      setIsExtractingIssues(false);
      setLoading(false);
      // 処理成功メッセージを表示（オプション）
      if (result && result.message) {
        // ここでトースト通知などを表示できます
        console.log(result.message);
      }
    } catch (err) {
      console.error('論点抽出エラー:', err);
      setError('会話からの論点抽出に失敗しました');
      setIsExtractingIssues(false);
      setLoading(false);
    }
  };

  // 論点データの初期読み込み
  useEffect(() => {
    // プロジェクトデータ取得後、論点データも取得
    if (project && !loading) {
      const fetchIssues = async () => {
        try {
          const issuesData = await issueApi.getIssues(projectId);
          setIssues(issuesData);
        } catch (error) {
          console.error('論点データ取得エラー:', error);
          // エラーが発生しても他の機能に影響しないようにする
        }
      };
      
      fetchIssues();
    }
  }, [project, projectId, loading]);

  // 署名処理
  const handleSign = async () => {
    if (!signingPin || signingPin.length < 4) {
      setError('署名PINは4桁以上で入力してください');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/signatures`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: projectId,
          user_name: 'テストユーザー', // 実際のユーザー名を使用
          pin: signingPin,
        }),
      });

      if (!response.ok) {
        throw new Error('署名処理に失敗しました');
      }

      const result = await response.json();
      // 署名リストを更新
      setSignatures([...signatures, result]);
      setSigningPin(''); // PINをリセット
      setError(null);
    } catch (err) {
      console.error('署名エラー:', err);
      setError('署名処理に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // タブ切り替え用コンポーネント
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => {
    // タブごとにアイコンを定義
    const getIcon = () => {
      switch (tab) {
        case 'conversation':
          return (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
          );
        case 'discussion':
          return (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
            </svg>
          );
        case 'proposal':
          return (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          );
        case 'signature':
          return (
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          );
        default:
          return null;
      }
    };
    
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-3 text-center flex-1 flex items-center justify-center transition-all duration-200 ${
          activeTab === tab
            ? 'bg-white border-t-2 border-indigo-600 text-indigo-600 font-medium shadow-sm rounded-t-md'
            : 'text-gray-600 hover:text-indigo-500 hover:bg-gray-100'
        }`}
      >
        {getIcon()}
        <span>{label}</span>
        
        {/* 未読バッジの表示 */}
        {tab === 'discussion' && issues.length > 0 && (
          <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {issues.length}
          </span>
        )}
        {tab === 'proposal' && proposals.length > 0 && (
          <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs font-semibold px-2 py-0.5 rounded-full">
            {proposals.length}
          </span>
        )}
      </button>
    );
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

  // 会話タブのコンテンツ
  const ConversationTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <div className="flex items-center mb-4">
          <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
          </svg>
          <div>
            <h2 className="text-xl font-semibold">会話</h2>
            <p className="text-gray-600 text-sm">相続に関するヒアリングを進めています。AIの質問に音声で回答してください。</p>
          </div>
        </div>
        
        {/* 感情分析の概要表示 */}
        {messages.length > 2 && (
          <div className="mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">感情分析の概要</h3>
              {/* 一本の感情分析バー */}
              <div className="mb-2">
                <div className="relative h-7 bg-gray-200 rounded-full overflow-hidden flex">
                  {/* 否定的 */}
                  <div
                    className="flex items-center justify-center h-full bg-rose-500 text-white text-xs font-bold transition-all duration-300"
                    style={{
                      width: `${messages.filter(m => m.sentiment === 'negative').length / Math.max(messages.length, 1) * 100}%`,
                      borderTopLeftRadius: '9999px',
                      borderBottomLeftRadius: '9999px',
                      marginRight: messages.filter(m => m.sentiment === 'neutral').length > 0 ? '2px' : messages.filter(m => m.sentiment === 'positive').length > 0 ? '2px' : '0',
                    }}
                  >
                    {messages.filter(m => m.sentiment === 'negative').length > 0 && (
                      <span className="drop-shadow-sm">
                        否定的 {messages.filter(m => m.sentiment === 'negative').length}件
                      </span>
                    )}
                  </div>
                  {/* 中立的 */}
                  <div
                    className="flex items-center justify-center h-full bg-yellow-400 text-white text-xs font-bold transition-all duration-300"
                    style={{
                      width: `${messages.filter(m => m.sentiment === 'neutral').length / Math.max(messages.length, 1) * 100}%`,
                      marginRight: messages.filter(m => m.sentiment === 'positive').length > 0 ? '2px' : '0',
                    }}
                  >
                    {messages.filter(m => m.sentiment === 'neutral').length > 0 && (
                      <span className="drop-shadow-sm">
                        中立的 {messages.filter(m => m.sentiment === 'neutral').length}件
                      </span>
                    )}
                  </div>
                  {/* 肯定的 */}
                  <div
                    className="flex items-center justify-center h-full bg-emerald-500 text-white text-xs font-bold transition-all duration-300"
                    style={{
                      width: `${messages.filter(m => m.sentiment === 'positive').length / Math.max(messages.length, 1) * 100}%`,
                      borderTopRightRadius: '9999px',
                      borderBottomRightRadius: '9999px',
                    }}
                  >
                    {messages.filter(m => m.sentiment === 'positive').length > 0 && (
                      <span className="drop-shadow-sm">
                        肯定的 {messages.filter(m => m.sentiment === 'positive').length}件
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between px-2 mb-2">
                <div className="w-1/3 text-center text-xs text-rose-700">{messages.filter(m => m.sentiment === 'negative').length}件</div>
                <div className="w-1/3 text-center text-xs text-sky-700">{messages.filter(m => m.sentiment === 'neutral').length}件</div>
                <div className="w-1/3 text-center text-xs text-emerald-700">{messages.filter(m => m.sentiment === 'positive').length}件</div>
              </div>
              <div className="text-sm text-gray-600">
                会話の中で表明された感情の傾向を表しています。これらの情報は論点抽出や提案作成に活用されます。
              </div>
            </div>
          </div>
        )}
        
        {/* 会話メッセージ表示エリア - 方向を逆転させた設計 */}
        <div 
          className="border rounded-lg mb-6 h-96 max-h-screen bg-gray-50 resize-y cursor-ns-resize flex flex-col-reverse relative"
          style={{ overflow: 'auto' }}
        >
          {/* ローディングインジケーター - 絶対位置で下部中央に固定 */}
          {(isAiProcessing || transcription === '音声を処理中...') && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="bg-white bg-opacity-90 rounded-full shadow-md px-4 py-2 flex items-center space-x-2">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
                  <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
                </div>
                <span className="text-xs text-gray-700 font-medium">
                  {isAiProcessing ? 'AI相談員が回答を考えています...' : '音声を処理中...'}
                </span>
              </div>
            </div>
          )}
          
          {/* メッセージコンテナ - 逆方向に表示され、常に最新が見える */}
          <div className="p-4 w-full">
            {messages.length === 0 ? (
              <div className="text-center py-8 w-full">
                <p className="text-gray-500 mb-4">AIによるヒアリングを開始します...</p>
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {/* 録音・処理中表示を削除（固定ローディングに移動） */}
                
                {/* メッセージ表示 - 逆順ではなく正順で表示 */}
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`flex ${message.speaker === 'テストユーザー' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.speaker === 'テストユーザー' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="font-semibold text-sm">{message.speaker}</div>
                        {message.sentiment && message.speaker === 'テストユーザー' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            message.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                            message.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {message.sentiment === 'positive' ? '肯定的' :
                             message.sentiment === 'negative' ? '否定的' : '中立的'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{message.content}</p>
                      <div className="text-xs text-right mt-1 text-gray-500">
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* 音声入力コントロール - 独立したフォームとして分離 */}
        <div className="border-t pt-4">
          <div className="flex flex-col items-center justify-center">
            <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
            
            {transcription && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg w-full">
                <p className="text-gray-700">{transcription}</p>
              </div>
            )}
            
            <div className="flex space-x-4 mt-4">
              <button 
                type="button"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                onClick={handleExtractIssues}
                disabled={messages.length < 3}
              >
                会話から論点をまとめる
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 論点タブのコンテンツ
  const DiscussionTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
        <div>
          <h2 className="text-xl font-semibold">論点</h2>
          <p className="text-gray-600 text-sm">会話から抽出された重要な話題と合意形成が必要な事項</p>
        </div>
      </div>

      {/* 論点生成中ローディングUI */}
      {isExtractingIssues && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">AIが論点を生成中です。しばらくお待ちください…</p>
        </div>
      )}
      {!isExtractingIssues && !loading && (
        <>
          {/* データなしの場合 */}
          {issues.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p className="text-gray-600 mb-4">まだ論点が抽出されていません</p>
              <button 
                onClick={() => setActiveTab('conversation')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                会話タブで論点を抽出する
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-8 bg-gray-50 p-5 rounded-lg border border-gray-100">
                <h3 className="font-medium text-lg text-gray-700 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  論点サマリー
                </h3>
                <div className="flex flex-wrap gap-6">
                  {/* 合意済み */}
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-emerald-800">{issues.filter(issue => issue.classification === 'agreed').length}</div>
                      <div className="text-sm text-emerald-600">合意済み</div>
                    </div>
                  </div>
                  {/* 協議中 */}
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-amber-800">{issues.filter(issue => issue.classification === 'discussing').length}</div>
                      <div className="text-sm text-amber-600">協議中</div>
                    </div>
                  </div>
                  {/* 意見相違 */}
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-rose-800">{issues.filter(issue => issue.classification === 'disagreed').length}</div>
                      <div className="text-sm text-rose-600">意見相違</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 論点リスト - トピック別にグループ化 */}
              <div className="space-y-6">
                {/* 論点をトピックごとにグループ化 */}
                {Array.from(new Set(issues.map(issue => issue.topic || '未分類'))).map(topic => (
                  <div key={topic} className="">
                    <div className="divide-y divide-transparent">
                      {issues.filter(issue => (issue.topic || '未分類') === topic).map(issue => {
                        // 色分け用クラス
                        let cardBg = '';
                        let badgeBg = '';
                        let badgeText = '';
                        let badgeIcon = null;
                        if (issue.classification === 'agreed') {
                          cardBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                          badgeBg = 'bg-emerald-100 text-emerald-700';
                          badgeText = '合意済み';
                          badgeIcon = (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                          );
                        } else if (issue.classification === 'discussing') {
                          cardBg = 'bg-amber-50 border-amber-200 text-amber-900';
                          badgeBg = 'bg-amber-100 text-amber-700';
                          badgeText = '協議中';
                          badgeIcon = (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                          );
                        } else if (issue.classification === 'disagreed') {
                          cardBg = 'bg-rose-50 border-rose-200 text-rose-900';
                          badgeBg = 'bg-rose-100 text-rose-700';
                          badgeText = '意見相違';
                          badgeIcon = (
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                          );
                        }

                        return (
                          <div
                            key={issue.id}
                            className={`relative rounded-xl border shadow-sm p-5 mb-4 flex flex-col gap-2 ${cardBg}`}
                            style={{ minHeight: '100px' }}
                          >
                            {/* バッジを右上に小さく */}
                            <div className={`absolute top-4 right-4 flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm ${badgeBg}`}
                              style={{ zIndex: 2 }}>
                              {badgeIcon}
                              {badgeText}
                            </div>
                            {/* タイトル（topic） */}
                            <div className="font-bold text-base mb-1 flex items-center gap-2">
                              <span>{issue.topic || '論点'}</span>
                            </div>
                            {/* 内容 */}
                            <p className="text-base leading-relaxed mb-1 break-words">{issue.content}</p>
                            {/* 追加情報 */}
                            {issue.classification === 'disagreed' && (
                              <div className="mt-2 text-xs text-rose-700 bg-rose-100 p-2 rounded">
                                <span className="font-medium">意見の相違：</span>この項目について参加者間で意見が分かれています。詳細な話し合いが必要です。
                              </div>
                            )}
                            {issue.classification === 'agreed' && (
                              <div className="mt-2 text-xs text-emerald-700 bg-emerald-100 p-2 rounded">
                                <span className="font-medium">合意事項：</span>この項目については全員の合意が得られています。
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-8">
                <button 
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  onClick={() => setActiveTab('conversation')}
                >
                  会話に戻る
                </button>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  onClick={() => setActiveTab('proposal')}
                >
                  提案を見る
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // 署名タブのコンテンツ
  const SignatureTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
        </svg>
        <div>
          <h2 className="text-xl font-semibold">署名</h2>
          <p className="text-gray-600 text-sm">最終提案に基づいた協議書への電子署名</p>
        </div>
      </div>
      
      <div className="bg-indigo-50 rounded-lg p-5 border border-indigo-200 mb-8">
        <div className="flex items-start">
          <div className="bg-indigo-100 rounded-full p-2 mr-4 mt-1">
            <svg className="w-6 h-6 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-indigo-800 mb-2">電子署名について</h3>
            <p className="text-indigo-700 text-sm">
              この電子署名は<span className="font-medium">法的効力</span>を持ちます。署名することで、あなたは協議書の内容に同意したことになります。
              全員の署名が完了すると、正式な遺産分割協議書として効力が発生します。
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-8">
        <h3 className="font-medium text-lg flex items-center mb-4">
          <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
          署名状況
        </h3>
        <div className="overflow-hidden bg-white shadow sm:rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名前
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  署名日時
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-800 font-medium">テ</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">テストユーザー</div>
                      <div className="text-sm text-gray-500">あなた</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {signatures.find(s => s.user_name === 'テストユーザー') ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      署名済み
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      署名待ち
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {signatures.find(s => s.user_name === 'テストユーザー')?.signed_at ? 
                    new Date(signatures.find(s => s.user_name === 'テストユーザー')!.signed_at).toLocaleDateString() + ' ' + 
                    new Date(signatures.find(s => s.user_name === 'テストユーザー')!.signed_at).toLocaleTimeString() : 
                    '-'}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-pink-100 rounded-full flex items-center justify-center">
                      <span className="text-pink-800 font-medium">花</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">山田花子</div>
                      <div className="text-sm text-gray-500">関係者</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {signatures.find(s => s.user_name === '山田花子') ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      署名済み
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      署名待ち
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {signatures.find(s => s.user_name === '山田花子')?.signed_at ? 
                    new Date(signatures.find(s => s.user_name === '山田花子')!.signed_at).toLocaleDateString() + ' ' + 
                    new Date(signatures.find(s => s.user_name === '山田花子')!.signed_at).toLocaleTimeString() : 
                    '-'}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-800 font-medium">太</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">田中太郎</div>
                      <div className="text-sm text-gray-500">関係者</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {signatures.find(s => s.user_name === '田中太郎') ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      署名済み
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      署名待ち
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {signatures.find(s => s.user_name === '田中太郎')?.signed_at ? 
                    new Date(signatures.find(s => s.user_name === '田中太郎')!.signed_at).toLocaleDateString() + ' ' + 
                    new Date(signatures.find(s => s.user_name === '田中太郎')!.signed_at).toLocaleTimeString() : 
                    '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 署名入力エリア */}
      {!signatures.find(s => s.user_name === 'テストユーザー') && (
        <div className="bg-white border-2 border-indigo-200 rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="font-medium text-lg mb-4 flex items-center">
            <svg className="w-5 h-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
            あなたの署名を入力してください
          </h3>
          
          <div className="mb-4">
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              署名用PIN（4桁以上）
            </label>
            <div className="relative">
              <input
                type="password"
                id="pin"
                value={signingPin}
                onChange={(e) => setSigningPin(e.target.value)}
                placeholder="署名用PINを入力"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 pl-10"
                minLength={4}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSign}
            disabled={signingPin.length < 4 || loading}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
                署名して同意
              </>
            )}
          </button>
        </div>
      )}
      
      {/* 署名済みメッセージ */}
      {signatures.find(s => s.user_name === 'テストユーザー') && (
        <div className="border-green-500 border-2 rounded-lg p-6 mb-6 bg-green-50">
          <div className="flex items-center mb-4">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-medium text-lg text-green-700">あなたは署名済みです</h3>
          </div>
          <p className="text-green-600 pl-11">
            <span className="font-medium">{new Date(signatures.find(s => s.user_name === 'テストユーザー')!.signed_at).toLocaleDateString()}</span> 
            <span className="mx-1">に署名しました。</span>
            <span className="text-xs bg-green-100 px-2 py-1 rounded ml-2">
              {new Date(signatures.find(s => s.user_name === 'テストユーザー')!.signed_at).toLocaleTimeString()}
            </span>
          </p>
        </div>
      )}
      
      <div className="mt-6 border-t border-gray-200 pt-4">
        <p className="text-sm text-gray-600 flex items-start">
          <svg className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>
            全員の署名が完了すると、本協議書は法的効力を持ちます。
            署名はタイムスタンプ付きで記録され、改ざんすることはできません。
          </span>
        </p>
      </div>
    </div>
  );

  // 提案タブのコンテンツ
  const ProposalTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h2 className="text-xl font-semibold">提案</h2>
            <p className="text-gray-600 text-sm">ニーズに合わせた最適な住まい案</p>
          </div>
        </div>
        <button
          onClick={handleCreateProposal}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          新しい提案を作成
        </button>
      </div>
      
      {/* 提案なしの場合 */}
      {proposals.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="text-gray-600 mb-4">このプロジェクトにはまだ提案がありません</p>
          <p className="text-gray-500 mb-4">上のボタンから新しい提案を作成するか、会話を続けてAIに提案を作成してもらいましょう</p>
          <button
            onClick={() => setActiveTab('conversation')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            会話に戻る
          </button>
        </div>
      ) : (
        <div>
          {/* 提案フィルター/ソートオプション */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6 flex items-center">
            <div className="mr-4">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
              </svg>
            </div>
            <div className="text-sm text-gray-700">
              <span className="font-medium">提案件数: {proposals.length}件</span>
              <span className="mx-3">|</span>
              <span className="text-indigo-600 font-medium">お気に入り: {proposals.filter(p => p.selected).length}件</span>
            </div>
          </div>
                
          {/* 提案カードグリッド */}
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
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={true} userName="テストユーザー" />
      <main className="flex-grow bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <Link 
              href="/projects" 
              className="text-indigo-600 hover:text-indigo-800 flex items-center mb-2"
            >
              ← ダッシュボードに戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600 mt-2">{project.description}</p>
            <p className="text-sm text-gray-500 mt-1">
              ステータス: 進行中 • メンバー: 3人 • 作成日: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
          
          {/* タブナビゲーション */}
          <div className="mb-6 bg-gray-50 rounded-t-lg border border-gray-200 overflow-hidden">
            <div className="flex shadow-sm">
              <TabButton tab="conversation" label="会話" />
              <TabButton tab="discussion" label="論点" />
              <TabButton tab="proposal" label="提案" />
              <TabButton tab="signature" label="署名" />
            </div>
          </div>
          
          {/* タブコンテンツ */}
          <div>
            {activeTab === 'conversation' && <ConversationTab />}
            {activeTab === 'discussion' && <DiscussionTab />}
            {activeTab === 'proposal' && <ProposalTab />}
            {activeTab === 'signature' && <SignatureTab />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 
