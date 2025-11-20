import "react-native-get-random-values";
import { Buffer } from "buffer";
import { argon2id } from "@noble/hashes/argon2";
import { sha256 } from "@noble/hashes/sha256";
import { chacha20poly1305 } from "@noble/ciphers/chacha";
import { randomBytes } from "@noble/ciphers/utils";

if (typeof global.Buffer === "undefined") {
  (global as any).Buffer = Buffer;
}

let sessionKey: Uint8Array | null = null;

const ARGON2_OPTIONS = {
  t: 2,
  m: 65536,
  p: 4,
  dkLen: 32,
};

const base64Encode = (data: Uint8Array) => Buffer.from(data).toString("base64");
const base64Decode = (data: string) => new Uint8Array(Buffer.from(data, "base64"));

export const initializeEncryptionSession = (
  username: string,
  masterPassword: string,
  userSaltBase64: string
) => {
  const saltBytes = base64Decode(userSaltBase64);
  const usernameBytes = Buffer.from(username.trim().toLowerCase(), "utf-8");
  const mixedSalt = sha256(Buffer.concat([saltBytes, Buffer.from(":"), usernameBytes]));

  sessionKey = argon2id(Buffer.from(masterPassword, "utf-8"), {
    ...ARGON2_OPTIONS,
    salt: mixedSalt,
  });
};

export const clearEncryptionSession = () => {
  if (sessionKey) {
    sessionKey.fill(0);
  }
  sessionKey = null;
};

const requireSessionKey = () => {
  if (!sessionKey) {
    throw new Error("Encryption session is not initialized");
  }
  return sessionKey;
};

export const encryptSecret = (plaintext: string) => {
  const key = requireSessionKey();
  const nonce = randomBytes(12);
  const cipher = chacha20poly1305(key);
  const ciphertext = cipher.encrypt(nonce, Buffer.from(plaintext, "utf-8"), new Uint8Array());

  return {
    ciphertext: base64Encode(ciphertext),
    nonce: base64Encode(nonce),
  };
};

export const decryptSecret = (ciphertextBase64: string, nonceBase64: string) => {
  const key = requireSessionKey();
  const cipher = chacha20poly1305(key);
  const plaintext = cipher.decrypt(
    base64Decode(nonceBase64),
    base64Decode(ciphertextBase64),
    new Uint8Array()
  );
  return Buffer.from(plaintext).toString("utf-8");
};

export const isEncryptionReady = () => !!sessionKey;

