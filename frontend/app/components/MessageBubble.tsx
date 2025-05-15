interface MessageBubbleProps {
  message: string;
  isUser: boolean;
  sentimentScore?: number;
  timestamp?: Date;
  intention?: {
    type: 'wish' | 'requirement' | 'compromise' | 'rejection';
    content: string;
  };
  keyPoint?: boolean;
}

export default function MessageBubble({ 
  message, 
  isUser, 
  sentimentScore, 
  timestamp = new Date(),
  intention,
  keyPoint
}: MessageBubbleProps) {
  // 感情スコアに基づいて色を決定
  const getSentimentColor = () => {
    if (sentimentScore === undefined) return 'bg-gray-200';
    
    if (sentimentScore > 0.7) return 'bg-green-100 border-green-300';
    if (sentimentScore < 0.3) return 'bg-red-100 border-red-300';
    return 'bg-yellow-100 border-yellow-300';
  };
  
  // 感情スコアの表示テキスト
  const getSentimentText = () => {
    if (sentimentScore === undefined) return null;
    
    if (sentimentScore > 0.7) return '肯定的 😊';
    if (sentimentScore < 0.3) return '否定的 😞';
    return '中立的 😐';
  };

  // 意図タイプに基づくラベル
  const getIntentionLabel = () => {
    if (!intention) return null;
    
    switch (intention.type) {
      case 'wish':
        return { text: '希望', bgColor: 'bg-blue-100', textColor: 'text-blue-800' };
      case 'requirement':
        return { text: '譲れない条件', bgColor: 'bg-purple-100', textColor: 'text-purple-800' };
      case 'compromise':
        return { text: '譲歩可能', bgColor: 'bg-green-100', textColor: 'text-green-800' };
      case 'rejection':
        return { text: '拒否', bgColor: 'bg-red-100', textColor: 'text-red-800' };
      default:
        return null;
    }
  };

  const intentionLabel = getIntentionLabel();
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`
          max-w-[80%] rounded-lg px-4 py-3 shadow-sm relative
          ${isUser 
            ? 'bg-indigo-100 text-indigo-900' 
            : sentimentScore !== undefined 
              ? getSentimentColor() 
              : 'bg-white border border-gray-200'
          }
          ${keyPoint ? 'border-2 border-indigo-500' : ''}
        `}
      >
        {keyPoint && (
          <div className="absolute -top-2 -right-2 bg-indigo-500 text-white text-xs rounded-full px-2 py-1">
            重要
          </div>
        )}
        
        <p className="text-sm md:text-base">{message}</p>
        
        <div className="flex flex-wrap items-center justify-between mt-2 text-xs">
          <div className="flex items-center space-x-2">
            {sentimentScore !== undefined && (
              <span className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                {getSentimentText()}
              </span>
            )}
            
            {intentionLabel && (
              <span className={`inline-flex items-center px-2 py-1 rounded-full ${intentionLabel.bgColor} ${intentionLabel.textColor}`}>
                {intentionLabel.text}
              </span>
            )}
          </div>
          
          <span className="text-gray-500 ml-2">
            {timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        {intention && (
          <div className="mt-2 pt-2 border-t border-gray-200 text-sm">
            <p className={`italic ${intentionLabel?.textColor || 'text-gray-600'}`}>
              {intention.content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
