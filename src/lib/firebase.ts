/**
 * Firebase bootstrap. Config comes from Vite env vars (see .env.example).
 * Without config the app runs in demo mode against localStorage.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let auth: Auth | null = null;
let db: Firestore | null = null;
if (firebaseEnabled) {
  const app = initializeApp(config);
  auth = getAuth(app);
  // IndexedDB cache: reloads are served locally, so reads stay well inside the free tier.
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}
export { auth, db };
