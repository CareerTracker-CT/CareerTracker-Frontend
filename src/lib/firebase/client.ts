import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  initializeAuth,
  linkWithPopup,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  unlink,
  updateProfile,
  type Auth,
  type AuthProvider,
  type User,
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
      // Session-scoped persistence: the Firebase identity survives page
      // reloads within the tab (so Settings → Linked Accounts can restore
      // the authenticated user without a fresh sign-in) but is dropped when
      // the tab closes — Firebase never becomes a second app-wide persistent
      // session, and nothing is written to localStorage. This is the
      // Firebase-supported restoration mechanism, not a workaround.
      persistence: browserSessionPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }

  return firebaseAuth;
}

/**
 * Popup-capable social providers we support, by Firebase sign-in-method id.
 * Fresh objects per attempt — Firebase providers accumulate scopes and must
 * never be shared across concurrent sign-ins.
 */
function buildPopupProvider(providerId: SocialProviderId): AuthProvider {
  if (providerId === "google.com") {
    const provider = new GoogleAuthProvider();
    // Always surface the Google account chooser. Without it the popup
    // silently reuses the browser's cached session — which can bind a stale
    // test identity instead of the account the user meant to pick.
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
  }

  const provider = new GithubAuthProvider();
  // Read-only email access: without this scope Firebase cannot read the
  // primary email of an account that keeps it private, and the backend
  // refuses to provision local accounts on unproven emails. No repository
  // access is ever requested.
  provider.addScope("user:email");
  return provider;
}

type SocialProviderId = "google.com" | "github.com";

/** Human labels for the Firebase provider ids this app surfaces. */
const PROVIDER_LABELS: Record<string, string | undefined> = {
  "google.com": "Google",
  "github.com": "GitHub",
};

/**
 * Diagnostic logging for authentication decisions. Provider ids, Firebase
 * error codes and booleans only — NEVER credentials, tokens or emails.
 */
function logAuthDiagnostic(message: string, details: Record<string, unknown>) {
  console.warn(`[auth] ${message}`, details);
}

/**
 * An error whose copy is final and user-safe — assembled by this module.
 * `describeLoginError` renders `message` verbatim for handled errors.
 */
export interface HandledAuthError extends Error {
  handled: true;
  code?: string;
}

function handledError(message: string, code?: string): HandledAuthError {
  const error = new Error(message) as HandledAuthError;
  error.handled = true;
  if (code) error.code = code;
  return error;
}

/**
 * Authenticates with Firebase email/password and returns a freshly minted
 * Firebase ID token.
 *
 * Firebase is configured with session-scoped persistence: it is used only to
 * prove the user's identity during login (and to keep provider linking
 * available across tab reloads). The CareerTracker access JWT and refresh
 * cookie issued by the backend remain the application's authoritative
 * session, so Firebase does not become a second app-wide persistent session.
 */
export async function signInWithFirebaseEmail(
  email: string,
  password: string,
): Promise<string> {
  const auth = getFirebaseAuth();

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user.getIdToken();
  } catch (error) {
    const code = (error as { code?: unknown })?.code;

    // Credential failures may simply be the wrong request-method for an email
    // that lives in Firebase under a social provider. Asking Firebase which
    // sign-in methods exist for the given address lets us point at the right
    // button — a message improvement only, never an ownership decision.
    if (code === "auth/invalid-credential" || code === "auth/user-not-found") {
      const methods = await fetchSignInMethodsForEmail(auth, email).catch(
        () => [],
      );
      const social = methods.find((m) => m in PROVIDER_LABELS);

      if (social) {
        logAuthDiagnostic("signin-method-hint", {
          existingProvider: social,
        });
        throw handledError(
          `This email is registered through ${PROVIDER_LABELS[social]}. Press the ${PROVIDER_LABELS[social]} button above to sign in, or connect Email from Settings → Linked Accounts.`,
          code as string,
        );
      }
    }

    logAuthDiagnostic("email-signin-failed", { firebaseCode: code ?? "" });
    throw error;
  }
}

