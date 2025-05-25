'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import ProposalCard, { Proposal, ProposalPoint } from '@/app/components/ProposalCard';
import VoiceRecorder from '@/app/components/VoiceRecorder';
import { 
  projectApi,
  proposalApi,
  conversationApi,
  issueApi,
  generateProposals,
  agreementApi,
  signatureApi
} from '@/app/utils/api';
import AgreementPreview from '@/app/components/AgreementPreview';
import SignatureInput from '@/app/components/SignatureInput';
import { useAuth } from '@/app/auth/AuthContext';

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
  user_id?: number; // 追加
  user_name: string;
  signed_at: string;
  status: 'pending' | 'signed';
  method?: 'pin' | 'text';
  value?: string;
}

// タブの型定義
type TabType = 'conversation' | 'discussion' | 'proposal' | 'signature';

interface Agreement {
  id: number;
  project_id: number;
  proposal_id?: number;
  title?: string; // 追加
  content: string;
  status: string;
  is_signed: boolean;
  created_at: string;
  updated_at?: string;
}

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
  const [isAiProcessing, setIsAiProcessing] = useState(false); // AI処理中フラグ
  const [isExtractingIssues, setIsExtractingIssues] = useState(false); // 論点生成中フラグ
  // 協議書作成用に選択された提案
  const [selectedAgreementProposal, setSelectedAgreementProposal] = useState<Proposal | null>(null);
  // 協議書（Agreement）状態
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [agreementContent, setAgreementContent] = useState('');
  const [isEditingAgreement, setIsEditingAgreement] = useState(false);
  const [agreementLoading, setAgreementLoading] = useState(false);
  // プレビュー表示用の状態
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
  const [members, setMembers] = useState<{ user_id: number; user_name: string; role: string }[]>([]);
  
  const { backendUserId } = useAuth();
  const hasInitializedConversation = useRef(false); // 追加

  useEffect(() => {
    // プロジェクトデータ取得
    if (!isNaN(projectId) && projectId > 0 && loading) {
      const fetchProjectData = async () => {
        try {
          setLoading(true);
          // プロジェクト詳細の取得
          const projectData = await projectApi.getProject(projectId);
          setProject(projectData);
          // プロジェクトに関連する提案の取得
          const proposalsData: ApiProposal[] = await proposalApi.getProposals(projectId);
          const formattedProposals = (proposalsData as ApiProposal[]).map((proposal: ApiProposal) => ({
            id: proposal.id.toString(),
            title: proposal.title || '無題の提案',
            description: proposal.content || '',
            supportRate: proposal.support_rate || 0,
            points: (proposal.points || []).map((pt: { id?: number; type: string; content: string }, idx: number): ProposalPoint => ({
              id: pt.id ?? idx,
              type: pt.type as 'merit' | 'demerit' | 'cost' | 'effort',
              content: pt.content
            })),
            selected: proposal.is_selected || false,
            is_favorite: Boolean(proposal.is_favorite),
          }))
          .sort((a: Proposal, b: Proposal) => Number(b.id) - Number(a.id));
          setProposals(formattedProposals);
          // 会話履歴の取得
          try {
            const conversationData = await conversationApi.getConversation(projectId);
            setMessages(conversationData);
            if (conversationData.length === 0 && !hasInitializedConversation.current) {
              hasInitializedConversation.current = true;
              setTimeout(() => {
                displayInitialAiMessage(projectData);
              }, 1000);
            }
          } catch (convErr) {
            console.error('会話データ取得エラー:', convErr);
            if (!hasInitializedConversation.current) {
              hasInitializedConversation.current = true;
              setTimeout(() => {
                displayInitialAiMessage(projectData);
              }, 1000);
            }
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
          }
          setError(null);
        } catch (err) {
          console.error('データ取得エラー:', err);
          setError('プロジェクトデータの取得に失敗しました');
        } finally {
          setLoading(false);
        }
      };
      fetchProjectData();
      return;
    }

    // プロジェクトデータ取得後の論点取得
    if (project && !loading) {
      const fetchIssues = async () => {
        try {
          const issuesData = await issueApi.getIssues(projectId);
          setIssues(issuesData);
        } catch (error) {
          console.error('論点データ取得エラー:', error);
        }
      };
      fetchIssues();
    }

    // 署名タブ表示時の協議書取得・生成
    if (activeTab === 'signature') {
      setAgreementLoading(true);
      (async () => {
        try {
          const data = await agreementApi.getAgreementByProject(projectId);
          if (data) {
            setAgreement(data);
            setAgreementContent(data.content);
            // 署名リストも取得
            const sigs = await signatureApi.getSignaturesByAgreement(data.id);
            setSignatures(sigs);
          } else if (selectedAgreementProposal) {
            const aiAgreement = await agreementApi.generateAgreementAI(projectId, Number(selectedAgreementProposal.id));
            setAgreement(aiAgreement);
            setAgreementContent(aiAgreement.content);
            // 署名リストも取得
            const sigs = await signatureApi.getSignaturesByAgreement(aiAgreement.id);
            setSignatures(sigs);
          } else {
            setAgreement(null);
            setAgreementContent('');
            setSignatures([]);
          }
        } catch {
          setAgreement(null);
          setAgreementContent('');
          setSignatures([]);
        } finally {
          setAgreementLoading(false);
        }
      })();
    }

    // プロジェクト参加メンバー一覧の取得
    const fetchMembers = async () => {
      try {
        const membersData: Array<{ user_id: number; user_name?: string; role: string }> = await projectApi.getProjectMembers(projectId);
        console.log('membersData', membersData);
        setMembers(membersData.map((m) => ({
          user_id: m.user_id,
          user_name: m.user_name || `ユーザー${m.user_id}`,
          role: m.role
        })));
      } catch {
        setMembers([]);
      }
    };
    if (projectId) fetchMembers();
  }, [projectId, loading, project, activeTab, selectedAgreementProposal]);

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
        p.id === proposalId.toString() ? { ...p, is_favorite: Boolean(updatedProposal.is_favorite) } : p
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
        points: (newProposal.points || []).map((pt: { id?: number; type: string; content: string }, idx: number): ProposalPoint => ({
          id: pt.id ?? idx,
          type: pt.type as 'merit' | 'demerit' | 'cost' | 'effort',
          content: pt.content
        })),
        is_favorite: Boolean(newProposal.is_favorite),
      };
      
      setProposals([
        formattedProposal,
        ...proposals
      ]);
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

  // タブ切り替え用コンポーネント
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => {
    const getIcon = () => {
      switch (tab) {
        case 'conversation':
          return (
            <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          );
        case 'discussion':
          return (
            <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          );
        case 'proposal':
          return (
            <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          );
        case 'signature':
          return (
            <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          );
        default:
          return null;
      }
    };
    const isActive = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex-1 flex flex-col items-center justify-center py-2 transition-all duration-200 font-semibold relative
          ${isActive ? 'text-indigo-700 bg-white shadow z-10' : 'text-gray-500 hover:bg-gray-50 cursor-pointer'}
        `}
        style={{ minWidth: 0 }}
        aria-current={isActive ? 'page' : undefined}
      >
        {getIcon()}
        <span className="text-sm font-bold tracking-wide">{label}</span>
        {/* バッジ */}
        {tab === 'discussion' && issues.length > 0 && (
          <span className={`absolute top-2 right-4 px-1.5 py-0.5 rounded-full text-xs font-bold transition-all duration-200
            ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}
          >
            {issues.length}
          </span>
        )}
        {tab === 'proposal' && proposals.length > 0 && (
          <span className={`absolute top-2 right-4 px-1.5 py-0.5 rounded-full text-xs font-bold transition-all duration-200
            ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}
          >
            {proposals.length}
          </span>
        )}
        {/* アクティブインジケーター */}
        <span className={`absolute left-0 right-0 top-0 h-1 rounded-t-xl transition-all duration-300
          ${isActive ? 'bg-indigo-600' : 'bg-transparent'}`}></span>
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
  const SignatureTab = () => {
    const userName = useAuth().user?.displayName;
    const mySignature = userName ? signatures.find(s => s.user_name === userName) : undefined;

    const handleSignatureComplete = async (method: 'pin' | 'text', value: string) => {
      if (!agreement || !backendUserId) return;
      try {
        await signatureApi.createSignature({
          agreement_id: agreement.id,
          user_id: backendUserId,
          method,
          value
        });
        // 署名リストを再取得
        const sigs = await signatureApi.getSignaturesByAgreement(agreement.id);
        setSignatures(sigs);
      } catch {
        alert('署名の保存に失敗しました');
      }
    };

    // 編集用ローカルstate
    const [editingContent, setEditingContent] = useState(agreementContent);
    // 編集開始時のみ初期値をセット
    useEffect(() => {
      if (isEditingAgreement) {
        setEditingContent(agreementContent);
      }
    }, [isEditingAgreement]);

    return (
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

        {/* --- 協議書用紙風カード or 案内メッセージ --- */}
        {agreement && agreementContent ? (
          <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-lg border-2 border-gray-300 p-8 relative mb-10">
            <h2 className="text-2xl font-bold text-center mb-2 tracking-wide">{agreement.title || 'サンプルタイトル'}</h2>
            <div className="text-center text-gray-500 mb-6">{agreement?.created_at ? new Date(agreement.created_at).toLocaleDateString() : new Date().toLocaleDateString()}　{project?.title}</div>
            <div className="font-serif text-lg leading-relaxed mb-8 whitespace-pre-line min-h-[180px]">{agreementContent}</div>
            {/* ▼▼▼ 相続人ごとの署名状況 横並びリスト表示 ▼▼▼ */}
            <div className="flex flex-col gap-4 mt-10">
              {members.length === 0 ? (
                <div className="text-gray-400 text-sm py-8 w-full text-center border rounded-lg bg-gray-50">
                  相続人（メンバー）が登録されていません。
                </div>
              ) : (
                members.map(member => {
                  const sig = signatures.find(s => s.user_id === member.user_id);
                  return (
                    <div key={member.user_id} className="flex items-center gap-4 w-full">
                      {/* 左端ラベル */}
                      <span className="w-40 text-left text-base font-semibold text-gray-800">相続人</span>
                      {/* 下線（サイン欄風）＋署名済みなら上にユーザー名 */}
                      <span className="flex-1 relative h-6 flex items-center">
                        {/* 署名済みなら下線の上に契約書風フォントでユーザー名 */}
                        {sig && (
                          <span
                            className="absolute left-1/2 -translate-x-1/2 -top-1 font-serif font-bold text-lg text-gray-700 tracking-wider select-none leading-none p-0 m-0"
                            style={{letterSpacing: '0.15em', lineHeight: 1, padding: 0, margin: 0}}>
                            {member.user_name}
                          </span>
                        )}
                        <span className="w-full border-b border-gray-300 h-6 block"></span>
                      </span>
                      {/* 署名状況（右端） */}
                      <span className="flex items-center min-w-[120px] justify-end">
                        {sig ? (
                          <span className="flex items-center gap-2">
                            <svg width="48" height="48" viewBox="0 0 48 48" aria-label="同意済み印鑑">
                              <circle cx="24" cy="24" r="21" fill="#fff" stroke="#e11d48" strokeWidth="3.5" />
                              <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#e11d48" style={{fontFamily:'serif', letterSpacing: '0.1em'}}>同意</text>
                            </svg>
                            <span className="text-xs text-gray-500">{sig.signed_at ? new Date(sig.signed_at).toLocaleDateString() : ''}</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-400">
                            <svg width="48" height="48" viewBox="0 0 48 48" className="opacity-60" aria-label="未同意印鑑">
                              <circle cx="24" cy="24" r="21" fill="#fff" stroke="#bbb" strokeWidth="3.5" />
                              <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#bbb" style={{fontFamily:'serif', letterSpacing: '0.1em'}}>未</text>
                            </svg>
                            <span className="text-xs">署名待ち</span>
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="flex gap-2 mt-8 justify-end">
              {!isEditingAgreement && agreement && !signatures.find(s => s.user_name === 'テストユーザー') && (
                <button className="px-3 py-1 bg-indigo-500 text-white rounded" onClick={() => setIsEditingAgreement(true)} disabled={agreementLoading}>編集</button>
              )}
              <button
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setShowAgreementPreview(true)}
                disabled={!agreement}
              >
                協議書プレビュー
              </button>
            </div>
            {showAgreementPreview && agreement && (
              <AgreementPreview
                projectName={project?.title || ''}
                projectDescription={project?.description || ''}
                agreementTitle={agreement.title || ''}
                agreementContent={agreementContent}
                members={members.map(m => ({id: m.user_id.toString(), name: m.user_name, role: m.role}))}
                proposals={[]}
                createdAt={agreement.created_at ? new Date(agreement.created_at) : new Date()}
                signatures={signatures.map(s => ({
                  id: s.id.toString(),
                  name: s.user_name,
                  isComplete: s.status === 'signed',
                  date: s.signed_at ? new Date(s.signed_at) : undefined
                }))}
                onClose={() => setShowAgreementPreview(false)}
              />
            )}
            {isEditingAgreement && (
              <div className="mt-6">
                <textarea
                  className="w-full border rounded p-2 mb-2"
                  rows={8}
                  value={editingContent}
                  onChange={e => setEditingContent(e.target.value)}
                  placeholder="協議書の内容を入力してください"
                  title="協議書内容"
                />
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => { setAgreementContent(editingContent); handleSaveAgreement(); }} disabled={agreementLoading}>保存</button>
                  <button className="px-3 py-1 bg-gray-300 text-gray-700 rounded" onClick={() => { setIsEditingAgreement(false); setEditingContent(agreementContent); }}>キャンセル</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto bg-white shadow rounded-lg border-2 border-gray-200 p-12 text-center text-gray-500 text-lg my-12">
            協議書がまだ作成されていません。<br />
            提案タブから協議書を作成してください。
          </div>
        )}
        {/* 署名入力フォーム or 署名済み表示 */}
        <div className="max-w-2xl mx-auto mt-10">
          <SignatureInput
            onComplete={handleSignatureComplete}
            isComplete={!!mySignature}
            method={mySignature?.method}
            value={mySignature?.value}
          />
        </div>
      </div>
    );
  };

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
        <div className="flex gap-2">
          <button
            onClick={handleCreateProposal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            新しい提案を作成
          </button>
          <button
            onClick={handleGenerateAiProposals}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            disabled={isAiProcessing}
          >
            {isAiProcessing ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></span>
                生成中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  {/* シンプルなプラスマークアイコン */}
                  <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                AIで提案を作成
              </>
            )}
          </button>
        </div>
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
          {/* ローディング中案内 */}
          {agreementLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-indigo-500 mb-3"></div>
              <p className="text-gray-600">協議書をAIが作成中です。しばらくお待ちください…</p>
            </div>
          )}
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
              <span className="text-indigo-600 font-medium">お気に入り: {proposals.filter(p => p.is_favorite).length}件</span>
            </div>
          </div>
          {/* 提案カードグリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onToggleFavorite={() => handleToggleFavorite(parseInt(proposal.id))}
                onDelete={() => handleDeleteProposal(parseInt(proposal.id))}
                onUpdate={handleProposalUpdate}
                onSelectForAgreement={handleSelectForAgreement}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // AI提案生成ハンドラ
  const handleGenerateAiProposals = async () => {
    setIsAiProcessing(true);
    try {
      // 論点・会話履歴を取得
      const issuesData = await issueApi.getIssues(projectId);
      // AI生成API呼び出し（この時点でDB保存済み）
      await generateProposals(projectId.toString(), issuesData);
      // ここでDB保存APIは呼ばず、リストを再取得するだけ
      const proposalsData = await proposalApi.getProposals(projectId);
      const formattedProposals = (proposalsData as ApiProposal[]).map((proposal: ApiProposal) => ({
        id: proposal.id.toString(),
        title: proposal.title || '無題の提案',
        description: proposal.content || '',
        supportRate: proposal.support_rate || 0,
        points: (proposal.points || []).map((pt: { id?: number; type: string; content: string }, idx: number): ProposalPoint => ({
          id: pt.id ?? idx,
          type: pt.type as 'merit' | 'demerit' | 'cost' | 'effort',
          content: pt.content
        })),
        selected: proposal.is_selected || false,
        is_favorite: Boolean(proposal.is_favorite),
      }))
      .sort((a: Proposal, b: Proposal) => Number(b.id) - Number(a.id));
      setProposals(formattedProposals);
      setError(null);
    } catch {
      setError('AIによる提案生成に失敗しました');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // 提案カードのポイント操作ハンドラ
  const handleProposalUpdate = async (proposal: Proposal) => {
    await proposalApi.updateProposal(Number(proposal.id), {
      title: proposal.title,
      content: proposal.description,
      support_rate: proposal.supportRate
    });
    // 再取得してリスト更新
    const proposalsData = await proposalApi.getProposals(projectId);
    const formattedProposals = (proposalsData as ApiProposal[]).map((p: ApiProposal) => ({
      id: p.id.toString(),
      title: p.title || '無題の提案',
      description: p.content || '',
      supportRate: p.support_rate || 0,
      points: (p.points || []).map((pt: { id?: number; type: string; content: string }, idx: number): ProposalPoint => ({
        id: pt.id ?? idx,
        type: pt.type as 'merit' | 'demerit' | 'cost' | 'effort',
        content: pt.content
      })),
      selected: p.is_selected || false,
      is_favorite: Boolean(p.is_favorite),
    }))
    .sort((a: Proposal, b: Proposal) => Number(b.id) - Number(a.id));
    setProposals(formattedProposals);
  };

  // 協議書作成ボタン押下時のハンドラ
  const handleSelectForAgreement = async (proposal: Proposal) => {
    setAgreementLoading(true);
    setError(null);
    try {
      // AIで協議書を生成しDB保存
      const aiAgreement = await agreementApi.generateAgreementAI(projectId, Number(proposal.id));
      setAgreement(aiAgreement);
      setAgreementContent(aiAgreement.content);
      setSelectedAgreementProposal(proposal); // どの提案を元にしたか記録用
      setShowAgreementPreview(false); // プレビューは自動で開かない
      setActiveTab('signature'); // 生成完了後に遷移
    } catch {
      setError('協議書の生成に失敗しました');
    } finally {
      setAgreementLoading(false);
    }
  };

  // 協議書保存ハンドラ
  const handleSaveAgreement = async () => {
    if (!agreement) return;
    setAgreementLoading(true);
    try {
      const updated = await agreementApi.updateAgreement(agreement.id, { content: agreementContent });
      setAgreement(updated);
      setIsEditingAgreement(false);
    } catch {
      // エラー処理
    } finally {
      setAgreementLoading(false);
    }
  };

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
          <div className="mb-6 bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
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
