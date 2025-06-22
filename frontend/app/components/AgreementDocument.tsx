import React from 'react';
import SignatureStatus from './SignatureStatus';

interface Member {
  user_id: number;
  user_name: string;
  name?: string;
  role: string;
}

interface Signature {
  id: number;
  user_id?: number;
  user_name: string;
  signed_at: string;
  status: 'pending' | 'signed';
  method?: 'text';
  value?: string;
}

interface Agreement {
  id: number;
  title?: string;
  content: string;
  created_at: string;
}

interface Project {
  title: string;
}

interface AgreementDocumentProps {
  agreement: Agreement;
  agreementContent: string;
  project: Project;
  members: Member[];
  signatures: Signature[];
  showEditControls?: boolean;
  isEditingAgreement?: boolean;
  editingContent?: string;
  agreementLoading?: boolean;
  onEditToggle?: () => void;
  onPreviewToggle?: () => void;
  onContentChange?: (content: string) => void;
  onSave?: () => void;
  onCancel?: () => void;
}

export default function AgreementDocument({
  agreement,
  agreementContent,
  project,
  members,
  signatures,
  showEditControls = true,
  isEditingAgreement = false,
  editingContent = '',
  agreementLoading = false,
  onEditToggle,
  onPreviewToggle,
  onContentChange,
  onSave,
  onCancel
}: AgreementDocumentProps) {
  return (
    <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-lg border-2 border-gray-300 p-8 relative mb-10">
      <h2 className="text-2xl font-bold text-center mb-2 tracking-wide">
        {agreement.title || 'サンプルタイトル'}
      </h2>
      <div className="text-center text-gray-500 mb-6">
        {agreement?.created_at ? new Date(agreement.created_at).toLocaleDateString() : new Date().toLocaleDateString()}　{project?.title}
      </div>
      <div className="font-serif text-lg leading-relaxed mb-8 whitespace-pre-line min-h-[180px]">
        {agreementContent}
      </div>
      
      {/* 署名状況表示 */}
      <SignatureStatus 
        members={members}
        signatures={signatures}
      />
      
      {/* 編集・プレビューボタン */}
      {showEditControls && (
        <div className="flex gap-2 mt-8 justify-end">
          {!isEditingAgreement && agreement && !signatures.find(s => s.user_name === 'テストユーザー') && onEditToggle && (
            <button 
              className="px-3 py-1 bg-indigo-500 text-white rounded" 
              onClick={onEditToggle} 
              disabled={agreementLoading}
            >
              編集
            </button>
          )}
          {onPreviewToggle && (
            <button
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              onClick={onPreviewToggle}
              disabled={!agreement}
            >
              協議書プレビュー
            </button>
          )}
        </div>
      )}
      
      {/* 編集フォーム */}
      {isEditingAgreement && onContentChange && onSave && onCancel && (
        <div className="mt-6">
          <textarea
            className="w-full border rounded p-2 mb-2"
            rows={8}
            value={editingContent}
            onChange={e => onContentChange(e.target.value)}
            placeholder="協議書の内容を入力してください"
            title="協議書内容"
          />
          <div className="flex gap-2">
            <button 
              className="px-3 py-1 bg-indigo-600 text-white rounded" 
              onClick={onSave} 
              disabled={agreementLoading}
            >
              保存
            </button>
            <button 
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded" 
              onClick={onCancel}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