/**
 * Creates a Firebase email/password account for a new user and sends the
 * verification email. The account starts unverified — and the backend refuses
 * to provision or link any row until the email is proven — so the caller
 * performs NO session exchange here. The verification email points the user
 * back to the sign-in flow; pressing "Sign in" after verifying exchanges the
 * token and establishes the CareerTracker session.
 */
export async function registerWithFirebaseEmail(
  fullName: string,
  email: string,
  password: string,
): Promise<{ email: string }> {
  const auth = getFirebaseAuth();

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // The backend requires a display name to provision the application row,
    // so the profile name must ride along with the identity. A flaky network
    // here would strand an unverified, nameless account that can never sign
    // in — so the follow-up steps retry once before giving up.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await updateProfile(credential.user, { displayName: fullName });
        await sendEmailVerification(credential.user);
        break;
      } catch {
        if (attempt === 1) {
          await signOut(auth);
          throw handledError(
            "Your account was created, but the setup step didn't finish. Press Create account again — Firebase will send a fresh verification email.",
          );
        }
      }
    }

    // Return to a clean state: the user proves the email and signs in — the
    // freshly created identity is not used to shortcut the verification gate.
    await signOut(auth);

    logAuthDiagnostic("register-success", {});
    return { email };
  } catch (error) {
    const code = (error as { code?: unknown })?.code ?? "";

    logAuthDiagnostic("register-failed", { firebaseCode: code });

    if (code === "auth/email-already-in-use") {
      throw handledError(
        "An account with that email already exists. Press Sign in instead.",
        code as string,
      );
    }
    if (code === "auth/weak-password") {
      throw handledError(
        "That password is too weak. Use at least 8 characters with one uppercase letter, one number and one symbol.",
        code as string,
      );
    }
    if (code === "auth/invalid-email") {
      throw handledError(
        "That email address doesn't look valid. Check it and try again.",
        code as string,
      );
    }
    if (code === "auth/email-change-needs-verification") {
      throw handledError(
        "A verification email was already sent. Follow the link in it, then press Sign in.",
        code as string,
      );
    }

    throw error;
  }
}

/**
 * Sends the verification email again for the current identity session.
 * Best-effort: a missing session simply reports that there is nothing to send.
 */
export async function resendFirebaseVerificationEmail(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw handledError(
      "Your registration session ended. Press Create account again to receive a new verification email.",
    );
  }

  try {
    await sendEmailVerification(user);
  } catch (error) {
    const code = (error as { code?: unknown })?.code ?? "";

    if (code === "auth/too-many-requests") {
      throw handledError(
        "Verification emails are sent in limited bursts. Please wait a moment and try again.",
        code as string,
      );
    }

    throw error;
  }
}

/**
 * Shared social sign-in used by the login page.
 *
 * Firebase keeps accounts unmerged ("one account per email"): signing in with
 * a provider whose email is already registered through another provider
 * raises `auth/account-exists-with-different-credential`. Login MUST not link
 * providers, prompt for a second provider, or preserve the pending
 * credential — provider linking happens exclusively in Settings → Linked
 * Accounts after a successful sign-in. Here the conflict becomes a stable,
 * user-safe message instead.
 *
 * Firebase exposes the sign-in methods that already exist for a conflicting
 * email. That information is used ONLY to name the existing provider in the
 * message it is never an ownership decision, and nothing is ever merged on
 * the basis of an email match. The pending credential from the failed popup
 * is deliberately dropped — cancelled flows may never link anything.
 */
