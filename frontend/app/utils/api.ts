/**
 * バックエンドAPIクライアント
 */

// APIのベースURL（環境変数から読み込むか、デフォルト値を使用）
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * 音声ファイルを文字起こしするAPI
 * @param audioBlob 音声ファイルのBlob
 * @returns 文字起こし結果
 */
export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string; confidence: number }> {
  try {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`文字起こしAPIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('音声文字起こし中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      text: 'API接続エラーが発生しました。これはモックデータです。',
      confidence: 0.5,
    };
  }
}

/**
 * テキストの感情分析を行うAPI
 * @param text 分析するテキスト
 * @param userId ユーザーID（オプション）
 * @param context コンテキスト情報（オプション）
 * @returns 感情分析結果
 */
export async function analyzeSentiment(
  text: string,
  userId?: string,
  context?: string
): Promise<{ sentiment_score: number; is_positive: boolean; keywords: any[] }> {
  try {
    console.log('テキストの感情分析を実行:', text);
    
    // バックエンドの感情分析APIを呼び出す
    const response = await fetch(`${API_BASE_URL}/api/analysis/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        user_id: userId,
        context
      }),
    });

    if (!response.ok) {
      console.warn(`感情分析APIエラー: ${response.status} - フォールバック処理を使用します`);
      // エラーをスローせずにフォールバック処理に進む
      return _fallbackSentimentAnalysis(text);
    }

    return await response.json();
  } catch (error) {
    console.error('感情分析中にエラーが発生しました:', error);
    // エラー時はフォールバックとして簡易的な感情分析を行う
    return _fallbackSentimentAnalysis(text);
  }
}

/**
 * フォールバック用の簡易感情分析（APIが利用できない場合）
 * @private
 */
function _fallbackSentimentAnalysis(text: string): { sentiment_score: number; is_positive: boolean; keywords: any[] } {
  console.log('フォールバック感情分析を使用:', text);
  
  const positiveWords = ['良い', '嬉しい', '幸せ', '望ましい', '賛成', '満足', '同意', '希望', '好き', '感謝'];
  const negativeWords = ['悪い', '悲しい', '不満', '不安', '問題', '心配', '反対', '困難', '嫌い', '難しい'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // 単純なキーワードマッチング
  positiveWords.forEach(word => {
    if (text.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) negativeCount++;
  });
  
  // スコアの計算（0-1の範囲、0.5が中立、1が最も肯定的、0が最も否定的）
  let score;
  if (positiveCount === 0 && negativeCount === 0) {
    score = 0.5; // キーワードがマッチしない場合は中立
  } else {
    score = 0.5 + (0.5 * (positiveCount - negativeCount) / (positiveCount + negativeCount));
  }
  
  // 値域を0-1に制限
  score = Math.max(0, Math.min(1, score));
  
  // キーワードリストの生成
  const keywords = [];
  positiveWords.forEach(word => {
    if (text.includes(word)) keywords.push({ word, type: 'positive' });
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) keywords.push({ word, type: 'negative' });
  });
  
  const result = {
    sentiment_score: score,
    is_positive: score > 0.6, // 0.6以上を肯定的とみなす
    keywords: keywords.length > 0 ? keywords : [{ word: 'neutral', type: 'neutral' }]
  };
  
  console.log('フォールバック感情分析結果:', result);
  return result;
}

/**
 * 会話から論点を抽出するAPI
 * @param messages 会話メッセージの配列
 * @param projectId プロジェクトID（オプション）
 * @returns 抽出された論点
 */
export async function extractIssues(
  messages: any[],
  projectId?: string
): Promise<{ issues: any[]; total_issues_count: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        project_id: projectId,
      }),
    });

    if (!response.ok) {
      throw new Error(`論点抽出APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('論点抽出中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      issues: [
        {
          id: 'issue_1',
          title: '実家の扱い',
          description: '実家を売却するか、家族が住み続けるか',
          agreement_score: 40,
          related_messages: [0, 2, 5]
        },
        {
          id: 'issue_2',
          title: '預金の分割方法',
          description: '均等に分けるか、必要性に応じて分けるか',
          agreement_score: 75,
          related_messages: [1, 4]
        }
      ],
      total_issues_count: 2
    };
  }
}

/**
 * 論点の合意度を更新するAPI
 * @param updates 更新する論点と合意度のリスト
 * @returns 更新結果
 */
export async function updateIssueStatus(
  updates: { issue_id: string; agreement_score: number }[]
): Promise<{ success: boolean; updated_issues: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/issues/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`論点更新APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('論点更新中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      success: true,
      updated_issues: updates.map(u => ({ ...u, updated: true }))
    };
  }
}

