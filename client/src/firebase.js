import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// Check if Firebase Auth config is provided
const isFirebaseConfigured = !!(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

// Storage requires a bucket setup
const isStorageConfigured = isFirebaseConfigured && !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;

let storage = null;
let auth = null;
let googleProvider = null;

if (isFirebaseConfigured) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log('Firebase auth initialized successfully.');

    if (isStorageConfigured) {
      storage = getStorage(app);
      console.log('Firebase storage initialized successfully.');
    } else {
      console.log('Firebase storage bucket not configured. Falling back to local storage.');
    }
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
} else {
  console.log('Firebase credentials not detected. Falling back to local server storage.');
}

/**
 * Uploads a file to Firebase Storage
 * @param {File} file 
 * @param {string} path 
 * @returns {Promise<string>} downloadURL
 */
export async function uploadFileToFirebase(file, path = 'chat_attachments') {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const fileRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
  const snapshot = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

export { isFirebaseConfigured, isStorageConfigured, storage, auth, googleProvider, signInWithPopup };
export default storage;