async function socialSignIn(attemptedProviderId: SocialProviderId): Promise<string> {
  const auth = getFirebaseAuth();
  const attemptedLabel = PROVIDER_LABELS[attemptedProviderId];

  try {
    const credential = await signInWithPopup(
      auth,
      buildPopupProvider(attemptedProviderId),
    );
    return credential.user.getIdToken();
  } catch (error) {
    const value = error as {
      code?: unknown;
      customData?: { email?: string };
    };
    const code = typeof value?.code === "string" ? value.code : "";
    const email = value?.customData?.email;

    if (code !== "auth/account-exists-with-different-credential") {
      logAuthDiagnostic("signin-failed", {
        attemptedProvider: attemptedProviderId,
        firebaseCode: code,
        isProviderConflict: false,
      });
      throw error;
    }

    // Message improvement only: ask Firebase which methods exist for the
    // conflicting email. A failure here is non-fatal — the generic conflict
    // copy covers it.
    let existingLabel: string | null = null;
    if (email) {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, email);
        existingLabel =
          PROVIDER_LABELS[
            methods.find((m) => m in PROVIDER_LABELS) ?? ""
          ] ?? null;
      } catch {
        existingLabel = null;
      }
    }

    logAuthDiagnostic("signin-conflict", {
      attemptedProvider: attemptedProviderId,
      firebaseCode: code,
      isProviderConflict: true,
      existingProviderKnown: existingLabel !== null,
      // Never the email itself.
      conflictingEmailPresent: Boolean(email),
    });

    const message = existingLabel
      ? `This account may already be registered with ${existingLabel}. Please continue with ${existingLabel}, then connect ${attemptedLabel} from Settings → Linked Accounts.`
      : "This email is already associated with another sign-in method. Please sign in using your original method. You can connect another provider later from Settings → Linked Accounts.";

    throw handledError(message, code);
  }
}

/** Authenticates with Firebase Google sign-in and returns its ID token. */
export function signInWithFirebaseGoogle(): Promise<string> {
  return socialSignIn("google.com");
}

/**
 * Authenticates with GitHub through Firebase and returns its ID token.
 * The GitHub OAuth dance happens entirely inside the Firebase-hosted popup
 * (the OAuth client secret lives in Firebase, never in this codebase) —
 * this app only ever sees a Firebase ID token, exactly like the Google path.
 */
export function signInWithFirebaseGitHub(): Promise<string> {
  return socialSignIn("github.com");
}

/* ------------------------------------------------------------------ */
/* Linked Accounts (Settings — the ONLY place providers get linked)   */
/* ------------------------------------------------------------------ */

/**
 * The signed-in Firebase user, if the identity session exists in this tab.
 * Firebase runs with session-scoped persistence, so the identity survives
 * reloads but is dropped when the tab is closed — callers must handle `null`
 * honestly (no silent re-authentication tricks).
 */
export function getCurrentFirebaseUser(): User | null {
  return getFirebaseAuth().currentUser;
}

/**
 * Subscribes to the Firebase identity session. The callback runs whenever the
 * signed-in Firebase user changes (sign-in, sign-out). Returns the
 * unsubscribe function — call it from an effect cleanup.
 */
