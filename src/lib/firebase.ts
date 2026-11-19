import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

/**
 * Public web config — safe to commit. Access to data is enforced by the
 * Firestore security rules in `firestore.rules`, not by keeping this secret.
 */
const firebaseConfig = {
  apiKey: 'AIzaSyA4M6205FyBMp5JGix-e03-vxzRCZLOjrs',
  authDomain: 'tracker-7ce9d.firebaseapp.com',
  projectId: 'tracker-7ce9d',
  storageBucket: 'tracker-7ce9d.firebasestorage.app',
  messagingSenderId: '965411886494',
  appId: '1:965411886494:web:d54bf081565fc01f26728f',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// `npm run dev:emulator` runs against local Firebase emulators instead of the real project.
if (import.meta.env.VITE_FIREBASE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
