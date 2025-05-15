import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

interface TemplatePreviewProps {
  template: {
    id: string;
    title: string;
    description: string;
    type: '遺産分割協議書' | '遺言書' | '財産目録' | 'その他';
    pageCount: number;
    downloadCount: number;
    isPopular: boolean;
  };
  onClose: () => void;
  onDownload: (templateId: string) => void;
}

export default function TemplatePreview({
  template,
  onClose,
  onDownload
}: TemplatePreviewProps) {
  // ESCキーでモーダルを閉じる
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);
  
  // テンプレートタイプに基づいたプレビューコンテンツを生成
  const renderTemplateContent = () => {
    switch (template.type) {
      case '遺産分割協議書':
        return (
          <div className="px-8 py-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">遺産分割協議書</h1>
              <p className="text-gray-500">作成日: {new Date().toLocaleDateString('ja-JP')}</p>
            </div>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">1. 当事者</h2>
              <div className="pl-4">
                <div className="mb-4">
                  <p className="font-medium">
                    相続人1: ＿＿＿＿＿＿＿＿＿＿＿＿
                  </p>
                  <p className="text-gray-600 text-sm pl-6">
                    （住所）＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿
                  </p>
                </div>
                <div className="mb-4">
                  <p className="font-medium">
                    相続人2: ＿＿＿＿＿＿＿＿＿＿＿＿
                  </p>
                  <p className="text-gray-600 text-sm pl-6">
                    （住所）＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿
                  </p>
                </div>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">2. 被相続人</h2>
              <div className="pl-4">
                <p className="mb-2">
                  被相続人: ＿＿＿＿＿＿＿＿＿＿＿＿（死亡時の住所：＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿）
                </p>
                <p className="mb-2">
                  死亡日: ＿＿＿＿年＿＿月＿＿日
                </p>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">3. 遺産の分割内容</h2>
              <div className="pl-4">
                <p className="mb-4">
                  被相続人の遺産について、以下の通り分割することを全当事者で合意した。
                </p>
                
                <div className="mb-4">
                  <h3 className="font-medium">3.1 不動産</h3>
                  <div className="pl-4 mt-2">
                    <p>所在地: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                    <p>種類: □ 土地 □ 建物 □ その他（＿＿＿＿＿＿）</p>
                    <p>取得者: ＿＿＿＿＿＿＿＿＿＿＿＿</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h3 className="font-medium">3.2 預貯金</h3>
                  <div className="pl-4 mt-2">
                    <p>金融機関名: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                    <p>口座番号: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                    <p>取得者および金額: ＿＿＿＿＿＿＿＿＿＿＿＿（＿＿＿＿＿＿＿円）</p>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">4. 署名</h2>
              <div className="pl-4">
                <p className="mb-6">
                  以下に署名捺印することで、上記の遺産分割協議内容に同意したものとする。
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                  <div className="border-b border-gray-400 pt-16 text-center">
                    <p>相続人1　＿＿＿＿＿＿＿＿＿＿＿＿　㊞</p>
                  </div>
                  <div className="border-b border-gray-400 pt-16 text-center">
                    <p>相続人2　＿＿＿＿＿＿＿＿＿＿＿＿　㊞</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        );
        
      case '遺言書':
        return (
          <div className="px-8 py-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">遺言書</h1>
              <p className="text-gray-500">（自筆証書遺言）</p>
            </div>
            
            <section className="mb-8">
              <div className="pl-4">
                <p className="mb-4">
                  私、＿＿＿＿＿＿＿＿＿＿＿＿は、ここに私の遺言として以下のとおり定めます。
                </p>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">第1条（遺言者）</h3>
                  <div className="pl-4">
                    <p>氏名: ＿＿＿＿＿＿＿＿＿＿＿＿</p>
                    <p>生年月日: ＿＿＿＿年＿＿月＿＿日</p>
                    <p>住所: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h3 className="font-medium mb-2">第2条（遺産の処分）</h3>
                  <div className="pl-4">
                    <p className="mb-2">1. 不動産</p>
                    <p className="pl-4 mb-4">
                      所在地（＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿）にある私の所有する不動産を＿＿＿＿＿＿＿＿＿＿に相続させます。
                    </p>
                    
                    <p className="mb-2">2. 預貯金</p>
                    <p className="pl-4 mb-4">
                      ＿＿＿＿＿＿銀行＿＿＿＿＿＿支店の預金口座（口座番号：＿＿＿＿＿＿＿＿）の預金を＿＿＿＿＿＿＿＿＿＿に相続させます。
                    </p>
                  </div>
                </div>
              </div>
            </section>
            
            <section className="mt-16 mb-8">
              <div className="text-right">
                <p className="mb-4">＿＿＿＿年＿＿月＿＿日</p>
                <p>住所: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿</p>
                <p>氏名: ＿＿＿＿＿＿＿＿＿＿＿＿　（自署）</p>
              </div>
            </section>
          </div>
        );
        
      case '財産目録':
        return (
          <div className="px-8 py-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">財産目録</h1>
              <p className="text-gray-500">作成日: {new Date().toLocaleDateString('ja-JP')}</p>
            </div>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">1. 基本情報</h2>
              <div className="pl-4">
                <p className="mb-2">
                  被相続人: ＿＿＿＿＿＿＿＿＿＿＿＿
                </p>
                <p className="mb-2">
                  生年月日: ＿＿＿＿年＿＿月＿＿日
                </p>
                <p className="mb-2">
                  死亡日: ＿＿＿＿年＿＿月＿＿日
                </p>
                <p className="mb-2">
                  住所: ＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿
                </p>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">2. 不動産</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border">種類</th>
                      <th className="py-2 px-4 border">所在地</th>
                      <th className="py-2 px-4 border">面積</th>
                      <th className="py-2 px-4 border">評価額</th>
                      <th className="py-2 px-4 border">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">3. 金融資産</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border">種類</th>
                      <th className="py-2 px-4 border">金融機関</th>
                      <th className="py-2 px-4 border">口座番号</th>
                      <th className="py-2 px-4 border">金額</th>
                      <th className="py-2 px-4 border">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                      <td className="py-2 px-4 border"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        );
        
      default:
        return (
          <div className="p-8 text-center">
            <p className="text-lg text-gray-600">このテンプレートのプレビューは現在準備中です。</p>
          </div>
        );
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{template.title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="閉じる"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {renderTemplateContent()}
        </div>
        
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600">{template.pageCount}ページ • {template.type}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDownload(template.id)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              ダウンロード
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
