import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebaseの設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 開発環境でのモックオブジェクト
const isDevelopment = process.env.NODE_ENV === 'development';

// すでに初期化されていなければ初期化
let app, db, auth: Auth, storage;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase初期化エラー:', error);
  if (process.env.NODE_ENV === 'development') {
    // 開発用のモックオブジェクト
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
