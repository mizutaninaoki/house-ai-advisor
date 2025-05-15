import { useState } from 'react';
import { PlusIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface EstateData {
  id: string;
  address: string;
  propertyTaxValue?: number;
  financialAssets?: number;
  documents?: File[];
  issues?: string[];
}

interface EstateRegistrationFormProps {
  onSubmit: (data: EstateData) => void;
  initialData?: Partial<EstateData>;
}

export default function EstateRegistrationForm({ onSubmit, initialData = {} }: EstateRegistrationFormProps) {
  const [address, setAddress] = useState(initialData.address || '');
  const [propertyTaxValue, setPropertyTaxValue] = useState(initialData.propertyTaxValue?.toString() || '');
  const [financialAssets, setFinancialAssets] = useState(initialData.financialAssets?.toString() || '');
  const [documents, setDocuments] = useState<File[]>([]);
  const [issues, setIssues] = useState<string[]>(initialData.issues || []);
  const [newIssue, setNewIssue] = useState('');
  const [error, setError] = useState('');
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setDocuments(prev => [...prev, ...fileArray]);
    }
  };
  
  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const addIssue = () => {
    if (newIssue.trim()) {
      setIssues(prev => [...prev, newIssue.trim()]);
      setNewIssue('');
    }
  };
  
  const removeIssue = (index: number) => {
    setIssues(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      setError('住所は必須です');
      return;
    }
    
    setError('');
    onSubmit({
      id: initialData.id || Date.now().toString(),
      address,
      propertyTaxValue: propertyTaxValue ? Number(propertyTaxValue) : undefined,
      financialAssets: financialAssets ? Number(financialAssets) : undefined,
      documents,
      issues
    });
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">不動産・資産登録</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            住所・地番 <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="例：東京都新宿区西新宿2-8-1"
            required
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="property-tax" className="block text-sm font-medium text-gray-700 mb-1">
            固定資産税評価額（円）
          </label>
          <input
            id="property-tax"
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={propertyTaxValue}
            onChange={(e) => setPropertyTaxValue(e.target.value)}
            placeholder="例：30000000"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="financial-assets" className="block text-sm font-medium text-gray-700 mb-1">
            金融資産（円）
          </label>
          <input
            id="financial-assets"
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={financialAssets}
            onChange={(e) => setFinancialAssets(e.target.value)}
            placeholder="例：10000000"
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            書類アップロード（固定資産税通知書など）
          </label>
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-md">
            <div className="flex items-center justify-center">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <ArrowUpTrayIcon className="h-8 w-8 text-gray-400" />
                <span className="mt-2 text-sm text-gray-500">クリックしてファイルを選択</span>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileChange}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </label>
            </div>
          </div>
          
          {documents.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700">アップロード済み書類：</p>
              <ul className="mt-1 space-y-1">
                {documents.map((doc, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm truncate">{doc.name}</span>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                      title={`${doc.name}を削除`}
                      aria-label={`${doc.name}を削除`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            不動産に関する論点・懸案事項
          </label>
          <div className="flex">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded-l-md"
              value={newIssue}
              onChange={(e) => setNewIssue(e.target.value)}
              placeholder="例：リフォームの必要性、賃貸か売却か"
            />
            <button
              type="button"
              onClick={addIssue}
              className="bg-indigo-600 text-white px-3 rounded-r-md hover:bg-indigo-700"
              title="論点を追加"
              aria-label="論点を追加"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
          
          {issues.length > 0 && (
            <div className="mt-2">
              <ul className="space-y-1">
                {issues.map((issue, index) => (
                  <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{issue}</span>
                    <button
                      type="button"
                      onClick={() => removeIssue(index)}
                      className="text-red-500 hover:text-red-700"
                      title={`「${issue}」を削除`}
                      aria-label={`「${issue}」を削除`}
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
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
