import { generateKeyPairSync } from 'node:crypto';
import { validBase64, validatePublicKey, parseEnvelope } from './encrypted-envelope';

const key = Buffer.alloc(32, 42).toString('base64');
const envelope = { v: 1, senderPublicKey: key, recipientPublicKey: key, iv: Buffer.alloc(12).toString('base64'), ciphertext: Buffer.alloc(32).toString('base64') };

describe('encrypted envelope boundary', () => {
  it('accepts canonical base64 and validates byte length', () => {
    expect(validBase64(key, 32)).toBe(true);
    for (const invalid of [null, 123, {}, `${key}\n`, key.slice(0, -1)]) expect(validBase64(invalid, 32)).toBe(false);
    expect(validBase64(key, 31)).toBe(false);
  });
  it('accepts generated X25519 keys and rejects low-order points', () => {
    const raw = generateKeyPairSync('x25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('base64');
    expect(() => validatePublicKey(raw)).not.toThrow();
    for (const invalid of [null, '!!!', Buffer.alloc(32).toString('base64')]) expect(() => validatePublicKey(invalid)).toThrow();
  });
  it('accepts a bounded versioned envelope', () => {
    expect(parseEnvelope(JSON.stringify(envelope))).toEqual(envelope);
  });
  it('rejects malformed data, extra plaintext, wrong versions, invalid IV and ciphertext bounds', () => {
    for (const input of [null, '{}', 'null', 'x'.repeat(20001), ...[
      { ...envelope, content: 'leak' }, { ...envelope, v: 2 }, { ...envelope, iv: key },
      { ...envelope, ciphertext: Buffer.alloc(16).toString('base64') },
      { ...envelope, ciphertext: Buffer.alloc(12017).toString('base64') },
    ].map((value) => JSON.stringify(value))]) expect(() => parseEnvelope(input)).toThrow();
  });
});
