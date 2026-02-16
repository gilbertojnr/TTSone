import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, doc, setDoc, getDocs, Firestore } from "firebase/firestore";
import { HighProbSetup } from "../types";

/**
 * PRODUCTION CONFIGURATION for Project: gen-lang-client-0278144585
 * Connected to trustthestrat-backend-service and aenigma-parvum-agent.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key", 
  authDomain: "gen-lang-client-0278144585.firebaseapp.com",
  projectId: "gen-lang-client-0278144585",
  storageBucket: "gen-lang-client-0278144585.appspot.com",
  messagingSenderId: "278144585",
  appId: "1:278144585:web:strat-protocol-prod"
};

let db: Firestore | null = null;
let firebaseInitialized = false;

try {
  // Only initialize if we have a valid API key
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "demo-key") {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    firebaseInitialized = true;
    console.log("TTS Cloud Infrastructure: Connected to gen-lang-client-0278144585");
  } else {
    console.log("TTS Cloud: Firebase not configured (demo mode)");
  }
} catch (error) {
  console.error("TTS Cloud Infrastructure: Connection Failed", error);
}

const SIGNALS_COLLECTION = "protocol_signals";
const WATCHLIST_COLLECTION = "user_watchlist";

/**
 * Saves a high-probability signal. 
 * Note: The Aenigma-Parvum agent writes here with origin: 'AENIGMA_CLOUD'
 */
export async function saveSignalToCloud(signal: HighProbSetup) {
  if (!db) return;
  try {
    await addDoc(collection(db, SIGNALS_COLLECTION), {
      ...signal,
      timestamp: new Date().getTime(),
      origin: "TTS_FRONTEND",
      cloudVerified: true
    });
  } catch (e) {
    console.warn("TTS Cloud: Broadcast failed", e);
  }
}

/**
 * Streams signals from the cloud.
 * This aggregates signals from the local Gemini engine AND the Cloud Run Aenigma agent.
 */
export function streamSignals(callback: (signals: HighProbSetup[]) => void) {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  try {
    const q = query(collection(db, SIGNALS_COLLECTION), orderBy("timestamp", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const signals = snapshot.docs.map(doc => ({
        ...doc.data() as HighProbSetup,
        id: doc.id
      }));
      callback(signals);
    }, (error) => {
      console.warn("TTS Cloud: Signal stream interrupted", error);
      callback([]);
    });
    return unsubscribe;
  } catch (error) {
    callback([]);
    return () => {};
  }
}

export async function saveWatchlistToCloud(symbols: string[]) {
  if (!db) return;
  try {
    await setDoc(doc(db, WATCHLIST_COLLECTION, "global_user"), {
      symbols,
      lastUpdated: new Date().getTime()
    });
  } catch (e) {}
}

export async function getWatchlistFromCloud(): Promise<string[] | null> {
  if (!db) return null;
  try {
    const snapshot = await getDocs(collection(db, WATCHLIST_COLLECTION));
    const userDoc = snapshot.docs.find(d => d.id === "global_user");
    return userDoc ? userDoc.data().symbols : null;
  } catch (e) {
    return null;
  }
}