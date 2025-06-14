import React from 'react';

export interface EstateData {
  id: string;
  name: string;
  address: string;
  propertyTaxValue?: number;
  type: string; // 例: '建物' など
}

// サンプルのフォームコンポーネント（必要に応じて拡張してください）
const EstateRegistrationForm: React.FC = () => {
  return (
    <div>
      {/* ここに不動産登録フォームの実装を追加 */}
      <p>Estate Registration Form</p>
    </div>
  );
};

export default EstateRegistrationForm; 