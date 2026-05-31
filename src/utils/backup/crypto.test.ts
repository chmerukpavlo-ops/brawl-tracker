import { describe, it, expect } from "vitest";
import { sha256, encryptPayload, decryptPayload } from "./crypto";

describe("sha256", () => {
  it("produces 64 hex characters", async () => {
    const hex = await sha256("hello");
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", async () => {
    const a = await sha256("brawl stars");
    const b = await sha256("brawl stars");
    expect(a).toBe(b);
  });

  it("matches the known SHA-256 of 'hello'", async () => {
    // From https://en.wikipedia.org/wiki/SHA-2 reference vectors.
    expect(await sha256("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("changes when input changes by a single byte", async () => {
    const a = await sha256("hello");
    const b = await sha256("hellp");
    expect(a).not.toBe(b);
  });
});

describe("encryptPayload / decryptPayload", () => {
  it("round-trips a UTF-8 string", async () => {
    const ciphertext = await encryptPayload("щось українською 👀", "correct horse");
    const plaintext = await decryptPayload(ciphertext, "correct horse");
    expect(plaintext).toBe("щось українською 👀");
  });

  it("produces different ciphertext each call (random salt + iv)", async () => {
    const a = await encryptPayload("same plaintext", "pw");
    const b = await encryptPayload("same plaintext", "pw");
    expect(a).not.toBe(b);
  });

  it("rejects decryption with the wrong password", async () => {
    const ciphertext = await encryptPayload("secret", "right");
    await expect(decryptPayload(ciphertext, "wrong")).rejects.toThrow(/decryption failed/i);
  });

  it("rejects an empty password on encrypt and decrypt", async () => {
    await expect(encryptPayload("x", "")).rejects.toThrow(/password is required/);
    await expect(decryptPayload("anything", "")).rejects.toThrow(/password is required/);
  });

  it("rejects a payload that's too short to contain salt + iv", async () => {
    const tooShort = btoa("AAAA");
    await expect(decryptPayload(tooShort, "pw")).rejects.toThrow(/too short/);
  });
});
