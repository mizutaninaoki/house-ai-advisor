import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import SignatureStatus from './SignatureStatus';

interface AgreementPreviewProps {
  projectName: string;
  projectDescription: string;
  agreementTitle: string;
  agreementContent: string;
  members: Array<{id: string, name: string, role: string}>;
  proposals: Array<{id: string, title: string, description: string, supportRate: number}>;
  createdAt: Date;
  signatures: Array<{id: string, name: string, isComplete: boolean, date?: Date}>;
  onClose: () => void;
}

export default function AgreementPreview({
  agreementTitle,
  agreementContent,
  members,
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
            <h1 className="text-3xl font-bold mb-2">{agreementTitle || '遺産分割協議書'}</h1>
            <p className="text-gray-500">作成日: {createdAt.toLocaleDateString('ja-JP')}</p>
          </div>
          
          <div className="font-serif text-lg leading-relaxed mb-8 whitespace-pre-line min-h-[180px]">{agreementContent}</div>
          
          <SignatureStatus 
            members={members}
            signatures={signatures}
            isPreview={true}
            showTitle={true}
          />
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
