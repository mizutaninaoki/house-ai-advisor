import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebaseの設定（undefinedや空文字を許容）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

const isProduction = process.env.NODE_ENV === 'production';
// NEXT_PHASEはNext.jsがビルドや実行時に自動でセットする内部環境変数。
// ユーザーが.envやDocker等で手動設定する必要はない。
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

let app, db, auth: Auth, storage;

function isConfigValid(config: typeof firebaseConfig) {
  // 必須項目が全て埋まっているか
  return !!(config.apiKey && config.authDomain && config.projectId && config.appId);
}

try {
  if (isProduction && !isBuild && !isConfigValid(firebaseConfig)) {
    throw new Error('Firebaseの環境変数が不足しています');
  }
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase初期化エラー:', error);
  if (!isProduction || isBuild) {
    // 開発用やビルド時のモックオブジェクト
    app = null;
    db = {} as any;
    auth = {
      onAuthStateChanged: (_: any, callback: any) => {
        callback(null);
        return () => {};
      },
      signInWithPopup: async () => ({ user: { uid: 'mock-uid', email: 'test@example.com', displayName: 'テストユーザー' } }),
      signOut: async () => {}
    } as unknown as Auth;
    storage = {} as any;
  } else {
    throw error;
  }
}

export { app, db, auth, storage }; 