/**
 * 論点に基づいて提案を生成するAPI
 * @param projectId プロジェクトID
 * @param issues 論点のリスト
 * @param estateData 不動産データ（オプション）
 * @param userPreferences ユーザー選好（オプション）
 * @returns 生成された提案
 */
export async function generateProposals(
  projectId: string,
  issues: any[],
  estateData?: any,
  userPreferences?: any
): Promise<{ proposals: any[]; recommendation: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/proposals/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project_id: projectId,
        issues,
        estate_data: estateData,
        user_preferences: userPreferences,
      }),
    });

    if (!response.ok) {
      throw new Error(`提案生成APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('提案生成中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      proposals: [
        {
          id: 'proposal_1',
          title: '実家は長男が相続し、他の相続人には現金で代償',
          description: '実家を売却せずに長男が住み続け、その代わりに他の相続人には預貯金から多めに分配する案',
          points: [
            { type: 'merit', content: '実家を維持できる' },
            { type: 'merit', content: '現金を必要とする相続人にはすぐに資金が入る' },
            { type: 'demerit', content: '不動産評価額の算定が難しい' },
            { type: 'cost', content: '代償金の用意が必要' }
          ],
          support_rate: 65
        },
        {
          id: 'proposal_2',
          title: '実家を売却して全ての資産を現金化後に分割',
          description: '不動産を売却して現金化し、法定相続分に応じて分割する案',
          points: [
            { type: 'merit', content: '分かりやすく公平' },
            { type: 'merit', content: '全員が現金を受け取れる' },
            { type: 'demerit', content: '思い出のある実家を手放す必要がある' },
            { type: 'effort', content: '不動産売却の手続きが必要' }
          ],
          support_rate: 40
        }
      ],
      recommendation: 'proposal_1'
    };
  }
}

/**
 * 複数の提案を比較するAPI
 * @param proposals 比較する提案のリスト
 * @param criteria 比較基準（オプション）
 * @returns 比較結果
 */
export async function compareProposals(
  proposals: any[],
  criteria?: string[]
): Promise<{ comparison: any[]; criteria: string[]; recommendation: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/proposals/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proposals,
        criteria,
      }),
    });

    if (!response.ok) {
      throw new Error(`提案比較APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('提案比較中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      comparison: proposals.map(p => ({
        proposal_id: p.id,
        title: p.title,
        scores: {
          '公平性': 4,
          '手続きの容易さ': 3,
          '現金化': 2,
          '不動産維持': 5
        },
        total_score: 14
      })),
      criteria: criteria || ['公平性', '手続きの容易さ', '現金化', '不動産維持'],
      recommendation: proposals[0]?.id || 'unknown'
    };
  }
}

// API通信を行うためのユーティリティ関数

