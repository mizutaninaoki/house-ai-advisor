'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChartBarIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import IssueMap, { Issue } from '@/app/components/IssueMap';
import ProposalCard, { Proposal } from '@/app/components/ProposalCard';
import PushToTalkButton from '@/app/components/PushToTalkButton';
import MessageBubble from '@/app/components/MessageBubble';
import SignatureInput from '@/app/components/SignatureInput';
import AgreementPreview from '@/app/components/AgreementPreview';
import { 
  extractIssues, 
  generateProposals, 
  updateIssueStatus,
  analyzeSentiment
} from '@/app/utils/api';

// 会話メッセージの型定義
interface Intention {
  type: 'wish' | 'requirement' | 'compromise' | 'rejection';
  content: string;
}

interface Conversation {
  id: string;
  message: string;
  isUser: boolean;
  sentimentScore?: number;
  intention?: Intention;
  keyPoint?: boolean;
  timestamp: Date;
}

export default function ProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'conversations' | 'issues' | 'proposals' | 'signatures'>('conversations');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // モックデータ
  const [project, setProject] = useState({
    id: projectId,
    name: `テストプロジェクト ${projectId}`,
    description: 'これはテスト用のプロジェクトです。',
    createdAt: new Date(),
    status: 'active',
    members: [
      { id: '1', name: 'テストユーザー', role: 'owner', email: 'test@example.com' },
      { id: '2', name: '山田花子', role: 'member', email: 'hanako@example.com' },
      { id: '3', name: '田中太郎', role: 'member', email: 'taro@example.com' },
    ]
  });
  
  const [conversations, setConversations] = useState<Conversation[]>([
    { 
      id: '1', 
      message: 'こんにちは、遺産分割の話し合いを始めましょう。', 
      isUser: false, 
      timestamp: new Date(Date.now() - 3600000 * 24) 
    },
    { 
      id: '2', 
      message: '父の遺産について、実家は私が住み続けたいと思っています。', 
      isUser: true, 
      sentimentScore: 0.65,
      intention: { type: 'wish', content: '実家に住み続けたいという希望が表明されています' },
      keyPoint: true,
      timestamp: new Date(Date.now() - 3600000 * 12) 
    },
    { 
      id: '3', 
      message: '私は現金の分配を希望します。実家には執着はありません。', 
      isUser: false, 
      sentimentScore: 0.8,
      intention: { type: 'compromise', content: '実家よりも現金を希望しており、柔軟性がある姿勢です' },
      timestamp: new Date(Date.now() - 3600000 * 6) 
    },
    { 
      id: '4', 
      message: '銀行預金はどのように分けるのがよいでしょうか？ 私としては教育費がかかるので少し多めに欲しいです。', 
      isUser: true, 
      sentimentScore: 0.5,
      intention: { type: 'wish', content: '教育費の必要性から預金を多めに希望' },
      timestamp: new Date(Date.now() - 3600000) 
    },
    { 
      id: '5', 
      message: '預金は法定相続分で良いですが、父の形見の時計だけは絶対に譲れません。', 
      isUser: false, 
      sentimentScore: 0.3,
      intention: { type: 'requirement', content: '父の形見の時計は譲れない条件として提示' },
      keyPoint: true,
      timestamp: new Date(Date.now() - 1800000) 
    },
    {
      id: '6',
      message: '実家の庭にある桜の木は残せるといいですね。子供の頃から思い出がたくさんあります。',
      isUser: true,
      sentimentScore: 0.7,
      intention: { type: 'wish', content: '実家の思い出の部分を残したいという希望' },
      timestamp: new Date(Date.now() - 900000)
    },
    {
      id: '7',
      message: '桜の木については配慮できると思います。他に大切にしたい思い出はありますか？',
      isUser: false,
      sentimentScore: 0.8,
      intention: { type: 'compromise', content: '思い出の品への配慮を示す姿勢' },
      timestamp: new Date(Date.now() - 600000)
    },
    {
      id: '8',
      message: '遺産分割では、全員が納得できる方法を探していきたいですね。',
      isUser: true,
      sentimentScore: 0.75,
      intention: { type: 'compromise', content: '公平な解決策を望む前向きな姿勢' },
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '9',
      message: 'その通りです。みなさんの希望をバランス良く考慮して進めていきましょう。',
      isUser: false,
      sentimentScore: 0.85,
      intention: { type: 'compromise', content: '全員の希望を尊重する意向' },
      timestamp: new Date()
    }
  ]);
  
  const [issues, setIssues] = useState<Issue[]>([
    { id: '1', title: '実家の扱い', description: '売却か継続保有か', agreementScore: 40 },
    { id: '2', title: '預金の分割方法', description: '均等か必要性に応じてか', agreementScore: 75 },
    { id: '3', title: '相続税の負担', description: '誰がどのように負担するか', agreementScore: 20 },
    { id: '4', title: '遺品の分配', description: '思い出の品の分け方', agreementScore: 60 }
  ]);
  
  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: '1',
      title: '実家は長男が相続し、他の相続人には現金で代償',
      description: '実家を売却せずに長男が住み続け、その代わりに他の相続人には預貯金から多めに分配する案',
      points: [
        { type: 'merit', content: '実家を維持できる' },
        { type: 'merit', content: '現金を必要とする相続人にはすぐに資金が入る' },
        { type: 'demerit', content: '不動産評価額の算定が難しい' },
        { type: 'cost', content: '代償金の用意が必要' }
      ],
      supportRate: 65
    },
    {
      id: '2',
      title: '実家を売却して全ての資産を現金化後に分割',
      description: '不動産を売却して現金化し、法定相続分に応じて分割する案',
      points: [
        { type: 'merit', content: '分かりやすく公平' },
        { type: 'merit', content: '全員が現金を受け取れる' },
        { type: 'demerit', content: '思い出のある実家を手放す必要がある' },
        { type: 'effort', content: '不動産売却の手続きが必要' }
      ],
      supportRate: 40
    }
  ]);
  
  const [signatures, setSignatures] = useState<Array<{id: string, name: string, isComplete: boolean, date?: Date}>>([
    { id: '1', name: 'テストユーザー', isComplete: false },
    { id: '2', name: '山田花子', isComplete: false },
    { id: '3', name: '田中太郎', isComplete: false }
  ]);
  
  useEffect(() => {
    // データ読み込みのシミュレーション
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, []);

  // 会話から論点を抽出
  const extractIssuesFromConversations = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('会話から論点を抽出しています...');
      
      // 会話メッセージをAPIに適した形式に変換
      const messages = conversations.map(conv => ({
        id: conv.id,
        text: conv.message,
        is_user: conv.isUser,
        timestamp: conv.timestamp.toISOString()
      }));
      
      // APIを呼び出して論点を抽出
      const result = await extractIssues(messages, projectId);
      
      if (result && result.issues && result.issues.length > 0) {
        // 論点をIssue型に変換して状態を更新
        const extractedIssues: Issue[] = result.issues.map(issue => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
          agreementScore: issue.agreement_score
        }));
        
        setIssues(extractedIssues);
        setStatusMessage('論点の抽出が完了しました');
        
        // 論点タブに自動的に切り替え
        setActiveTab('issues');
      } else {
        setStatusMessage('論点が見つかりませんでした。もう少し会話を続けてください。');
      }
    } catch (error) {
      console.error('論点抽出中にエラーが発生しました:', error);
      setStatusMessage('論点抽出中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
      // 3秒後にステータスメッセージをクリア
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };
  
  // 論点から提案を生成
  const generateProposalsFromIssues = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('論点から提案を生成しています...');
      
      // 論点をAPIに適した形式に変換
      const issuesForApi = issues.map(issue => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        agreement_score: issue.agreementScore
      }));
      
      // モックの不動産データ
      const estateData = {
        home_value: 50000000,
        other_assets: 30000000,
        location: '東京都世田谷区',
        built_year: 1995
      };
      
      // APIを呼び出して提案を生成
      const result = await generateProposals(projectId, issuesForApi, estateData);
      
      if (result && result.proposals && result.proposals.length > 0) {
        // 提案をProposal型に変換して状態を更新
        const generatedProposals: Proposal[] = result.proposals.map(prop => ({
          id: prop.id,
          title: prop.title,
          description: prop.description,
          points: prop.points || [],
          supportRate: prop.support_rate
        }));
        
        setProposals(generatedProposals);
        setStatusMessage('提案の生成が完了しました');
        
        // 提案タブに自動的に切り替え
        setActiveTab('proposals');
      } else {
        setStatusMessage('提案を生成できませんでした。論点の内容を見直してください。');
      }
    } catch (error) {
      console.error('提案生成中にエラーが発生しました:', error);
      setStatusMessage('提案生成中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
      // 3秒後にステータスメッセージをクリア
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };
  
  // 論点の合意度更新
  const updateIssueAgreement = async (issueId: string, newScore: number) => {
    try {
      setIsProcessing(true);
      
      // 更新データを作成
      const updates = [{ issue_id: issueId, agreement_score: newScore }];
      
      // APIを呼び出して論点の合意度を更新
      const result = await updateIssueStatus(updates);
      
      if (result && result.success) {
        // 成功したら状態を更新
        setIssues(prev => prev.map(issue => {
          if (issue.id === issueId) {
            return { ...issue, agreementScore: newScore };
          }
          return issue;
        }));
      }
    } catch (error) {
      console.error('論点の合意度更新中にエラーが発生しました:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 音声文字起こし後の処理
  const handleTranscription = async (text: string, sentimentScore?: number) => {
    let analyzedSentiment: number;
    let extractedIntention: Intention | undefined = undefined;
    
    try {
      // バックエンドAPIを使用した感情分析
      const sentimentResult = await analyzeSentiment(text, params.id as string, '遺産分割協議');
      analyzedSentiment = sentimentResult.sentiment_score;
      
      console.log(`感情分析結果:`, sentimentResult);
      
      // 意図抽出（感情スコアと検出されたキーワードに基づく）
      if (analyzedSentiment < 0.3) {
        extractedIntention = { 
          type: 'rejection', 
          content: '相続財産の分配に対する強い拒否' 
        };
      } else if (analyzedSentiment < 0.4) {
        extractedIntention = { 
          type: 'requirement', 
          content: '譲れない条件の提示' 
        };
      } else if (analyzedSentiment > 0.7) {
        extractedIntention = { 
          type: 'compromise', 
          content: '譲歩可能な妥協案の提示' 
        };
      } else {
        extractedIntention = { 
          type: 'wish', 
          content: '相続に関する希望の表明' 
        };
      }
    } catch (error) {
      console.error('感情分析APIエラー:', error);
      // エラー時のフォールバックとして簡易的な意図抽出を行う
      // エラー時は適切なデフォルト値を設定
      analyzedSentiment = sentimentScore !== undefined ? sentimentScore : 0.5;
      
      if (analyzedSentiment < 0.3) {
        extractedIntention = { 
          type: 'rejection', 
          content: '相続財産の分配に対する強い拒否' 
        };
      } else if (analyzedSentiment < 0.4) {
        extractedIntention = { 
          type: 'requirement', 
          content: '譲れない条件の提示' 
        };
      } else if (analyzedSentiment > 0.7) {
        extractedIntention = { 
          type: 'compromise', 
          content: '譲歩可能な妥協案の提示' 
        };
      } else {
        extractedIntention = { 
          type: 'wish', 
          content: '相続に関する希望の表明' 
        };
      }
    }
    
    // キーポイントかどうかの判定（感情分析スコアに基づく）
    const isKeyPoint = (extractedIntention?.type === 'rejection' && analyzedSentiment < 0.2) || 
                       (extractedIntention?.type === 'requirement' && analyzedSentiment < 0.4);
    
    // 新しいユーザーメッセージを追加
    const newMessage: Conversation = {
      id: Date.now().toString(),
      message: text,
      isUser: true,
      sentimentScore: analyzedSentiment,
      intention: extractedIntention,
      keyPoint: isKeyPoint,
      timestamp: new Date()
    };
    
    setConversations(prev => [...prev, newMessage]);
    
    // AIの応答をシミュレーション
    setTimeout(() => {
      // 入力テキストの感情に基づいて応答の感情を調整
      let responseEmotionScore: number;
      
      // ユーザーの発言が否定的なら、AIも少し否定的に（しかし少しポジティブ方向に寄せる）
      if (analyzedSentiment < 0.3) {
        // ユーザーが否定的な場合、AIは少し否定的～中立的に応答
        responseEmotionScore = Math.min(0.5, analyzedSentiment + 0.2);
      } else if (analyzedSentiment > 0.7) {
        // ユーザーが肯定的な場合、AIも肯定的に応答
        responseEmotionScore = Math.min(0.9, analyzedSentiment);
      } else {
        // それ以外は中立的な範囲で少し変動
        responseEmotionScore = 0.5 + (Math.random() * 0.2 - 0.1);
      }
      
      // 応答タイプは感情スコアに基づいて選択
      let responseType: 'wish' | 'requirement' | 'compromise' | 'rejection';
      
      if (analyzedSentiment < 0.3) {
        // 否定的な感情には拒否
        responseType = 'rejection';
      } else if (analyzedSentiment < 0.4) {
        // やや否定的な感情には要件
        responseType = 'requirement';
      } else if (analyzedSentiment > 0.7) {
        // 肯定的な感情には譲歩
        responseType = 'compromise';
      } else {
        // 中立的な感情には希望
        responseType = 'wish';
      }
      
      // 応答の意図内容を設定（responseTypeに基づく）
      const responseContent = {
        'wish': '希望が表明されています',
        'requirement': 'これは譲れない条件として示されています',
        'compromise': '柔軟に対応できる姿勢が示されています',
        'rejection': '拒否・反対の意向が示されています'
      }[responseType];
      
      // 応答テキストの内容をカスタマイズ（responseTypeに基づく）
      let responseMessage: string;
      
      if (responseType === 'rejection') {
        responseMessage = `「${text}」という強い意見をいただきました。他の相続人の利益も考慮して、より公平な解決策を検討する必要があります。`;
        // 拒否タイプの応答は常に否定的な感情スコアを設定
        responseEmotionScore = 0.2;
      } else if (responseType === 'requirement') {
        responseMessage = `「${text}」という条件が示されました。他の相続人の意向との調整が必要になります。`;
        responseEmotionScore = 0.35;  // 要件タイプは少し否定的
      } else if (responseType === 'wish') {
        responseMessage = `「${text}」というご希望を承りました。可能な限り実現できるよう検討しましょう。`;
        responseEmotionScore = 0.6;  // 希望タイプはやや肯定的
      } else {
        responseMessage = `「${text}」についてのご意見ありがとうございます。他の家族メンバーの意見も聞いて検討しましょう。`;
        responseEmotionScore = 0.7;  // 妥協タイプは肯定的
      }
      
      const aiResponse: Conversation = {
        id: (Date.now() + 1).toString(),
        message: responseMessage,
        isUser: false,
        sentimentScore: responseEmotionScore,
        intention: { type: responseType, content: responseContent },
        keyPoint: responseType === 'rejection' || responseType === 'requirement',
        timestamp: new Date()
      };
      setConversations(prev => [...prev, aiResponse]);
    }, 1000);
  };
  
  // 音声BLOBの処理
  const handleAudioRecorded = async (_audioBlob: Blob) => {
    // audioBlob変数にアンダースコアを追加して未使用変数のリントエラーを回避
    try {
      // ここではバックエンドAPIを使って音声処理
      // transcribeAudioとhandleTranscriptionは既に別のフローで連携しているのでコメントアウト
      /*
      const transcriptionResult = await transcribeAudio(audioBlob);
      if (transcriptionResult && transcriptionResult.text) {
        handleTranscription(transcriptionResult.text, transcriptionResult.confidence);
      }
      */
    } catch (error) {
      console.error('音声処理中にエラーが発生しました:', error);
    }
  };
  
  const handleProposalVote = (proposalId: string, support: boolean) => {
    // 提案への投票処理
    setProposals(prev => prev.map(proposal => {
      if (proposal.id === proposalId) {
        // 簡易的なシミュレーション: 賛成なら+10%、反対なら-10%
        const change = support ? 10 : -10;
        const newRate = Math.min(100, Math.max(0, proposal.supportRate + change));
        return { ...proposal, supportRate: newRate };
      }
      return proposal;
    }));
  };
  
  const handleSignComplete = (method: 'pin' | 'text', value: string) => {
    // 署名完了処理
    console.log(`署名完了: ${method} - ${value}`);
    
    // ステータスメッセージの設定
    setStatusMessage('署名が完了しました。協議書の処理を進めています...');
    
    // 署名状態の更新
    setSignatures(prev => prev.map((sig, index) => {
      if (index === 0) { // 現在のユーザーの署名を更新
        return { ...sig, isComplete: true, date: new Date() };
      }
      return sig;
    }));
    
    // すべての人が署名した場合、プロジェクトの状態を「完了」に更新
    const allSigned = signatures.every(sig => sig.isComplete);
    
    // 3秒後にステータスメッセージと状態を更新
    setTimeout(() => {
      if (allSigned) {
        setProject(prev => ({ ...prev, status: 'completed' }));
        setStatusMessage('すべての署名が完了しました。遺産分割協議が成立しました！');
      } else {
        setStatusMessage('署名が完了しました。他のメンバーの署名を待っています。');
      }
      
      // さらに3秒後にメッセージを消す（合計6秒）
      setTimeout(() => {
        setStatusMessage(null);
      }, 3000);
    }, 1500);
  };
  
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header isLoggedIn={true} userName="テストユーザー" />
        <main className="flex-grow flex items-center justify-center">
          <p>読み込み中...</p>
        </main>
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} userName="テストユーザー" />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{project.name}</h1>
          <Link 
            href="/dashboard" 
            className="flex items-center text-cyan-600 hover:text-cyan-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
        
        <p className="text-gray-600 mb-4">{project.description}</p>
          
        <div className="mt-4 flex items-center text-sm text-gray-500">
          <span>ステータス: {project.status === 'active' ? '進行中' : project.status === 'pending' ? '招待中' : '完了'}</span>
          <span className="mx-2">•</span>
          <span>メンバー: {project.members.length}人</span>
          <span className="mx-2">•</span>
          <span>作成日: {project.createdAt.toLocaleDateString('ja-JP')}</span>
        </div>

        {/* ステータスメッセージ */}
        {statusMessage && (
          <div className="my-4 p-2 bg-blue-50 text-blue-700 rounded">
            {statusMessage}
          </div>
        )}
        
        {/* タブナビゲーション */}
        <div className="mt-6 mb-6 border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`py-4 px-6 text-center flex flex-col items-center justify-center min-w-[100px] transition-all ${
                activeTab === 'conversations'
                  ? 'border-b-4 border-cyan-500 text-cyan-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <ChatBubbleLeftRightIcon className={`h-6 w-6 mb-1 ${activeTab === 'conversations' ? 'text-cyan-500' : 'text-gray-500'}`} />
              <span className="font-medium text-base">会話</span>
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className={`py-4 px-6 text-center flex flex-col items-center justify-center min-w-[100px] transition-all ${
                activeTab === 'issues'
                  ? 'border-b-4 border-cyan-500 text-cyan-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className={`h-6 w-6 mb-1 ${activeTab === 'issues' ? 'text-cyan-500' : 'text-gray-500'}`} />
              <span className="font-medium text-base">論点</span>
            </button>
            <button
              onClick={() => setActiveTab('proposals')}
              className={`py-4 px-6 text-center flex flex-col items-center justify-center min-w-[100px] transition-all ${
                activeTab === 'proposals'
                  ? 'border-b-4 border-cyan-500 text-cyan-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className={`h-6 w-6 mb-1 ${activeTab === 'proposals' ? 'text-cyan-500' : 'text-gray-500'}`} />
              <span className="font-medium text-base">提案</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('signatures');
                
                // 署名がまだ完了していない場合、フォームにフォーカスを当てる
                if (!signatures[0]?.isComplete) {
                  setTimeout(() => {
                    const input = document.getElementById(
                      document.getElementById('pin-input') ? 'pin-input' : 'text-input'
                    );
                    input?.focus();
                  }, 100);
                }
              }}
              className={`py-4 px-6 text-center flex flex-col items-center justify-center min-w-[100px] transition-all ${
                activeTab === 'signatures'
                  ? 'border-b-4 border-cyan-500 text-cyan-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-b-2 hover:border-gray-300'
              }`}
            >
              <PencilSquareIcon className={`h-6 w-6 mb-1 ${activeTab === 'signatures' ? 'text-cyan-500' : 'text-gray-500'}`} />
              <span className="font-medium text-base">署名</span>
            </button>
          </nav>
        </div>
        
        {/* タブコンテンツ */}
        <div className="mb-8">
          {activeTab === 'conversations' && (
            <div className="bg-white p-6 rounded-lg shadow-sm relative">
              <h2 className="text-xl font-semibold mb-4">ヒアリング会話</h2>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">会話から抽出された情報</h3>
                
                {/* 感情分析の概要 */}
                <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">感情分析の概要</h4>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-gray-600">否定的</span>
                        <span className="text-xs text-gray-600">中立的</span>
                        <span className="text-xs text-gray-600">肯定的</span>
                      </div>
                      {/* 感情分析の可視化 - 実際のデータに基づいて調整する必要があります */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="flex h-full">
                          {/* 会話データに基づいて動的に幅を計算 */}
                          <div className="bg-red-400 rounded-l-full" style={{ 
                            width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.4).length / Math.max(1, conversations.filter(c => c.sentimentScore !== undefined).length) * 100)}%` 
                          }}></div>
                          <div className="bg-yellow-400" style={{ 
                            width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.4 && c.sentimentScore < 0.6).length / Math.max(1, conversations.filter(c => c.sentimentScore !== undefined).length) * 100)}%` 
                          }}></div>
                          <div className="bg-green-400 rounded-r-full" style={{ 
                            width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.6).length / Math.max(1, conversations.filter(c => c.sentimentScore !== undefined).length) * 100)}%` 
                          }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">
                    会話の中で検出された感情の分布です。否定的・中立的・肯定的な発言のバランスを示しています。
                  </p>
                  {/* 感情スコアの詳細 */}
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>否定的: {conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.4).length}件</span>
                    <span>中立的: {conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.4 && c.sentimentScore < 0.6).length}件</span>
                    <span>肯定的: {conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.6).length}件</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">希望・要望</h4>
                    <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                      {conversations
                        .filter(conv => conv.intention?.type === 'wish')
                        .map(conv => (
                          <li key={conv.id}>{conv.intention?.content}</li>
                        ))
                      }
                      {!conversations.some(conv => conv.intention?.type === 'wish') && (
                        <li className="text-gray-400">まだ希望や要望は抽出されていません</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">譲れない条件</h4>
                    <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                      {conversations
                        .filter(conv => conv.intention?.type === 'requirement')
                        .map(conv => (
                          <li key={conv.id}>{conv.intention?.content}</li>
                        ))
                      }
                      {!conversations.some(conv => conv.intention?.type === 'requirement') && (
                        <li className="text-gray-400">まだ譲れない条件は抽出されていません</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">譲歩可能な点</h4>
                    <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                      {conversations
                        .filter(conv => conv.intention?.type === 'compromise')
                        .map(conv => (
                          <li key={conv.id}>{conv.intention?.content}</li>
                        ))
                      }
                      {!conversations.some(conv => conv.intention?.type === 'compromise') && (
                        <li className="text-gray-400">まだ譲歩可能な点は抽出されていません</li>
                      )}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">拒否・反対</h4>
                    <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                      {conversations
                        .filter(conv => conv.intention?.type === 'rejection')
                        .map(conv => (
                          <li key={conv.id}>{conv.intention?.content}</li>
                        ))
                      }
                      {!conversations.some(conv => conv.intention?.type === 'rejection') && (
                        <li className="text-gray-400">まだ拒否・反対は抽出されていません</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg bg-gray-50 p-4 mb-4 h-[300px] md:h-[400px] overflow-y-auto">
                {conversations.map(conv => (
                  <MessageBubble
                    key={conv.id}
                    message={conv.message}
                    isUser={conv.isUser}
                    sentimentScore={conv.sentimentScore}
                    intention={conv.intention}
                    keyPoint={conv.keyPoint}
                    timestamp={conv.timestamp}
                  />
                ))}
              </div>
              
              <div className="text-center relative">
                <PushToTalkButton 
                  onTranscription={handleTranscription}
                  onAudioRecorded={handleAudioRecorded}
                />
                <div className="mt-2 text-sm text-gray-600">
                  ボタンを押しながら話すと、AIがあなたの発言を分析します。
                </div>
                
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={extractIssuesFromConversations}
                    disabled={isProcessing || conversations.length < 3}
                    className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChartBarIcon className="h-5 w-5" />
                    会話から論点をまとめる
                  </button>
                </div>
                
                {conversations.length < 3 && (
                  <div className="mt-2 text-xs text-gray-500">
                    論点を抽出するには、少なくとも3つの会話メッセージが必要です。
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'issues' && (
            <div>
              <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">遺産分割の論点分析</h2>
                <p className="text-gray-600 mb-4">
                  会話から抽出された重要な論点を分析し、合意形成の進捗状況を可視化しています。各論点の合意度が高いほど、円滑な遺産分割協議が可能になります。
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <h3 className="text-sm font-medium text-green-800 mb-1">高合意の論点</h3>
                    <p className="text-xs text-green-700">合意度75%以上の論点です。すでに大きな合意ができています。</p>
                    <div className="mt-2 text-lg font-bold text-green-600">
                      {/* 肯定的な会話（感情スコア0.6以上）の数に基づいて論点数を表示 */}
                      {Math.max(1, Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.6).length / 3))}件
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                    <h3 className="text-sm font-medium text-yellow-800 mb-1">部分合意の論点</h3>
                    <p className="text-xs text-yellow-700">合意度50-74%の論点です。さらなる協議が必要です。</p>
                    <div className="mt-2 text-lg font-bold text-yellow-600">
                      {/* 中立的な会話（感情スコア0.4-0.6）の数に基づいて論点数を表示 */}
                      {Math.max(1, Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.4 && c.sentimentScore < 0.6).length / 3))}件
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <h3 className="text-sm font-medium text-orange-800 mb-1">要検討の論点</h3>
                    <p className="text-xs text-orange-700">合意度25-49%の論点です。重点的に協議を進めましょう。</p>
                    <div className="mt-2 text-lg font-bold text-orange-600">
                      {/* やや否定的な会話（感情スコア0.3-0.4）の数に基づいて論点数を表示 */}
                      {Math.max(1, Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.3 && c.sentimentScore < 0.4).length / 2))}件
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <h3 className="text-sm font-medium text-red-800 mb-1">未合意の論点</h3>
                    <p className="text-xs text-red-700">合意度25%未満の論点です。最優先で協議が必要です。</p>
                    <div className="mt-2 text-lg font-bold text-red-600">
                      {/* 否定的な会話（感情スコア0.3未満）の数に基づいて論点数を表示 */}
                      {Math.max(1, Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.3).length / 2))}件
                    </div>
                  </div>
                </div>
              </div>
              
              <IssueMap issues={issues} onIssueUpdate={updateIssueAgreement} />
              
              {/* 否定的な会話が一定数以上ある場合に注意を表示 */}
              {conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.4).length > 1 && (
                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-sm">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">注意: 合意形成が不十分な論点があります</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          合意度の低い論点がある状態で提案を生成すると、関係者全員が納得できる提案が得られない可能性があります。
                          まずは会話を続けて合意形成を進めることをお勧めします。
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 論点の詳細分析セクション */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 優先協議すべき論点 */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">優先的に協議すべき論点</h3>
                  <p className="text-sm text-gray-600 mb-3">合意度が低い順に表示しています。</p>
                  
                  {conversations.length > 0 ? (
                    <ul className="space-y-2">
                      {[...conversations]
                        .filter(conv => conv.keyPoint)
                        .sort((a, b) => (a.sentimentScore || 0) - (b.sentimentScore || 0))
                        .slice(0, 3)
                        .map(conv => {
                          // 会話から抽出した論点の合意度を算出
                          const agreementScore = Math.round((conv.sentimentScore || 0) * 100);
                          return (
                            <li key={conv.id} className="flex items-center p-2 border-l-4 rounded bg-gray-50" style={{
                              borderColor: agreementScore >= 75 ? 'rgb(22, 163, 74)' :
                                          agreementScore >= 50 ? 'rgb(202, 138, 4)' :
                                          agreementScore >= 25 ? 'rgb(234, 88, 12)' :
                                          'rgb(220, 38, 38)'
                            }}>
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-800">
                                  {conv.intention?.content || '重要な論点'}
                                </h4>
                                <p className="text-xs text-gray-600">{conv.message.substring(0, 50)}...</p>
                              </div>
                              <div className="ml-2 flex flex-col items-end">
                                <div className="text-xs font-semibold" style={{
                                  color: agreementScore >= 75 ? 'rgb(22, 163, 74)' :
                                         agreementScore >= 50 ? 'rgb(202, 138, 4)' :
                                         agreementScore >= 25 ? 'rgb(234, 88, 12)' :
                                         'rgb(220, 38, 38)'
                                }}>
                                  {agreementScore}%
                                </div>
                                <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{
                                      width: `${agreementScore}%`,
                                      backgroundColor: agreementScore >= 75 ? 'rgb(22, 163, 74)' :
                                                       agreementScore >= 50 ? 'rgb(202, 138, 4)' :
                                                       agreementScore >= 25 ? 'rgb(234, 88, 12)' :
                                                       'rgb(220, 38, 38)'
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </li>
                          );
                        })
                      }
                    </ul>
                  ) : (
                    <p className="text-gray-500 italic">論点がまだ抽出されていません</p>
                  )}
                </div>
                
                {/* 協議の進捗状況 */}
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">協議の進捗状況</h3>
                  <p className="text-sm text-gray-600 mb-4">全体的な合意形成の進み具合を示しています。</p>
                  
                  {issues.length > 0 ? (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">全体の平均合意度</span>
                        <span className="font-medium">
                          {/* 全会話の平均感情スコアから合意度を計算（0-1のスコアを0-100%に変換） */}
                          {Math.round((conversations.reduce((sum, conv) => sum + (conv.sentimentScore || 0.5), 0) / Math.max(1, conversations.length)) * 100)}%
                        </span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-gray-200 rounded-full mb-3">
                        <div 
                          className="h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" 
                          style={{
                            width: `${Math.round((conversations.reduce((sum, conv) => sum + (conv.sentimentScore || 0.5), 0) / Math.max(1, conversations.length)) * 100)}%`
                          }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>0%</span>
                        <span>50%</span>
                        <span>100%</span>
                      </div>
                      
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center">
                          <div className="w-32 text-sm">合意形成の完了</div>
                          <div className="flex-1 bg-gray-200 h-5 rounded overflow-hidden">
                            <div 
                              className="bg-green-500 h-full flex items-center justify-end px-2"
                              style={{ width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.6).length / Math.max(1, conversations.length) * 100)}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.6).length / Math.max(1, conversations.length) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-32 text-sm">進行中の協議</div>
                          <div className="flex-1 bg-gray-200 h-5 rounded overflow-hidden">
                            <div 
                              className="bg-yellow-500 h-full flex items-center justify-end px-2"
                              style={{ width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.3 && c.sentimentScore < 0.6).length / Math.max(1, conversations.length) * 100)}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore >= 0.3 && c.sentimentScore < 0.6).length / Math.max(1, conversations.length) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="w-32 text-sm">未着手の課題</div>
                          <div className="flex-1 bg-gray-200 h-5 rounded overflow-hidden">
                            <div 
                              className="bg-red-500 h-full flex items-center justify-end px-2"
                              style={{ width: `${Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.3).length / Math.max(1, conversations.length) * 100)}%` }}
                            >
                              <span className="text-xs text-white font-medium">
                                {Math.round(conversations.filter(c => c.sentimentScore !== undefined && c.sentimentScore < 0.3).length / Math.max(1, conversations.length) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-500 italic">
                      データがありません
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <button
                  onClick={generateProposalsFromIssues}
                  disabled={isProcessing || issues.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  論点から提案を生成
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'proposals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map(proposal => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleProposalVote}
                />
              ))}
              
              {proposals.length === 0 && (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">提案がまだ生成されていません。論点タブで「論点から提案を生成」ボタンをクリックしてください。</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'signatures' && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">遺産分割協議書に署名する</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">署名状況</h3>
                <ul className="divide-y divide-gray-200">
                  {signatures.map(sig => (
                    <li key={sig.id} className="py-3 flex justify-between">
                      <span>{sig.name}</span>
                      <span className={sig.isComplete ? "text-green-600 font-medium" : "text-gray-500"}>
                        {sig.isComplete 
                          ? `署名済み (${sig.date ? sig.date.toLocaleDateString('ja-JP') : '日時不明'})` 
                          : '署名待ち'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">あなたの署名</h3>
                <SignatureInput 
                  onComplete={handleSignComplete} 
                  isComplete={signatures[0]?.isComplete || false} 
                />
              </div>

              {/* 署名後のアクション */}
              {signatures[0]?.isComplete && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium mb-4">次のステップ</h3>
                  
                  {project.status === 'completed' ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <p className="text-green-800 font-medium">遺産分割協議が成立しました！</p>
                      <p className="text-green-700 mt-2">全員の署名が完了しました。必要な手続きを行ってください。</p>
                    </div>
                  ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-blue-800 font-medium">あなたの署名が完了しました</p>
                      <p className="text-blue-700 mt-2">他のメンバーの署名をお待ちください。</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-4">
                    <button
                      onClick={() => {
                        // 協議書プレビューを表示
                        setShowPreview(true);
                      }}
                      className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      協議書をプレビュー
                    </button>
                    
                    <button
                      onClick={() => {
                        // ダウンロード処理をここに実装
                        setShowPreview(true);
                        // プレビューが表示された後、少し遅延させて印刷ダイアログを表示
                        setTimeout(() => {
                          window.print();
                        }, 500);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-800 border border-gray-300 rounded hover:bg-gray-200 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      協議書をダウンロード
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      
      {/* 協議書プレビューモーダル */}
      {showPreview && (
        <AgreementPreview
          projectName={project.name}
          projectDescription={project.description}
          members={project.members}
          proposals={proposals}
          createdAt={project.createdAt}
          signatures={signatures}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
} 
