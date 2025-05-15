'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import Link from 'next/link';
import { ChevronDownIcon, ChevronUpIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface FaqItem {
  question: string;
  answer: string;
}

export default function Help() {
  const [user] = useState<User | null>({ displayName: 'テストユーザー', email: 'test@example.com', uid: 'mock-user-id' } as User);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  const toggleFaq = (index: number) => {
    if (openFaq === index) {
      setOpenFaq(null);
    } else {
      setOpenFaq(index);
    }
  };
  
  const faqItems: FaqItem[] = [
    {
      question: 'おうちのAI相談室とは何ですか？',
      answer: 'おうちのAI相談室は、家族間の遺産分割を円滑に進めるためのオンラインプラットフォームです。感情的・経済的対立を解消し、全員が納得できる合意形成をサポートします。音声入力、争点の可視化、AIによる解決策提案など、独自の機能を提供しています。'
    },
    {
      question: '誰でも利用できますか？',
      answer: 'はい、どなたでもご利用いただけます。特に、遺産分割の当事者である相続人の方々に適しています。高齢の方でもスマートフォンから簡単に参加できるよう、Push-to-Talk機能などを実装しています。'
    },
    {
      question: '費用はかかりますか？',
      answer: '基本機能は無料でご利用いただけます。プロジェクト数の増加や高度な機能の利用には有料プランへのアップグレードが必要です。詳細は料金ページをご確認ください。（※このデモでは料金プランは実装されていません）'
    },
    {
      question: '個人情報は安全ですか？',
      answer: 'はい、セキュリティ対策を徹底しています。データは暗号化され、第三者に共有されることはありません。プライバシーポリシーに基づいた厳格な情報管理を行っています。'
    },
    {
      question: '作成した書類に法的効力はありますか？',
      answer: '本サービスで作成される遺産分割協議書のテンプレートは、一般的な法的要件を満たすよう設計されていますが、必ず専門家（弁護士・司法書士など）のレビューを受けることをお勧めします。最終的な法的効力の確保には、専門家の確認が重要です。'
    },
    {
      question: 'どのように家族を招待できますか？',
      answer: 'プロジェクト作成後、「相続人の招待」セクションからメールアドレスを入力することで、家族メンバーに招待メールを送信できます。招待を受けた方は、メール内のリンクからプロジェクトに参加できます。'
    },
    {
      question: 'プッシュ・トゥ・トーク機能とは何ですか？',
      answer: 'Push-to-Talk（プッシュ・トゥ・トーク）は、ボタンを押している間だけ音声を録音する機能です。テキスト入力が苦手な方でも、話すだけで簡単に意見を表明できます。録音された音声は自動的にテキスト化され、AIが内容を分析します。'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} userName={user?.displayName || undefined} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">ヘルプセンター</h1>
          <Link 
            href="/dashboard" 
            className="flex items-center text-cyan-600 hover:text-cyan-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">お問い合わせ</h2>
            <p className="text-gray-600 mb-4">
              ご質問やご不明点がございましたら、お気軽にお問い合わせください。
            </p>
            <a 
              href="mailto:support@example.com" 
              className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
            >
              support@example.com
            </a>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">マニュアル</h2>
            <p className="text-gray-600 mb-4">
              詳細な使用方法については、以下のユーザーマニュアルをご確認ください。
            </p>
            <button 
              className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
              disabled
            >
              ユーザーマニュアルを見る（デモ）
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">チュートリアル</h2>
            <p className="text-gray-600 mb-4">
              初めての方向けに、基本的な使い方を解説したチュートリアル動画をご用意しています。
            </p>
            <button 
              className="inline-flex items-center text-cyan-600 hover:text-cyan-800"
              disabled
            >
              チュートリアルを見る（デモ）
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">よくある質問</h2>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                <button
                  className="w-full flex justify-between items-center text-left py-2"
                  onClick={() => toggleFaq(index)}
                >
                  <span className="font-medium text-gray-800">{item.question}</span>
                  {openFaq === index ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {openFaq === index && (
                  <div className="mt-2 text-gray-600 pl-2">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
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
      </main>
      
      <Footer />
    </div>
  );
} 
