/** Clave de la página: una cookie firmada que dura un año en cada dispositivo. */
export const COOKIE = "feed-clave";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
} as const;

async function signature() {
  const { APP_PASSWORD: password, SITE_SECRET: secret } = process.env;
  if (!password || !secret) return null;
  const encode = (text: string) => new TextEncoder().encode(text);
  const key = await crypto.subtle.importKey(
    "raw",
    encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encode(password)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function validSession(cookie: string | undefined) {
  const expected = await signature();
  return !!expected && !!cookie && same(cookie, expected);
}

/** Devuelve el valor de la cookie si la clave es correcta. */
export async function sessionFor(password: string) {
  return password && same(password.trim(), process.env.APP_PASSWORD ?? "") ? signature() : null;
}
