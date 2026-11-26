'use client';

// Ponytail: one identity per account/device, no forward secrecy or device recovery.
// Upgrade to an audited ratchet protocol and authenticated device linking before multi-device support.

const KEY_STORAGE_KEY = 'bonten:e2ee:keys';
const ENCODER = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

interface KeyPair {
  privateKey: CryptoKey;
  publicKeyRaw: string;
}

export interface EncryptedMessage {
  v: 1;
  senderPublicKey: string;
  recipientPublicKey: string;
  ciphertext: string;
  iv: string;
}

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string, size?: number): ArrayBuffer {
  if (typeof b64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(b64)) throw new Error('Dados criptográficos inválidos.');
  const bytes = new Uint8Array(atob(b64).split('').map((c) => c.charCodeAt(0)));
  if (size !== undefined && bytes.length !== size || toBase64(bytes) !== b64) throw new Error('Dados criptográficos inválidos.');
  return bytes.buffer;
}

async function getOrCreateIdentityKeyPair(userId: string): Promise<KeyPair> {
  if (!userId || typeof window === 'undefined' || !crypto.subtle) throw new Error('Criptografia indisponível.');
  const storageKey = `${KEY_STORAGE_KEY}:${userId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const { publicKeyRaw, privateKey } = JSON.parse(stored);
      const privateKeyKey = await crypto.subtle.importKey('pkcs8', fromBase64(privateKey), 'X25519', true, ['deriveBits']);
      const expectedPub = await crypto.subtle.exportKey('raw', await crypto.subtle.importKey('raw', fromBase64(publicKeyRaw), 'X25519', false, []));
      if (toBase64(expectedPub) !== publicKeyRaw) throw new Error();
      return { privateKey: privateKeyKey, publicKeyRaw };
    } catch {
      throw new Error('Identidade local corrompida.');
    }
  }
  const keyPair = await crypto.subtle.generateKey('X25519', true, ['deriveBits']) as CryptoKeyPair;
  const publicKeyRaw = toBase64(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const privateKey = toBase64(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey));
  localStorage.setItem(storageKey, JSON.stringify({ publicKeyRaw, privateKey }));
  return { privateKey: keyPair.privateKey, publicKeyRaw };
}

async function deriveSharedKey(myPrivateKey: CryptoKey, theirPublicKeyB64: string, info: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const theirPublicKey = await crypto.subtle.importKey('raw', fromBase64(theirPublicKeyB64, 32), 'X25519', false, []);
  const sharedSecret = await crypto.subtle.deriveBits({ name: 'X25519', public: theirPublicKey }, myPrivateKey, 256);
  const material = await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function pinPeer(userId: string, peerId: string, key: string): Promise<void> {
  if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(key) && fromBase64(key, 32)) {
    const name = `bonten:e2ee:peer:${userId}:${peerId}`;
    const pinned = localStorage.getItem(name);
    if (pinned && pinned !== key) throw new Error('Chave do contato mudou. Envio bloqueado.');
    localStorage.setItem(name, key);
  }
}

async function encryptMessage(plaintext: string, recipientPublicKey: string, userId: string, recipientId: string): Promise<EncryptedMessage> {
  const bytes = ENCODER.encode(plaintext);
  if (!bytes.length || bytes.length > 12000 || !recipientId || recipientId === userId) throw new Error('Mensagem inválida.');
  const keyPair = await getOrCreateIdentityKeyPair(userId);
  await pinPeer(userId, recipientId, recipientPublicKey);
  const envelope: EncryptedMessage = { v: 1, senderPublicKey: keyPair.publicKeyRaw, recipientPublicKey, iv: '', ciphertext: '' };
  const info = ENCODER.encode(JSON.stringify(['bonten-dm-v1', userId, recipientId, keyPair.publicKeyRaw, recipientPublicKey]));
  const aesKey = await deriveSharedKey(keyPair.privateKey, recipientPublicKey, info);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  envelope.iv = toBase64(iv);
  envelope.ciphertext = toBase64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: info }, aesKey, bytes));
  return envelope;
}

async function decryptMessage(message: EncryptedMessage, userId: string, senderId: string, receiverId: string): Promise<string> {
  if (!message || message.v !== 1 || (userId !== senderId && userId !== receiverId)) throw new Error('Mensagem inválida.');
  const mine = userId === senderId;
  const keyPair = await getOrCreateIdentityKeyPair(userId);
  const peer = mine ? message.recipientPublicKey : message.senderPublicKey;
  const peerId = mine ? receiverId : senderId;
  await pinPeer(userId, peerId, peer);
  const info = ENCODER.encode(JSON.stringify(['bonten-dm-v1', senderId, receiverId, message.senderPublicKey, message.recipientPublicKey]));
  const aesKey = await deriveSharedKey(keyPair.privateKey, peer, info);
  const ciphertext = fromBase64(message.ciphertext);
  if (ciphertext.byteLength < 17 || ciphertext.byteLength > 12016) throw new Error('Mensagem criptografada inválida.');
  return decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(message.iv, 12), additionalData: info }, aesKey, ciphertext));
}

export { getOrCreateIdentityKeyPair, encryptMessage, decryptMessage };
export async function getMyPublicKeyBase64(userId: string, registeredPublicKey?: string | null): Promise<string> {
  const keyPair = await getOrCreateIdentityKeyPair(userId);
  if (registeredPublicKey && keyPair.publicKeyRaw !== registeredPublicKey) throw new Error('Chave cadastrada difere deste dispositivo.');
  return keyPair.publicKeyRaw;
}