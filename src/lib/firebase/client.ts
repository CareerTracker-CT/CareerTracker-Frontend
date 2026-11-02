import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
} from "firebase/auth";

/**
 * Firebase web configuration (public by design — not a secret).
 * Server-side Firebase Admin credentials live only on the backend.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let firebaseAuth: Auth | undefined;

function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = initializeAuth(getFirebaseApp(), {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }

  return firebaseAuth;
}

/**
 * Authenticates with Firebase email/password and returns a freshly minted
 * Firebase ID token.
 *
 * Firebase is configured with in-memory persistence: it is used only to prove
 * the user's identity during login. The CareerTracker access JWT and refresh
 * cookie issued by the backend remain the application's authoritative session,
 * so Firebase does not become a second app-wide persistent session.
 */
export async function signInWithFirebaseEmail(
  email: string,
  password: string,
): Promise<string> {
  const auth = getFirebaseAuth();

  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken();
}

/** Authenticates with Firebase Google sign-in and returns its ID token. */
export async function signInWithFirebaseGoogle(): Promise<string> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, new GoogleAuthProvider());
  return credential.user.getIdToken();
}
