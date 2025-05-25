import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';
import { proposalPointsApi } from '@/app/utils/api';

export interface ProposalPoint {
  id: number;
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
  is_favorite: boolean;
}

interface ProposalCardProps {
  proposal: Proposal;
  onVote?: (proposalId: string, support: boolean) => void;
  isVotingAllowed?: boolean;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  onUpdate?: (proposal: Proposal) => Promise<void>;
}

export default function ProposalCard({ 
  proposal, 
  onVote, 
  isVotingAllowed = true,
  onToggleFavorite,
  onDelete,
  onUpdate
}: ProposalCardProps) {
  const { id, title, description, supportRate, selected, is_favorite } = proposal;
  const [points, setPoints] = useState<ProposalPoint[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editDescription, setEditDescription] = useState(description);
  const [editPoints, setEditPoints] = useState<Array<{ type: ProposalPoint['type']; content: string }>>([]);

  useEffect(() => {
    proposalPointsApi.getPoints(Number(id)).then((data) => {
      setPoints(data);
      setEditPoints(data.map((p: ProposalPoint) => ({ type: p.type, content: p.content })));
    });
  }, [id, editMode]);

  const getBorderColor = () => {
    if (selected) return 'border-green-500';
    if (supportRate >= 75) return 'border-green-300';
    if (supportRate >= 50) return 'border-yellow-300';
    if (supportRate >= 25) return 'border-orange-300';
    return 'border-red-300';
  };

  const renderEditPoints = () => (
    <div className="mb-5">
      {editPoints.map((point, idx) => (
        <div key={idx} className="flex items-center mb-2 gap-2">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={point.type}
            onChange={e => {
              const newArr = [...editPoints];
              newArr[idx].type = e.target.value as ProposalPoint['type'];
              setEditPoints(newArr);
            }}
            title="ポイント種別を選択"
          >
            <option value="merit">メリット</option>
            <option value="demerit">デメリット</option>
            <option value="cost">コスト</option>
            <option value="effort">労力・手間</option>
          </select>
          <input
            className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
            value={point.content}
            onChange={e => {
              const newArr = [...editPoints];
              newArr[idx].content = e.target.value;
              setEditPoints(newArr);
            }}
            placeholder="内容を入力"
          />
          <button
            className="text-xs text-red-500 hover:underline"
            onClick={() => {
              const newArr = [...editPoints];
              newArr.splice(idx, 1);
              setEditPoints(newArr);
            }}
            type="button"
          >🗑</button>
        </div>
      ))}
      <button
        className="text-xs text-indigo-500 hover:underline mt-2"
        onClick={() => setEditPoints([...editPoints, { type: 'merit', content: '' }])}
        type="button"
      >＋追加</button>
    </div>
  );

  const handleSave = async () => {
    if (onUpdate) await onUpdate({ ...proposal, title: editTitle, description: editDescription });
    for (const ep of editPoints) {
      if (ep.content && !points.find(p => p.type === ep.type && p.content === ep.content)) {
        await proposalPointsApi.createPoint(Number(id), {
          proposal_id: Number(id),
          type: ep.type,
          content: ep.content
        });
      }
    }
    for (const p of points) {
      if (!editPoints.find(ep => ep.type === p.type && ep.content === p.content)) {
        await proposalPointsApi.deletePoint(p.id);
      }
    }
    const latest = await proposalPointsApi.getPoints(Number(id));
    setPoints(latest);
    setEditMode(false);
  };

  return (
    <div 
      className={`
        bg-white rounded-lg shadow-md p-5 border-l-4
        ${getBorderColor()}
        ${selected ? 'ring-2 ring-green-500 ring-opacity-50' : ''}
        flex flex-col h-full
      `}
    >
      <div className="flex justify-between items-start mb-4">
        {editMode ? (
          <input
            className="text-lg font-semibold text-gray-800 border-b border-indigo-200 focus:outline-none focus:border-indigo-500 bg-gray-50 px-2 py-1 rounded"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            title="提案タイトルを編集"
            placeholder="提案タイトル"
          />
        ) : (
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        )}
        <div className="bg-gray-100 text-gray-700 text-sm font-medium px-2 py-1 rounded">
          賛同率: {supportRate}%
        </div>
      </div>
      {editMode ? (
        <textarea
          className="w-full border border-indigo-200 rounded p-2 mb-4 text-gray-700 focus:outline-none focus:border-indigo-500"
          value={editDescription}
          onChange={e => setEditDescription(e.target.value)}
          rows={3}
          title="提案内容を編集"
          placeholder="提案内容を入力"
        />
      ) : (
        <p className="text-gray-600 mb-4">{description}</p>
      )}
      
      {editMode ? renderEditPoints() : (
        <ul className="mb-2 space-y-1">
          {points.map((p, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm leading-relaxed">
              {/* アイコン */}
              {p.type === 'merit' && <span className="text-green-500 text-base">●</span>}
              {p.type === 'demerit' && <span className="text-red-500 text-base">●</span>}
              {p.type === 'cost' && <span className="text-blue-500 text-base">¥</span>}
              {p.type === 'effort' && <span className="text-gray-500 text-base">⏱</span>}
              {/* ラベル */}
              <span className="font-semibold">
                {p.type === 'merit' && 'メリット'}
                {p.type === 'demerit' && 'デメリット'}
                {p.type === 'cost' && 'コスト'}
                {p.type === 'effort' && '労力・手間'}
              </span>
              <span>：</span>
              {/* 内容 */}
              <span>{p.content}</span>
            </li>
          ))}
        </ul>
      )}
      
      <div className="flex justify-between mt-4 pt-3 border-t border-gray-100 mt-auto">
        {editMode ? (
          <>
            <button
              className="px-3 py-1 bg-green-600 text-white rounded mr-2"
              onClick={handleSave}
            >保存</button>
            <button
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded"
              onClick={() => {
                setEditTitle(title);
                setEditDescription(description);
                setEditMode(false);
              }}
            >キャンセル</button>
          </>
        ) : (
          <>
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
            <button
              className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded ml-2"
              onClick={() => setEditMode(true)}
            >編集</button>
          </>
        )}
        <div className="flex gap-2">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className={`flex items-center ${is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-600'}`}
              title={is_favorite ? 'お気に入りから外す' : 'お気に入りに追加'}
              aria-label={is_favorite ? 'お気に入りから外す' : 'お気に入りに追加'}
            >
              {is_favorite ? (
                <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ) : (
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              )}
              <span className={`text-sm ${is_favorite ? 'text-yellow-500 font-bold' : 'text-gray-500'}`}>
                {is_favorite ? 'お気に入り済み' : 'お気に入り'}
              </span>
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
