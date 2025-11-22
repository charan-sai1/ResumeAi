
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User, linkWithPopup, unlink } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { Resume, UserProfileMemory } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBzr4NZl7OW508J1JPBHuoRUEMhIizyERc",
  authDomain: "resume-2c7d7.firebaseapp.com",
  databaseURL: "https://resume-2c7d7-default-rtdb.firebaseio.com",
  projectId: "resume-2c7d7",
  storageBucket: "resume-2c7d7.firebasestorage.app",
  messagingSenderId: "319718896956",
  appId: "1:319718896956:web:812ecfe8cff609f32c1a39",
  measurementId: "G-4QYGNM1G3N"
};

// Initialize Firebase
let app;
let auth: any;
let db: any;
let isConfigured = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  isConfigured = true;
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

export { auth, db, isConfigured };

// --- Auth Functions ---

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not configured");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Auth Error:", error);
    throw error;
  }
};

export const signInWithGithub = async () => {
  if (!auth) throw new Error("Firebase not configured");
  const provider = new GithubAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    throw error;
  }
};

export const signInWithLinkedIn = async () => {
  if (!auth) throw new Error("Firebase not configured");
  // Note: LinkedIn Auth requires enabling the provider in Firebase Console
  const provider = new OAuthProvider('oidc.linkedin');
  // Request access to basic profile fields if supported by your OIDC config
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("LinkedIn Auth Error:", error);
    throw error;
  }
};

// --- Account Linking Functions ---

const getProviderObj = (providerName: 'google' | 'github' | 'linkedin') => {
  switch (providerName) {
    case 'google': return new GoogleAuthProvider();
    case 'github': return new GithubAuthProvider();
    case 'linkedin': 
      const p = new OAuthProvider('oidc.linkedin');
      p.addScope('openid');
      p.addScope('profile');
      p.addScope('email');
      return p;
    default: throw new Error("Unknown provider");
  }
};

export const linkProvider = async (user: User, providerName: 'google' | 'github' | 'linkedin') => {
  if (!auth) throw new Error("Firebase not configured");
  const provider = getProviderObj(providerName);
  try {
    const result = await linkWithPopup(user, provider);
    return result.user;
  } catch (error) {
    console.error(`Link ${providerName} Error:`, error);
    throw error;
  }
};

export const unlinkProvider = async (user: User, providerId: string) => {
  if (!auth) throw new Error("Firebase not configured");
  try {
    const result = await unlink(user, providerId);
    return result;
  } catch (error) {
    console.error("Unlink Error:", error);
    throw error;
  }
};

export const signOut = async () => {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// --- Database Functions ---

export const saveResumeToDB = async (userId: string, resume: Resume) => {
  if (!db) return;
  try {
    // Save in a subcollection: users/{userId}/resumes/{resumeId}
    await setDoc(doc(db, 'users', userId, 'resumes', resume.id), resume);
  } catch (e) {
    console.error("Error saving resume:", e);
    throw e;
  }
};

export const deleteResumeFromDB = async (userId: string, resumeId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'users', userId, 'resumes', resumeId));
  } catch (e) {
    console.error("Error deleting resume:", e);
    throw e;
  }
};

export const fetchResumesFromDB = async (userId: string): Promise<Resume[]> => {
  if (!db) return [];
  try {
    const querySnapshot = await getDocs(collection(db, 'users', userId, 'resumes'));
    const resumes: Resume[] = [];
    querySnapshot.forEach((doc) => {
      resumes.push(doc.data() as Resume);
    });
    return resumes.sort((a, b) => b.lastModified - a.lastModified);
  } catch (e) {
    console.error("Error fetching resumes:", e);
    return [];
  }
};

export const saveMemoryToDB = async (userId: string, memory: UserProfileMemory) => {
  if (!db) return;
  try {
    // Save memory in a document: users/{userId}/memory/main
    await setDoc(doc(db, 'users', userId, 'memory', 'main'), memory);
  } catch (e) {
    console.error("Error saving memory:", e);
    throw e;
  }
};

export const fetchMemoryFromDB = async (userId: string): Promise<UserProfileMemory | null> => {
  if (!db) return null;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId, 'memory', 'main'));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfileMemory;
    }
    return null;
  } catch (e) {
    console.error("Error fetching memory:", e);
    return null;
  }
};
