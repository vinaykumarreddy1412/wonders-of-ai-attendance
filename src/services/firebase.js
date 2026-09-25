import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Client Firebase configuration for euphoria-8ab12
const firebaseConfig = {
  projectId: 'euphoria-8ab12',
  authDomain: 'euphoria-8ab12.firebaseapp.com',
  storageBucket: 'euphoria-8ab12.firebasestorage.app'
};

let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase client init notice:', err);
}

export { app, db };
