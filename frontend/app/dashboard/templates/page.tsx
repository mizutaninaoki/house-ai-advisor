'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DocumentTextIcon, DocumentDuplicateIcon, ArrowDownTrayIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';
import TemplatePreview from '@/app/components/TemplatePreview';

interface Template {
  id: string;
  title: string;
  description: string;
  type: '遺産分割協議書' | '遺言書' | '財産目録' | 'その他';
  pageCount: number;
  downloadCount: number;
  isPopular: boolean;
}

export default function DocumentTemplates() {
  const [selectedType, setSelectedType] = useState<string>('すべて');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  
  const templates: Template[] = [
    {
      id: '1',
      title: '標準遺産分割協議書',
      description: '基本的な遺産分割協議書のテンプレートです。不動産、預貯金などの一般的な遺産項目に対応しています。',
      type: '遺産分割協議書',
      pageCount: 6,
      downloadCount: 2580,
      isPopular: true
    },
    {
      id: '2',
      title: '不動産特化型遺産分割協議書',
      description: '不動産を中心とした遺産分割のための協議書テンプレートです。複数不動産への対応や評価額の記載欄が充実しています。',
      type: '遺産分割協議書',
      pageCount: 8,
      downloadCount: 1243,
      isPopular: false
    },
    {
      id: '3',
      title: '自筆証書遺言書',
      description: '法的要件を満たした自筆証書遺言のテンプレートです。作成の手順と注意点も記載されています。',
      type: '遺言書',
      pageCount: 3,
      downloadCount: 1875,
      isPopular: true
    },
    {
      id: '4',
      title: '公正証書遺言用メモ',
      description: '公正証書遺言を作成する際に、公証役場に提出する情報をまとめるためのメモテンプレートです。',
      type: '遺言書',
      pageCount: 4,
      downloadCount: 952,
      isPopular: false
    },
    {
      id: '5',
      title: '財産目録（詳細版）',
      description: '不動産、金融資産、動産、負債などをカテゴリ別に詳細に記録できる財産目録のテンプレートです。',
      type: '財産目録',
      pageCount: 10,
      downloadCount: 3241,
      isPopular: true
    },
    {
      id: '6',
      title: '相続放棄申述書',
      description: '相続放棄を家庭裁判所に申し立てる際に使用する申述書のテンプレートです。',
      type: 'その他',
      pageCount: 2,
      downloadCount: 751,
      isPopular: false
    }
  ];
  
  const filterTypes = ['すべて', '遺産分割協議書', '遺言書', '財産目録', 'その他'];
  
  const filteredTemplates = selectedType === 'すべて' 
    ? templates 
    : templates.filter(template => template.type === selectedType);
    
  const handleDownload = (templateId: string, e?: React.MouseEvent) => {
    // イベントの伝播を停止（カードのクリックイベントと競合しないように）
    if (e) {
      e.stopPropagation();
    }
    // テンプレートのダウンロード処理（デモでは実際にダウンロードせず、コンソールログのみ）
    console.log(`テンプレート ${templateId} のダウンロードが開始されました（デモ）`);
    alert('デモモードでは、テンプレートはダウンロードされません。');
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
  };

  const handleClosePreview = () => {
    setSelectedTemplate(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header isLoggedIn={true} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">書類テンプレート</h1>
          <Link 
            href="/dashboard" 
            className="flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-6">
            相続手続きに必要な各種書類のテンプレートを無料でダウンロードできます。必要な項目を埋めるだけで簡単に作成できます。
          </p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {filterTypes.map(type => (
              <button
                key={type}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  selectedType === type 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedType(type)}
              >
                {type}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTemplates.map(template => (
              <div 
                key={template.id} 
                className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleTemplateClick(template)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-indigo-100 p-3 rounded-lg mr-4">
                    {template.type === '遺産分割協議書' && <DocumentDuplicateIcon className="h-6 w-6 text-indigo-600" />}
                    {template.type === '遺言書' && <DocumentTextIcon className="h-6 w-6 text-indigo-600" />}
                    {(template.type === '財産目録' || template.type === 'その他') && <DocumentTextIcon className="h-6 w-6 text-indigo-600" />}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-800">{template.title}</h3>
                      {template.isPopular && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">人気</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <div className="flex items-center mt-3 text-xs text-gray-500">
                      <span>{template.type}</span>
                      <span className="mx-2">•</span>
                      <span>{template.pageCount}ページ</span>
                      <span className="mx-2">•</span>
                      <span>{template.downloadCount}回ダウンロード</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-right">
                  <button
                    onClick={(e) => handleDownload(template.id, e)}
                    className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    ダウンロード
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-100">
          <h2 className="text-lg font-semibold text-indigo-900 mb-2">ご利用上の注意</h2>
          <p className="text-indigo-700 mb-4">テンプレートを利用する際は、以下の点にご注意ください：</p>
          
          <ul className="list-disc pl-5 space-y-2 text-indigo-800">
            <li>テンプレートはあくまで参考資料です。実際の利用の際は、弁護士や司法書士などの専門家にご相談ください。</li>
            <li>地域や状況によって、必要な書類や記載事項が異なる場合があります。</li>
            <li>最新の法改正に対応していない場合がありますので、ご使用前に最新情報をご確認ください。</li>
            <li>当サービスは法律相談や法的アドバイスを提供するものではありません。</li>
          </ul>
        </div>
        
        <div className="mt-8 text-center">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
      
      <Footer />

      {/* テンプレートプレビューモーダル */}
      {selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={handleClosePreview}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
} 
