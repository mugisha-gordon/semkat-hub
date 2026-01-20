import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { firebaseConfig } from './config';

// Initialize Firebase app (singleton pattern)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Optionally connect to local Firebase emulators for development
// For safety, emulators are only used when VITE_FIREBASE_USE_EMULATORS === 'true'
// and we are NOT in a production build.
const useEmulators =
  import.meta.env.VITE_FIREBASE_USE_EMULATORS === "true" && !import.meta.env.PROD;
if (useEmulators) {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "localhost";

  // Avoid double-connecting during HMR / repeated imports
  const g = globalThis as any;
  if (!g.__SEMKAThubFirebaseEmulatorsConnected) {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8081);
    connectStorageEmulator(storage, host, 9199);
    g.__SEMKAThubFirebaseEmulatorsConnected = true;
  }
}

// Export app instance for advanced usage
export { app };
