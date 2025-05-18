'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/app/firebase/config';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import { 
  HomeIcon, 
  UserGroupIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  DocumentCheckIcon,
  ArrowRightIcon,
  HeartIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // テスト用ユーザーデータはコメントアウト
    // setUser({ displayName: 'テストユーザー', email: 'test@example.com' } as User);
    
    // Firebase認証を使用
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleGetStarted = () => {
    router.push('/dashboard');
  };
  
  const features = [
    {
      icon: <UserGroupIcon className="h-8 w-8 text-emerald-500" />,
      title: '家族全員の合意形成',
      description: '年齢や距離に関係なく、すべての家族がスマートフォンから簡単に参加できます。'
    },
    {
      icon: <ChatBubbleLeftRightIcon className="h-8 w-8 text-amber-500" />,
      title: 'Push-to-Talkで簡単操作',
      description: 'テキスト入力が苦手な方も、音声入力で簡単に意見を伝えられます。'
    },
    {
      icon: <ChartBarIcon className="h-8 w-8 text-teal-500" />,
      title: '争点の可視化',
      description: '家族間で意見が分かれている点を自動で抽出し、グラフで視覚的に表示します。'
    },
    {
      icon: <HeartIcon className="h-8 w-8 text-rose-500" />,
      title: '合意形成の促進',
      description: 'AIが様々な解決策を提案し、全員が納得できる落としどころを見つけます。'
    },
    {
      icon: <DocumentTextIcon className="h-8 w-8 text-sky-500" />,
      title: '遺産分割協議書の作成',
      description: '合意内容に基づき、法的効力のある遺産分割協議書の草案を自動生成します。'
    },
    {
      icon: <HomeIcon className="h-8 w-8 text-violet-500" />,
      title: '不動産評価を自動算出',
      description: '住所を入力するだけで、固定資産税評価額や市場価値の目安を表示します。'
    }
  ];
  
  const steps = [
    {
      number: 1,
      title: '代表者がプロジェクトを作成',
      description: '家族の代表者がGoogleアカウントで登録し、新しいプロジェクトを作成します。'
    },
    {
      number: 2,
      title: '不動産情報の登録',
      description: '相続対象の不動産や金融資産の情報を入力します。'
    },
    {
      number: 3,
      title: '相続人を招待',
      description: 'メールアドレスを入力して、他の相続人を招待します。'
    },
    {
      number: 4,
      title: '意見交換・合意形成',
      description: 'Push-to-Talkで意見を表明し、AIが争点を抽出して解決策を提案します。'
    },
    {
      number: 5,
      title: '署名・同意',
      description: '全員が内容に合意したら、電子署名で確定します。'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Header isLoggedIn={!!user} userName={user?.displayName || undefined} />
      
      {/* ヒーローセクション */}
      <section className="bg-gradient-to-br from-cyan-100 via-sky-50 to-white py-24 md:py-28">
        <div className="container mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center">
            <SparklesIcon className="h-10 w-10 text-cyan-500 animate-float" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600">
            家族の相続問題を<br className="hidden md:inline" />やさしく解決する
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            家族間の感情的・経済的対立を解消し、円満な遺産分割を実現するプラットフォーム
          </p>
          
          <button
            onClick={handleGetStarted}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center mx-auto"
          >
            {user ? 'ダッシュボードへ' : '今すぐ始める'}
            <ArrowRightIcon className="h-5 w-5 ml-2" />
          </button>
        </div>
      </section>
      
      {/* 特徴セクション */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4">
            おうちのAI相談室の特徴
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            複雑な相続問題をカンタンに、家族みんなが納得できる形で解決します
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-2">
                <div className="bg-gray-50 p-4 rounded-full inline-flex w-16 h-16 items-center justify-center mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* 使い方セクション */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-4">
            かんたん5ステップ
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-2xl mx-auto">
            おうちのAI相談室を使って、煩雑な相続手続きをシンプルに進めることができます
          </p>
          
          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex mb-12">
                <div className="flex-shrink-0 mr-6">
                  <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-full w-1 bg-gradient-to-b from-cyan-300 to-blue-300 mx-auto mt-2"></div>
                  )}
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm flex-1 mb-2 border border-gray-100">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-10">
            <button
              onClick={handleGetStarted}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-lg py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 flex items-center mx-auto"
            >
              {user ? 'ダッシュボードへ' : '今すぐ始める'}
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </button>
          </div>
        </div>
      </section>
      
      {/* CTAセクション */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            遺産分割を「揉めず・後腐れなく」解決しましょう
          </h2>
          
          <p className="text-lg max-w-3xl mx-auto mb-10">
            家族間の対立を80%以上解消し、全員が納得感をもって合意できる状態を実現します。
            弁護士に頼る前に、まずは家相続AIをお試しください。
          </p>
          
          <button
            onClick={handleGetStarted}
            className="bg-white text-cyan-600 text-lg py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
          >
            {user ? 'ダッシュボードへ' : '無料で始める'}
          </button>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
