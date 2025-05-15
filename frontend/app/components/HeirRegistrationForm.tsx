import { useState } from 'react';

export interface Heir {
  id: string;
  name: string;
  relation: string;
  email: string;
  isUnderAge?: boolean;
  specialRep?: boolean;
  inviteSent?: boolean;
}

interface HeirRegistrationFormProps {
  onSubmit: (data: Heir) => void;
  initialData?: Partial<Heir>;
}

export default function HeirRegistrationForm({ onSubmit, initialData = {} }: HeirRegistrationFormProps) {
  const [name, setName] = useState(initialData.name || '');
  const [relation, setRelation] = useState(initialData.relation || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [isUnderAge, setIsUnderAge] = useState(initialData.isUnderAge || false);
  const [specialRep, setSpecialRep] = useState(initialData.specialRep || false);
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本バリデーション
    if (!name.trim()) {
      setError('名前は必須です');
      return;
    }
    
    if (!relation.trim()) {
      setError('続柄は必須です');
      return;
    }
    
    if (!email.trim()) {
      setError('メールアドレスは必須です');
      return;
    }
    
    // メールフォーマットの簡易チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    setError('');
    onSubmit({
      id: initialData.id || Date.now().toString(),
      name,
      relation,
      email,
      isUnderAge,
      specialRep: isUnderAge && specialRep,
      inviteSent: initialData.inviteSent || false
    });
  };
  
  const relationOptions = [
    { value: '', label: '選択してください' },
    { value: '配偶者', label: '配偶者' },
    { value: '長男', label: '長男' },
    { value: '長女', label: '長女' },
    { value: '二男', label: '二男' },
    { value: '二女', label: '二女' },
    { value: '三男', label: '三男' },
    { value: '三女', label: '三女' },
    { value: '息子', label: '息子' },
    { value: '娘', label: '娘' },
    { value: '父', label: '父' },
    { value: '母', label: '母' },
    { value: '兄', label: '兄' },
    { value: '姉', label: '姉' },
    { value: '弟', label: '弟' },
    { value: '妹', label: '妹' },
    { value: 'その他', label: 'その他' }
  ];
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">相続人登録</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：山田太郎"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="relation" className="block text-sm font-medium text-gray-700 mb-1">
            続柄 <span className="text-red-500">*</span>
          </label>
          <select
            id="relation"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            required
          >
            {relationOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            メールアドレス <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例：example@email.com"
            required
          />
        </div>
        
        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="under-age"
              type="checkbox"
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              checked={isUnderAge}
              onChange={(e) => setIsUnderAge(e.target.checked)}
            />
            <label htmlFor="under-age" className="ml-2 block text-sm text-gray-700">
              未成年の相続人
            </label>
          </div>
        </div>
        
        {isUnderAge && (
          <div className="mb-4 ml-6 p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              <input
                id="special-rep"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                checked={specialRep}
                onChange={(e) => setSpecialRep(e.target.checked)}
              />
              <label htmlFor="special-rep" className="ml-2 block text-sm text-gray-700">
                特別代理人を設定する
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ※未成年相続人の法定代理人（親）が共同相続人の場合、利益相反防止のため特別代理人が必要です
            </p>
          </div>
        )}
        
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
          登録する
        </button>
      </form>
    </div>
  );
} 
