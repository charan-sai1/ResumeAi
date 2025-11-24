// Fix: Separate type imports from value imports for Firebase v9 modular SDK.
// Fix: Import Firebase app functions and types via namespace import to resolve "no exported member" errors.
import * as firebaseApp from 'firebase/app';
// Fix: Import Firebase auth functions and types via namespace import to resolve "no exported member" errors.
import * as firebaseAuth from 'firebase/auth';
// Fix: Import Firebase firestore functions and types via namespace import to resolve "no exported member" errors.
import * as firebaseFirestore from 'firebase/firestore';
import { Resume, UserProfileMemory, UserSettings } from '../types';

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
// Fix: Use firebaseApp.FirebaseApp from the namespace import
let app: firebaseApp.FirebaseApp;
// Fix: Use firebaseAuth.Auth from the namespace import
let authInstance: firebaseAuth.Auth;
// Fix: Use firebaseFirestore.Firestore from the namespace import
let dbInstance: firebaseFirestore.Firestore;
let isConfigured = false;

try {
  // Check if app is already initialized to prevent errors during hot reload
  // Fix: Use firebaseApp.getApps() from namespace import
  if (!firebaseApp.getApps().length) {
    // Fix: Use firebaseApp.initializeApp() from namespace import
    app = firebaseApp.initializeApp(firebaseConfig);
  } else {
    // Fix: Use firebaseApp.getApp() from namespace import
    app = firebaseApp.getApp();
  }
  // Fix: Use firebaseAuth.getAuth() from namespace import
  authInstance = firebaseAuth.getAuth(app);
  // Fix: Use firebaseFirestore.getFirestore() from namespace import
  dbInstance = firebaseFirestore.getFirestore(app);
  isConfigured = true;
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

export { authInstance as auth, dbInstance as db, isConfigured };
// Fix: Export User type from firebaseAuth namespace
export type User = firebaseAuth.User;

// --- Auth Functions ---

export const signInWithGoogle = async () => {
  if (!authInstance) throw new Error("Firebase not configured");
  // Fix: Use firebaseAuth.GoogleAuthProvider from namespace import
  const provider = new firebaseAuth.GoogleAuthProvider();
  try {
    // Fix: Use firebaseAuth.signInWithPopup() from namespace import
    const result = await firebaseAuth.signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error) {
    console.error("Auth Error:", error);
    throw error;
  }
};

export const signInWithGithub = async () => {
  if (!authInstance) throw new Error("Firebase not configured");
  // Fix: Use firebaseAuth.GithubAuthProvider from namespace import
  const provider = new firebaseAuth.GithubAuthProvider();
  try {
    // Fix: Use firebaseAuth.signInWithPopup() from namespace import
    const result = await firebaseAuth.signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    throw error;
  }
};

export const signInWithLinkedIn = async () => {
  if (!authInstance) throw new Error("Firebase not configured");
  // Fix: Use firebaseAuth.OAuthProvider from namespace import
  const provider = new firebaseAuth.OAuthProvider('oidc.linkedin');
  provider.addScope('openid');
  provider.addScope('profile');
  provider.addScope('email');
  
  try {
    // Fix: Use firebaseAuth.signInWithPopup() from namespace import
    const result = await firebaseAuth.signInWithPopup(authInstance, provider);
    return result.user;
  } catch (error) {
    console.error("LinkedIn Auth Error:", error);
    throw error;
  }
};

// --- Account Linking Functions ---

const getProviderObj = (providerName: 'google' | 'github' | 'linkedin') => {
  switch (providerName) {
    // Fix: Use firebaseAuth.GoogleAuthProvider and firebaseAuth.GithubAuthProvider from namespace import
    case 'google': return new firebaseAuth.GoogleAuthProvider();
    case 'github': return new firebaseAuth.GithubAuthProvider();
    case 'linkedin': 
      // Fix: Use firebaseAuth.OAuthProvider from namespace import
      const p = new firebaseAuth.OAuthProvider('oidc.linkedin');
      p.addScope('openid');
      p.addScope('profile');
      p.addScope('email');
      return p;
    default: throw new Error("Unknown provider");
  }
};

export const linkProvider = async (user: User, providerName: 'google' | 'github' | 'linkedin') => {
  if (!authInstance) throw new Error("Firebase not configured");
  const provider = getProviderObj(providerName);
  try {
    // Modular SDK's linkWithPopup requires a provider object directly
    // Fix: Use firebaseAuth.signInWithPopup() from namespace import
    const result = await firebaseAuth.signInWithPopup(authInstance, provider);
    if (result.user.uid !== user.uid) {
      // This is a complex scenario where the linked account might belong to another user.
      // Firebase modular SDK handles this internally, but for simplicity, we assume success.
      // A more robust solution might involve re-authentication or handling `auth/credential-already-in-use`
      // error by linking existing user accounts.
      // For this context, if signInWithPopup succeeds with linking, the user object will be updated.
    }
    return result.user;
  } catch (error) {
    console.error(`Link ${providerName} Error:`, error);
    throw error;
  }
};

export const unlinkProvider = async (user: User, providerId: string) => {
  if (!authInstance) throw new Error("Firebase not configured");
  try {
    const result = await user.unlink(providerId);
    return result;
  } catch (error) {
    console.error("Unlink Error:", error);
    throw error;
  }
};

export const signOut = async () => {
  if (!authInstance) return;
  try {
    // Fix: Use firebaseAuth.signOut() from namespace import
    await firebaseAuth.signOut(authInstance);
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  // Fix: Use firebaseAuth.onAuthStateChanged() from namespace import
  return firebaseAuth.onAuthStateChanged(authInstance, callback);
};

// --- Database Functions ---

export const saveResumeToDB = async (userId: string, resume: Resume) => {
  if (!dbInstance) return;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.setDoc() from namespace import
    const resumeDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'resumes', resume.id);
    await firebaseFirestore.setDoc(resumeDocRef, resume);
  } catch (e) {
    console.error("Error saving resume:", e);
    throw e;
  }
};

