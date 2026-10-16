import { describe, expect, it } from "vitest";
import { decryptPayload, encryptPayload } from "./message-encryption";

describe("message encryption", () => {
  it("stores an authenticated ciphertext instead of the readable message", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    const secret = "un mensaje privado";
    const encrypted = await encryptPayload(secret, key);

    expect(encrypted).toMatch(/^e2e:v1:/);
    expect(encrypted).not.toContain(secret);
    await expect(decryptPayload(encrypted, key)).resolves.toBe(secret);
  });

  it("rejects messages changed after encryption", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]);
    const encrypted = await encryptPayload("contenido privado", key);
    const altered = `${encrypted.slice(0, -2)}AA`;

    await expect(decryptPayload(altered, key)).rejects.toThrow();
  });
});
