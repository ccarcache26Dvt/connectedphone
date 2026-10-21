import { supabase } from "@/integrations/supabase/client";

const databaseName = "connected-private-keys";
const storeName = "identities";
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type EncryptedFile = {
  iv: string;
  data: ArrayBuffer;
};

function toBase64(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("No se pudo abrir el almacén seguro de claves"));
  });
}

async function readPrivateKey(userId: string): Promise<CryptoKey | null> {
  const database = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(userId);
    request.onsuccess = () => {
      database.close();
      resolve((request.result as CryptoKey | undefined) ?? null);
    };
    request.onerror = () => {
      database.close();
      reject(request.error ?? new Error("No se pudo leer la clave privada del dispositivo"));
    };
  });
}

async function savePrivateKey(userId: string, key: CryptoKey): Promise<void> {
  const database = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(key, userId);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(
        transaction.error ?? new Error("No se pudo guardar la clave privada en este dispositivo"),
      );
    };
    transaction.onabort = () => {
      database.close();
      reject(
        transaction.error ?? new Error("No se pudo guardar la clave privada en este dispositivo"),
      );
    };
  });
}

async function passwordKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function unlockEncryptionIdentity(userId: string, password: string): Promise<void> {
  if (!globalThis.crypto?.subtle || !globalThis.indexedDB) {
    throw new Error(
      "Este navegador no admite el almacenamiento cifrado requerido. Usa una conexión segura y un navegador actualizado.",
    );
  }
  const [{ data: profile, error: profileError }, { data: stored, error: keyError }] =
    await Promise.all([
      supabase.from("profiles").select("public_key").eq("id", userId).single(),
      supabase.from("user_encryption_keys").select("*").eq("user_id", userId).maybeSingle(),
    ]);
  if (profileError) throw profileError;
  if (keyError) throw keyError;

  let privateKey = await readPrivateKey(userId);
  if (!profile.public_key) {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ]);
    const publicKey = toBase64(await crypto.subtle.exportKey("raw", pair.publicKey));
    const privateBytes = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await passwordKey(password, salt);
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      wrappingKey,
      privateBytes,
    );
    const { error: saveError } = await supabase.from("user_encryption_keys").upsert({
      user_id: userId,
      encrypted_private_key: toBase64(encryptedPrivateKey),
      encryption_salt: toBase64(salt),
      encryption_iv: toBase64(iv),
    });
    if (saveError) throw saveError;
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ public_key: publicKey })
      .eq("id", userId);
    if (profileUpdateError) throw profileUpdateError;
    privateKey = pair.privateKey;
    await savePrivateKey(userId, privateKey);
    return;
  }

  if (!stored) {
    throw new Error(
      "Falta el respaldo cifrado de la clave privada. Contacta al soporte antes de usar el chat.",
    );
  }

  if (!privateKey) {
    try {
      const wrappingKey = await passwordKey(password, fromBase64(stored.encryption_salt));
      const privateBytes = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(stored.encryption_iv) },
        wrappingKey,
        fromBase64(stored.encrypted_private_key),
      );
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        privateBytes,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveBits"],
      );
      await savePrivateKey(userId, privateKey);
    } catch {
      throw new Error(
        "No se pudo desbloquear la clave privada. Verifica la contraseña de la cuenta.",
      );
    }
  }
}

export async function conversationKey(
  userId: string,
  conversationId: string,
  peerPublicKey: string,
): Promise<CryptoKey> {
  const privateKey = await readPrivateKey(userId);
  if (!privateKey)
    throw new Error("Falta la clave privada de este dispositivo. Cierra sesión y vuelve a entrar.");
  const publicKey = await crypto.subtle.importKey(
    "raw",
    fromBase64(peerPublicKey),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: publicKey },
    privateKey,
    256,
  );
  const material = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(conversationId),
      info: encoder.encode("connected-chat-v1"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPayload(value: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(value),
  );
  return `e2e:v1:${toBase64(iv)}:${toBase64(encrypted)}`;
}

export async function decryptPayload(value: string, key: CryptoKey): Promise<string> {
  const parts = value.split(":");
  if (parts.length !== 4 || parts[0] !== "e2e" || parts[1] !== "v1") {
    throw new Error("El mensaje cifrado tiene un formato no reconocido.");
  }
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(parts[2]) },
    key,
    fromBase64(parts[3]),
  );
  return decoder.decode(plaintext);
}

export async function encryptFile(file: File, key: CryptoKey): Promise<EncryptedFile> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await file.arrayBuffer());
  return { iv: toBase64(iv), data };
}

export async function decryptFile(
  data: ArrayBuffer,
  iv: string,
  key: CryptoKey,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, data);
}
