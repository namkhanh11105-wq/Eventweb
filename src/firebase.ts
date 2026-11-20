import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY?.trim() ||
    'AIzaSyCikUkQ9qA-nYGuHLU51ZvjsbX7bh7DBhg',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ||
    'quan-ly-su-kien-86a89.firebaseapp.com',
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    'quan-ly-su-kien-86a89',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ||
    'quan-ly-su-kien-86a89.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
    '639566920947',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID?.trim() ||
    '1:639566920947:web:439cabb6bb0d0d8c85cb86',
};

const hasValidEnv =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId) &&
  !firebaseConfig.apiKey.startsWith('MY_') &&
  !firebaseConfig.projectId.startsWith('MY_');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitError: string | null = null;

if (hasValidEnv) {
  try {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Kiểm tra kết nối Firestore khi khởi động
    void getDocFromServer(doc(db, 'test', 'connection')).catch((error: unknown) => {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Không thể kết nối Cloud Firestore: máy khách đang ngoại tuyến hoặc cấu hình chưa hợp lệ.');
      }
    });
  } catch (error) {
    firebaseInitError =
      error instanceof Error ? error.message : 'Không thể khởi tạo cấu hình Firebase.';
    console.warn('[Firebase] Khởi tạo thất bại:', error);
    app = null;
    auth = null;
    db = null;
  }
}

export const isFirebaseConfigured = Boolean(app && auth && db);
export { app, auth, db, firebaseInitError, firebaseConfig };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = true
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
    },
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  if (rethrow) {
    if (errInfo.error.toLowerCase().includes('permission') || errInfo.error.toLowerCase().includes('insufficient')) {
      throw new Error(
        `Không đủ quyền thao tác Firestore (${path ?? 'unknown'}). Vui lòng kiểm tra Firestore Security Rules trong Firebase Console.`
      );
    }
    throw error instanceof Error ? error : new Error(errInfo.error);
  }
}
