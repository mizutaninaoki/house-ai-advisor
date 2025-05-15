import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';

interface AgreementPreviewProps {
  projectName: string;
  projectDescription: string;
  members: Array<{id: string, name: string, role: string}>;
  proposals: Array<{id: string, title: string, description: string, supportRate: number}>;
  createdAt: Date;
  signatures: Array<{id: string, name: string, isComplete: boolean, date?: Date}>;
  onClose: () => void;
}

export default function AgreementPreview({
  projectName,
  projectDescription,
  members,
  proposals,
  createdAt,
  signatures,
  onClose
}: AgreementPreviewProps) {
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
  
  // 採用された提案を取得（最も支持率の高い提案）
  const adoptedProposal = proposals.length > 0 
    ? proposals.reduce((prev, current) => 
        prev.supportRate > current.supportRate ? prev : current)
    : null;
  
  // 印鑑スタイルのCSSクラス
  const stampStyle = "border-4 border-red-600 text-red-600 font-bold py-2 px-4 rounded-full transform rotate-12 inline-block text-center";
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">遺産分割協議書プレビュー</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            title="閉じる"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">遺産分割協議書</h1>
            <p className="text-gray-500">作成日: {createdAt.toLocaleDateString('ja-JP')}</p>
          </div>
          
          <section className="mb-10">
            <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">1. 当事者</h2>
            <div className="pl-4">
              {members.map((member, index) => (
                <div key={member.id} className="mb-4">
                  <p className="font-medium">
                    相続人{index + 1}: {member.name}
                  </p>
                  <p className="text-gray-600 text-sm pl-6">
                    役割: {member.role === 'owner' ? '代表相続人' : '相続人'}
                  </p>
                </div>
              ))}
            </div>
          </section>
          
          <section className="mb-10">
            <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">2. 遺産分割の内容</h2>
            <div className="pl-4">
              <p className="mb-4">
                被相続人の遺産について、以下の通り分割することを全員で合意した。
              </p>
              
              {adoptedProposal ? (
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <p className="font-semibold mb-2">{adoptedProposal.title}</p>
                  <p className="text-gray-700">{adoptedProposal.description}</p>
                </div>
              ) : (
                <p className="text-red-500">採用された提案がありません</p>
              )}
            </div>
          </section>
          
          <section className="mb-10">
            <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">3. 協議の経緯</h2>
            <div className="pl-4">
              <p className="mb-2">
                プロジェクト名: {projectName}
              </p>
              <p className="mb-4">
                {projectDescription}
              </p>
              <p>
                相続人全員で話し合いを行い、上記の遺産分割案について合意に達した。
              </p>
            </div>
          </section>
          
          <section className="mb-10">
            <h2 className="text-xl font-semibold border-b-2 border-gray-200 pb-2 mb-4">4. 署名</h2>
            <div className="pl-4">
              <p className="mb-6">
                以下に署名することで、上記の遺産分割協議内容に同意したものとする。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {signatures.map(sig => (
                  <div key={sig.id} className="border border-gray-200 p-4 rounded-lg">
                    <p className="text-gray-800 mb-1">
                      {sig.name}
                    </p>
                    {sig.isComplete ? (
                      <div className="flex flex-col items-center">
                        <div className={stampStyle}>
                          承認
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          署名日: {sig.date ? sig.date.toLocaleDateString('ja-JP') : '日時不明'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic mt-2">署名待ち</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          <div className="text-center mt-12 pt-4 border-t border-gray-300">
            <p className="text-gray-500 text-sm">
              この文書はプレビューです。正式な法的文書として使用する場合は、専門家の助言を得てください。
            </p>
          </div>
        </div>
        
        <div className="flex justify-end p-4 border-t border-gray-200">
          <button
            onClick={() => {
              // PDFダウンロード処理をここに実装
              window.print();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mr-2"
          >
            印刷
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
  );
} 