export function subscribeFirebaseIdentity(
  onChange: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

/**
 * Clears the Firebase identity session (session-scoped storage). Called from
 * the application's sign-out flow so a stale identity cannot linger in the
 * closed-session storage after the CareerTracker session ended. Best-effort:
 * the authoritative sign-out already happened on the backend.
 */
export function clearFirebaseIdentity(): void {
  signOut(getFirebaseAuth()).catch(() => {
    // Nothing to clear (or already cleared) — the app session stands either way.
  });
}

/** Firebase provider ids currently linked to the given user. */
export function readLinkedProviderIds(user: User): string[] {
  return user.providerData
    .map((entry) => entry.providerId)
    .filter(
      (id): id is SocialProviderId | "password" =>
        id === "google.com" || id === "github.com" || id === "password",
    );
}

/**
 * Connects an additional social provider to the currently signed-in Firebase
 * user through `linkWithPopup`. The user proves the NEW provider
 * interactively; no merge decisions are made from email matches. The
 * Firebase UID — and therefore the CareerTracker account and all of its
 * data — never changes.
 *
 * Throws `HandledAuthError` (final, user-safe copy) for every expected
 * Firebase outcome: already linked / provider bound to a different account,
 * cancelled or blocked popups, stale identity session, network failure.
 */
export async function connectLinkedAccount(
  providerId: SocialProviderId,
): Promise<string[]> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    logAuthDiagnostic("link-blocked", {
      provider: providerId,
      reason: "no-firebase-session",
    });
    throw handledError(
      "Your sign-in session with the identity provider has ended. Sign out, sign in again, then open Linked Accounts to connect providers.",
    );
  }

  const label = PROVIDER_LABELS[providerId] ?? providerId;

  try {
    await linkWithPopup(user, buildPopupProvider(providerId));
    logAuthDiagnostic("link-success", { provider: providerId });
    return readLinkedProviderIds(user);
  } catch (error) {
    const code =
      typeof (error as { code?: unknown })?.code === "string"
        ? (error as { code: string }).code
        : "";

    logAuthDiagnostic("link-failed", { provider: providerId, firebaseCode: code });

    // Messaging per outcome; state is refreshed by the caller afterwards, so
    // "already linked" repairs the UI by simply returning no error state.
    if (code === "auth/provider-already-linked") {
      throw handledError(
        `${label} is already connected to this account.`,
        code,
      );
    }
    if (code === "auth/credential-already-in-use") {
      throw handledError(
        `That ${label} account is already connected to a different CareerTracker identity. Sign in with it instead — accounts are never merged automatically.`,
        code,
      );
    }
    if (code === "auth/requires-recent-login") {
      throw handledError(
        "For security, this action needs a fresh sign-in. Sign out and sign in again, then try connecting from Linked Accounts.",
        code,
      );
    }
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      throw handledError(`${label} linking was cancelled.`, code);
    }
    if (code === "auth/popup-blocked") {
      throw handledError(
        `${label} linking could not open. Allow pop-ups for this site and try again.`,
        code,
      );
    }
    if (code === "auth/network-request-failed") {
      throw handledError(
        "Sign-in is temporarily unavailable. Please try again in a moment.",
        code,
      );
    }

    throw handledError(
      `We couldn't connect ${label}. Please try again in a moment.`,
      code || undefined,
    );
  }
}

/**
 * Disconnects a provider from the current Firebase user after the caller has
 * shown a confirmation. Guards the only-usable-method rule: the user must
 * always retain at least one workable sign-in method (Google, GitHub or
 * password). Unlinking NEVER touches the CareerTracker account — the UID and
 * all application data are unchanged.
 */
export async function disconnectLinkedAccount(
  providerId: SocialProviderId,
): Promise<string[]> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw handledError(
      "Your sign-in session with the identity provider has ended. Sign out, sign in again, then open Linked Accounts.",
    );
  }

  const methods = readLinkedProviderIds(user);
  if (methods.length <= 1) {
    throw handledError(
      "You can't remove your only sign-in method. Connect another provider first — otherwise you'd lose access to this account.",
    );
  }
  if (!methods.includes(providerId)) {
    throw handledError("That provider isn't connected.");
  }

  const label = PROVIDER_LABELS[providerId] ?? providerId;

  try {
    await unlink(user, providerId);
    logAuthDiagnostic("unlink-success", { provider: providerId });
    return readLinkedProviderIds(user);
  } catch (error) {
    const code =
      typeof (error as { code?: unknown })?.code === "string"
        ? (error as { code: string }).code
        : "";

    logAuthDiagnostic("unlink-failed", { provider: providerId, firebaseCode: code });

    if (code === "auth/no-such-provider") {
      throw handledError(`${label} isn't connected to this account.`, code);
    }
    if (code === "auth/requires-recent-login") {
      throw handledError(
        "For security, this action needs a fresh sign-in. Sign out and sign in again, then try disconnecting from Linked Accounts.",
        code,
      );
    }
    if (code === "auth/network-request-failed") {
      throw handledError(
        "Sign-in is temporarily unavailable. Please try again in a moment.",
        code,
      );
    }

    throw handledError(
      `We couldn't disconnect ${label}. Please try again in a moment.`,
      code || undefined,
    );
  }
}