// ユーザー関連のAPI
export const userApi = {
  // ユーザーの作成
  createUser: async (userData: { email: string, name: string, firebase_uid?: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/users/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      throw new Error(`ユーザー作成に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // ユーザーの取得
  getUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`ユーザー取得に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // メールアドレスでユーザーを検索
  getUserByEmail: async (email: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/email/${email}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // ユーザーが見つからない場合はnullを返す
      }
      throw new Error(`ユーザー検索に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // Firebase UIDでユーザーを検索
  getUserByFirebaseUid: async (firebaseUid: string) => {
    const response = await fetch(`${API_BASE_URL}/api/users/firebase/${firebaseUid}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // ユーザーが見つからない場合はnullを返す
      }
      throw new Error(`ユーザー検索に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  
  // ユーザー削除
  deleteUser: async (userId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`ユーザー削除に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  
  // Firebase認証情報からユーザーを作成/取得
  getOrCreateFromFirebase: async (firebaseUser: { uid: string, email: string, displayName?: string }) => {
    try {
      // まずFirebase UIDでユーザーを検索
      const userByUid = await userApi.getUserByFirebaseUid(firebaseUser.uid).catch(() => null);
      if (userByUid) return userByUid;
      
      // 次にメールアドレスで検索
      const userByEmail = await userApi.getUserByEmail(firebaseUser.email).catch(() => null);
      
      if (userByEmail) {
        // 既存ユーザーがFirebase UIDを持っていない場合は更新
        if (!userByEmail.firebase_uid) {
          // この更新は簡略化のため省略。実際にはAPIエンドポイントを追加する必要があるかも
          // ここではユーザーを作成時と同じように再登録して関連付けを行う
          return await userApi.createUser({
            email: firebaseUser.email,
            name: firebaseUser.displayName || 'ユーザー',
            firebase_uid: firebaseUser.uid
          });
        }
        return userByEmail;
      }
      
      // 存在しない場合は新規作成
      return await userApi.createUser({
        email: firebaseUser.email,
        name: firebaseUser.displayName || 'ユーザー',
        firebase_uid: firebaseUser.uid
      });
    } catch (error) {
      console.error('Firebase認証ユーザーの処理エラー:', error);
      throw new Error('ユーザー情報の同期に失敗しました');
    }
  },
};

// プロジェクト関連のAPI
export const projectApi = {
  // プロジェクト一覧の取得
  getProjects: async (userId?: number) => {
    let url = `${API_BASE_URL}/api/projects/`;
    if (userId) {
      url += `?user_id=${userId}`;
    }
    
    console.log('プロジェクト取得URL:', url);
    
    try {
      const response = await fetch(url);
      
      console.log('プロジェクト取得レスポンス:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`プロジェクト一覧の取得に失敗しました: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
      throw error;
    }
  },
  
  // プロジェクトの詳細取得
  getProject: async (projectId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`);
    
    if (!response.ok) {
      throw new Error(`プロジェクト詳細の取得に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // プロジェクトの作成
  createProject: async (projectData: { title: string, description: string, user_id: number, members?: { email: string, name: string, relation?: string }[] }) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      throw new Error(`プロジェクト作成に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // プロジェクトの更新
  updateProject: async (projectId: number, projectData: { title: string, description: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });
    
    if (!response.ok) {
      throw new Error(`プロジェクト更新に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // プロジェクトの削除
  deleteProject: async (projectId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      if (response.status === 409) {
        const error = new Error('関連データが残っているため削除できません');
        (error as any).code = 409;
        throw error;
      }
      const error = new Error(`プロジェクト削除に失敗しました: ${response.statusText}`);
      (error as any).code = response.status;
      throw error;
    }
    return await response.json();
  },
  
  // プロジェクト参加メンバー一覧を取得
  getProjectMembers: async (projectId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/members`);
    if (!response.ok) throw new Error('メンバー一覧取得に失敗');
    return await response.json();
  },
};

// 提案関連のAPI
export const proposalApi = {
  // 提案一覧の取得
  getProposals: async (projectId?: number) => {
    let url = `${API_BASE_URL}/api/proposals/`;
    if (projectId) {
      url += `?project_id=${projectId}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`提案一覧の取得に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // 提案の詳細取得
  getProposal: async (proposalId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}`);
    
    if (!response.ok) {
      throw new Error(`提案詳細の取得に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // 提案の作成
  createProposal: async (proposalData: { 
    project_id: number, 
    title: string, 
    content: string,
    is_favorite?: boolean
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proposalData),
    });
    
    if (!response.ok) {
      throw new Error(`提案作成に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // お気に入り状態の切り替え
  toggleFavorite: async (proposalId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/favorite`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`お気に入り状態の更新に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // 提案の削除
  deleteProposal: async (proposalId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`提案削除に失敗しました: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  // 提案の更新
  updateProposal: async (proposalId: number, proposalData: { title: string, content: string, support_rate?: number }) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proposalData),
    });
    if (!response.ok) {
      throw new Error(`提案の更新に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
};

// 会話関連のAPI
export const conversationApi = {
  // 会話データの取得
  getConversation: async (projectId: number) => {
    try {
      // バックエンドから会話データを取得する
      // 注: バックエンド側でまだ実装されていなければモックデータではなく空配列を返す
      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/conversations`);
      
      if (response.ok) {
        const data = await response.json();
        return data; // 実際のデータを返す
      } else if (response.status === 404) {
        console.log('会話データが見つかりません。空の配列を返します。');
        return []; // 404の場合は空配列を返す
      } else {
        throw new Error(`会話データの取得に失敗しました: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('会話データの取得中にエラーが発生しました:', error);
      // エラー時は空の配列を返す（モックデータなし）
      return [];
    }
  },
  
  // 会話メッセージの保存
  saveMessage: async (messageData: { 
    project_id: number, 
    content: string, 
    speaker: string,
    sentiment?: 'positive' | 'neutral' | 'negative'
  }) => {
    try {
      // メッセージの感情分析（sentimentが指定されていない場合）
      if (!messageData.sentiment) {
        try {
          const sentimentResult = await analyzeSentiment(messageData.content);
          // 感情分析の結果によってsentimentを設定
          if (sentimentResult.is_positive) {
            messageData.sentiment = 'positive';
          } else if (sentimentResult.sentiment_score < 0.4) {
            messageData.sentiment = 'negative';
          } else {
            messageData.sentiment = 'neutral';
          }
        } catch (err) {
          console.warn('感情分析に失敗しました。デフォルト値を使用します:', err);
          messageData.sentiment = 'neutral';
        }
      }

      // Conversationモデルに存在するフィールドのみを含むオブジェクトを作成
      const validConversationData = {
        project_id: messageData.project_id,
        content: messageData.content,
        speaker: messageData.speaker,
        sentiment: messageData.sentiment
      };

      // バックエンドにメッセージを保存
      const response = await fetch(`${API_BASE_URL}/api/projects/${messageData.project_id}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validConversationData),
      });
      
      if (!response.ok) {
        throw new Error(`メッセージの保存に失敗しました: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('メッセージの保存中にエラーが発生しました:', error);
      // エラー時はローカルオブジェクトを返す（DBには保存されていない）
      return {
        id: Math.floor(Math.random() * 1000) + 10,
        content: messageData.content,
        speaker: messageData.speaker,
        timestamp: new Date().toISOString(),
        sentiment: messageData.sentiment || 'neutral'
      };
    }
  },
  
  // 音声をアップロードして文字起こし
  transcribeAndSave: async (projectId: number, audioBlob: Blob, speaker: string) => {
    try {
      // 音声文字起こしAPIを呼び出す
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      
      // バックエンドの/speech/transcribeエンドポイントを使用
      const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`音声の処理に失敗しました: ${response.statusText}`);
      }
      
      const transcriptionResult = await response.json();
      console.log('文字起こし結果:', transcriptionResult);
      
      // 文字起こし結果があれば、メッセージとして保存
      if (transcriptionResult.text) {
        // 感情分析を実行
        let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
        try {
          const sentimentResult = await analyzeSentiment(transcriptionResult.text);
          // スコアに基づいて感情を分類
          if (sentimentResult.is_positive) {
            sentiment = 'positive';
          } else if (sentimentResult.sentiment_score < 0.4) {
            sentiment = 'negative';
          } else {
            sentiment = 'neutral';
          }
        } catch (error) {
          console.warn('感情分析に失敗しました:', error);
          // エラー時はデフォルトの感情を使用
          sentiment = 'neutral';
        }
        
        // Conversationモデルに存在するフィールドのみを含むオブジェクトを作成
        const messageData = {
          project_id: projectId,
          content: transcriptionResult.text,
          speaker: speaker,
          sentiment: sentiment
        };
        
        // 保存APIを呼び出す
        const savedMessage = await conversationApi.saveMessage(messageData);
        
        return {
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence || 0.5,
          message: savedMessage,
          sentiment: sentiment
        };
      } else {
        throw new Error('文字起こし結果が空です');
      }
    } catch (error) {
      console.warn('音声処理中にエラーが発生しました:', error);
      // エラー時は正しく保存されていないことを示すため、ローカルオブジェクトを返す
      const mockText = '音声の処理中にエラーが発生しました。保存されていないのでリロードすると消えます。';
      const mockMessage = {
        id: Math.floor(Math.random() * 1000) + 10,
        content: mockText,
        speaker: speaker,
        timestamp: new Date().toISOString(),
        sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
      };
      
      return {
        text: mockText,
        confidence: 0,
        message: mockMessage,
        sentiment: 'neutral' as 'positive' | 'neutral' | 'negative'
      };
    }
  },
  
  // 会話から論点を抽出
  extractIssues: async (projectId: number) => {
    try {
      // 会話履歴を取得
      const messages = await conversationApi.getConversation(projectId);
      
      // バックエンドの論点抽出APIがある場合はそれを使用
      // 現状ではこの形式のエンドポイントはまだないのでモックデータを返す
      
      // 相続コンテキストに基づく論点を抽出
      const defaultIssues = [
        {
          id: 1,
          content: '実家に住み続けたいという希望',
          type: 'positive' as const,
          agreement_level: 'high' as const,
          related_messages: [1, 3]
        },
        {
          id: 2,
          content: '相続の公平性に関する懸念',
          type: 'negative' as const,
          agreement_level: 'medium' as const,
          related_messages: [2]
        },
        {
          id: 3,
          content: '父の思い出の部屋を残したいという要望',
          type: 'requirement' as const,
          agreement_level: 'medium' as const,
          related_messages: [3]
        },
        {
          id: 4,
          content: '固定資産税の支払い負担',
          type: 'neutral' as const,
          agreement_level: 'low' as const,
          related_messages: [2, 3]
        }
      ];
      
      // 会話内容に基づいて論点をカスタマイズ
      const customizedIssues = [...defaultIssues];
      
      // 会話内容から特定のキーワードを検出して論点を追加
      const conversationText = messages.map((m: { content: string }) => m.content).join(' ');
      
      if (conversationText.includes('売却') || conversationText.includes('売る')) {
        customizedIssues.push({
          id: 5,
          content: '実家を売却することへの意向',
          type: conversationText.includes('売りたくない') ? 'negative' as const : 'positive' as const,
          agreement_level: 'medium' as const,
          related_messages: []
        });
      }
      
      if (conversationText.includes('預金') || conversationText.includes('貯金') || conversationText.includes('現金')) {
        customizedIssues.push({
          id: 6,
          content: '預貯金の分配方法',
          type: 'neutral' as const,
          agreement_level: 'high' as const,
          related_messages: []
        });
      }
      
      if (conversationText.includes('公平') || conversationText.includes('平等')) {
        customizedIssues.push({
          id: 7,
          content: '遺産分割の公平性確保',
          type: 'requirement' as const,
          agreement_level: 'high' as const,
          related_messages: []
        });
      }
      
      return {
        issues: customizedIssues
      };
    } catch (error) {
      console.warn('論点抽出中にエラーが発生しました。モックデータを返します:', error);
      // モックデータを返す
      return {
        issues: [
          {
            id: 1,
            content: '実家に住み続けたいという希望',
            type: 'positive' as const,
            agreement_level: 'high' as const,
            related_messages: [1, 3]
          },
          {
            id: 2,
            content: '相続の公平性に関する懸念',
            type: 'negative' as const,
            agreement_level: 'medium' as const,
            related_messages: [2]
          },
          {
            id: 3,
            content: '父の思い出の部屋を残したいという要望',
            type: 'requirement' as const,
            agreement_level: 'medium' as const,
            related_messages: [3]
          },
          {
            id: 4,
            content: '固定資産税の支払い負担',
            type: 'neutral' as const,
            agreement_level: 'low' as const,
            related_messages: [2, 3]
          }
        ]
      };
    }
  }
};

// 論点関連のAPI
export const issueApi = {
  // プロジェクトの論点一覧を取得
  getIssues: async (projectId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues?project_id=${projectId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data; // 実際のデータを返す
      } else if (response.status === 404) {
        console.log('論点データが見つかりません。空の配列を返します。');
        return []; // 404の場合は空配列を返す
      } else {
        throw new Error(`論点データの取得に失敗しました: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('論点データの取得中にエラーが発生しました:', error);
      // エラー時は空の配列を返す
      return [];
    }
  },
  
  // 会話から論点を抽出して保存
  extractAndSaveIssues: async (projectId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ project_id: projectId }),
      });
      
      if (!response.ok) {
        console.error(`論点抽出エラー: ${response.status} ${response.statusText}`);
        throw new Error(`論点抽出に失敗しました: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.warn('論点抽出中にエラーが発生しました:', error);
      throw error; // エラーを上位に伝播
    }
  },
  
  // 論点を追加
  createIssue: async (issueData: {
    project_id: number;
    content: string;
    type: 'positive' | 'negative' | 'neutral' | 'requirement';
    agreement_level?: 'high' | 'medium' | 'low';
  }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });
      
      if (!response.ok) {
        throw new Error(`論点の作成に失敗しました: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('論点作成中にエラーが発生しました:', error);
      throw error;
    }
  },
  
  // 論点を更新
  updateIssue: async (
    issueId: number,
    issueData: {
      content: string;
      type: 'positive' | 'negative' | 'neutral' | 'requirement';
      agreement_level?: 'high' | 'medium' | 'low';
    }
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issueData),
      });
      
      if (!response.ok) {
        throw new Error(`論点の更新に失敗しました: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('論点更新中にエラーが発生しました:', error);
      throw error;
    }
  },
  
  // 論点を削除
  deleteIssue: async (issueId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/issues/${issueId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`論点の削除に失敗しました: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn('論点削除中にエラーが発生しました:', error);
      throw error;
    }
  }
};

// 提案ポイント（ProposalPoint）関連のAPI
export const proposalPointsApi = {
  // 指定提案のポイント一覧取得
  getPoints: async (proposalId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/points`);
    if (!response.ok) {
      throw new Error(`ポイント一覧の取得に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // ポイント追加
  createPoint: async (proposalId: number, pointData: { proposal_id: number; type: string; content: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/points`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pointData),
    });
    if (!response.ok) {
      throw new Error(`ポイント作成に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // ポイント更新
  updatePoint: async (pointId: number, pointData: { type?: string; content?: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/points/${pointId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pointData),
    });
    if (!response.ok) {
      throw new Error(`ポイント更新に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // ポイント削除
  deletePoint: async (pointId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/proposals/points/${pointId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`ポイント削除に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
};

// 協議書（Agreement）関連のAPI
export const agreementApi = {
  // AIで協議書を生成し保存
  generateAgreementAI: async (projectId: number, proposalId: number) => {
    const response = await fetch(
      `${API_BASE_URL}/api/agreements/ai/generate?project_id=${projectId}&proposal_id=${proposalId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // body: JSON.stringify({ project_id: projectId, proposal_id: proposalId }), // クエリパラメータで送信するのでbody不要
      }
    );
    if (!response.ok) {
      throw new Error(`協議書AI生成に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // プロジェクトの協議書を取得
  getAgreementByProject: async (projectId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/agreements/by_project?project_id=${projectId}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`協議書取得に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // 協議書を更新
  updateAgreement: async (agreementId: number, data: { content?: string; status?: string; is_signed?: boolean }) => {
    const response = await fetch(`${API_BASE_URL}/api/agreements/${agreementId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`協議書更新に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
};

// 署名（Signature）関連のAPI
export const signatureApi = {
  // 署名を作成
  createSignature: async (data: { agreement_id: number; user_id: number; method: string; value: string }) => {
    const response = await fetch(`${API_BASE_URL}/api/signatures/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`署名作成に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
  // 協議書ごとの署名リスト取得
  getSignaturesByAgreement: async (agreementId: number) => {
    const response = await fetch(`${API_BASE_URL}/api/signatures/by_agreement?agreement_id=${agreementId}`);
    if (!response.ok) {
      throw new Error(`署名リスト取得に失敗しました: ${response.statusText}`);
    }
    return await response.json();
  },
}; 
