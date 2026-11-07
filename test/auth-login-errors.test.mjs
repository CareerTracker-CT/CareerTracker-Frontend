import assert from "node:assert/strict";
import test from "node:test";
import { describeLoginError } from "../src/lib/login-errors.mjs";

test("invalid Firebase credentials keep generic, non-enumerating copy", () => {
  assert.equal(
    describeLoginError({ code: "auth/invalid-credential" }),
    "We couldn't sign you in. Check your credentials and try again.",
  );
  assert.equal(
    describeLoginError({ response: { status: 401 } }),
    "We couldn't sign you in. Check your credentials and try again.",
  );
});

test("Firebase and backend network failures are not presented as bad credentials", () => {
  const expected = "Sign-in is temporarily unavailable. Please try again in a moment.";
  assert.equal(describeLoginError({ code: "auth/network-request-failed" }), expected);
  assert.equal(describeLoginError({ code: "ERR_NETWORK", isAxiosError: true }), expected);
  assert.equal(describeLoginError({ code: "ECONNABORTED", isAxiosError: true }), expected);
  assert.equal(describeLoginError({ isAxiosError: true }), expected);
});

test("backend outage statuses use service-unavailable copy", () => {
  const expected = "Sign-in is temporarily unavailable. Please try again in a moment.";
  for (const status of [502, 503, 504]) {
    assert.equal(describeLoginError({ response: { status } }), expected);
  }
  assert.equal(
    describeLoginError({ response: { status: 500 } }),
    "Sign-in encountered a server problem. Please try again.",
  );
});

test("Firebase configuration and provider errors report service trouble", () => {
  const expected = "Sign-in is temporarily unavailable. Please try again in a moment.";
  for (const code of [
    "auth/invalid-api-key",
    "auth/app-not-authorized",
    "auth/operation-not-allowed",
    "auth/unauthorized-domain",
  ]) {
    assert.equal(describeLoginError({ code }), expected);
  }
});

test("specific safe account and policy codes are distinguished", () => {
  assert.match(describeLoginError({ code: "auth/user-disabled" }), /account can't sign in/i);
  assert.match(
    describeLoginError({ response: { status: 403, data: { error: { code: "EMAIL_VERIFICATION_REQUIRED" } } } }),
    /verify your email/i,
  );
  assert.match(
    describeLoginError({ response: { status: 401, data: { error: { code: "SESSION_REVOKED" } } } }),
    /session has ended/i,
  );
});

test("rate limiting and popup cancellation preserve helpful states", () => {
  assert.match(describeLoginError({ code: "auth/too-many-requests" }), /wait a moment/i);
  assert.match(describeLoginError({ response: { status: 429 } }), /wait a moment/i);
  assert.equal(describeLoginError({ code: "auth/popup-closed-by-user" }), "Google sign-in was cancelled.");
  assert.equal(describeLoginError({ code: "auth/popup-blocked" }), "Google sign-in could not open. Please try again.");
});

test("unknown errors and backend details are not leaked", () => {
  const secret = "private database driver detail";
  assert.equal(
    describeLoginError({ response: { status: 400, data: { error: { code: "BAD_REQUEST", message: secret } } } }),
    "We couldn't complete sign-in. Please try again.",
  );
  assert.equal(describeLoginError(new Error(secret)), "We couldn't complete sign-in. Please try again.");
  assert.doesNotMatch(describeLoginError({ message: secret }), /private database driver detail/);
});
