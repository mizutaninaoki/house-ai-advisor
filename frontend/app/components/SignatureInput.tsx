import { useState } from 'react';

interface SignatureInputProps {
  onComplete: (method: 'pin' | 'text', value: string) => void;
  isComplete?: boolean;
  method?: 'pin' | 'text';
  value?: string;
}

export default function SignatureInput({ onComplete, isComplete = false, method, value }: SignatureInputProps) {
  const [signMethod, setSignMethod] = useState<'pin' | 'text'>('pin');
  const [pinValue, setPinValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signMethod === 'pin' && pinValue.length < 4) {
      setError('PINは4桁以上入力してください');
      return;
    }
    
    if (signMethod === 'text' && textValue.trim() === '') {
      setError('名前を入力してください');
      return;
    }
    
    setError('');
    onComplete(
      signMethod, 
      signMethod === 'pin' ? pinValue : textValue
    );
  };

  if (isComplete && method && value) {
    return (
      <div className="border border-green-500 bg-green-50 rounded-lg p-4 flex flex-col items-center">
        <span className="text-green-700 font-medium text-lg mb-2">署名済み</span>
        <div className="w-full max-w-xs mb-2">
          {method === 'pin' ? (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">署名用PIN</label>
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                value={value.replace(/./g, '●')}
                disabled
                title="署名用PIN"
                placeholder="署名用PIN"
              />
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">氏名署名</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                value={value}
                disabled
                title="氏名署名"
                placeholder="氏名署名"
              />
            </>
          )}
        </div>
        <p className="text-green-600 text-sm">この内容で署名しました</p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">同意の署名</h3>
      
      <div className="flex mb-4">
        <button
          type="button"
          className={`flex-1 py-2 ${signMethod === 'pin' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100'}`}
          onClick={() => setSignMethod('pin')}
        >
          PIN入力
        </button>
        <button
          type="button"
          className={`flex-1 py-2 ${signMethod === 'text' ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-gray-100'}`}
          onClick={() => setSignMethod('text')}
        >
          名前入力
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        {signMethod === 'pin' ? (
          <div className="mb-4">
            <label htmlFor="pin-input" className="block text-sm font-medium text-gray-700 mb-1">
              署名用PIN（4桁以上）
            </label>
            <input
              id="pin-input"
              type="password"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value)}
              placeholder="署名用のPINを入力"
              minLength={4}
            />
          </div>
        ) : (
          <div className="mb-4">
            <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-1">
              氏名署名
            </label>
            <input
              id="text-input"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder="氏名を入力"
            />
          </div>
        )}
        
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
        >
          署名して同意
        </button>
      </form>
    </div>
  );
} 
