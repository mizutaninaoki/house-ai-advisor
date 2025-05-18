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

    const response = await fetch(`${API_BASE_URL}/speech/transcribe`, {
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
    const response = await fetch(`${API_BASE_URL}/analysis/sentiment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        user_id: userId,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`感情分析APIエラー: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('感情分析中にエラーが発生しました:', error);
    // エラー時はモックデータを返す（開発用）
    return {
      sentiment_score: 0.15,
      is_positive: false,
      keywords: ['negative', 'unhappy'],
    };
  }
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
    const response = await fetch(`${API_BASE_URL}/analysis/issues`, {
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
    const response = await fetch(`${API_BASE_URL}/analysis/issues/status`, {
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
    const response = await fetch(`${API_BASE_URL}/proposals/generate`, {
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
    const response = await fetch(`${API_BASE_URL}/proposals/compare`, {
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
  createProject: async (projectData: { title: string, description: string, user_id: number }) => {
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
      throw new Error(`プロジェクト削除に失敗しました: ${response.statusText}`);
    }
    
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
    image_url?: string,
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
}; 
