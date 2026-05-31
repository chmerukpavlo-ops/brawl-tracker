/**
 * Web Crypto helpers for backup integrity and optional password
 * protection. No third-party crypto: everything runs through
 * `window.crypto.subtle`.
 *
 * Layout for encrypted blobs (base64-encoded as a single string):
 *
 *   [ salt(16) | iv(12) | ciphertext(...) ]
 *
 * The KDF is PBKDF2-SHA256, 100k iterations (matches OWASP 2024
 * minimum); the cipher is AES-GCM-256 (authenticated, so we get
 * tamper detection for free — no separate HMAC needed).
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LEN = 16;
const IV_LEN = 12;

function ensureSubtle(): SubtleCrypto {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error(
      "Web Crypto API is unavailable. Backups require a secure (HTTPS) context."
    );
  }
  return crypto.subtle;
}

/** Hex-encoded SHA-256 of an arbitrary UTF-8 string. */
export async function sha256(input: string): Promise<string> {
  const subtle = ensureSubtle();
  const buffer = new TextEncoder().encode(input);
  const digest = await subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}

/* ───────────────────────── encryption ─────────────────────────── */

async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const subtle = ensureSubtle();
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts `plaintext` with `password` and returns a single base64
 * string holding `salt || iv || ciphertext`. Throws on any subtle
 * crypto failure (caller wraps with a friendly message).
 */
export async function encryptPayload(
  plaintext: string,
  password: string
): Promise<string> {
  if (!password) throw new Error("password is required");
  const subtle = ensureSubtle();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);

  const ciphertext = await subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_LEN);
  combined.set(new Uint8Array(ciphertext), SALT_LEN + IV_LEN);
  return bytesToBase64(combined);
}

/**
 * Decrypts a payload produced by `encryptPayload`. AES-GCM throws on
 * any tampering or wrong password — we map both cases to a single
 * error so the UI can show a unified "invalid password" message.
 */
export async function decryptPayload(
  base64: string,
  password: string
): Promise<string> {
  if (!password) throw new Error("password is required");
  const subtle = ensureSubtle();
  const combined = base64ToBytes(base64);
  if (combined.length < SALT_LEN + IV_LEN + 1) {
    throw new Error("payload too short");
  }
  const salt = combined.slice(0, SALT_LEN);
  const iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = combined.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(password, salt);
  try {
    const plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("decryption failed");
  }
}

/* ─────────────────────── encoding helpers ─────────────────────── */

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunk to avoid the spread-arg limit (~65k) on very large buffers.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
