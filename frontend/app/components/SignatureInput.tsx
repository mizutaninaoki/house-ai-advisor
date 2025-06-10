import { useState, useEffect } from 'react';

interface SignatureInputProps {
  onComplete: (method: 'text', value: string) => void;
  isComplete?: boolean;
  method?: 'text';
  value?: string;
  currentUserName?: string;
  disabled?: boolean;
}

export default function SignatureInput({ onComplete, isComplete = false, method, value, currentUserName, disabled = false }: SignatureInputProps) {
  const [textValue, setTextValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isComplete && value) {
      setTextValue(value);
    }
  }, [isComplete, value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || isComplete) {
      return;
    }
    
    if (textValue.trim() === '') {
      setError('名前を入力してください');
      return;
    }
    
    if (currentUserName && textValue.trim() !== currentUserName) {
      setError(`ログイン中のユーザー名「${currentUserName}」と一致する名前を入力してください`);
      return;
    }
    
    setError('');
    onComplete('text', textValue);
  };

  if (isComplete && method && value) {
    return (
      <div className="border border-green-500 bg-green-50 rounded-lg p-4 flex flex-col items-center">
        <span className="text-green-700 font-medium text-lg mb-2">署名済み</span>
        <div className="w-full max-w-xs mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">署名</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
            value={value}
            disabled
            title="署名"
            placeholder="署名"
          />
        </div>
        <p className="text-green-600 text-sm">この内容で署名しました</p>
      </div>
    );
  }

  const isFormDisabled = disabled || isComplete;

  return (
    <div className={`border rounded-lg p-4 shadow-sm ${isFormDisabled ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
      <h3 className={`text-lg font-semibold mb-4 ${isFormDisabled ? 'text-green-700' : 'text-gray-800'}`}>
        {isComplete ? '署名完了' : '同意の署名'}
        {isComplete && <span className="text-sm font-normal ml-2">(署名済み)</span>}
      </h3>
      
      {currentUserName && (
        <div className={`mb-4 p-3 border rounded-md ${isFormDisabled ? 'bg-green-100 border-green-300' : 'bg-blue-50 border-blue-200'}`}>
          <p className={`text-sm ${isFormDisabled ? 'text-green-800' : 'text-blue-800'}`}>
            <span className="font-medium">ユーザー名：</span> {currentUserName}
          </p>
          {!isFormDisabled && (
            <p className="text-xs text-blue-600 mt-1">
              署名するには、上記と同じ名前を下のフォームに入力してください
            </p>
          )}
          {isComplete && (
            <p className="text-xs text-green-600 mt-1">
              この名前で署名が完了しています
            </p>
          )}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="text-input" className={`block text-sm font-medium mb-1 ${isFormDisabled ? 'text-green-700' : 'text-gray-700'}`}>
            署名
          </label>
          <input
            id="text-input"
            type="text"
            className={`w-full p-2 border rounded-md ${
              isFormDisabled 
                ? 'border-green-300 bg-green-100 text-green-800 cursor-not-allowed' 
                : 'border-gray-300'
            }`}
            value={textValue}
            onChange={(e) => !isFormDisabled && setTextValue(e.target.value)}
            placeholder={
              isComplete 
                ? "署名完了済み" 
                : (currentUserName ? `${currentUserName} と入力してください` : "氏名を入力")
            }
            disabled={isFormDisabled}
          />
        </div>
        
        {error && !isFormDisabled && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}
        
        {isComplete && (
          <div className="mb-4 flex items-center text-green-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span className="text-sm font-medium">署名が完了しました</span>
          </div>
        )}
        
        <button
          type="submit"
          className={`w-full py-2 px-4 rounded-md transition-colors ${
            isFormDisabled 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
          disabled={isFormDisabled}
        >
          {isComplete ? '署名済み' : '署名して同意'}
        </button>
      </form>
    </div>
  );
} 
