import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebaseの設定
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-app.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-app.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

// 開発環境でのモックオブジェクト
const isDevelopment = process.env.NODE_ENV === 'development';

// すでに初期化されていなければ初期化
let app, db, auth, storage;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.warn('Firebase初期化エラー:', error);
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
  } as any;
  storage = {} as any;
}

export { app, db, auth, storage }; 
