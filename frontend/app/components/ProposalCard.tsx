import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export interface ProposalPoint {
  type: 'merit' | 'demerit' | 'cost' | 'effort';
  content: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  points?: ProposalPoint[];
  supportRate: number; // 0-100%
  selected?: boolean;
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: string, support: boolean) => void;
  isVotingAllowed?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
}

export default function ProposalCard({ 
  proposal, 
  onVote, 
  isVotingAllowed = true,
  onToggleFavorite,
  onDelete
}: ProposalCardProps) {
  const { id, title, description, points = [], supportRate, selected } = proposal;
  
  const getBorderColor = () => {
    if (selected) return 'border-green-500';
    if (supportRate >= 75) return 'border-green-300';
    if (supportRate >= 50) return 'border-yellow-300';
    if (supportRate >= 25) return 'border-orange-300';
    return 'border-red-300';
  };
  
  const getTypeIcon = (type: ProposalPoint['type']) => {
    switch (type) {
      case 'merit':
        return <span className="text-green-500">●</span>;
      case 'demerit':
        return <span className="text-red-500">●</span>;
      case 'cost':
        return <span className="text-blue-500">¥</span>;
      case 'effort':
        return <span className="text-purple-500">⏱</span>;
      default:
        return null;
    }
  };
  
  const getTypeLabel = (type: ProposalPoint['type']) => {
    switch (type) {
      case 'merit':
        return 'メリット';
      case 'demerit':
        return 'デメリット';
      case 'cost':
        return 'コスト';
      case 'effort':
        return '労力・手間';
      default:
        return '';
    }
  };
  
  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-5 border-l-4
        ${getBorderColor()}
        ${selected ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
      `}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <div className="bg-gray-100 text-gray-700 text-sm font-medium px-2 py-1 rounded">
          賛同率: {supportRate}%
        </div>
      </div>
      
      <p className="text-gray-600 mb-4">{description}</p>
      
      {points.length > 0 && (
        <div className="space-y-3 mb-5">
          {points.map((point, index) => (
            <div key={index} className="flex items-start">
              <div className="mr-2 mt-1">{getTypeIcon(point.type)}</div>
              <div>
                <span className="text-sm font-medium">{getTypeLabel(point.type)}：</span>
                <span className="text-sm text-gray-600">{point.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
        {onVote && isVotingAllowed && (
          <>
            <button
              onClick={() => onVote(id, true)}
              className="flex items-center text-green-600 hover:text-green-800"
              title="この提案に賛成"
              aria-label="この提案に賛成"
            >
              <CheckCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm">賛成</span>
            </button>
            
            <button
              onClick={() => onVote(id, false)}
              className="flex items-center text-red-600 hover:text-red-800"
              title="この提案に反対"
              aria-label="この提案に反対"
            >
              <XCircleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm">反対</span>
            </button>
          </>
        )}
        
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="flex items-center text-yellow-600 hover:text-yellow-800"
            title="お気に入りに追加/削除"
            aria-label="お気に入りに追加/削除"
          >
            <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm">お気に入り</span>
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex items-center text-red-600 hover:text-red-800"
            title="提案を削除"
            aria-label="提案を削除"
          >
            <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span className="text-sm">削除</span>
          </button>
        )}
      </div>
      
      {selected && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-center bg-green-50 text-green-700 py-2 rounded">
            <CheckCircleIcon className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">選択された提案</span>
          </div>
        </div>
      )}
    </div>
  );
} 
