import crypto from "crypto";

const COOKIE_NAME = "dashboard_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET missing or too short (need 16+ chars)");
  }
  return secret;
}

export function createSessionToken(): string {
  const payload = `${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return false;
  }
  // Check age
  const ts = Number(payload);
  if (!Number.isFinite(ts)) return false;
  const ageSec = (Date.now() - ts) / 1000;
  return ageSec < COOKIE_MAX_AGE;
}

export function checkPassword(input: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD || "";
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

export const AUTH = {
  COOKIE_NAME,
  COOKIE_MAX_AGE,
};
