import React, { useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, RadialLinearScale, TooltipItem } from 'chart.js';
import { PolarArea } from 'react-chartjs-2';
import { ChatBubbleBottomCenterTextIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

export interface Issue {
  id: string;
  title: string;
  description?: string;
  agreementScore: number; // 0-100%
}

interface IssueMapProps {
  issues: Issue[];
  onIssueUpdate?: (issueId: string, newScore: number) => void;
}

export default function IssueMap({ issues, onIssueUpdate }: IssueMapProps) {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  
  const data = {
    labels: issues.map(issue => issue.title),
    datasets: [
      {
        label: '合意度 (%)',
        data: issues.map(issue => issue.agreementScore),
        backgroundColor: issues.map(issue => {
          // 合意度に基づいて色を変更
          if (issue.agreementScore >= 75) return 'rgba(75, 192, 192, 0.5)'; // 高合意 - 緑
          if (issue.agreementScore >= 50) return 'rgba(255, 206, 86, 0.5)'; // 中合意 - 黄
          if (issue.agreementScore >= 25) return 'rgba(255, 159, 64, 0.5)'; // 低合意 - オレンジ
          return 'rgba(255, 99, 132, 0.5)'; // 非合意 - 赤
        }),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'polarArea'>) => {
            const issue = issues[context.dataIndex];
            return [
              `合意度: ${issue.agreementScore}%`,
              issue.description ? `詳細: ${issue.description}` : '',
            ].filter(Boolean);
          },
        },
      },
    },
    onClick: (_: any, elements: any) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        setSelectedIssue(issues[index]?.id || null);
      }
    },
  };

  // 合意度変更ハンドラー
  const handleAgreementChange = (issueId: string, newScore: number) => {
    if (onIssueUpdate) {
      onIssueUpdate(issueId, newScore);
    }
  };

  // 合意度に基づくステータスを取得
  const getAgreementStatus = (score: number) => {
    if (score >= 75) return { text: '高い合意', color: 'text-green-600', bgColor: 'bg-green-100', icon: <CheckCircleIcon className="h-5 w-5" /> };
    if (score >= 50) return { text: '部分的な合意', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: <ClockIcon className="h-5 w-5" /> };
    if (score >= 25) return { text: '要検討', color: 'text-orange-600', bgColor: 'bg-orange-100', icon: <ChatBubbleBottomCenterTextIcon className="h-5 w-5" /> };
    return { text: '合意形成が必要', color: 'text-red-600', bgColor: 'bg-red-100', icon: <ExclamationTriangleIcon className="h-5 w-5" /> };
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">論点マップ</h3>
        <p className="text-sm text-gray-600 mb-4">各論点の合意度をレーダーチャートで可視化しています。論点をクリックすると詳細が表示されます。</p>
        <div className="h-64 md:h-80">
          <PolarArea data={data} options={options} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {issues.map(issue => {
          const status = getAgreementStatus(issue.agreementScore);
          const isSelected = selectedIssue === issue.id;
          
          return (
            <div 
              key={issue.id} 
              className={`bg-white rounded-lg shadow p-4 border-l-4 transition-all cursor-pointer ${
                isSelected ? 'border-indigo-500 ring-2 ring-indigo-300' : 
                issue.agreementScore >= 75 ? 'border-green-500' :
                issue.agreementScore >= 50 ? 'border-yellow-500' :
                issue.agreementScore >= 25 ? 'border-orange-500' :
                'border-red-500'
              }`}
              onClick={() => setSelectedIssue(isSelected ? null : issue.id)}
            >
              <div className="flex justify-between items-start">
                <h4 className="text-md font-medium text-gray-800">{issue.title}</h4>
                <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${status.bgColor} ${status.color}`}>
                  {status.icon}
                  {status.text}
                </div>
              </div>
              
              {issue.description && (
                <p className="text-sm text-gray-600 mt-2">{issue.description}</p>
              )}
              
              <div className="mt-3">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-gray-500">合意度</span>
                  <span className="text-xs font-medium" style={{
                    color: issue.agreementScore >= 75 ? 'rgb(22, 163, 74)' :
                           issue.agreementScore >= 50 ? 'rgb(202, 138, 4)' :
                           issue.agreementScore >= 25 ? 'rgb(234, 88, 12)' :
                           'rgb(220, 38, 38)'
                  }}>
                    {issue.agreementScore}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${issue.agreementScore}%`,
                      backgroundColor: issue.agreementScore >= 75 ? 'rgb(22, 163, 74)' :
                                        issue.agreementScore >= 50 ? 'rgb(202, 138, 4)' :
                                        issue.agreementScore >= 25 ? 'rgb(234, 88, 12)' :
                                        'rgb(220, 38, 38)'
                    }}
                  ></div>
                </div>
              </div>
              
              {isSelected && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">提案への影響</h5>
                  <div className="text-xs text-gray-600">
                    <p>• この論点の合意度が低いと、提案の採択率が下がる可能性があります。</p>
                    <p>• 合意形成を進めると、より良い提案の生成につながります。</p>
                  </div>
                  
                  {onIssueUpdate && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">合意度を調整:</span>
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgreementChange(issue.id, Math.max(0, issue.agreementScore - 10));
                            }}
                            className="px-3 py-1 text-xs bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                            disabled={issue.agreementScore <= 0}
                          >
                            -10%
                          </button>
                          <span className="text-sm font-medium">{issue.agreementScore}%</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgreementChange(issue.id, Math.min(100, issue.agreementScore + 10));
                            }}
                            className="px-3 py-1 text-xs bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                            disabled={issue.agreementScore >= 100}
                          >
                            +10%
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <h3 className="text-md font-semibold text-indigo-800 mb-2">論点について</h3>
        <p className="text-sm text-indigo-700">
          論点は遺産分割協議の中で合意形成が必要な重要項目です。各論点の合意度が高いほど、
          スムーズな協議と公平な分割につながります。合意度の低い論点から優先的に協議を進めることをお勧めします。
        </p>
      </div>
    </div>
  );
} 
