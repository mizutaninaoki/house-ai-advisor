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
  signatureApi,
  API_BASE_URL
} from '@/app/utils/api';
import AgreementPreview from '@/app/components/AgreementPreview';
import AgreementDocument from '@/app/components/AgreementDocument';
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
  user_id?: number; // ユーザーID
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
  user_id?: number; // ユーザーID
  timestamp: string;
  sentiment?: 'positive' | 'neutral' | 'negative'; // 感情分析結果
}

// 論点の型定義
interface Issue {
  id: number;
  content: string;
  type: 'positive' | 'negative' | 'neutral' | 'requirement';
  user_id?: number; // ユーザーID
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
  method?: 'text';
  value?: string;
}

// タブの型定義
type TabType = 'conversation' | 'discussion' | 'estate' | 'proposal' | 'signature';

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

// Estate型定義
interface Estate {
  id: number;
  project_id: number;
  name: string;
  address: string;
  property_tax_value?: number;
  type?: string;
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
  const [creatingAgreement, setCreatingAgreement] = useState(false); // 協議書作成中フラグ
  // プレビュー表示用の状態
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
  const [members, setMembers] = useState<{ user_id: number; user_name: string; name?: string; role: string }[]>([]);
  const [estates, setEstates] = useState<Estate[]>([]);
  
  const { backendUserId } = useAuth();
  const hasInitializedConversation = useRef(false);
  const userName = useAuth().user?.displayName || "テストユーザー";

