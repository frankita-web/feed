// Links firmados para mostrar fotos privadas en el mail sin la clave de la página:
// solo sirven para esa foto, y nadie puede armar uno sin SITE_SECRET.

async function hmac(text: string) {
  const encode = (value: string) => new TextEncoder().encode(value);
  const key = await crypto.subtle.importKey(
    "raw",
    encode(process.env.SITE_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encode(`foto:${text}`)));
  return Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Link público y firmado a una foto guardada (ruta "/api/media/media/…"). */
export async function signedPhotoUrl(origin: string, path: string) {
  const media = path.replace(/^\/api\/media\//, "");
  return `${origin}/api/foto?p=${encodeURIComponent(media)}&s=${await hmac(media)}`;
}

export async function validPhotoSignature(media: string, signature: string) {
  return !!process.env.SITE_SECRET && media.startsWith("media/") && signature === (await hmac(media));
}
