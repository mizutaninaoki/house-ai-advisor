import React from 'react';

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

interface PreviewSignature {
  id: string;
  name: string;
  isComplete: boolean;
  date?: Date;
}

interface PreviewMember {
  id: string;
  name: string;
  role: string;
}

interface SignatureStatusProps {
  members: Member[] | PreviewMember[];
  signatures: Signature[] | PreviewSignature[];
  isPreview?: boolean;
  showTitle?: boolean;
}

export default function SignatureStatus({ 
  members, 
  signatures, 
  isPreview = false, 
  showTitle = false 
}: SignatureStatusProps) {
  // プレビュー用と通常用でデータ構造が異なるため、統一的に処理する関数
  const getSignedSignatures = () => {
    if (isPreview) {
      return (signatures as PreviewSignature[]).filter(sig => sig.isComplete);
    }
    return (signatures as Signature[]).filter(sig => sig.status === 'signed');
  };

  const getUnsignedMembers = () => {
    const signedSignatures = getSignedSignatures();
    
    if (isPreview) {
      const previewMembers = members as PreviewMember[];
      const previewSignatures = signedSignatures as PreviewSignature[];
      return previewMembers.filter(member => 
        !previewSignatures.some(sig => sig.id === member.id || sig.name === member.name)
      );
    }
    
    const regularMembers = members as Member[];
    const regularSignatures = signedSignatures as Signature[];
    return regularMembers.filter(member => 
      !regularSignatures.some(sig => sig.user_id === member.user_id && sig.status === 'signed')
    );
  };

  const renderSignedMember = (sig: Signature | PreviewSignature, sigIndex: number) => {
    let memberName = '';
    let signDate = '';
    let keyPrefix = '';

    if (isPreview) {
      const previewSig = sig as PreviewSignature;
      const member = (members as PreviewMember[]).find(m => m.id === previewSig.id || m.name === previewSig.name);
      memberName = previewSig.name || member?.name || `ユーザー${previewSig.id}`;
      signDate = previewSig.date ? previewSig.date.toLocaleDateString() : '';
      keyPrefix = 'signature-preview';
    } else {
      const regularSig = sig as Signature;
      const member = (members as Member[]).find(m => m.user_id === regularSig.user_id);
      memberName = regularSig.value || regularSig.user_name || member?.name || member?.user_name || `ユーザー${regularSig.user_id}`;
      signDate = regularSig.signed_at ? new Date(regularSig.signed_at).toLocaleDateString() : '';
      keyPrefix = 'signature';
    }

    return (
      <div key={`${keyPrefix}-${sig.id}-${sigIndex}`} className="flex items-center gap-4 w-full">
        {/* 左端ラベル */}
        <span className="w-40 text-left text-base font-semibold text-gray-800">相続人</span>
        {/* 下線（サイン欄風）＋署名済みなら上にユーザー名 */}
        <span className="flex-1 relative h-6 flex items-center">
          {/* 署名済みなら下線の上に契約書風フォントでユーザー名 */}
          <span
            className="absolute left-1/2 -translate-x-1/2 -top-1 font-serif font-bold text-lg text-gray-700 tracking-wider select-none leading-none p-0 m-0"
            style={{letterSpacing: '0.15em', lineHeight: 1, padding: 0, margin: 0}}>
            {memberName}
          </span>
          <span className="w-full border-b border-gray-300 h-6 block"></span>
        </span>
        {/* 署名状況（右端） */}
        <span className="flex items-center min-w-[120px] justify-end">
          <span className="flex items-center gap-2">
            <svg width="48" height="48" viewBox="0 0 48 48" aria-label="同意済み印鑑">
              <circle cx="24" cy="24" r="21" fill="#fff" stroke="#e11d48" strokeWidth="3.5" />
              <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#e11d48" style={{fontFamily:'serif', letterSpacing: '0.1em'}}>同意</text>
            </svg>
            <span className="text-xs text-gray-500">
              {signDate}
            </span>
          </span>
        </span>
      </div>
    );
  };

  const renderUnsignedMember = (member: Member | PreviewMember, memberIndex: number) => {
    let keyPrefix = '';
    let memberId = '';

    if (isPreview) {
      const previewMember = member as PreviewMember;
      keyPrefix = 'unsigned-member-preview';
      memberId = previewMember.id;
    } else {
      const regularMember = member as Member;
      keyPrefix = 'unsigned-member';
      memberId = regularMember.user_id.toString();
    }

    return (
      <div key={`${keyPrefix}-${memberId}-${memberIndex}`} className="flex items-center gap-4 w-full">
        {/* 左端ラベル */}
        <span className="w-40 text-left text-base font-semibold text-gray-800">相続人</span>
        {/* 下線（サイン欄風） */}
        <span className="flex-1 relative h-6 flex items-center">
          <span className="w-full border-b border-gray-300 h-6 block"></span>
        </span>
        {/* 署名状況（右端） */}
        <span className="flex items-center min-w-[120px] justify-end">
          <span className="flex items-center gap-2 text-gray-400">
            <svg width="48" height="48" viewBox="0 0 48 48" className="opacity-60" aria-label="未同意印鑑">
              <circle cx="24" cy="24" r="21" fill="#fff" stroke="#bbb" strokeWidth="3.5" />
              <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#bbb" style={{fontFamily:'serif', letterSpacing: '0.1em'}}>未</text>
            </svg>
            <span className="text-xs">署名待ち</span>
          </span>
        </span>
      </div>
    );
  };

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-4 mt-10">
        {showTitle && <h3 className="text-lg font-semibold text-gray-800 mb-4">署名状況</h3>}
        <div className="text-gray-400 text-sm py-8 w-full text-center border rounded-lg bg-gray-50">
          相続人（メンバー）が登録されていません。
        </div>
      </div>
    );
  }

  const signedSignatures = getSignedSignatures();
  const unsignedMembers = getUnsignedMembers();

  return (
    <div className="flex flex-col gap-4 mt-10">
      {showTitle && <h3 className="text-lg font-semibold text-gray-800 mb-4">署名状況</h3>}
      {/* 署名済みのレコードを表示 */}
      {signedSignatures.map((sig, sigIndex) => renderSignedMember(sig, sigIndex))}
      {/* 未署名のメンバーを表示 */}
      {unsignedMembers.map((member, memberIndex) => renderUnsignedMember(member, memberIndex))}
    </div>
  );
} 
