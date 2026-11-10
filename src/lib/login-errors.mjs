const CREDENTIALS_MESSAGE =
  "We couldn't sign you in. Check your credentials and try again.";
const SERVICE_MESSAGE =
  "Sign-in is temporarily unavailable. Please try again in a moment.";

function readString(value) {
  return typeof value === "string" ? value : "";
}

/** Return safe, stable sign-in copy without exposing SDK or server details. */
export function describeLoginError(error) {
  const value = error && typeof error === "object" ? error : {};
  const code = readString(value.code);
  const message = readString(value.message);
  const response = value.response && typeof value.response === "object"
    ? value.response
    : {};
  const status = Number(response.status);
  const serverCode = readString(response.data?.error?.code).toUpperCase();

  // Errors assembled by the auth helper already carry final, user-safe copy
  // (e.g. the login-conflict guidance). Render it verbatim.
  if (value.handled === true && message) {
    return message;
  }

  if (code === "auth/popup-closed-by-user") {
    return "Sign-in was cancelled.";
  }
  if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
    return "Pop-up sign-in could not open. Please try again.";
  }
  // Firebase raised this when the popup succeeded but the same email is
  // already bound to another sign-in method (e.g. Google or password).
  if (code === "auth/account-exists-with-different-credential") {
    return "That email is already registered with a different sign-in method. Sign in with that method instead.";
  }

  if ([
    "auth/invalid-credential",
    "auth/wrong-password",
    "auth/user-not-found",
    "auth/invalid-email",
  ].includes(code)) {
    return CREDENTIALS_MESSAGE;
  }

  if (code === "auth/user-disabled" || serverCode === "ACCOUNT_DISABLED") {
    return "This account can't sign in. Contact support for help.";
  }
  if (serverCode === "EMAIL_VERIFICATION_REQUIRED") {
    return "Verify your email address, then try signing in again.";
  }
  if (serverCode === "SESSION_EXPIRED" || serverCode === "SESSION_REVOKED") {
    return "Your session has ended. Please sign in again.";
  }
  if (status === 401) {
    return CREDENTIALS_MESSAGE;
  }
  // CareerTracker 403s carry deliberate user-safe copy — notably the
  // "sign-in provider shares no verified email" guidance shown to a Firebase
  // identity (e.g. GitHub private email) that cannot be provisioned safely.
  if (status === 403) {
    const serverMessage = readString(response.data?.error?.message);
    return serverMessage || SERVICE_MESSAGE;
  }
  if (code === "auth/too-many-requests" || status === 429) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }

  if (
    code === "auth/network-request-failed" ||
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    code === "ETIMEDOUT" ||
    value.name === "TimeoutError"
  ) {
    return SERVICE_MESSAGE;
  }

  if (
    code === "auth/invalid-api-key" ||
    code === "auth/app-not-authorized" ||
    code === "auth/operation-not-allowed" ||
    code === "auth/unauthorized-domain" ||
    code === "auth/invalid-app-credential" ||
    code === "auth/configuration-not-found" ||
    code === "ERR_CANCELED" ||
    (!Number.isFinite(status) && value.isAxiosError === true)
  ) {
    return SERVICE_MESSAGE;
  }

  if (status >= 500 && status <= 599) {
    return status === 500
      ? "Sign-in encountered a server problem. Please try again."
      : SERVICE_MESSAGE;
  }

  return "We couldn't complete sign-in. Please try again.";
}