  useEffect(() => {
    // activeTabが 'conversation' に設定された時に確実にAI相談員メッセージが表示されるようにする
    if (activeTab === 'conversation' && !loading && project && backendUserId && !hasInitializedConversation.current) {
      (async () => {
        try {
          const conversationData = await conversationApi.getConversation(projectId, backendUserId || undefined);
          const hasAiMessages = conversationData.some((msg: Message) => msg.speaker === "AI相談員");
          if (!hasAiMessages) {
            displayInitialAiMessage(project);
            hasInitializedConversation.current = true;
          }
        } catch (error) {
          console.error('会話タブ表示時のメッセージ確認エラー:', error);
          displayInitialAiMessage(project);
          hasInitializedConversation.current = true;
        }
      })();
    }

    // プロジェクトデータ取得
    if (!isNaN(projectId) && projectId > 0 && loading) {
      const fetchProjectData = async () => {
        try {
          setLoading(true);
          // プロジェクト詳細の取得
          const projectData = await projectApi.getProject(projectId);
          setProject(projectData);
          // プロジェクトに関連する提案の取得（ログインユーザーのもののみ）
          let formattedProposals: Proposal[] = [];
          if (backendUserId) {
            const proposalsData: ApiProposal[] = await proposalApi.getProposals(projectId, backendUserId);
            formattedProposals = (proposalsData as ApiProposal[]).map((proposal: ApiProposal) => ({
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
          }
          setProposals(formattedProposals);
          // 会話履歴の取得
          try {
            const conversationData = await conversationApi.getConversation(projectId, backendUserId || undefined);
            setMessages(conversationData);
            const hasAiMessages = conversationData.some((msg: Message) => msg.speaker === "AI相談員");
            if (!hasAiMessages && !hasInitializedConversation.current) {
              hasInitializedConversation.current = true;
              displayInitialAiMessage(projectData);
            }
          } catch (convErr) {
            console.error('会話データ取得エラー:', convErr);
            if (!hasInitializedConversation.current) {
              hasInitializedConversation.current = true;
              displayInitialAiMessage(projectData);
            }
          }
          // 論点データの取得（ログインユーザーのもののみ）
          try {
            const issuesUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/issues?project_id=${projectId}${backendUserId ? `&user_id=${backendUserId}` : ''}`;
            const issuesData = await fetch(issuesUrl);
            if (issuesData.ok) {
              const issues = await issuesData.json();
              setIssues(issues);
            }
          } catch (issueErr) {
            console.error('論点データ取得エラー:', issueErr);
          }
          // 署名情報は協議書が存在する場合のみ取得するため、ここでは初期化のみ
          setSignatures([]);
          setError(null);
          // 不動産一覧の取得
          try {
            const estatesData = await projectApi.getEstates(projectId);
            setEstates(estatesData);
          } catch (estateErr) {
            console.error('不動産データ取得エラー:', estateErr);
          }
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

    // プロジェクトデータ取得後の論点・提案・メッセージ取得
    if (project && !loading && backendUserId) {
      // 会話データの再取得（ユーザー訪問時に確実にAI相談員のメッセージが表示されるようにするため）
      const fetchConversation = async () => {
        try {
          const conversationData = await conversationApi.getConversation(projectId, backendUserId || undefined);
          setMessages(conversationData);
          // AI相談員からの会話がない場合は初期メッセージを表示
          const hasAiMessages = conversationData.some((msg: Message) => msg.speaker === "AI相談員");
          if (!hasAiMessages && !hasInitializedConversation.current) {
            hasInitializedConversation.current = true;
            displayInitialAiMessage(project);
          }
        } catch (error) {
          console.error('会話データ再取得エラー:', error);
          if (!hasInitializedConversation.current) {
            hasInitializedConversation.current = true;
            displayInitialAiMessage(project);
          }
        }
      };
      fetchConversation();
      
      const fetchIssues = async () => {
        try {
          const issuesData = await issueApi.getIssues(projectId, backendUserId);
          setIssues(issuesData);
        } catch (error) {
          console.error('論点データ取得エラー:', error);
        }
      };
      fetchIssues();

      // 提案データの取得（ログインユーザーのもののみ）
      const fetchProposals = async () => {
        try {
          const proposalsData: ApiProposal[] = await proposalApi.getProposals(projectId, backendUserId);
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
        } catch (error) {
          console.error('提案データ取得エラー:', error);
        }
      };
      fetchProposals();
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
            // 署名リストも取得（プロジェクト全員に公開）
            try {
              const sigs = await signatureApi.getSignaturesByAgreement(data.id);
              setSignatures(sigs);
            } catch (sigErr) {
              console.error('署名データ取得エラー:', sigErr);
              setSignatures([]);
            }
          } else if (selectedAgreementProposal) {
            const aiAgreement = await agreementApi.generateAgreementAI(projectId, Number(selectedAgreementProposal.id));
            setAgreement(aiAgreement);
            setAgreementContent(aiAgreement.content);
            // 署名リストも取得（プロジェクト全員に公開）
            try {
              const sigs = await signatureApi.getSignaturesByAgreement(aiAgreement.id);
              setSignatures(sigs);
            } catch (sigErr) {
              console.error('署名データ取得エラー:', sigErr);
              setSignatures([]);
            }
          } else {
            setAgreement(null);
            setAgreementContent('');
            setSignatures([]);
          }
        } catch (err) {
          console.error('協議書取得エラー:', err);
          setAgreement(null);
          setAgreementContent('');
          setSignatures([]);
        } finally {
          setAgreementLoading(false);
        }
      })();
    }

    // 署名タブで署名状況を定期的に更新（プロジェクト全員に公開）
    let signatureInterval: NodeJS.Timeout | null = null;
    if (activeTab === 'signature' && agreement) {
      signatureInterval = setInterval(async () => {
        try {
          const sigs = await signatureApi.getSignaturesByAgreement(agreement.id);
          setSignatures(sigs);
        } catch (sigErr) {
          console.error('署名状況更新エラー:', sigErr);
        }
      }, 5000); // 5秒ごとに署名状況を更新
    }

    // プロジェクト参加メンバー一覧の取得
    const fetchMembers = async () => {
      try {
        const membersData: Array<{ user_id: number; user_name?: string; name?: string; role: string }> = await projectApi.getProjectMembers(projectId);
        setMembers(membersData.map((m) => ({
          user_id: m.user_id,
          user_name: m.user_name || `ユーザー${m.user_id}`,
          name: m.name,
          role: m.role
        })));
      } catch {
        setMembers([]);
      }
    };
    if (projectId) fetchMembers();

    return () => {
      if (signatureInterval) {
        clearInterval(signatureInterval);
      }
    };
  }, [projectId, loading, project, activeTab, selectedAgreementProposal, backendUserId, hasInitializedConversation.current]);

  // プロジェクト情報を基に初期AIメッセージを表示
  const displayInitialAiMessage = (projectData: Project) => {
    const initialMessage: Message = {
      id: Date.now(),
      content: getInitialGreeting(projectData),
      speaker: "AI相談員",
      timestamp: new Date().toISOString(),
      sentiment: 'neutral'
    };
    
    // メッセージをDBに保存（AI相談員の質問にuser_idを設定）
    conversationApi.saveMessage({
      project_id: projectId,
      content: initialMessage.content,
      speaker: initialMessage.speaker,
      user_id: backendUserId || undefined, // AI相談員の質問も特定のユーザーに対するものとして記録
      sentiment: initialMessage.sentiment
    }).then(savedMessage => {
      // 保存したメッセージをメッセージリストに追加
      setMessages(prevMessages => [{ 
        ...savedMessage, 
        // バックエンドから返されたプロパティがなければ初期値を設定
        id: savedMessage.id || initialMessage.id,
        timestamp: savedMessage.timestamp || initialMessage.timestamp,
        sentiment: savedMessage.sentiment || initialMessage.sentiment
      }, ...prevMessages]);
    })
    .catch(err => console.error('初期メッセージの保存に失敗:', err));
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



  // 録音完了時の処理
  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      // 音声処理中の状態を設定
      setTranscription('音声を処理中...');
      
      // 音声データを送信して文字起こし
      const result = await conversationApi.transcribeAndSave(
        projectId,
        audioBlob,
        userName, // 実際のユーザー名を使用
        backendUserId || undefined // ユーザーIDを設定
      );
      
      // メッセージリストに追加
      if (result.message) {
        // バックエンドから最新メッセージリストを取得して更新（ユーザーIDでフィルタリング）
        const updatedMessages = await conversationApi.getConversation(projectId, backendUserId || undefined);
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
      const aiResponseObj = await fetch(`${API_BASE_URL}/api/analysis/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: currentMessages,
          user_message: userMessage,
          project_id: projectId,
          user_id: backendUserId
        })
      })
        .then(res => res.json())
        .catch(() => ({ reply: 'AI相談員の応答取得に失敗しました', project_id: projectId, user_id: backendUserId }));
      const aiResponse = aiResponseObj.reply;
      
      // メッセージをDBに保存（AI相談員の応答にuser_idを設定）
      await conversationApi.saveMessage({
        project_id: projectId,
        content: aiResponse,
        speaker: "AI相談員",
        user_id: backendUserId || undefined, // AI相談員の応答も特定のユーザーに対するものとして記録
        sentiment: 'neutral'
      });
      
      // 保存後に最新のメッセージリストを取得（ユーザーIDでフィルタリング）
      const updatedMessages = await conversationApi.getConversation(projectId, backendUserId || undefined);
      setMessages(updatedMessages);
    } catch (error) {
      console.error('AI応答生成エラー:', error);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // モックAI応答生成（実際の実装ではバックエンドのAI APIを使用）
  // この関数は不要なので削除

  // 論点抽出処理
  const handleExtractIssues = async () => {
    try {
      setActiveTab('discussion'); // まず論点タブに切り替え
      setIsExtractingIssues(true); // すぐローディング表示
      setError(null);
      // バックエンドAPIを呼び出して会話から論点を抽出
      const result = await issueApi.extractAndSaveIssues(projectId, backendUserId || undefined);
      // 抽出された論点データを取得（ログインユーザーのもののみ）
      const extractedIssues = await issueApi.getIssues(projectId, backendUserId || undefined);
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
        case 'estate':
          return (
            <svg className="w-7 h-7 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
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
        {tab === 'discussion' && issues.filter(issue => issue.user_id === backendUserId).length > 0 && (
          <span className={`absolute top-2 right-4 px-1.5 py-0.5 rounded-full text-xs font-bold transition-all duration-200
            ${isActive ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-800'}`}
          >
            {issues.filter(issue => issue.user_id === backendUserId).length}
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
        <Header isLoggedIn={true} />
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
        <Header isLoggedIn={true} />
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
  const ConversationTab = () => {
    // ユーザー発言のみ（AI相談員を除く）を感情分析対象とする
    const userOnlyMessages = messages.filter(m => m.speaker !== 'AI相談員' && m.user_id === backendUserId);
    return (
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
                      width: `${userOnlyMessages.filter(m => m.sentiment === 'negative').length / Math.max(userOnlyMessages.length, 1) * 100}%`,
                      borderTopLeftRadius: '9999px',
                      borderBottomLeftRadius: '9999px',
                      marginRight: userOnlyMessages.filter(m => m.sentiment === 'neutral').length > 0 ? '2px' : userOnlyMessages.filter(m => m.sentiment === 'positive').length > 0 ? '2px' : '0',
                    }}
                  >
                    {userOnlyMessages.filter(m => m.sentiment === 'negative').length > 0 && (
                      <span className="drop-shadow-sm">
                        否定的 {userOnlyMessages.filter(m => m.sentiment === 'negative').length}件
                      </span>
                    )}
                  </div>
                  {/* 中立的 */}
                  <div
                    className="flex items-center justify-center h-full bg-yellow-400 text-white text-xs font-bold transition-all duration-300"
                    style={{
                      width: `${userOnlyMessages.filter(m => m.sentiment === 'neutral').length / Math.max(userOnlyMessages.length, 1) * 100}%`,
                      marginRight: userOnlyMessages.filter(m => m.sentiment === 'positive').length > 0 ? '2px' : '0',
                    }}
                  >
                    {userOnlyMessages.filter(m => m.sentiment === 'neutral').length > 0 && (
                      <span className="drop-shadow-sm">
                        中立的 {userOnlyMessages.filter(m => m.sentiment === 'neutral').length}件
                      </span>
                    )}
                  </div>
                  {/* 肯定的 */}
                  <div
                    className="flex items-center justify-center h-full bg-emerald-500 text-white text-xs font-bold transition-all duration-300"
                    style={{
                      width: `${userOnlyMessages.filter(m => m.sentiment === 'positive').length / Math.max(userOnlyMessages.length, 1) * 100}%`,
                      borderTopRightRadius: '9999px',
                      borderBottomRightRadius: '9999px',
                    }}
                  >
                    {userOnlyMessages.filter(m => m.sentiment === 'positive').length > 0 && (
                      <span className="drop-shadow-sm">
                        肯定的 {userOnlyMessages.filter(m => m.sentiment === 'positive').length}件
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between px-2 mb-2">
                <div className="w-1/3 text-center text-xs text-rose-700">{userOnlyMessages.filter(m => m.sentiment === 'negative').length}件</div>
                <div className="w-1/3 text-center text-xs text-yellow-600">{userOnlyMessages.filter(m => m.sentiment === 'neutral').length}件</div>
                <div className="w-1/3 text-center text-xs text-emerald-700">{userOnlyMessages.filter(m => m.sentiment === 'positive').length}件</div>
              </div>
              <div className="text-sm text-gray-600">
                会話の中で表明された感情の傾向を表しています。これらの情報は論点抽出や提案作成に活用されます。
              </div>
            </div>
          </div>
          
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
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  {/* 録音・処理中表示を削除（固定ローディングに移動） */}
                  
                  {/* メッセージ表示 - プロジェクトの全会話を表示 */}
                  {messages.map((message, index) => (
                    <div
                      key={`${message.id}-${index}`} 
                      className={`flex ${message.speaker !== 'AI相談員' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.speaker !== 'AI相談員' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-semibold text-sm">{message.speaker}</div>
                          {message.sentiment && message.speaker !== 'AI相談員' && (
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
  };

  // 論点タブのコンテンツ
  const DiscussionTab = () => {
    // ログインユーザーの論点のみをフィルタリング
    const userIssues = issues.filter(issue => issue.user_id === backendUserId);
    
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <div>
            <h2 className="text-xl font-semibold">論点</h2>
            <p className="text-gray-600 text-sm">あなたの会話から抽出された重要な話題と合意形成が必要な事項</p>
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
          {userIssues.length === 0 ? (
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
                    <div className="text-2xl font-bold text-emerald-800">{userIssues.filter(issue => issue.classification === 'agreed').length}</div>
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
                    <div className="text-2xl font-bold text-amber-800">{userIssues.filter(issue => issue.classification === 'discussing').length}</div>
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
                    <div className="text-2xl font-bold text-rose-800">{userIssues.filter(issue => issue.classification === 'disagreed').length}</div>
                    <div className="text-sm text-rose-600">意見相違</div>
                  </div>
                </div>
                </div>
              </div>

              {/* 論点リスト - トピック別にグループ化 */}
              <div className="space-y-6">
                {/* 論点をトピックごとにグループ化 */}
                {Array.from(new Set(userIssues.map(issue => issue.topic || '未分類'))).map(topic => (
                  <div key={topic} className="">
                    <div className="divide-y divide-transparent">
                      {userIssues.filter(issue => (issue.topic || '未分類') === topic).map(issue => {
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
  };

  // 署名タブのコンテンツ
  const SignatureTab = () => {
    const userName = useAuth().user?.displayName;
    
    // 署名済み判定：厳密なuser_idまたはuser_nameの完全一致で判定
    const mySignature = signatures.find(s => {
      // バックエンドのuser_idがある場合は、これを最優先で使用
      if (backendUserId && s.user_id) {
        return s.user_id === backendUserId;
      }
      // user_idがない場合のみ、user_nameの完全一致で判定
      if (userName && s.user_name) {
        return s.user_name === userName;
      }
      return false;
    });
    
    // デバッグ情報（開発環境のみ）
    if (process.env.NODE_ENV === 'development') {
      console.log('自分の署名判定:', {
        userName,
        backendUserId,
        mySignature,
        allSignatures: signatures,
        匹配方法: backendUserId ? 'user_id' : 'user_name',
        検索対象: backendUserId || userName
      });
    }

      const handleSignatureComplete = async (method: 'text', value: string) => {
    if (!agreement || !backendUserId) return;
    try {
      const newSignature = await signatureApi.createSignature({
        agreement_id: agreement.id,
        user_id: backendUserId,
        method,
        value
      });
      
      // デバッグ情報（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log('署名完了:', newSignature);
      }
      
      // 署名リストを再取得（プロジェクト全員に署名状況が即座に反映される）
      const sigs = await signatureApi.getSignaturesByAgreement(agreement.id);
      
      // デバッグ情報（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log('更新された署名リスト:', sigs);
      }
      
      setSignatures(sigs);
    } catch (error) {
      console.error('署名保存エラー:', error);
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
            <p className="text-gray-600 text-sm">最終提案に基づいた協議書への署名</p>
            <p className="text-blue-600 text-xs mt-1">※ 署名状況はプロジェクト全員にリアルタイムで公開されます</p>
          </div>
        </div>

        {agreement && agreementContent ? (
          <>
            <AgreementDocument
              agreement={agreement}
              agreementContent={agreementContent}
              project={project}
              members={members}
              signatures={signatures}
              isEditingAgreement={isEditingAgreement}
              editingContent={editingContent}
              agreementLoading={agreementLoading}
              onEditToggle={() => setIsEditingAgreement(true)}
              onPreviewToggle={() => setShowAgreementPreview(true)}
              onContentChange={setEditingContent}
              onSave={() => { setAgreementContent(editingContent); handleSaveAgreement(); }}
              onCancel={() => { setIsEditingAgreement(false); setEditingContent(agreementContent); }}
            />
            {showAgreementPreview && agreement && (
              <AgreementPreview
                projectName={project?.title || ''}
                projectDescription={project?.description || ''}
                agreementTitle={agreement.title || ''}
                agreementContent={agreementContent}
                members={members.map(m => ({id: m.user_id.toString(), name: m.name || m.user_name, role: m.role}))}
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
          </>
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
            currentUserName={userName || undefined}
            disabled={!!mySignature}
          />
        </div>
      </div>
    );
  };

  // 提案タブのコンテンツ
  const ProposalTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center">
          <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h2 className="text-xl font-semibold">提案</h2>
            <p className="text-gray-600 text-sm">あなたが生成したAI提案一覧</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row sm:gap-2">
          <button
            onClick={handleGenerateAiProposals}
            className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
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
      {/* 提案フィルター/ソートオプション */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center mb-2 sm:mb-0 mr-0 sm:mr-4">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
          </svg>
        </div>
        <div className="text-sm text-gray-700 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="font-medium">提案件数: {proposals.length}件</span>
          <span className="hidden sm:inline mx-3">|</span>
          <span className="text-indigo-600 font-medium">お気に入り: {proposals.filter(p => p.is_favorite).length}件</span>
        </div>
      </div>
      {/* 協議書作成中のローディング表示 */}
      {creatingAgreement && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-700 font-medium">協議書を作成中...</span>
          </div>
        </div>
      )}
      
      {/* 提案カードグリッド */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
  );

  // AI提案生成ハンドラ
  const handleGenerateAiProposals = async () => {
    setIsAiProcessing(true);
    try {
      // 論点・会話履歴を取得（ログインユーザーのもののみ）
      const issuesData = await issueApi.getIssues(projectId, backendUserId || undefined);
      // AI生成API呼び出し（この時点でDB保存済み）
      await generateProposals(projectId.toString(), issuesData, backendUserId || undefined);
      // ここでDB保存APIは呼ばず、リストを再取得するだけ（ログインユーザーのもののみ）
      if (backendUserId) {
        const proposalsData = await proposalApi.getProposals(projectId, backendUserId);
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
      }
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
    // 再取得してリスト更新（ログインユーザーのもののみ）
    if (backendUserId) {
      const proposalsData = await proposalApi.getProposals(projectId, backendUserId);
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
    }
  };

  // 協議書作成ボタン押下時のハンドラ
  const handleSelectForAgreement = async (proposal: Proposal) => {
    setCreatingAgreement(true);
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
      setCreatingAgreement(false);
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

  // 遺産タブのコンテンツ
  const EstateTab = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <svg className="w-7 h-7 text-indigo-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
        <div>
          <h2 className="text-xl font-semibold">遺産</h2>
        </div>
      </div>
      {estates.length === 0 ? (
        <div className="text-gray-500 text-center py-12">登録された遺産（不動産）はありません。</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-4 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">名称</th>
                <th className="py-2 px-4 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">住所</th>
                <th className="py-2 px-4 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">タイプ</th>
                <th className="py-2 px-4 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">固定資産税評価額（円）</th>
              </tr>
            </thead>
            <tbody>
              {estates.map((estate, idx) => (
                <tr key={estate.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="py-2 px-4 border-b border-gray-200 whitespace-nowrap">{estate.name}</td>
                  <td className="py-2 px-4 border-b border-gray-200 whitespace-nowrap">{estate.address}</td>
                  <td className="py-2 px-4 border-b border-gray-200 whitespace-nowrap">{estate.type || '-'}</td>
                  <td className="py-2 px-4 border-b border-gray-200 whitespace-nowrap">{estate.property_tax_value ? estate.property_tax_value.toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header isLoggedIn={true} />
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
            <div className="flex items-center mt-2">
              <span className="flex items-center mr-4">
                <svg className="h-4 w-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-4a4 4 0 11-8 0 4 4 0 018 0zm6 4v2a2 2 0 01-2 2h-1.5M3 16v2a2 2 0 002 2h1.5" /></svg>
                <span className="text-xs text-gray-500">{members.length > 0 ? members.length : '-'}人</span>
              </span>
              {project.status && (
                <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                  project.status === 'active' ? 'bg-green-100 text-green-800' :
                  project.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {project.status === 'active' ? '進行中' :
                   project.status === 'pending' ? '招待中' : '完了'}
                </span>
              )}
            </div>
          </div>
          
          {/* タブナビゲーション */}
          <div className="mb-6 bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
            <div className="flex rounded-lg shadow overflow-hidden mb-8 bg-white">
              <TabButton tab="estate" label="遺産" />
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
            {activeTab === 'estate' && <EstateTab />}
            {activeTab === 'proposal' && <ProposalTab />}
            {activeTab === 'signature' && <SignatureTab />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 