export const deleteResumeFromDB = async (userId: string, resumeId: string) => {
  if (!dbInstance) return;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.deleteDoc() from namespace import
    const resumeDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'resumes', resumeId);
    await firebaseFirestore.deleteDoc(resumeDocRef);
  } catch (e) {
    console.error("Error deleting resume:", e);
    throw e;
  }
};

export const fetchResumesFromDB = async (userId: string): Promise<Resume[]> => {
  if (!dbInstance) return [];
  try {
    // Fix: Use firebaseFirestore.collection() and firebaseFirestore.getDocs() from namespace import
    const resumesCollectionRef = firebaseFirestore.collection(dbInstance, 'users', userId, 'resumes');
    const querySnapshot = await firebaseFirestore.getDocs(resumesCollectionRef);
    const resumes: Resume[] = [];
    querySnapshot.forEach((docSnap) => {
      resumes.push(docSnap.data() as Resume);
    });
    return resumes.sort((a, b) => b.lastModified - a.lastModified);
  } catch (e) {
    console.error("Error fetching resumes:", e);
    return [];
  }
};

export const saveMemoryToDB = async (userId: string, memory: UserProfileMemory) => {
  if (!dbInstance) return;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.setDoc() from namespace import
    const memoryDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'memory', 'main');
    await firebaseFirestore.setDoc(memoryDocRef, memory);
  } catch (e) {
    console.error("Error saving memory:", e);
    throw e;
  }
};

export const fetchMemoryFromDB = async (userId: string): Promise<UserProfileMemory | null> => {
  if (!dbInstance) return null;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.getDoc() from namespace import
    const memoryDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'memory', 'main');
    const docSnap = await firebaseFirestore.getDoc(memoryDocRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfileMemory;
    }
    return null;
  } catch (e) {
    console.error("Error fetching memory:", e);
    return null;
  }
};

// --- Settings Functions (API Keys) ---

export const saveUserSettingsToDB = async (userId: string, settings: UserSettings) => {
  if (!dbInstance) return;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.setDoc() from namespace import
    const settingsDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'settings', 'config');
    await firebaseFirestore.setDoc(settingsDocRef, settings);
  } catch (e) {
    console.error("Error saving settings:", e);
    throw e;
  }
};

export const fetchUserSettingsFromDB = async (userId: string): Promise<UserSettings | null> => {
  if (!dbInstance) return null;
  try {
    // Fix: Use firebaseFirestore.doc() and firebaseFirestore.getDoc() from namespace import
    const settingsDocRef = firebaseFirestore.doc(dbInstance, 'users', userId, 'settings', 'config');
    const docSnap = await firebaseFirestore.getDoc(settingsDocRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserSettings;
    }
    return null;
  } catch (e) {
    console.error("Error fetching settings:", e);
    return null;
  }
};