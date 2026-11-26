import { BadRequestException } from '@nestjs/common';
import { createPublicKey, diffieHellman, generateKeyPairSync } from 'node:crypto';

export function validBase64(value: unknown, size?: number): value is string {
  if (typeof value !== 'string' || !value.length || value.length > 20000) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.toString('base64') === value && (size === undefined || bytes.length === size);
}

export function validatePublicKey(value: unknown): asserts value is string {
  if (!validBase64(value, 32)) throw new BadRequestException('Invalid X25519 public key');
  try {
    const publicKey = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b656e032100', 'hex'), Buffer.from(value, 'base64')]),
      format: 'der', type: 'spki',
    });
    // Reject low-order X25519 points, not just incorrectly sized strings.
    diffieHellman({ privateKey: generateKeyPairSync('x25519').privateKey, publicKey });
  } catch {
    throw new BadRequestException('Invalid X25519 public key');
  }
}

export function parseEnvelope(value: unknown): { v: 1; senderPublicKey: string; recipientPublicKey: string; ciphertext: string; iv: string } {
  try {
    if (typeof value !== 'string' || value.length > 20000) throw new Error();
    const envelope = JSON.parse(value);
    if (!envelope || envelope.v !== 1 || Object.keys(envelope).sort().join(',') !== 'ciphertext,iv,recipientPublicKey,senderPublicKey,v' ||
      !validBase64(envelope.senderPublicKey, 32) || !validBase64(envelope.recipientPublicKey, 32) ||
      !validBase64(envelope.iv, 12) || !validBase64(envelope.ciphertext)) throw new Error();
    const bytes = Buffer.from(envelope.ciphertext, 'base64').length;
    if (bytes < 17 || bytes > 12016) throw new Error();
    return envelope;
  } catch {
    throw new BadRequestException('Invalid encrypted message');
  }
}
